import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  validateRepo, validateRef, validateDir, validateArtifactId, validateFirebaseAppId,
  validateText, checkRepoPublic, MAX_INPUT_BYTES,
} from './validate-external-input.mjs'
import { listEntries, pickApkEntry, extractApk, crc32 } from './extract-single-apk.mjs'

// ---- 入力の検証 ----

test('入力 repo: owner/repo の形だけ通す', () => {
  for (const ok of ['kouiso/r2-gallery', 'a-b_c.d/e-f']) assert.ok(validateRepo(ok).ok, ok)
  for (const ng of ['', 'x', 'a/b/c', 'a b/c', 'a/../b', 'a;b', '-a/b', 'a/.', 'a?b', '日本語/b']) {
    assert.equal(validateRepo(ng).ok, false, ng)
  }
})

test('入力 ref: git の引数や URL に化ける形を落とす', () => {
  for (const ok of ['main', 'develop', 'feat/x.y', 'v1.2.3', 'a'.repeat(255)]) assert.ok(validateRef(ok).ok, ok)
  for (const ng of ['', 'main other', '-h', '--upload-pack=x', 'a..b', 'a//b', 'a@{b', 'a b', 'a~1', 'a:b', 'a\\b', '/a', 'a/', 'a.', 'x.lock', 'a\nb']) {
    assert.equal(validateRef(ng).ok, false, ng)
  }
})

test('入力 dir: clone の中に閉じる相対パスだけ通す', () => {
  for (const ok of ['worker', 'a/b/c', 'x_y.z']) assert.ok(validateDir(ok).ok, ok)
  for (const ng of ['', '/etc', '../x', 'a/../b', './a', 'a/./b', 'a//b', 'C:\\x', 'a\\b', 'a\nb', 'x:win']) {
    assert.equal(validateDir(ng).ok, false, ng)
  }
})

test('入力 artifact_id / firebase_app_id', () => {
  assert.ok(validateArtifactId('123456789').ok)
  for (const ng of ['', '12a3', '-1', '1.5', '1;rm', '1 2']) assert.equal(validateArtifactId(ng).ok, false, ng)
  assert.ok(validateFirebaseAppId('1:123456789012:android:0a1b2c3d4e5f0a1b2c3d4e5f0a1b2c3d').ok)
  for (const ng of ['', '1:2:ios:x', 'a:b:android:x', '1:2:android:', '1:2:android:nothex!']) {
    assert.equal(validateFirebaseAppId(ng).ok, false, ng)
  }
})

test('入力 text: 65,536 bytes 上限と制御文字', () => {
  assert.ok(validateText('リリースノート\n2行目').ok)
  assert.ok(validateText('a'.repeat(MAX_INPUT_BYTES)).ok)
  assert.equal(validateText('a'.repeat(MAX_INPUT_BYTES + 1)).ok, false)
  assert.equal(validateText('ok\x07bell').ok, false)
  assert.equal(validateText('').ok, false)
})

test('checkRepoPublic: Public と確実な応答だけ通し、それ以外は全部落とす', async () => {
  const make = (status, body) => async () => ({ status, json: async () => body })
  assert.ok((await checkRepoPublic('kouiso/r2-gallery', make(200, { private: false, visibility: 'public' }))).ok)
  for (const [status, body] of [
    [404, {}],
    [200, { private: true, visibility: 'private' }],
    [200, { private: false }],
    [200, {}],
  ]) {
    const r = await checkRepoPublic('kouiso/r2-gallery', make(status, body))
    assert.equal(r.ok, false, `${status} ${JSON.stringify(body)}`)
  }
  const err = await checkRepoPublic('kouiso/r2-gallery', async () => { throw new Error('down') })
  assert.equal(err.ok, false)
})

// ---- 合成 ZIP ----

/** 試験用の小さい ZIP 生成器。store/deflate と unix 属性を自分で書いて、実物の構造のまま試す。 */
function buildZip(entries) {
  const chunks = []
  const cdir = []
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8')
    const data = e.data ?? Buffer.alloc(0)
    const method = e.method ?? 0
    const stored = method === 8 ? deflateRawSync(data) : data
    const crc = e.crc ?? crc32(data)
    const csize = e.csize ?? stored.length
    const usize = e.usize ?? data.length
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(e.flags ?? 0, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(csize, 18)
    local.writeUInt32LE(usize, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    const localOff = chunks.reduce((n, c) => n + c.length, 0)
    chunks.push(local, name, stored)
    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(e.madeByUnix ? 3 << 8 | 20 : 20, 4) // versionMadeBy
    cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(e.flags ?? 0, 8)
    cd.writeUInt16LE(method, 10)
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(csize, 20)
    cd.writeUInt32LE(usize, 24)
    cd.writeUInt16LE(name.length, 28)
    cd.writeUInt32LE((e.extAttr ?? 0) >>> 0, 38)
    cd.writeUInt32LE(localOff, 42)
    cdir.push(Buffer.concat([cd, name]))
  }
  const body = Buffer.concat(chunks)
  const central = Buffer.concat(cdir)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(cdir.length, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(body.length, 16)
  return Buffer.concat([body, central, eocd])
}

const APK_NAME = 'app-release.apk'
const APK_DATA = Buffer.from('fake-apk-bytes-for-contract-test')

function withZip(t, entries, fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'eq250-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const zip = path.join(dir, 'a.zip')
  writeFileSync(zip, buildZip(entries))
  return fn(zip, dir)
}

test('ZIP: 通常の APK 1 個なら取り出せる（store/deflate 両方）', (t) => {
  for (const method of [0, 8]) {
    withZip(t, [{ name: 'readme.txt', data: Buffer.from('note') }, { name: APK_NAME, data: APK_DATA, method }], (zip, dir) => {
      const out = path.join(dir, 'app.apk')
      const r = extractApk(zip, out)
      assert.ok(r.ok, r.error)
      assert.deepEqual(readFileSync(out), APK_DATA)
    })
  }
})

test('ZIP: 危ない名前は全部落とす（..・絶対・改行・バックスラッシュ・制御）', (t) => {
  for (const name of ['../evil.apk', '/tmp/x.apk', 'a/../../x.apk', 'C:\\tmp\\x.apk', 'ok\nname.apk', 'a\\b.apk', 'bad\x01.apk']) {
    withZip(t, [{ name, data: APK_DATA }], (zip) => {
      assert.equal(extractApk(zip, path.join(path.dirname(zip), 'o.apk')).ok, false, name)
    })
  }
})

test('ZIP: symlink・APK 複数・APK 無し・巨大サイズ・壊れた実体を落とす', (t) => {
  const S_IFLNK = 0o120000
  const cases = [
    // symlink（unix の mode は種類フィールド S_IFLNK に権限ビットを足した形）
    [{ name: 'l', data: Buffer.from('x'), madeByUnix: true, extAttr: ((S_IFLNK | 0o777) << 16) >>> 0 }, { name: APK_NAME, data: APK_DATA }],
    // APK 2 個
    [{ name: 'a.apk', data: APK_DATA }, { name: 'dir/b.apk', data: APK_DATA }],
    // APK 無し
    [{ name: 'readme.txt', data: Buffer.from('x') }],
    // 非圧縮サイズが上限超え（目次だけ大きく書く）
    [{ name: APK_NAME, data: APK_DATA, usize: 1024 * 1024 * 1024 + 1 }],
    // crc が目次と違う
    [{ name: APK_NAME, data: APK_DATA, crc: crc32(APK_DATA) ^ 0xff }],
    // 非圧縮サイズが目次と違う
    [{ name: APK_NAME, data: APK_DATA, usize: APK_DATA.length + 9 }],
    // 暗号化フラグ
    [{ name: APK_NAME, data: APK_DATA, flags: 0x0001 }],
  ]
  for (const entries of cases) {
    withZip(t, entries, (zip) => {
      assert.equal(extractApk(zip, path.join(path.dirname(zip), 'o.apk')).ok, false, JSON.stringify(entries.map((e) => e.name)))
    })
  }
})

test('ZIP: 通常ファイル混じりでも全項目を検査する（APK 以外の危ない名前も落ちる）', (t) => {
  withZip(t, [{ name: APK_NAME, data: APK_DATA }, { name: 'docs/../../etc/passwd', data: Buffer.from('x') }], (zip) => {
    assert.equal(extractApk(zip, path.join(path.dirname(zip), 'o.apk')).ok, false)
  })
})

test('ZIP: 展開先の上書きはしない', (t) => {
  withZip(t, [{ name: APK_NAME, data: APK_DATA }], (zip, dir) => {
    const out = path.join(dir, 'app.apk')
    writeFileSync(out, 'already')
    assert.equal(extractApk(zip, out).ok, false)
    assert.equal(readFileSync(out, 'utf8'), 'already')
  })
})

test('ZIP: 中央ディレクトリを読めないものは拒否', () => {
  assert.equal(listEntries(Buffer.from('not a zip')).ok, false)
  const listed = listEntries(buildZip([{ name: APK_NAME, data: APK_DATA }]))
  assert.ok(listed.ok)
  assert.equal(pickApkEntry(listed.entries).ok, true)
})
