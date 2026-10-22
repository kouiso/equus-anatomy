import { writeFileSync } from 'node:fs'
import { DATA_ROOT, runAudit } from './load'

const args = process.argv.slice(2)
if (args.some((arg) => arg !== '--write-report')) throw new Error('使用法: pnpm audit:coverage [--write-report]')
const report = runAudit()
const summary = Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'rows'))
if (args.includes('--write-report')) {
  // 行ごとの追跡データは1掲載行=1行にし、次回レビューの差分を読みやすくする。
  const header = JSON.stringify(summary, null, 2).slice(0, -2)
  const rows = report.rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n')
  writeFileSync(`${DATA_ROOT}audit-report.json`, `${header},\n  "rows": [\n${rows}\n  ]\n}\n`)
}
console.log(JSON.stringify(summary, null, 2))
if (report.errors.length > 0) process.exitCode = 1
