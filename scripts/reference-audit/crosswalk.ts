import { createHash } from 'node:crypto'
import type { EquusSnapshot, ReviewTracker, SourceRow } from './types'

type Citation = { kind: 'reference_identity' | 'independent_anatomy'; source: string; locator: string }
type Review = { reviewer: string; reviewedAt: string; citations: Citation[] }
export type RelationshipReviews = {
  schemaVersion: 1
  identity: (Review & { catalogIds: string[]; decision: 'same_structure' | 'different_structures' | 'duplicate_view' })[]
  missingEntries: (Review & { catalogId: string; scope: 'individual_catalog_entry'; equusInventorySha256: string; reason: string })[]
}

/** 表記の索引用。語幹・単複・翻訳・医学的同義語は推定しない。 */
export function labelKey(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function inventoryDigest(entries: readonly EquusSnapshot[]): string {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex')
}

function groupBy<T>(entries: readonly T[], key: (entry: T) => string): T[][] {
  const groups = new Map<string, T[]>()
  for (const entry of entries) {
    const id = key(entry)
    const group = groups.get(id) ?? []
    group.push(entry)
    groups.set(id, group)
  }
  return [...groups.values()]
}

/** 検索仮説を作るだけ。別名・包含・同一性の承認には使用しない。 */
function lexicalCandidates(row: SourceRow, entries: readonly EquusSnapshot[]) {
  const sourceKey = labelKey(row.source_name)
  const sourceMuscleKey = labelKey(row.source_name.replace(/\s+(?:Muscle|M\.)$/i, ''))
  return entries.flatMap((entry) => {
    const hits: { field: 'nameEn' | 'nameLa'; rule: string }[] = []
    for (const field of ['nameEn', 'nameLa'] as const) {
      const forms = [{ text: entry[field], rule: 'surface_form' }]
      if (field === 'nameLa' && /^Mm?\./.test(entry[field])) forms.push({ text: entry[field].replace(/^Mm?\.\s*/, ''), rule: 'latin_marker_omitted_for_search' })
      if (/\([^)]*\)/.test(entry[field])) forms.push({ text: entry[field].replace(/\([^)]*\)/g, ''), rule: 'parenthetical_omitted_for_search' })
      for (const form of forms) {
        const key = labelKey(form.text)
        if (!key) continue
        if (sourceKey === key) hits.push({ field, rule: form.rule })
        if (row.source_system === 'Musculature' && entry.layer === 'muscle' && sourceMuscleKey !== sourceKey && sourceMuscleKey === key) hits.push({ field, rule: `source_muscle_marker_omitted_for_search+${form.rule}` })
        const tokens = key.split(' '), sourceTokens = new Set(sourceKey.split(' '))
        // 1語の包含（Head、Eye等）は候補を過剰に広げるので行わない。
        if (tokens.length >= 2 && tokens.length < sourceTokens.size && tokens.every((token) => sourceTokens.has(token))) hits.push({ field, rule: `token_subset_related_only+${form.rule}` })
      }
    }
    return hits.length ? [{ equusId: entry.id, nameEn: entry.nameEn, nameLa: entry.nameLa, hits, anatomicalRelationship: 'unresolved' as const }] : []
  })
}

export function analyzeCrosswalk(rows: readonly SourceRow[], entries: readonly EquusSnapshot[], tracker: ReviewTracker, relationships: RelationshipReviews) {
  const errors: string[] = []
  const byId = new Map(rows.map((row) => [row.catalog_id, row]))
  const nameReviews = new Map(tracker.entries.map((entry) => [entry.catalogId, entry.nameReview]))
  const equusInventorySha256 = inventoryDigest(entries)
  const check = (ok: boolean, message: string) => { if (!ok) errors.push(message) }
  check(relationships.schemaVersion === 1, '関係レビュー台帳の版が不正')
  function citations(review: Review, label: string) {
    check(Boolean(review.reviewer.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt), `${label}: 確認者・日付が不足`)
    for (const kind of ['reference_identity', 'independent_anatomy']) check(review.citations.some((item) => item.kind === kind && Boolean(item.source.trim() && item.locator.trim())), `${label}: ${kind}の出典・該当箇所が不足`)
  }
  const identityPairs = new Map<string, string>()
  const parents = new Map<string, string>()
  function root(id: string): string {
    const parent = parents.get(id)
    return parent === undefined || parent === id ? id : root(parent)
  }
  for (const review of relationships.identity) {
    check(['same_structure', 'different_structures', 'duplicate_view'].includes(review.decision), '同一性判断の区分が不正')
    check(review.catalogIds.length >= 2 && new Set(review.catalogIds).size === review.catalogIds.length && review.catalogIds.every((id) => byId.has(id)), '同一性判断の参照IDが不足・不明・重複')
    citations(review, review.catalogIds.join('/'))
    if (review.decision !== 'different_structures') {
      const sides = new Set(review.catalogIds.map((id) => byId.get(id)?.laterality))
      check(!(sides.has('left') && sides.has('right')), `${review.catalogIds.join('/')}: 明示された左右を同一個体として統合できない`)
    }
    for (const [index, id] of review.catalogIds.entries()) for (const other of review.catalogIds.slice(index + 1)) {
      const pair = [id, other].sort().join('/')
      const decision = review.decision === 'different_structures' ? 'different' : 'same'
      check(!identityPairs.has(pair) || identityPairs.get(pair) === decision, `${pair}: 同一性判断が矛盾`)
      identityPairs.set(pair, decision)
      if (decision === 'same') parents.set(root(other), root(id))
    }
  }
  for (const [pair, decision] of identityPairs) {
    const [left, right] = pair.split('/')
    if (left && right && decision === 'different') check(root(left) !== root(right), `${pair}: 別の同一性判断を介して矛盾している`)
  }
  const missingIds = new Set<string>()
  for (const review of relationships.missingEntries) {
    const id = review.catalogId
    check(byId.has(id) && !missingIds.has(id), `${id}: 不足判断の参照IDが不明または重複`)
    missingIds.add(id)
    check(review.scope === 'individual_catalog_entry', `${id}: 個別項目の不足と図上の不在を混同している`)
    check(review.equusInventorySha256 === equusInventorySha256, `${id}: 不足判断のEquus台帳が現行と不一致`)
    check(Boolean(review.reason.trim()), `${id}: 同義語・包含関係を調べた不足理由がない`)
    const name = nameReviews.get(id)
    check(name?.decision === 'no_correspondence_after_review' && Boolean(name.reviewer.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(name.reviewedAt) && name.equusIds.length === 0, `${id}: 名称・包含関係の審査前に不足を確定できない`)
    for (const kind of ['terminology', 'independent_anatomy']) check(Boolean(name?.evidenceIds.some((evidenceId) => tracker.evidence.some((item) => item.id === evidenceId && item.kind === kind && item.catalogIds.includes(id) && Boolean(item.source.trim() && item.locator.trim())))), `${id}: 不足判断の前提となる名称審査に${kind}の根拠が不足`)
    citations(review, id)
  }

  const rowSummary = (row: SourceRow) => ({ catalogId: row.catalog_id, sourceOrder: row.source_order, name: row.source_name, system: row.source_system, side: row.laterality, initialEquusId: row.equus_id })
  const repeatedLabels = groupBy(rows, (row) => labelKey(row.source_name)).filter((group) => group.length > 1).map((group) => {
    const systems = [...new Set(group.map((row) => row.source_system))]
    const vascularCollision = systems.includes('Circulatory System: Arteries') && systems.includes('Circulatory System: Veins')
    return { labelKey: labelKey(group[0]!.source_name), classification: vascularCollision ? 'artery_vein_label_collision' : systems.length === 1 ? 'same_system_repeat_unresolved' : 'cross_system_repeat_unresolved', rows: group.map(rowSummary), identity: 'unresolved', viewInformation: 'not_in_source_inventory', nextEvidence: '各掲載行のベンダー構造ID・対象肢/左右・表示方向。同一IDの別表示か別構造かを確認する' }
  })

  const explicitSides = rows.flatMap((row) => {
    const match = /^(Left|Right)\s+(.+)$/i.exec(row.source_name)
    if (!match) { check(row.laterality === 'unspecified_in_source', `${row.catalog_id}: 元表記にない左右指定`); return [] }
    const side = match[1]!.toLowerCase()
    check(row.laterality === side, `${row.catalog_id}: 元表記と左右欄が不一致`)
    return [{ row, side, baseLabel: match[2]!, key: `${row.source_system}\u0000${labelKey(match[2]!)}` }]
  })
  const sideGroups = groupBy(explicitSides, (entry) => entry.key).map((group) => ({ baseLabel: group[0]!.baseLabel, system: group[0]!.row.source_system, classification: new Set(group.map((entry) => entry.side)).size === 2 ? 'opposite_side_labels_keep_separate' : 'one_explicit_side_only', rows: group.map((entry) => rowSummary(entry.row)), anatomicalInstanceCount: null }))
  const numberedLabels = rows.flatMap((row) => {
    const qualifiers = [...row.source_name.matchAll(/\(([^)]*\d[^)]*)\)/g)].map((match) => match[1]!)
    return qualifiers.length ? [{ ...rowSummary(row), qualifiers, containsRange: qualifiers.some((value) => /\d\s*[-–]\s*[A-Za-z]*\d/.test(value)), expandedInstanceCount: null }] : []
  })
  const searchRows = rows.map((row) => {
    const candidates = lexicalCandidates(row, entries)
    return { catalogId: row.catalog_id, sourceName: row.source_name, sourceSystem: row.source_system, initialStatus: row.equus_status, initialEquusId: row.equus_id, candidates, newCandidateIds: candidates.filter((candidate) => candidate.equusId !== row.equus_id).map((candidate) => candidate.equusId), relationshipReview: nameReviews.get(row.catalog_id)?.decision ?? 'unreviewed', missingEntryReview: missingIds.has(row.catalog_id) ? 'recorded_requires_successful_audit' : 'not_confirmed', spatialVerification: 'see_separate_spatial_review' }
  })
  const systems = groupBy(rows, (row) => row.source_system).map((group) => ({ system: group[0]!.source_system, rows: group.length, initialCandidateRows: group.filter((row) => row.equus_id !== null).length, lexicalCandidateRows: searchRows.filter((row) => row.sourceSystem === group[0]!.source_system && row.candidates.length > 0).length }))
  const relatedGroups = groupBy(rows.filter((row) => row.equus_id !== null), (row) => row.equus_id!).filter((group) => group.some((row) => row.equus_status === 'broader_or_related_equus_entry_only')).map((group) => ({ equusId: group[0]!.equus_id!, equusNameEn: entries.find((entry) => entry.id === group[0]!.equus_id)?.nameEn, rows: group.map(rowSummary), relationship: 'containment_direction_or_relatedness_unresolved', nextEvidence: '参照名とEquus項目の定義を独立資料で照合し、同一・Equusが包含・Equusの方が部分・関連のみを分ける' }))
  return {
    errors,
    equusInventorySha256,
    countingUnits: { sourceRows: rows.length, distinctNormalizedLabels: new Set(rows.map((row) => labelKey(row.source_name))).size, distinctSystemAndLabelGroups: groupBy(rows, (row) => `${row.source_system}\u0000${labelKey(row.source_name)}`).length, verifiedUniqueAnatomicalStructures: null, reason: '表記・区分の群数は構造個体数ではない。左右、集合、別表示のID対応が未確認' },
    summary: { repeatedLabelGroups: repeatedLabels.length, sameSystemRepeats: repeatedLabels.filter((group) => group.classification === 'same_system_repeat_unresolved').length, crossSystemRepeats: repeatedLabels.filter((group) => group.classification !== 'same_system_repeat_unresolved').length, explicitSideRows: explicitSides.length, oppositeSideLabelGroups: sideGroups.filter((group) => group.classification === 'opposite_side_labels_keep_separate').length, unspecifiedSideRows: rows.length - explicitSides.length, numberedLabelRows: numberedLabels.length, rangeLabelRows: numberedLabels.filter((row) => row.containsRange).length, lexicalCandidateRows: searchRows.filter((row) => row.candidates.length > 0).length, newLexicalCandidateRows: searchRows.filter((row) => row.newCandidateIds.length > 0).length, confirmedMissingIndividualEntries: errors.length ? null : relationships.missingEntries.length, recordedIdentityReviews: relationships.identity.length },
    repeatedLabels,
    sideGroups,
    numberedLabels,
    systems,
    systemsWithoutInitialCandidates: systems.filter((system) => system.initialCandidateRows === 0),
    relatedGroups,
    initialNameCandidatesWithoutLexicalHit: searchRows.filter((row) => row.initialStatus === 'name_correspondence_candidate' && row.candidates.length === 0).map((row) => ({ ...rowSummary(byId.get(row.catalogId)!), equusEntry: entries.find((entry) => entry.id === row.initialEquusId), nextEvidence: '表記正規化では対応しない。用語対照の原典と包含範囲を審査し、初期候補を自動承認しない' })),
    lexicalHitsStillRelated: searchRows.filter((row) => row.initialStatus === 'broader_or_related_equus_entry_only' && row.candidates.length > 0).map((row) => ({ ...rowSummary(byId.get(row.catalogId)!), candidates: row.candidates, nextEvidence: '文字列の一致・包含だけでは同一構造にならない。部品/集合/外貌/器官の定義を審査する' })),
    recordedIdentityReviews: relationships.identity,
    recordedMissingEntryReviews: relationships.missingEntries,
    rows: searchRows,
  }
}
