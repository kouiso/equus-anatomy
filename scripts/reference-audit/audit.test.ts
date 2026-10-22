import { describe, expect, it } from 'vitest'
import { auditCoverage } from './audit'
import { currentSnapshot, loadCoverage, runAudit } from './load'
import type { Evidence, ReviewTracker } from './types'

const inputs = loadCoverage()
function fixture() {
  const { catalog, snapshot, tracker } = structuredClone(inputs)
  const current = currentSnapshot()
  return { catalog, snapshot, tracker, current, audit: () => auditCoverage(catalog, snapshot, tracker, current) }
}

// 形式検証用の架空根拠。実台帳には書き込まず、解剖学的な判断も行わない。
function reviewedName(tracker: ReviewTracker) {
  const entry = tracker.entries[0]!
  const evidence: Evidence[] = ['terminology', 'independent_anatomy', 'reference_app'].map((kind, index) => ({
    id: `fixture-${index}`, kind: kind as Evidence['kind'], source: 'test fixture', locator: 'test fixture section', catalogIds: [entry.catalogId],
  }))
  tracker.evidence.push(...evidence)
  entry.nameReview = { decision: 'synonym', equusIds: ['bone-skull'], reviewer: 'test reviewer', reviewedAt: '2026-10-22', evidenceIds: ['fixture-0', 'fixture-1'] }
  return entry
}

describe('参照部位の網羅性と根拠台帳', () => {
  it('受領原本・87項目・座標基準を検証し、候補と未検証を区別する', () => {
    const report = runAudit()
    expect(report.errors).toEqual([])
    expect(report.referenceRows).toBe(692)
    expect(report.distinctLabels).toBe(681)
    expect(report.equusEntries).toBe(87)
    expect(report.initialCrosswalk).toEqual({ name_correspondence_candidate: 39, broader_or_related_equus_entry_only: 41, no_correspondence_identified: 612 })
    expect(report.equusIdsWithInitialCandidate).toBe(56)
    expect(report.equusWithoutInitialCandidate).toHaveLength(31)
    expect(report.reviewedNameDecisions.unreviewed).toBe(692)
    expect(Object.values(report.spatialVerified)).toEqual([0, 0, 0, 0, 0])
    expect(report.mobileParityVerified).toBe(false)
  })

  it('重複名を個別IDの行として保持し、一括対応先も隠さない', () => {
    const report = fixture().audit()
    expect(report.repeatedLabels).toHaveLength(11)
    expect(report.repeatedLabels.every((group) => group.catalogIds.length === 2 && new Set(group.catalogIds).size === 2)).toBe(true)
    expect(report.multipleReferenceRowsPerEquusId.find((group) => group.equusId === 'bone-teeth')?.catalogIds).toHaveLength(4)
  })

  it('不足したレビュー行を検出する', () => {
    const f = fixture(); f.tracker.entries.pop()
    expect(f.audit().errors).toContainEqual(expect.stringContaining('レビュー行が欠落'))
  })

  it('存在しない参照ID・重複レビューを検出する', () => {
    const f = fixture(); f.tracker.entries.push(structuredClone(f.tracker.entries[0]!))
    expect(f.audit().errors).toContainEqual(expect.stringContaining('catalogIdが重複'))
    f.tracker.entries.at(-1)!.catalogId = 'bha.0000000000000000'
    expect(f.audit().errors).toContainEqual(expect.stringContaining('出典にないレビュー行'))
  })

  it('原台帳の順序・初期対応・集計の不整合を検出する', () => {
    const f = fixture(); f.catalog.structures[0]!.source_order = 2
    f.catalog.structures[0]!.equus_status = 'name_correspondence_candidate'
    expect(f.audit().errors).toContainEqual(expect.stringContaining('掲載順'))
    expect(f.audit().errors).toContainEqual(expect.stringContaining('候補区分に対応先IDがない'))
    expect(f.audit().errors).toContainEqual(expect.stringContaining('集計'))
  })

  it('87項目に追加・削除・名称変更があれば差分にする', () => {
    const f = fixture(); f.current[0]!.nameEn = 'changed label'
    const removed = f.current.pop()!
    f.current.push({ ...removed, id: 'new-structure' })
    const report = f.audit()
    expect(report.errors).toContainEqual(expect.stringContaining('基準スナップショット'))
    expect(report.baselineDrift.added).toEqual(['new-structure'])
    expect(report.baselineDrift.removed).toEqual([removed.id])
    expect(report.baselineDrift.changed).toEqual([f.current[0]!.id])
  })

  it('初期候補や別名仮説を名称レビュー済みに自動昇格しない', () => {
    const f = fixture(); const row = f.catalog.structures.find((entry) => entry.equus_id !== null)!
    expect(f.audit().rows.find((entry) => entry.catalogId === row.catalog_id)?.review?.nameReview).toMatchObject({ decision: 'unreviewed', equusIds: [] })
  })

  it('未レビューの判断に承認IDを混入できない', () => {
    const f = fixture(); f.tracker.entries[0]!.nameReview.equusIds = ['bone-skull']
    expect(f.audit().errors).toContainEqual(expect.stringContaining('未レビューと承認データが混在'))
  })

  it('名称確定には用語と独立解剖根拠の両方を要求する', () => {
    const f = fixture(); const entry = reviewedName(f.tracker)
    entry.nameReview.evidenceIds = ['fixture-0']
    expect(f.audit().errors).toContainEqual(expect.stringContaining('independent_anatomyの根拠が不足'))
  })

  it('他の参照行の根拠や不明なEquus IDを受け付けない', () => {
    const f = fixture(); const entry = reviewedName(f.tracker)
    f.tracker.evidence[0]!.catalogIds = [f.tracker.entries[1]!.catalogId]
    entry.nameReview.equusIds = ['nonexistent']
    expect(f.audit().errors).toContainEqual(expect.stringContaining('別の参照行'))
    expect(f.audit().errors).toContainEqual(expect.stringContaining('存在しない'))
  })

  it.each(['equus_contains_reference', 'equus_is_part_of_reference', 'related'] as const)('名称関係%sは同義と区別し、位置完了にできない', (decision) => {
    const f = fixture(); const entry = reviewedName(f.tracker)
    entry.nameReview.decision = decision
    expect(f.audit().errors).toEqual([])
    entry.spatialReview.position = { status: 'verified', targets: [{ equusId: 'bone-skull', view: 'left', depth: 'superficial' }], reviewer: 'test reviewer', reviewedAt: '2026-10-22', evidenceIds: ['fixture-1', 'fixture-2'] }
    expect(f.audit().errors).toContainEqual(expect.stringContaining('個別構造の名称対応が確定する前'))
  })

  it('対応なしのレビューにも根拠を要求し、未特定612行を欠落確定にしない', () => {
    const f = fixture(); const entry = reviewedName(f.tracker)
    entry.nameReview.decision = 'no_correspondence_after_review'; entry.nameReview.equusIds = []
    expect(f.audit().errors).toEqual([])
    expect(f.audit().reviewedNameDecisions.no_correspondence_after_review).toBe(1)
    entry.nameReview.evidenceIds = []
    expect(f.audit().errors.length).toBeGreaterThan(0)
  })

  it('名称を確定しても位置・左右・深さ・隣接・投影は未検証のまま', () => {
    const f = fixture(); reviewedName(f.tracker)
    expect(f.audit().errors).toEqual([])
    expect(Object.values(f.audit().spatialVerified)).toEqual([0, 0, 0, 0, 0])
  })

  it('位置確認には参照アプリの根拠と向き・深さの明示を要求する', () => {
    const f = fixture(); const entry = reviewedName(f.tracker)
    entry.spatialReview.position = { status: 'verified', targets: [], reviewer: 'test reviewer', reviewedAt: '2026-10-22', evidenceIds: ['fixture-1'] }
    expect(f.audit().errors).toContainEqual(expect.stringContaining('対象ID・向き・深さが不足'))
    expect(f.audit().errors).toContainEqual(expect.stringContaining('reference_appの根拠が不足'))
  })

  it('投影は対象の向き・層・深さ・画像ハッシュ付きの根拠を必要とする', () => {
    const f = fixture(); const entry = reviewedName(f.tracker)
    f.tracker.evidence.push({ id: 'fixture-2d', kind: 'equus_2d', source: 'test fixture', locator: 'test fixture image', catalogIds: [entry.catalogId], view: 'left', layer: 'skeleton', depth: 'superficial', imageSha256: 'a'.repeat(64) })
    entry.spatialReview.projection2d = { status: 'verified', targets: [{ equusId: 'bone-skull', view: 'left', depth: 'superficial' }], reviewer: 'test reviewer', reviewedAt: '2026-10-22', evidenceIds: ['fixture-1', 'fixture-2', 'fixture-2d'] }
    expect(f.audit().errors).toEqual([])
    f.tracker.evidence.at(-1)!.view = 'right'
    expect(f.audit().errors).toContainEqual(expect.stringContaining('対象の向き・層・深さ'))
    f.tracker.evidence.at(-1)!.imageSha256 = 'not-a-hash'
    expect(f.audit().errors).toContainEqual(expect.stringContaining('画像ハッシュが不足'))
  })
})
