// 共通 Skill の正本（.agents/skills）と Claude Code 用の写し（.claude/skills）が同じ中身かを検査する。
// `--write` で正本から写しを作り直す。何度流しても同じ結果になる。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const write = process.argv.includes('--write')
const SRC = '.agents/skills'
const DST = '.claude/skills'
const problems = []

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
  if (!new RegExp(`^---\\n(?:[\\s\\S]*?\\n)?name: ${name}\\n`).test(body)) {
    problems.push(`${src} の name がディレクトリ名 ${name} と一致しません`)
  }
  const dst = join(DST, name, 'SKILL.md')
  const current = existsSync(dst) ? readFileSync(dst, 'utf8') : null
  if (current === body) continue
  if (write) {
    mkdirSync(join(DST, name), { recursive: true })
    writeFileSync(dst, body)
    process.stdout.write(`写しを更新: ${dst}\n`)
  } else {
    problems.push(`${dst} が正本とずれています（node scripts/check-agent-entrypoints.mjs --write で直す）`)
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
