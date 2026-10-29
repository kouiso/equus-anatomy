import { describe, expect, it } from 'vitest'
import { hasLatinVoice, SPEECH_LANG } from './speech'

describe('名称の読み上げ（#230 案C）', () => {
  it('言語タグは BCP47 で固定', () => {
    expect(SPEECH_LANG).toEqual({ ja: 'ja-JP', en: 'en-US', la: 'la' })
  })

  it('la 音声があれば true、無ければ false', () => {
    expect(hasLatinVoice(['la'])).toBe(true)
    expect(hasLatinVoice(['la-VA'])).toBe(true)
    expect(hasLatinVoice(['ja-JP', 'en-US', 'la-IT'])).toBe(true)
    expect(hasLatinVoice(['ja-JP', 'en-US'])).toBe(false)
    expect(hasLatinVoice([])).toBe(false)
  })

  it('言語タグの大文字小文字は吸収する', () => {
    expect(hasLatinVoice(['LA'])).toBe(true)
    expect(hasLatinVoice(['La-va'])).toBe(true)
  })

  it('la に似た別言語（リトアニア・ラトビア・ラディーノ）には当たらん', () => {
    // 別言語の音声へフォールバックさせると未監修の読みを教えるので、'la'/'la-' だけを見る
    expect(hasLatinVoice(['lt-LT', 'lv-LV', 'lad'])).toBe(false)
  })
})
