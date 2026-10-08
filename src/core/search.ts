import { areaOfStructure } from './area-map'
import { kanaAliasOf, kanaOf } from './data/kana'
import { canonicalRomaji, kanaToRomaji, romajiKeys } from './romaji'
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
  return (
    q
      .trim()
      // 半角カナや全角英数は NFKC で全角カタカナ・半角英数へ揃える（#69）。
      // haystack 側も同じ関数を通すので、揺れは両側で同じ形に畳まれる。
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
  )
}

type SearchIndex = {
  readonly text: string
  /** 読みのローマ字を canonicalRomaji で畳んだもの。入力も同じ形に畳んで当てる（#130） */
  readonly romaji: string
}

const indexCache = new WeakMap<Structure, SearchIndex>()

function indexOf(s: Structure): SearchIndex {
  const cached = indexCache.get(s)
  if (cached) return cached
  const kana = [kanaOf(s.id) ?? '', ...kanaAliasOf(s)]
  // 読みのローマ字も索引に入れる。「hone」「kubi」のように
  // 部位名を知らなくても読みで探せるようにするため（#71）
  const romaji = kana.flatMap((k) => kanaToRomaji(k))
  const index = {
    text: normalizeQuery([s.nameJa, s.nameLa, s.nameEn, s.region, s.summary, ...kana, ...romaji].join(' ')),
    romaji: kana.flatMap((k) => romajiKeys(normalizeQuery(k))).join(' '),
  }
  indexCache.set(s, index)
  return index
}

function matches(s: Structure, needle: string, romajiNeedle: string | undefined): boolean {
  const index = indexOf(s)
  return index.text.includes(needle) || (romajiNeedle !== undefined && index.romaji.includes(romajiNeedle))
}

export function filterStructures(structures: readonly Structure[], filter: StructureFilter): readonly Structure[] {
  const needle = normalizeQuery(filter.query ?? '')
  // 3 文字以下の綴りは素の索引（ヘボン式・訓令式それぞれ）で足りる。畳んだ索引に
  // 短い入力を当てると長音を落とした断片（ket・ek など）に当たってノイズが増える
  const romajiNeedle = /^[a-z]{4,}$/.test(needle) ? canonicalRomaji(needle) : undefined
  return structures.filter(
    (s) =>
      (filter.layer === undefined || filter.layer === 'all' || s.layer === filter.layer) &&
      (filter.area === undefined || filter.area === 'all' || areaOfStructure(s) === filter.area) &&
      (filter.view === undefined || filter.view === 'all' || s.views.includes(filter.view)) &&
      (needle === '' || matches(s, needle, romajiNeedle)),
  )
}
