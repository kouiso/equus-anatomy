import { translator, type Translator } from './i18n/translate'
import type { Layer, Structure } from './types'

/** 監修の範囲。層と部位IDの両方を書いたら和集合。どちらも空なら何も監修していない扱い。 */
export type SupervisionScope = {
  readonly layers?: readonly Layer[]
  readonly partIds?: readonly string[]
}

export type Supervisor = {
  readonly name: string
  /** 肩書き。省略時は「獣医師」。 */
  readonly title?: string
  readonly affiliation?: string
  /** 本人の掲載許可。false の間は氏名を画面に出さない。 */
  readonly namePublishConsent: boolean
}

export type SupervisionRecord = {
  readonly supervisor: Supervisor
  /** 監修を受けた日。YYYY-MM-DD。 */
  readonly reviewedOn: string
  readonly scope: SupervisionScope
}

export type SupervisionCredit = {
  readonly displayName: string
  readonly reviewedOn: string
}

export type PartSupervision =
  | { readonly status: 'unsupervised' }
  | { readonly status: 'supervised'; readonly credits: readonly SupervisionCredit[] }

export type SupervisionLevel = 'none' | 'partial' | 'full'

export type SupervisionSummary = {
  readonly level: SupervisionLevel
  readonly supervisedCount: number
  readonly total: number
  readonly credits: readonly SupervisionCredit[]
  /** 監修済みの部位名（和名）。About で範囲として並べる。 */
  readonly supervisedNames: readonly string[]
}

/** 監修前から画面に出してきた注記。監修記録が空の間は一字も変えずにこれを出す。 */
export const UNSUPERVISED_NOTICE = '学習デモ — 解剖学的正確性は未監修'

export function isInScope(structure: Pick<Structure, 'id' | 'layer'>, scope: SupervisionScope): boolean {
  return (scope.layers ?? []).includes(structure.layer) || (scope.partIds ?? []).includes(structure.id)
}

export function creditOf(record: SupervisionRecord): SupervisionCredit {
  const s = record.supervisor
  const title = s.title ?? '獣医師'
  const displayName = s.namePublishConsent
    ? `${title} ${s.name}${s.affiliation ? `（${s.affiliation}）` : ''}`
    : `${title}（氏名非公開）`
  return { displayName, reviewedOn: record.reviewedOn }
}

export function supervisionOf(
  structure: Pick<Structure, 'id' | 'layer'>,
  records: readonly SupervisionRecord[],
): PartSupervision {
  const matched = records.filter((record) => isInScope(structure, record.scope))
  if (matched.length === 0) return { status: 'unsupervised' }
  return { status: 'supervised', credits: matched.map(creditOf) }
}

export function summarizeSupervision(
  structures: readonly Pick<Structure, 'id' | 'layer' | 'nameJa'>[],
  records: readonly SupervisionRecord[],
): SupervisionSummary {
  const supervised = structures.filter((structure) => records.some((record) => isInScope(structure, record.scope)))
  const contributing = records.filter((record) => structures.some((structure) => isInScope(structure, record.scope)))
  const level: SupervisionLevel =
    supervised.length === 0 ? 'none' : supervised.length === structures.length ? 'full' : 'partial'
  return {
    level,
    supervisedCount: supervised.length,
    total: structures.length,
    credits: contributing.map(creditOf),
    supervisedNames: supervised.map((structure) => structure.nameJa),
  }
}

/** 全タブ共通ヘッダに出す一行。表示言語に追従するので Translator を渡す（省略時は日本語）。 */
export function supervisionNotice(summary: Pick<SupervisionSummary, 'level'>, t: Translator = translator('ja')): string {
  switch (summary.level) {
    case 'none':
      return t('supervision.notice.none')
    case 'partial':
      return t('supervision.notice.partial')
    case 'full':
      return t('supervision.notice.full')
  }
}

/** 部位の詳細に出す一行。 */
export function partSupervisionLabel(supervision: PartSupervision, t: Translator = translator('ja')): string {
  if (supervision.status === 'unsupervised') return t('supervision.part.unsupervised')
  const credits = supervision.credits.map((credit) => `${credit.displayName}・${credit.reviewedOn}`).join(' / ')
  return t('supervision.part.supervised', { credits })
}

/**
 * 監修記録の書き間違いを拾う。画面に「監修済み」と出す根拠になるデータなので、
 * 存在しない部位IDや日付の書式崩れは黙って通さない。
 */
export function validateSupervisionRecords(
  records: readonly SupervisionRecord[],
  knownPartIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = []
  records.forEach((record, index) => {
    const at = `records[${index}]`
    if (record.supervisor.name.trim() === '') errors.push(`${at}: 監修者名が空`)
    if (!isIsoDate(record.reviewedOn)) errors.push(`${at}: reviewedOn は YYYY-MM-DD の実在日付にする（${record.reviewedOn}）`)
    const layers = record.scope.layers ?? []
    const partIds = record.scope.partIds ?? []
    if (layers.length === 0 && partIds.length === 0) errors.push(`${at}: 監修範囲が空`)
    for (const id of partIds) if (!knownPartIds.has(id)) errors.push(`${at}: 存在しない部位ID ${id}`)
  })
  return errors
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}
