import type { Depth, Layer, View } from '../../src/core/types'

export const SPATIAL_ASPECTS = ['position', 'laterality', 'depth', 'adjacency', 'projection2d'] as const
export type SpatialAspect = typeof SPATIAL_ASPECTS[number]
export const SOURCE_STATUSES = ['name_correspondence_candidate', 'broader_or_related_equus_entry_only', 'no_correspondence_identified'] as const
export type SourceStatus = typeof SOURCE_STATUSES[number]
export const NAME_DECISIONS = ['unreviewed', 'synonym', 'equus_contains_reference', 'equus_is_part_of_reference', 'related', 'no_correspondence_after_review'] as const
export type NameDecision = typeof NAME_DECISIONS[number]
export type Region = { view: string; source: string; plate_exists: boolean }
export type EquusSnapshot = { id: string; layer: string; nameEn: string; nameJa: string; nameLa: string; regions: Region[]; right_view: string }
export type SourceRow = {
  catalog_id: string
  source_order: number
  source_system: string
  source_name: string
  source_url: string
  source_scope: string
  laterality: string
  sex: string
  synonyms: string[]
  equus_status: SourceStatus
  equus_id: string | null
  equus_name_ja: string | null
  equus_name_la: string | null
  equus_regions: Region[]
  independent_anatomical_review: string
  duplicate_label: boolean
  spatial_review: Record<string, string>
}
export type SourceSummary = {
  reference_rows: number
  distinct_label_strings_not_structure_count: number
  equus_entries: number
  equus_by_layer: Record<string, number>
  crosswalk_status: Record<SourceStatus, number>
  by_system: Record<string, Partial<Record<SourceStatus, number>>>
  equus_with_any_polygon: number
  equus_with_polygon_and_existing_plate: number
  reference_mobile_complete: boolean
}
export type SourceCatalog = {
  metadata: { retrieved: string; equus_commit: string; catalog_scope: string; catalog_ids: string; source_html_sha256: string }
  summary: SourceSummary
  structures: SourceRow[]
}

/** 出典の所在とレビュー記録。記入だけで医学的な正確性を自動認定するものではない。 */
export type Evidence = {
  id: string
  kind: 'terminology' | 'reference_app' | 'independent_anatomy' | 'equus_2d'
  source: string
  locator: string
  catalogIds: string[]
  view?: View
  layer?: Layer
  depth?: Depth
  imageSha256?: string
}
export type ReviewStamp = { reviewer: string; reviewedAt: string; evidenceIds: string[] }
export type NameReview = ReviewStamp & { decision: NameDecision; equusIds: string[] }
export type SpatialTarget = { equusId: string; view: View; depth: Depth }
export type SpatialReview = ReviewStamp & { status: 'unverified' | 'verified'; targets: SpatialTarget[] }
export type ReviewEntry = { catalogId: string; nameReview: NameReview; spatialReview: Record<SpatialAspect, SpatialReview> }
export type ReviewTracker = { schemaVersion: number; referenceScope: string; evidence: Evidence[]; entries: ReviewEntry[] }
