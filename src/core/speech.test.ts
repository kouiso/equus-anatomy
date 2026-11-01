import { describe, expect, it } from 'vitest'
import { STRUCTURES } from './data'
import { kanaOf } from './data/kana'
import { hasLatinVoice, speechTextJa, speechTextLa, SPEECH_LANG } from './speech'

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

describe('和名の読み上げ文字列', () => {
  it('読み仮名がある部位は仮名を読ませる（漢字の読み違いを避ける）', () => {
    expect(speechTextJa({ id: 'muscle-masseter', nameJa: '咬筋' })).toBe('こうきん')
  })

  it('板状筋は「ばんじょうきん」と読む（以前の誤り「ひじょうきん」を読み上げない）', () => {
    expect(speechTextJa({ id: 'muscle-splenius', nameJa: '板状筋' })).toBe('ばんじょうきん')
  })

  it('読み仮名が無い部位は和名をそのまま渡す', () => {
    expect(speechTextJa({ id: 'no-such-part', nameJa: '試験部位' })).toBe('試験部位')
  })

  it('収録している全部位に読み仮名がある', () => {
    const missing = STRUCTURES.filter((s) => kanaOf(s.id) === undefined).map((s) => s.id)
    expect(missing).toEqual([])
  })
})

describe('ラテン語名の読み上げ文字列', () => {
  it('筋の略号 M. / Mm. を略さず読ませる', () => {
    expect(speechTextLa('M. masseter')).toBe('Musculus masseter')
    expect(speechTextLa('Mm. pectorales')).toBe('Musculi pectorales')
  })

  it('略号でない語や途中の語は変えない', () => {
    expect(speechTextLa('Os femoris')).toBe('Os femoris')
    expect(speechTextLa('M. tensor fasciae latae')).toBe('Musculus tensor fasciae latae')
  })

  it('収録している全部位のラテン語名に、展開されないまま残る略号（大文字+ピリオドの語）が無い', () => {
    const left = STRUCTURES.flatMap((s) => speechTextLa(s.nameLa).split(' ')).filter((w) => /^[A-Z][a-z]{0,4}\.$/.test(w))
    expect(left).toEqual([])
  })
})
