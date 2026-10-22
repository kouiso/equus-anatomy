import { isDeepStrictEqual } from 'node:util'
import type { Evidence, EquusSnapshot, ReviewTracker, SourceCatalog, SourceRow, SourceStatus, SourceSummary } from './types'
import { NAME_DECISIONS, SOURCE_STATUSES, SPATIAL_ASPECTS } from './types'

export const REFERENCE_SCOPE = 'desktop_2.0.4_public_list_mobile_parity_unverified'

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const value = key(row)
    groups.set(value, [...(groups.get(value) ?? []), row])
  }
  return groups
}

export function sourceSummary(rows: readonly SourceRow[], snapshot: readonly EquusSnapshot[]): SourceSummary {
  const crosswalk = Object.fromEntries(SOURCE_STATUSES.map((status) => [status, 0])) as Record<SourceStatus, number>
  const bySystem: SourceSummary['by_system'] = {}
  const layers: Record<string, number> = {}
  for (const row of rows) {
    crosswalk[row.equus_status]++
    const system = bySystem[row.source_system] ?? {}
    system[row.equus_status] = (system[row.equus_status] ?? 0) + 1
    bySystem[row.source_system] = system
  }
  for (const entry of snapshot) layers[entry.layer] = (layers[entry.layer] ?? 0) + 1
  return {
    reference_rows: rows.length,
    distinct_label_strings_not_structure_count: new Set(rows.map((row) => row.source_name)).size,
    equus_entries: snapshot.length,
    equus_by_layer: layers,
    crosswalk_status: crosswalk,
    by_system: bySystem,
    equus_with_any_polygon: snapshot.filter((entry) => entry.regions.length > 0).length,
    equus_with_polygon_and_existing_plate: snapshot.filter((entry) => entry.regions.some((region) => region.plate_exists)).length,
    reference_mobile_complete: false,
  }
}

/** 原表記と初期候補を保持し、人による名称判断と位置判断を別々に検査する。 */
export function auditCoverage(catalog: SourceCatalog, snapshot: readonly EquusSnapshot[], tracker: ReviewTracker, current: readonly EquusSnapshot[]) {
  const errors: string[] = []
  const check = (condition: boolean, message: string) => { if (!condition) errors.push(message) }
  const ids = catalog.structures.map((row) => row.catalog_id)
  const sourceIds = new Set(ids)
  const live = new Map(current.map((entry) => [entry.id, entry]))
  const baseline = new Map(snapshot.map((entry) => [entry.id, entry]))
  const reviews = new Map(tracker.entries.map((entry) => [entry.catalogId, entry]))
  const evidence = new Map(tracker.evidence.map((entry) => [entry.id, entry]))
  const labels = groupBy(catalog.structures, (row) => row.source_name)

  check(sourceIds.size === ids.length, '参照catalog_idが重複している')
  check(baseline.size === snapshot.length, '収録スナップショットのIDが重複している')
  check(live.size === current.length, '現行EquusのIDが重複している')
  check(tracker.schemaVersion === 1 && tracker.referenceScope === REFERENCE_SCOPE, 'レビュー台帳の版または参照範囲が不正')
  check(reviews.size === tracker.entries.length, 'レビュー台帳のcatalogIdが重複している')
  check(evidence.size === tracker.evidence.length, '根拠IDが重複している')
  for (const id of sourceIds) check(reviews.has(id), `${id}: レビュー行が欠落している`)
  for (const id of reviews.keys()) check(sourceIds.has(id), `${id}: 出典にないレビュー行がある`)

  const drift = {
    added: current.filter((entry) => !baseline.has(entry.id)).map((entry) => entry.id),
    removed: snapshot.filter((entry) => !live.has(entry.id)).map((entry) => entry.id),
    changed: snapshot.filter((entry) => live.has(entry.id) && !isDeepStrictEqual(entry, live.get(entry.id))).map((entry) => entry.id),
  }
  check(Object.values(drift).every((entries) => entries.length === 0), '現行項目の名称・層・配置情報が基準スナップショットと異なる。差分の根拠を確認すること')

  for (const [index, row] of catalog.structures.entries()) {
    check(/^bha\.[a-f0-9]{16}$/.test(row.catalog_id), `${row.catalog_id}: 安定IDの形式が不正`)
    check(row.source_order === index + 1, `${row.catalog_id}: 出典の掲載順が欠落・変更している`)
    check(Boolean(row.source_name.trim() && row.source_system.trim() && row.source_url.trim()), `${row.catalog_id}: 出典の名称・区分・URLが空`)
    check(row.source_scope === REFERENCE_SCOPE, `${row.catalog_id}: desktop一覧とmobile実体の範囲が混同されている`)
    check(SOURCE_STATUSES.includes(row.equus_status), `${row.catalog_id}: 初期照合区分が不正`)
    check(row.independent_anatomical_review === 'pending', `${row.catalog_id}: 原台帳の未確認状態を変更している`)
    check(row.duplicate_label === ((labels.get(row.source_name)?.length ?? 0) > 1), `${row.catalog_id}: 重複表記のフラグが一致しない`)
    if (row.equus_id === null) {
      check(row.equus_status === 'no_correspondence_identified', `${row.catalog_id}: 候補区分に対応先IDがない`)
      check(row.synonyms.length === 0 && row.equus_name_ja === null && row.equus_name_la === null && row.equus_regions.length === 0, `${row.catalog_id}: 対応未特定の行に対応データが混入している`)
    } else {
      const entry = baseline.get(row.equus_id)
      check(entry !== undefined && row.equus_status !== 'no_correspondence_identified', `${row.catalog_id}: 候補IDが存在しない、または区分と矛盾`)
      if (entry) check(row.equus_name_ja === entry.nameJa && row.equus_name_la === entry.nameLa && isDeepStrictEqual(row.equus_regions, entry.regions), `${row.catalog_id}: 初期候補の名称・配置情報が87項目の基準と不一致`)
    }
  }

  const summary = sourceSummary(catalog.structures, snapshot)
  check(isDeepStrictEqual(summary, catalog.summary), '原台帳の集計が掲載行・87項目の実データと一致しない')
  for (const item of tracker.evidence) {
    check(['terminology', 'reference_app', 'independent_anatomy', 'equus_2d'].includes(item.kind), `${item.id}: 根拠の種類が不正`)
    check(Boolean(item.id.trim() && item.source.trim() && item.locator.trim()), `${item.id}: 根拠の出典・該当箇所が不足`)
    check(item.catalogIds.length > 0 && item.catalogIds.every((id) => sourceIds.has(id)), `${item.id}: 根拠が参照行に紐づいていない`)
    if (item.kind === 'equus_2d') {
      check(['left', 'right', 'front', 'rear'].includes(item.view ?? '') && ['skin', 'muscle', 'skeleton', 'organs'].includes(item.layer ?? '') && ['superficial', 'deep'].includes(item.depth ?? '') && /^[a-f0-9]{64}$/.test(item.imageSha256 ?? ''), `${item.id}: 2D図の向き・層・深さ・画像ハッシュが不足`)
    }
  }
  function reviewEvidence(catalogId: string, stamp: { reviewer: string; reviewedAt: string; evidenceIds: string[] }, needed: Evidence['kind'][], label: string) {
    check(Boolean(stamp.reviewer.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(stamp.reviewedAt), `${catalogId}: ${label}の確認者・確認日が不足`)
    const items = stamp.evidenceIds.map((id) => evidence.get(id))
    check(items.length > 0 && items.every((item) => item !== undefined && item.catalogIds.includes(catalogId)), `${catalogId}: ${label}の根拠IDが不明または別の参照行`)
    for (const kind of needed) check(items.some((item) => item?.kind === kind), `${catalogId}: ${label}に${kind}の根拠が不足`)
  }
  for (const entry of tracker.entries) {
    const name = entry.nameReview
    check(NAME_DECISIONS.includes(name.decision), `${entry.catalogId}: 名称関係の判断が不正`)
    check(new Set(name.equusIds).size === name.equusIds.length && name.equusIds.every((id) => live.has(id)), `${entry.catalogId}: 名称判断のEquus IDが重複または存在しない`)
    if (name.decision === 'unreviewed') {
      check(name.equusIds.length === 0 && name.evidenceIds.length === 0 && name.reviewer === '' && name.reviewedAt === '', `${entry.catalogId}: 未レビューと承認データが混在`)
    } else {
      check(name.decision === 'no_correspondence_after_review' ? name.equusIds.length === 0 : name.equusIds.length > 0, `${entry.catalogId}: 名称関係の判断と対応先の数が矛盾`)
      reviewEvidence(entry.catalogId, name, ['terminology', 'independent_anatomy'], '名称・包含関係')
    }
    for (const aspect of SPATIAL_ASPECTS) {
      const spatial = entry.spatialReview[aspect]
      if (!spatial) { errors.push(`${entry.catalogId}: ${aspect}の検証欄が欠落`); continue }
      check(['unverified', 'verified'].includes(spatial.status), `${entry.catalogId}: ${aspect}の確認状態が不正`)
      if (spatial.status === 'verified') {
        check(spatial.targets.length > 0 && spatial.targets.every((target) => name.equusIds.includes(target.equusId) && ['left', 'right', 'front', 'rear'].includes(target.view) && ['superficial', 'deep'].includes(target.depth)), `${entry.catalogId}: ${aspect}の対象ID・向き・深さが不足または名称対応と不一致`)
        if (aspect === 'projection2d') for (const target of spatial.targets) {
          check(spatial.evidenceIds.some((id) => {
            const item = evidence.get(id)
            return item?.kind === 'equus_2d' && item.view === target.view && item.layer === live.get(target.equusId)?.layer && item.depth === target.depth
          }), `${entry.catalogId}: 2D投影の対象の向き・層・深さに対応する根拠がない`)
        }
        reviewEvidence(entry.catalogId, spatial, aspect === 'projection2d' ? ['reference_app', 'independent_anatomy', 'equus_2d'] : ['reference_app', 'independent_anatomy'], aspect)
        check(name.decision === 'synonym', `${entry.catalogId}: 個別構造の名称対応が確定する前に${aspect}を確認済みにできない`)
      } else check(spatial.targets.length === 0 && spatial.evidenceIds.length === 0 && spatial.reviewer === '' && spatial.reviewedAt === '', `${entry.catalogId}: ${aspect}の未確認と承認データが混在`)
    }
  }

  const initialTargets = groupBy(catalog.structures.filter((row) => row.equus_id !== null), (row) => row.equus_id!)
  const nextEvidence = ['正式名・同義語・包含関係の用語出典と独立した獣医解剖資料', '左右・深さ・隣接関係を確認できる参照アプリの版と該当構造の表示', '対象の向き・層・画像ハッシュに対応するEquusの2D投影レビュー']
  return {
    errors,
    scope: REFERENCE_SCOPE,
    mobileParityVerified: false,
    referenceRows: catalog.structures.length,
    distinctLabels: labels.size,
    initialCrosswalk: summary.crosswalk_status,
    equusEntries: current.length,
    baselineDrift: drift,
    equusIdsWithInitialCandidate: initialTargets.size,
    equusWithoutInitialCandidate: current.filter((entry) => !initialTargets.has(entry.id)).map(({ id, nameJa, nameEn }) => ({ id, nameJa, nameEn })),
    repeatedLabels: [...labels].filter(([, rows]) => rows.length > 1).map(([label, rows]) => ({ label, catalogIds: rows.map((row) => row.catalog_id) })),
    multipleReferenceRowsPerEquusId: [...initialTargets].filter(([, rows]) => rows.length > 1).map(([equusId, rows]) => ({ equusId, catalogIds: rows.map((row) => row.catalog_id) })),
    reviewedNameDecisions: Object.fromEntries(NAME_DECISIONS.map((decision) => [decision, tracker.entries.filter((entry) => entry.nameReview.decision === decision).length])),
    spatialVerified: Object.fromEntries(SPATIAL_ASPECTS.map((aspect) => [aspect, tracker.entries.filter((entry) => entry.spatialReview[aspect]?.status === 'verified').length])),
    rows: catalog.structures.map((row) => ({
      catalogId: row.catalog_id,
      sourceName: row.source_name,
      sourceSystem: row.source_system,
      initialStatus: row.equus_status,
      initialCandidate: row.equus_id,
      // 原台帳のsynonymsも初期仮説。アプリの検索別名へ自動追加しない。
      initialAliasHypotheses: row.synonyms,
      review: reviews.get(row.catalog_id),
      nextEvidence,
    })),
  }
}
