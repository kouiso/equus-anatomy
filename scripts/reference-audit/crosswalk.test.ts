import { describe, expect, it } from 'vitest'
import { analyzeCrosswalk, inventoryDigest, labelKey, type RelationshipReviews } from './crosswalk'
import { loadCoverage } from './load'

const inputs = loadCoverage()
function fixture() {
  const { catalog, snapshot, tracker } = structuredClone(inputs)
  const relationships: RelationshipReviews = { schemaVersion: 1, identity: [], missingEntries: [] }
  return { rows: catalog.structures, snapshot, tracker, relationships, run: () => analyzeCrosswalk(catalog.structures, snapshot, tracker, relationships) }
}
// 審査形式のテスト用であり、実台帳へ書き込まない。
const citations = [
  { kind: 'reference_identity' as const, source: 'test fixture source', locator: 'fixture reference ID' },
  { kind: 'independent_anatomy' as const, source: 'test fixture source', locator: 'fixture section' },
]
const stamp = { reviewer: 'test reviewer', reviewedAt: '2026-10-24', citations }

describe('参照名の単位・関係・不足判断の追加監査', () => {
  it('表記681・区分付き688群を解剖学的な構造個体数へ変換しない', () => {
    const f = fixture(), before = JSON.stringify(f)
    const report = f.run()
    expect(report.errors).toEqual([])
    expect(report.countingUnits).toMatchObject({ sourceRows: 692, distinctNormalizedLabels: 681, distinctSystemAndLabelGroups: 688, verifiedUniqueAnatomicalStructures: null })
    expect(report.summary).toMatchObject({ sameSystemRepeats: 4, crossSystemRepeats: 7, newLexicalCandidateRows: 0, confirmedMissingIndividualEntries: 0 })
    expect(report.initialNameCandidatesWithoutLexicalHit).toHaveLength(8)
    expect(report.lexicalHitsStillRelated).toHaveLength(8)
    expect(report.systemsWithoutInitialCandidates.map((system) => system.rows).reduce((sum, count) => sum + count, 0)).toBe(335)
    expect(JSON.stringify(f)).toBe(before)
  })

  it('動脈と静脈で同じ表記でも別の参照行と区分を保持する', () => {
    const group = fixture().run().repeatedLabels.find((entry) => entry.labelKey === 'ventral intercostal branches')!
    expect(group.classification).toBe('artery_vein_label_collision')
    expect(group.rows.map((row) => row.system)).toEqual(['Circulatory System: Arteries', 'Circulatory System: Veins'])
    expect(new Set(group.rows.map((row) => row.catalogId)).size).toBe(2)
    expect(group.identity).toBe('unresolved')
  })

  it('同一区分内の反復を同一構造・別ビューと推定しない', () => {
    const groups = fixture().run().repeatedLabels.filter((entry) => entry.classification === 'same_system_repeat_unresolved')
    expect(groups).toHaveLength(4)
    expect(groups.every((entry) => entry.viewInformation === 'not_in_source_inventory' && entry.identity === 'unresolved')).toBe(true)
  })

  it('明示された左右3組は別行を保持し、残る685行を両側へ展開しない', () => {
    const report = fixture().run()
    expect(report.summary).toMatchObject({ explicitSideRows: 7, oppositeSideLabelGroups: 3, unspecifiedSideRows: 685 })
    expect(report.sideGroups.filter((group) => group.classification === 'opposite_side_labels_keep_separate').every((group) => group.rows.length === 2 && group.anatomicalInstanceCount === null)).toBe(true)
    expect(report.sideGroups.find((group) => group.baseLabel === 'Lymphatic Duct')?.classification).toBe('one_explicit_side_only')
  })

  it('原表記と矛盾する左右指定を検出する', () => {
    const f = fixture(); f.rows.find((row) => row.source_name === 'Right Atrium')!.laterality = 'left'
    expect(f.run().errors).toContainEqual(expect.stringContaining('元表記と左右欄が不一致'))
  })

  it('番号範囲を展開せず、骨と神経の同じ番号も統合しない', () => {
    const report = fixture().run()
    expect(report.summary).toMatchObject({ numberedLabelRows: 11, rangeLabelRows: 9 })
    expect(report.numberedLabels.find((row) => row.name === 'Lumbar Vertebrae (L1-L5)')?.qualifiers).toEqual(['L1-L5'])
    expect(report.numberedLabels.find((row) => row.name === 'Lumbar Nerves (1-6)')?.qualifiers).toEqual(['1-6'])
    expect(report.numberedLabels.every((row) => row.expandedInstanceCount === null)).toBe(true)
  })

  it('表記正規化は語幹・単複・医療用同義語を生成しない', () => {
    expect(labelKey('  TEST—Label (C1) ')).toBe('test label c1')
    expect(labelKey('Bones')).not.toBe(labelKey('Bone'))
    expect(labelKey('Eye')).not.toBe(labelKey('Oculus'))
  })

  it('同じ表記Eyeでも外貌と器官の関係を確定しない', () => {
    const row = fixture().run().rows.find((entry) => entry.sourceName === 'Eye')!
    expect(row.sourceSystem).toBe('Central Nervous System')
    expect(row.initialStatus).toBe('broader_or_related_equus_entry_only')
    expect(row.candidates[0]).toMatchObject({ equusId: 'skin-eye', anatomicalRelationship: 'unresolved' })
    expect(row.relationshipReview).toBe('unreviewed')
    expect(row.missingEntryReview).toBe('not_confirmed')
  })

  it('1語の部分一致や別区分のMuscle省略から候補を作らない', () => {
    const f = fixture()
    f.rows[0]!.source_name = 'Example detail'; f.rows[0]!.source_system = 'Other'
    f.snapshot[0]!.nameEn = 'Example'; f.snapshot[0]!.nameLa = 'Unrelated'
    expect(f.run().rows[0]!.candidates).toEqual([])
    f.rows[0]!.source_name = 'Example Muscle'
    expect(f.run().rows[0]!.candidates).toEqual([])
  })

  it('Muscle省略の検索仮説も名称承認・不足確定にはしない', () => {
    const report = fixture().run()
    const row = report.rows.find((entry) => entry.sourceName === 'Masseter Muscle')!
    expect(row.candidates[0]!.hits.some((hit) => hit.rule.includes('marker_omitted'))).toBe(true)
    expect(row.relationshipReview).toBe('unreviewed')
    expect(report.summary.confirmedMissingIndividualEntries).toBe(0)
  })

  it('根拠なし・未審査・古いEquus台帳での不足判断を検出する', () => {
    const f = fixture(), id = f.rows[0]!.catalog_id
    f.relationships.missingEntries.push({ ...stamp, catalogId: id, scope: 'individual_catalog_entry', equusInventorySha256: 'old', reason: '', citations: [] })
    const report = f.run()
    expect(report.errors).toContainEqual(expect.stringContaining('台帳が現行と不一致'))
    expect(report.errors).toContainEqual(expect.stringContaining('審査前に不足を確定できない'))
    expect(report.errors).toContainEqual(expect.stringContaining('reference_identity'))
    expect(report.summary.confirmedMissingIndividualEntries).toBeNull()
  })

  it('不足判断は個別カタログ項目の範囲に限定し、位置や総構造数を確定しない', () => {
    const f = fixture(), id = f.rows[0]!.catalog_id
    f.tracker.entries[0]!.nameReview = { decision: 'no_correspondence_after_review', equusIds: [], reviewer: 'test reviewer', reviewedAt: '2026-10-24', evidenceIds: ['fixture-only'] }
    f.tracker.evidence.push({ id: 'fixture-only', kind: 'terminology', source: 'test fixture source', locator: 'fixture section', catalogIds: [id] }, { id: 'fixture-anatomy', kind: 'independent_anatomy', source: 'test fixture source', locator: 'fixture section', catalogIds: [id] })
    f.tracker.entries[0]!.nameReview.evidenceIds.push('fixture-anatomy')
    f.relationships.missingEntries.push({ ...stamp, catalogId: id, scope: 'individual_catalog_entry', equusInventorySha256: inventoryDigest(f.snapshot), reason: 'fixture: reviewed names and containment' })
    expect(f.run().errors).toEqual([])
    expect(f.run().summary.confirmedMissingIndividualEntries).toBe(1)
    expect(f.run().countingUnits.verifiedUniqueAnatomicalStructures).toBeNull()
    expect(f.run().rows[0]!.spatialVerification).toBe('see_separate_spatial_review')
  })

  it('同一性判断に根拠と有効な複数IDを要求する', () => {
    const f = fixture()
    f.relationships.identity.push({ ...stamp, citations: [], catalogIds: ['unknown', 'unknown'], decision: 'duplicate_view' })
    expect(f.run().errors).toContainEqual(expect.stringContaining('参照IDが不足・不明・重複'))
    expect(f.run().errors).toContainEqual(expect.stringContaining('reference_identity'))
  })

  it('同一性の直接矛盾・推移的矛盾を検出する', () => {
    const f = fixture(), [a, b, c] = f.rows.slice(0, 3).map((row) => row.catalog_id)
    f.relationships.identity.push({ ...stamp, catalogIds: [a!, b!], decision: 'same_structure' }, { ...stamp, catalogIds: [b!, c!], decision: 'duplicate_view' }, { ...stamp, catalogIds: [a!, c!], decision: 'different_structures' })
    expect(f.run().errors).toContainEqual(expect.stringContaining('介して矛盾'))
    f.relationships.identity.push({ ...stamp, catalogIds: [a!, b!], decision: 'different_structures' })
    expect(f.run().errors).toContainEqual(expect.stringContaining('同一性判断が矛盾'))
  })

  it('明示された左右をduplicate_viewとして統合できない', () => {
    const f = fixture(), ids = f.rows.filter((row) => ['Left Atrium', 'Right Atrium'].includes(row.source_name)).map((row) => row.catalog_id)
    f.relationships.identity.push({ ...stamp, catalogIds: ids, decision: 'duplicate_view' })
    expect(f.run().errors).toContainEqual(expect.stringContaining('左右を同一個体として統合できない'))
  })
})
