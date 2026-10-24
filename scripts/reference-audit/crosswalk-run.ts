import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { analyzeCrosswalk, type RelationshipReviews } from './crosswalk'
import { currentSnapshot, loadCoverage, runAudit } from './load'

const outputRoot = fileURLToPath(new URL('../../doc/reference-audit/2026-10-24/', import.meta.url))
const args = process.argv.slice(2)
if (args.some((arg) => arg !== '--write-report')) throw new Error('使用法: pnpm audit:crosswalk [--write-report]')
const baseline = runAudit()
if (baseline.errors.length) throw new Error(`原台帳の監査に失敗: ${baseline.errors.join('\n')}`)
const { catalog, tracker } = loadCoverage()
const reviews = JSON.parse(readFileSync(`${outputRoot}relationship-reviews.json`, 'utf8')) as RelationshipReviews
const report = analyzeCrosswalk(catalog.structures, currentSnapshot(), tracker, reviews)
const summary = Object.fromEntries(Object.entries(report).filter(([key]) => key !== 'rows'))
if (args.includes('--write-report')) {
  const header = JSON.stringify(summary, null, 2).slice(0, -2)
  const rows = report.rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n')
  writeFileSync(`${outputRoot}crosswalk-report.json`, `${header},\n  "rows": [\n${rows}\n  ]\n}\n`)
}
console.log(JSON.stringify({ errors: report.errors, countingUnits: report.countingUnits, summary: report.summary, systemsWithoutInitialCandidates: report.systemsWithoutInitialCandidates }, null, 2))
if (report.errors.length) process.exitCode = 1
