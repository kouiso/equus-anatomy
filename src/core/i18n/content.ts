import type { Structure } from '../types'
import type { MessageKey } from './messages'
import type { Locale, Translator } from './translate'

const AREA_KEYS: Readonly<Record<string, MessageKey>> = {
  head: 'area.head',
  neck: 'area.neck',
  trunk: 'area.trunk',
  fore: 'area.fore',
  hind: 'area.hind',
  tail: 'area.tail',
}

/** 大まかな場所の表示名。regions/*.json に知らん id が増えても和名で出して空欄にはせん。 */
export function areaLabel(area: { readonly id: string; readonly nameJa: string }, t: Translator): string {
  const key = AREA_KEYS[area.id]
  return key === undefined ? area.nameJa : t(key)
}

/**
 * structures.ts の region（日本語の区分名）に対応する英語。
 * 獣医解剖学の用語として監修前の下書き (#13)。監修で直す時はここだけ書き換える。
 */
const REGION_EN: Readonly<Record<string, string>> = {
  頭部: 'Head',
  頸部: 'Neck',
  前躯: 'Forehand',
  前肢: 'Forelimb',
  体幹: 'Trunk',
  胸腔: 'Thoracic cavity',
  腹腔: 'Abdominal cavity',
  骨盤腔: 'Pelvic cavity',
  後躯: 'Hindquarters',
  後肢: 'Hindlimb',
  尾: 'Tail',
}

export function regionEnOf(region: string): string | undefined {
  return REGION_EN[region]
}

export function regionLabel(region: string, locale: Locale): string {
  return locale === 'en' ? (REGION_EN[region] ?? region) : region
}

/** 見出しに出す名前。英語表示では英名、日本語表示では和名。 */
export function structureName(s: Structure, locale: Locale): string {
  return locale === 'en' ? s.nameEn : s.nameJa
}

/** 見出しの下に添える別言語の名前。学習者が両方の名前を対で覚えられるように残す。 */
export function structureAltName(s: Structure, locale: Locale): string {
  return locale === 'en' ? s.nameJa : s.nameEn
}

export type StructureText = {
  readonly summary: string
  readonly body: string
  readonly function: string
  readonly note?: string
  /** 実際に出しとる解説の言語。英語表示でも英訳が無ければ 'ja' になる。 */
  readonly lang: Locale
}

/**
 * 解説文（summary/body/function/note）を表示言語で引く。
 * 英訳は監修を通したものだけを s.en に入れる。未訳の部位は日本語原文へ落とし、
 * 画面側は lang を見て「日本語のみ」と明示する。機械訳を黙って出さんため。
 */
export function structureText(s: Structure, locale: Locale): StructureText {
  const enText = locale === 'en' ? s.en : undefined
  if (enText === undefined) {
    return {
      summary: s.summary,
      body: s.body,
      function: s.function,
      ...(s.note === undefined ? {} : { note: s.note }),
      lang: 'ja',
    }
  }
  return {
    summary: enText.summary,
    body: enText.body,
    function: enText.function,
    ...(enText.note === undefined ? {} : { note: enText.note }),
    lang: 'en',
  }
}
