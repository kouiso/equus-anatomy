/**
 * 名称の読み上げ（#230 案C）。読み上げそのものは ui/speech.ts が expo-speech でやる。
 * ここには DOM/RN に触れん判定だけ置く。
 */

import { kanaOf } from './data/kana'
import type { Structure } from './types'

/** 発音ボタンが対応する言語タグ（BCP47）。和名・英名・ラテン語名の3つ。 */
export const SPEECH_LANG = { ja: 'ja-JP', en: 'en-US', la: 'la' } as const

/**
 * OS の音声一覧にラテン語を読める物があるか。
 * ラテン語名の読みは OS 音声の精度が確認できてから出す決まり（#230）。
 * 'la'/'la-*' の音声が無いまま別言語の音声へフォールバックさせると、
 * 誰も確かめられん読みを未監修で教えることになるので、ボタン自体を出さん。
 * 'lt'（リトアニア語）・'lv'（ラトビア語）・'lad'（ラディーノ語）には当たらんよう、
 * 完全一致か 'la-' 始まりだけを見る。
 */
export function hasLatinVoice(languages: readonly string[]): boolean {
  return languages.some((lang) => {
    const tag = lang.toLowerCase()
    return tag === 'la' || tag.startsWith('la-')
  })
}

/**
 * 解剖学ラテン語の略号（NAV の表記）。読み上げでは略さずに読ませる。
 * 略号のまま渡すと「M.」を「エム」と読み、誤った読みを教えることになる。
 */
const LATIN_ABBREVIATIONS: Readonly<Record<string, string>> = {
  'M.': 'Musculus',
  'Mm.': 'Musculi',
  'Lig.': 'Ligamentum',
  'Ligg.': 'Ligamenta',
  'A.': 'Arteria',
  'Aa.': 'Arteriae',
  'V.': 'Vena',
  'Vv.': 'Venae',
  'N.': 'Nervus',
  'Nn.': 'Nervi',
}

/** ラテン語名の読み上げに渡す文字列。語頭の略号を正式な語に戻す。 */
export function speechTextLa(nameLa: string): string {
  return nameLa
    .split(' ')
    .map((word) => LATIN_ABBREVIATIONS[word] ?? word)
    .join(' ')
}

/**
 * 和名の読み上げに渡す文字列。
 * 鬐甲・繋・膁 のような難読の漢字は OS の音声合成が読み違えるので、
 * 読み仮名（data/kana.ts）があればそちらを読ませる。無い部位だけ和名の漢字をそのまま渡す。
 */
export function speechTextJa(s: Pick<Structure, 'id' | 'nameJa'>): string {
  return kanaOf(s.id) ?? s.nameJa
}
