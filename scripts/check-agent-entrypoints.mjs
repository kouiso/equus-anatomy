// 共通 Skill の正本（.agents/skills）と Claude Code 用の写し（.claude/skills）が同じ中身かを検査する。
// `--write` で正本から写しを作り直す。何度流しても同じ結果になる。
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'

const write = process.argv.includes('--write')
const SRC = '.agents/skills'
const DST = '.claude/skills'
const problems = []

function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => relative(dir, join(e.parentPath, e.name)))
    .sort()
}

for (const required of ['AGENTS.md', '.gemini/settings.json']) {
  if (!existsSync(required)) problems.push(`${required} がありません`)
}
// 上の階層に別の CLAUDE.md があると Claude Code は AGENTS.md を直接読まないので、import だけの CLAUDE.md を置く
if (!existsSync('CLAUDE.md') || !/^@AGENTS\.md\s*$/m.test(readFileSync('CLAUDE.md', 'utf8'))) {
  problems.push('CLAUDE.md が無いか、@AGENTS.md の import がありません')
}
if (existsSync('.gemini/settings.json')) {
  const names = JSON.parse(readFileSync('.gemini/settings.json', 'utf8'))?.context?.fileName ?? []
  if (!names.includes('AGENTS.md')) problems.push('.gemini/settings.json の context.fileName に AGENTS.md がありません')
}

const skills = existsSync(SRC) ? readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []
for (const name of skills) {
  const src = join(SRC, name, 'SKILL.md')
  if (!existsSync(src)) {
    problems.push(`${src} がありません`)
    continue
  }
  const body = readFileSync(src, 'utf8')
  // frontmatter (先頭の --- と次の --- の間) の name だけを見る。本文に同じ行があっても通さない
  const front = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(body)
  const declared = front ? /^name:\s*(.+?)\s*$/m.exec(front[1])?.[1] : undefined
  if (declared !== name) {
    problems.push(`${src} の frontmatter の name がディレクトリ名 ${name} と一致しません`)
  }
  // SKILL.md だけでなく、Skill のディレクトリ内の全ファイルを写す。写しにだけあるファイルもずれとして扱う
  const srcFiles = listFiles(join(SRC, name))
  const dstFiles = existsSync(join(DST, name)) ? listFiles(join(DST, name)) : []
  for (const rel of srcFiles) {
    const from = join(SRC, name, rel)
    const to = join(DST, name, rel)
    const same = existsSync(to) && readFileSync(from).equals(readFileSync(to))
    if (same) continue
    if (write) {
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      process.stdout.write(`写しを更新: ${to}\n`)
    } else {
      problems.push(`${to} が正本とずれています（node scripts/check-agent-entrypoints.mjs --write で直す）`)
    }
  }
  for (const rel of dstFiles.filter((f) => !srcFiles.includes(f))) {
    const to = join(DST, name, rel)
    if (write) {
      rmSync(to)
      process.stdout.write(`正本に無い写しを削除: ${to}\n`)
    } else {
      problems.push(`${to} は正本に無い写しです`)
    }
  }
}
if (existsSync(DST)) {
  for (const d of readdirSync(DST, { withFileTypes: true })) {
    if (d.isDirectory() && !skills.includes(d.name)) problems.push(`${join(DST, d.name)} は正本が無い写しです`)
  }
}

if (problems.length) {
  for (const p of problems) process.stderr.write(`NG: ${p}\n`)
  process.exit(1)
}
process.stdout.write(`OK: 共通 Skill ${skills.length} 件、入口にずれなし\n`)
