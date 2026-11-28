#!/usr/bin/env node
/**
 * artifact の ZIP から、配布する APK を 1 個だけ取り出す（#250 / fad-external.yml）。
 *
 * unzip -o だと、名前の `..`・シンボリックリンク・改行入りの名前・巨大ファイルで
 * 作業場所の外や資格情報の置き場まで書き込まれる。ここでは中央ディレクトリの全項目を
 * メタだけ先に検査し、問題の無い通常ファイルの APK 1 個だけを固定の安全な path へ出す。
 * 上書きもしない（既にあれば失敗）。
 *
 * 使い方: node scripts/extract-single-apk.mjs <zip> <out.apk>
 */

import { inflateRawSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'

/** APK は大きくても実測数百 MB まで。zip bomb 判定用の上限（非圧縮時）。 */
export const MAX_UNCOMPRESSED = 1024 * 1024 * 1024

const EOCD_SIG = 0x06054b50
const CDIR_SIG = 0x02014b50
const LOCAL_SIG = 0x04034b50
const S_ISLNK = 0o120000

// crc32 の引き回し（zlib の crc32 は node に無いので自前）
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function fail(msg) {
  return { ok: false, error: msg }
}

/** ZIP 項目名が安全か（展開先の外・端末・別名で書き込まれん形だけ通す）。 */
function badName(name) {
  if (name.length === 0 || name.length > 4096) return '名前が空か長すぎる'
  // eslint-disable-next-line no-control-regex -- 制御文字を含む項目名を落とすのがこの検査の仕事
  if (/[\x00-\x1F\x7F]/.test(name)) return '制御文字（改行・NUL など）を含む'
  if (name.includes('\\')) return 'バックスラッシュを含む'
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name)) return '絶対パス'
  for (const part of name.split('/')) {
    if (part === '..') return '.. を含む'
  }
  return null
}

/** 中央ディレクトリを読んで全項目のメタを取る。読めん形は即失敗。 */
export function listEntries(zip) {
  // EOCD を末尾 64KB + 22 から探す（コメントがあっても見つかる）
  const min = Math.max(0, zip.length - 22 - 65536)
  let eocd = -1
  for (let i = zip.length - 22; i >= min; i--) {
    if (zip.readUInt32LE(i) === EOCD_SIG) { eocd = i; break }
  }
  if (eocd < 0) return fail('EOCD（ZIP の末尾の目次）が見つからん')
  const count = zip.readUInt16LE(eocd + 10)
  const cdirOff = zip.readUInt32LE(eocd + 16)
  const cdirSize = zip.readUInt32LE(eocd + 12)
  if (cdirOff + cdirSize > zip.length) return fail('中央ディレクトリがファイルの外を指している')

  const entries = []
  let p = cdirOff
  for (let i = 0; i < count; i++) {
    if (p + 46 > zip.length || zip.readUInt32LE(p) !== CDIR_SIG) return fail(`中央ディレクトリの ${i} 件目が壊れている`)
    const versionMadeBy = zip.readUInt16LE(p + 4)
    const flags = zip.readUInt16LE(p + 8)
    const method = zip.readUInt16LE(p + 10)
    const crc = zip.readUInt32LE(p + 16)
    const csize = zip.readUInt32LE(p + 20)
    const usize = zip.readUInt32LE(p + 24)
    const nameLen = zip.readUInt16LE(p + 28)
    const extraLen = zip.readUInt16LE(p + 30)
    const commentLen = zip.readUInt16LE(p + 32)
    const extAttr = zip.readUInt32LE(p + 38)
    const localOff = zip.readUInt32LE(p + 42)
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    entries.push({ name, flags, method, crc, csize, usize, extAttr, localOff, madeByUnix: (versionMadeBy >> 8) === 3 })
    p += 46 + nameLen + extraLen + commentLen
  }
  return { ok: true, entries }
}

/**
 * ZIP を検査し、通常ファイルの APK が 1 個だけならその項目を返す。
 * 検査は全項目に効く（APK でなくても危ない名前・リンクは全部落とす）。
 */
export function pickApkEntry(entries) {
  for (const e of entries) {
    if (e.flags & 0x0001) return fail(`暗号化項目 ${JSON.stringify(e.name)}`)
    const bad = badName(e.name)
    if (bad) return fail(`項目名 ${JSON.stringify(e.name)} が ${bad}`)
    // unix 製 ZIP のモードで symlink を見る。symlink は展開対象にしないが、書き込み用に紛れ込ませないよう全部落とす
    if (e.madeByUnix && (e.extAttr >>> 16) & 0o170000 && ((e.extAttr >>> 16) & 0o170000) === S_ISLNK) return fail(`項目 ${JSON.stringify(e.name)} はシンボリックリンク`)
    if (e.usize > MAX_UNCOMPRESSED) return fail(`項目 ${JSON.stringify(e.name)} の非圧縮サイズ ${e.usize} が上限超え`)
  }
  const apks = entries.filter((e) => !e.name.endsWith('/') && e.name.toLowerCase().endsWith('.apk'))
  if (apks.length === 0) return fail('APK が 1 個も無い')
  if (apks.length > 1) return fail(`APK が ${apks.length} 個ある（1 個に絞れん）: ${apks.map((a) => a.name).join(', ')}`)
  const apk = apks[0]
  if (apk.method !== 0 && apk.method !== 8) return fail(`APK の圧縮方式 ${apk.method} は対応していない`)
  return { ok: true, entry: apk }
}

/** 項目の実体を取り出し、中央ディレクトリのサイズ・CRC32 と照合する。 */
export function readEntryData(zip, entry) {
  const p = entry.localOff
  if (p + 30 > zip.length || zip.readUInt32LE(p) !== LOCAL_SIG) return fail('ローカルヘッダが壊れている')
  const nameLen = zip.readUInt16LE(p + 26)
  const extraLen = zip.readUInt16LE(p + 28)
  const dataOff = p + 30 + nameLen + extraLen
  if (dataOff + entry.csize > zip.length) return fail('圧縮データがファイルの外にはみ出している')
  const raw = zip.subarray(dataOff, dataOff + entry.csize)
  let data
  try {
    // usize は既に上限内と検査済み。それでも圧縮実体が目次以上に膨らまんよう、出力自体も上限で切る
    data = entry.method === 0 ? Buffer.from(raw) : inflateRawSync(raw, { maxOutputLength: entry.usize || 1 })
  } catch (err) {
    return fail(`解凍に失敗: ${err.message}`)
  }
  if (data.length !== entry.usize) return fail(`非圧縮サイズが目次と違う（目次 ${entry.usize}、実体 ${data.length}）`)
  if (crc32(data) !== entry.crc) return fail('CRC32 が目次と違う（壊れているか書き換えられている）')
  return { ok: true, data }
}

export function extractApk(zipPath, outPath) {
  const zip = readFileSync(zipPath)
  const listed = listEntries(zip)
  if (!listed.ok) return listed
  const picked = pickApkEntry(listed.entries)
  if (!picked.ok) return picked
  const read = readEntryData(zip, picked.entry)
  if (!read.ok) return read
  // 'wx' で既存を上書きしない
  try {
    writeFileSync(outPath, read.data, { flag: 'wx' })
  } catch (err) {
    return fail(`展開先 ${outPath} へ書けない（上書きもしない）: ${err.message}`)
  }
  return { ok: true, name: picked.entry.name, bytes: read.data.length }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const [zipPath, outPath] = process.argv.slice(2)
  if (!zipPath || !outPath) {
    console.error('使い方: extract-single-apk.mjs <zip> <out.apk>')
    process.exit(2)
  }
  const result = extractApk(zipPath, outPath)
  if (!result.ok) {
    console.error(`artifact ZIP を拒否: ${result.error}`)
    process.exit(1)
  }
  console.log(`APK を取り出した: ${result.name} (${result.bytes} bytes)`)
}
