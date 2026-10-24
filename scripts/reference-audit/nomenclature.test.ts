import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import appendix from '../../doc/reference-audit/2026-10-24/nomenclature-evidence.json'
import { analyzeCrosswalk, inventoryDigest, type RelationshipReviews } from './crosswalk'
import { loadCoverage, runAudit } from './load'

const input = loadCoverage()
const relationships = JSON.parse(readFileSync(new URL('../../doc/reference-audit/2026-10-24/relationship-reviews.json', import.meta.url), 'utf8')) as RelationshipReviews
const queue = analyzeCrosswalk(input.catalog.structures, input.snapshot, input.tracker, relationships).initialNameCandidatesWithoutLexicalHit
const sourceById = new Map(appendix.sources.map((source) => [source.id, source]))

describe('8候補の名称根拠付録', () => {
  it('現行監査の未一致8候補と対応先・原表記・ラテン名が一致し、抜けや別候補の混入がない', () => {
    expect(appendix.equusInventorySha256).toBe(inventoryDigest(input.snapshot))
    expect(appendix.candidates.map((row) => [row.catalogId, row.sourceName, row.equusId, row.equusNameEn, row.equusNameLa])).toEqual(
      queue.map((row) => [row.catalogId, row.name, row.initialEquusId, row.equusEntry!.nameEn, row.equusEntry!.nameLa]),
    )
    expect(appendix.candidates).toHaveLength(8)
    expect(new Set(appendix.candidates.map((row) => row.catalogId)).size).toBe(8)
    expect(runAudit().errors).toEqual([])
  })

  it('各根拠に読取済みの出典・具体的な節またはPDFページ・動物種と短い要約がある', () => {
    expect(sourceById.size).toBe(appendix.sources.length)
    for (const row of appendix.candidates) {
      expect(row.evidence.length).toBeGreaterThanOrEqual(2)
      for (const evidence of row.evidence) {
        const source = sourceById.get(evidence.sourceId)!
        expect(source).toBeDefined()
        expect(source.access).toMatch(/^web_(pdf_)?text_read$/)
        expect(source.accessedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(source.speciesScope.length).toBeGreaterThan(0)
        expect(evidence.speciesContext.length).toBeGreaterThan(0)
        expect(evidence.paraphraseJa.length).toBeGreaterThan(0)
        expect(evidence.locator.length).toBeGreaterThan(0)
        if (evidence.sourceId === 'nav6') {
          expect(evidence.pdfPageOneBased).toBeGreaterThan(0)
          expect(evidence.pdfPageOneBased).toBeLessThanOrEqual(178)
        } else expect(evidence.locator).toMatch(/step|Pony Specimen/)
      }
      expect(row.nextReferenceEvidenceJa.length).toBeGreaterThan(0)
    }
  })

  it('比較用語集の版と取得経路を明記し、公式ミラー同一性や教材の版を捏造しない', () => {
    const nav = sourceById.get('nav6')!
    expect(nav.edition).toContain('第6版・2017年')
    expect(nav.officialEditionSourceId).toBe('wava')
    expect(nav.officialMirrorByteIdentity).toBe('unverified')
    for (const source of appendix.sources.filter((source) => source.id.startsWith('umn-'))) expect(source.edition).toBeNull()
    expect(sourceById.get('liverpool-lead')!.access).toBe('unavailable_http_406')
    expect(appendix.candidates.every((row) => row.evidence.every((evidence) => evidence.sourceId !== 'liverpool-lead'))).toBe(true)
  })

  it('骨群の候補を関節・領域全体へ広げず、単数の近位種子骨を集合と同一視しない', () => {
    const bones = appendix.candidates.filter((row) => row.targetScope === 'bone_collection')
    expect(bones.map((row) => row.equusId)).toEqual(['bone-carpus', 'bone-sesamoid', 'bone-tarsus', 'bone-metatarsus'])
    expect(bones.filter((row) => row.assessment === 'bone_collection_via_existing_latin')).toHaveLength(3)
    expect(bones.find((row) => row.equusId === 'bone-sesamoid')!.assessment).toBe('singular_plural_scope_unresolved')
  })

  it('筋のラテン名が教材にあってもベンダー英名の変種は未解決のまま保持する', () => {
    const muscles = appendix.candidates.filter((row) => row.targetScope === 'muscle')
    expect(muscles).toHaveLength(2)
    expect(muscles.every((row) => row.assessment === 'latin_target_supported_vendor_variant_unresolved')).toBe(true)
  })

  it('名称資料を実体同一性・位置5項目・正式名称審査の承認へ流用しない', () => {
    for (const row of appendix.candidates) {
      expect(row.verification).toEqual({ vendorObjectIdentity: 'unverified', position: 'unverified', laterality: 'unverified', depth: 'unverified', adjacency: 'unverified', projection2d: 'unverified' })
      expect(row.nameReviewDecision).toBe('unreviewed')
      expect(input.tracker.entries.find((entry) => entry.catalogId === row.catalogId)!.nameReview.decision).toBe('unreviewed')
    }
    expect(relationships.identity).toEqual([])
    expect(relationships.missingEntries).toEqual([])
  })
})
