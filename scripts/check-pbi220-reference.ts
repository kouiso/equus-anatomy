import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GEOMETRY, STRUCTURES } from '../src/core/data'
import { plateIdOf } from '../src/core/types'
import review from '../doc/review/2026-10-25-pbi-220-names/review.json'

async function main() {
  // 固定c479d462の監査実装と原台帳を読み、研究ブランチには書き込まない。
  // 例: pnpm exec tsx scripts/check-pbi220-reference.ts /path/to/detached-c479d462
  const reference = resolve(process.argv[2] ?? '')
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: reference, encoding: 'utf8' }).trim(), 'c479d4620ae1c97be1c380a9c7fe36e2259e941b')
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: reference, encoding: 'utf8' }).trim(), '')
  const moduleAt = (file: string) => import(pathToFileURL(resolve(reference, `scripts/reference-audit/${file}.ts`)).href)
  const { loadCoverage, runAudit, geometryFingerprint } = await moduleAt('load')
  const { auditCoverage } = await moduleAt('audit')
  const { analyzeCrosswalk } = await moduleAt('crosswalk')
  const inputs = loadCoverage()
  assert.deepEqual(runAudit().errors, [])
  const current = STRUCTURES.map((structure) => ({
    id: structure.id, layer: structure.layer, nameEn: structure.nameEn, nameJa: structure.nameJa, nameLa: structure.nameLa,
    regions: (['left', 'front', 'rear'] as const).flatMap((view) => {
      const part = GEOMETRY[view].parts.find((candidate) => candidate.id === structure.id)
      return part ? [{ view, source: part.source, plate_exists: GEOMETRY[view].images[plateIdOf(part.layer, part.depth ?? 'superficial')] !== undefined }] : []
    }),
    right_view: GEOMETRY.left.parts.some((part) => part.id === structure.id) ? 'left_mirror_not_independent_anatomical_evidence' : 'not_mapped',
  }))
  const geometry = Object.fromEntries((['left', 'right', 'front', 'rear'] as const).map((view) => {
    const { size, images, parts } = GEOMETRY[view]
    return [view, createHash('sha256').update(JSON.stringify({ size, images, parts })).digest('hex')]
  }))
  assert.deepEqual(geometry, geometryFingerprint())
  const coverage = auditCoverage(inputs.catalog, inputs.snapshot, inputs.tracker, current)
  const expectedChanged = review.rows.filter((row) => row.allowedChangedStructureFields.some((field) => field === 'nameJa' || field === 'nameEn')).map((row) => row.id).sort()
  assert.deepEqual(coverage.baselineDrift.added, [])
  assert.deepEqual(coverage.baselineDrift.removed, [])
  assert.deepEqual([...coverage.baselineDrift.changed].sort(), expectedChanged)
  assert.deepEqual(coverage.errors, ['現行項目の名称・層・配置情報が基準スナップショットと異なる。差分の根拠を確認すること'])
  const relationships = JSON.parse(readFileSync(resolve(reference, 'doc/reference-audit/2026-10-24/relationship-reviews.json'), 'utf8'))
  const crosswalk = analyzeCrosswalk(inputs.catalog.structures, current, inputs.tracker, relationships)
  assert.deepEqual(crosswalk.errors, [])
  assert.equal(crosswalk.summary.newLexicalCandidateRows, 0)
  assert.equal(crosswalk.countingUnits.verifiedUniqueAnatomicalStructures, null)
  console.log(JSON.stringify({ referenceCommit: 'c479d4620ae1c97be1c380a9c7fe36e2259e941b', currentStructuresBlob: execFileSync('git', ['hash-object', 'src/core/data/structures.ts'], { encoding: 'utf8' }).trim(), baselineAuditErrors: [], currentCoverageExpectedNameDrift: coverage.baselineDrift, currentCoverageErrorsRetained: coverage.errors, currentCoverageMeaning: '旧87項目スナップショットは変更せず、PBI220の5件の名称差分だけを検出した。無条件all-passではない', currentCrosswalkErrors: crosswalk.errors, currentCrosswalkSummary: crosswalk.summary, geometryUnchanged: true, nameReviewApprovalForVendorIdentity: false, spatialReviewApproval: false }, null, 2))
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
