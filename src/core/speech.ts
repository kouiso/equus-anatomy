/**
 * 名称の読み上げ（#230 案C）。読み上げそのものは ui/speech.ts が expo-speech でやる。
 * ここには DOM/RN に触れん判定だけ置く。
 */

/** 発音ボタンが対応する言語タグ（BCP47）。和名・英名・ラテン語名の3つ。 */
export const SPEECH_LANG = { ja: 'ja-JP', en: 'en-US', la: 'la' } as const
export type SpeechLang = keyof typeof SPEECH_LANG

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
