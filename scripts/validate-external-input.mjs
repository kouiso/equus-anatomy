#!/usr/bin/env node
/**
 * 手動の外部取得・配布入口（cf-worker-deploy.yml / fad-external.yml）の入力検証（#250）。
 *
 * shell の本文に `${{ inputs.* }}` を埋めず、env 経由の値をここで機械に検査してから使う。
 * repo/ref/dir/ID/URL は許可した形だけ通し、notes は UTF-8 のバイト上限（環境変数へ渡せる大きさ）を守る。
 * 失敗は exit 1 + stderr に理由。何も通さない時は静かに終わる。
 *
 * 使い方:
 *   node scripts/validate-external-input.mjs repo|ref|dir|artifact-id|firebase-app-id|text <value>
 *   node scripts/validate-external-input.mjs --check-repo-public <owner/repo>
 */

/** 入力はどれも環境変数へ入るので、UTF-8 の実バイト数に上限を設ける（大きい notes で E2BIG になった実績）。 */
export const MAX_INPUT_BYTES = 65536

const RE_REPO = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/
const RE_ARTIFACT_ID = /^\d{1,20}$/
// Firebase の Android app id は 1:<project番号>:android:<16進の採番>
const RE_FIREBASE_APP_ID = /^\d+:\d+:android:[0-9a-fA-F]{8,64}$/
// 制御文字は改行とタブだけ許す（terminal escape・CR・NUL・DEL は落とす）
// eslint-disable-next-line no-control-regex -- 制御文字を検査するのがこのファイルの仕事
const RE_BAD_CONTROL = /[\x00-\x08\x0B-\x1F\x7F]/
// git ref に使えない文字（git check-ref-format --branch と同じ系統）と制御文字
// eslint-disable-next-line no-control-regex -- 制御文字を検査するのがこのファイルの仕事
const RE_BAD_REF_CHAR = /[\x00-\x1F\x7F ~^:?*[\]\\]/
// 制御文字を全部落とす版（パスや ID など改行も許されない値用）
// eslint-disable-next-line no-control-regex -- 制御文字を検査するのがこのファイルの仕事
const RE_ANY_CONTROL = /[\x00-\x1F\x7F]/

function fail(what, detail) {
  return { ok: false, error: `${what} が不正: ${detail}` }
}

function assertBytes(name, value) {
  if (typeof value !== 'string' || value.length === 0) return fail(name, '空')
  if (Buffer.byteLength(value, 'utf8') > MAX_INPUT_BYTES) return fail(name, `${MAX_INPUT_BYTES} bytes 超え`)
  return null
}

export function validateRepo(value) {
  const bad = assertBytes('repo', value)
  if (bad) return bad
  if (!RE_REPO.test(value)) return fail('repo', 'owner/repo の形（英数と -_. だけ）ではない')
  return { ok: true }
}

export function validateRef(value) {
  const bad = assertBytes('ref', value)
  if (bad) return bad
  if (RE_BAD_REF_CHAR.test(value)) return fail('ref', 'ref に使えない文字がある')
  if (value.startsWith('-')) return fail('ref', '先頭が -（git の引数に化ける）')
  if (value.startsWith('/') || value.endsWith('/')) return fail('ref', '先頭か末尾が /')
  if (value.includes('..') || value.includes('//') || value.includes('@{')) return fail('ref', '..・//・@{ を含む')
  if (value.endsWith('.') || value.endsWith('.lock')) return fail('ref', '末尾が . か .lock')
  return { ok: true }
}

export function validateDir(value) {
  const bad = assertBytes('dir', value)
  if (bad) return bad
  if (RE_ANY_CONTROL.test(value) || value.includes('\\')) return fail('dir', '制御文字か \\ を含む')
  if (value.startsWith('/') || /^[A-Za-z]:/.test(value)) return fail('dir', '絶対パス')
  const parts = value.split('/')
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return fail('dir', '空・.・.. の要素がある（clone の外へ出られる）')
  return { ok: true }
}

export function validateArtifactId(value) {
  const bad = assertBytes('artifact_id', value)
  if (bad) return bad
  if (!RE_ARTIFACT_ID.test(value)) return fail('artifact_id', '数字だけではない')
  return { ok: true }
}

export function validateFirebaseAppId(value) {
  const bad = assertBytes('firebase_app_id', value)
  if (bad) return bad
  if (!RE_FIREBASE_APP_ID.test(value)) return fail('firebase_app_id', '1:<project>:android:<採番> の形ではない')
  return { ok: true }
}

export function validateText(value) {
  const bad = assertBytes('text', value)
  if (bad) return bad
  if (RE_BAD_CONTROL.test(value)) return fail('text', '改行とタブ以外の制御文字を含む')
  return { ok: true }
}

const VALIDATORS = {
  repo: validateRepo,
  ref: validateRef,
  dir: validateDir,
  'artifact-id': validateArtifactId,
  'firebase-app-id': validateFirebaseAppId,
  text: validateText,
}

/**
 * repo が Public かどうかを、資格情報を一切使わず匿名で確かめる。
 * 応答が「公開だと確実」と読めない時は全部失敗（Private・認証要・曖昧を区別しない）。
 * fetchImpl は試験で差し替える。
 */
export async function checkRepoPublic(repo, fetchImpl = globalThis.fetch) {
  const valid = validateRepo(repo)
  if (!valid.ok) return valid
  let res
  try {
    res = await fetchImpl(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'equus-anatomy-input-check' },
    })
  } catch (err) {
    return fail('repo', `匿名の metadata 取得に失敗（ネットワーク）: ${err.message}`)
  }
  if (res.status !== 200) return fail('repo', `匿名の metadata が ${res.status}（公開と確かめられん）`)
  let json
  try {
    json = await res.json()
  } catch {
    return fail('repo', 'metadata の中身が読めん')
  }
  if (json.private !== false || json.visibility !== 'public') {
    return fail('repo', `visibility=${json.visibility ?? '?'} private=${json.private ?? '?'}（Public と確かめられん）`)
  }
  return { ok: true }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const [kind, value] = process.argv.slice(2)
  if (kind === '--check-repo-public') {
    const result = await checkRepoPublic(value ?? '')
    if (!result.ok) {
      console.error(result.error)
      process.exit(1)
    }
    process.exit(0)
  }
  const validator = VALIDATORS[kind]
  if (validator === undefined) {
    console.error(`使い方: validate-external-input.mjs repo|ref|dir|artifact-id|firebase-app-id|text <value>、または --check-repo-public <owner/repo>`)
    process.exit(2)
  }
  const result = validator(value ?? '')
  if (!result.ok) {
    console.error(result.error)
    process.exit(1)
  }
}
