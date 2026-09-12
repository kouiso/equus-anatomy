import { areaOfStructure } from './area-map'
import { kanaOf } from './data/kana'
import type { Layer, Structure, View } from './types'

/**
 * 図鑑の検索と絞り込み。DOM と関係ないので core に置く。
 * 計算を renderer に持たせると「Web で引けるのに native で引けん」が起きる。
 */
export type StructureFilter = {
  readonly query?: string
  readonly layer?: Layer | 'all'
  /** 大まかな場所の id（head/neck/trunk/fore/hind/tail）。図の上の区分と同じ。 */
  readonly area?: string | 'all'
  readonly view?: View | 'all'
}

/** 検索文字列の正規化。カタカナ入力もひらがなの読みに当たるようにする。 */
export function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

function haystack(s: Structure): string {
  return normalizeQuery([s.nameJa, s.nameLa, s.nameEn, s.region, s.summary, kanaOf(s.id) ?? ''].join(' '))
}

export function filterStructures(structures: readonly Structure[], filter: StructureFilter): readonly Structure[] {
  const needle = normalizeQuery(filter.query ?? '')
  return structures.filter(
    (s) =>
      (filter.layer === undefined || filter.layer === 'all' || s.layer === filter.layer) &&
      (filter.area === undefined || filter.area === 'all' || areaOfStructure(s) === filter.area) &&
      (filter.view === undefined || filter.view === 'all' || s.views.includes(filter.view)) &&
      (needle === '' || haystack(s).includes(needle)),
  )
}
