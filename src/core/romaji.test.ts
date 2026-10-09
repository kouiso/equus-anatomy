import { describe, expect, it } from 'vitest'
import { canonicalRomaji, kanaToRomaji, romajiKeys } from './romaji'

describe('canonicalRomaji', () => {
  it('ヘボン式・訓令式・IME 綴りをモーラごとに同じ形へ畳む（#130）', () => {
    expect(canonicalRomaji('zyouwankotsu')).toBe(canonicalRomaji('jouwankotsu'))
    expect(canonicalRomaji('zyouwankotsu')).toBe(canonicalRomaji('zyouwankotu'))
    expect(canonicalRomaji('shinzou')).toBe(canonicalRomaji('sinzou'))
    expect(canonicalRomaji('sinnzou')).toBe(canonicalRomaji('sinzou'))
    expect(canonicalRomaji('hifukukin')).toBe(canonicalRomaji('hihukukin'))
    expect(canonicalRomaji('chou')).toBe(canonicalRomaji('tyou'))
  })

  it('置き換えは連鎖させない（cfu が chu→tyu にならん）', () => {
    expect(canonicalRomaji('cfu')).toBe('chu')
  })

  it('母音が続く nn は畳まない（んな行と区別できん）', () => {
    expect(canonicalRomaji('konnichi')).toBe('konniti')
  })
})

describe('kanaToRomaji', () => {
  it('基本の読みをヘボン式に写像する', () => {
    expect(kanaToRomaji('くび')).toContain('kubi')
    expect(kanaToRomaji('ほね')).toContain('hone')
    expect(kanaToRomaji('かんぞう')).toContain('kanzou')
  })

  it('拗音と促音を畳む', () => {
    expect(kanaToRomaji('きょうぜん')).toContain('kyouzen')
    // っち は Hepburn の tch（こっち→kotchi と同じ系）
    expect(kanaToRomaji('だいけっちょう')).toContain('daiketchou')
  })

  it('長音・促音の揺れの別表記も返す', () => {
    expect(kanaToRomaji('きょうぜん')).toContain('kyozen')
    expect(kanaToRomaji('ろっこつ')).toContain('rokotsu')
    expect(kanaToRomaji('もうちょう')).toContain('mocho')
  })

  it('訓令式・IME 綴りの別表記も返す（si/tu/hu/zi、拗音も同じ系）', () => {
    expect(kanaToRomaji('しんぞう')).toContain('sinzou')
    expect(kanaToRomaji('ふくきん')).toContain('hukukin')
    expect(kanaToRomaji('けつい')).toContain('ketui')
    expect(kanaToRomaji('じんじゃく')).toContain('zinzyaku')
    expect(kanaToRomaji('しゃかい')).toContain('syakai')
    expect(kanaToRomaji('ちょうげつ')).toContain('tyougetu')
    // Hepburn 正本はそのまま残る
    expect(kanaToRomaji('しんぞう')).toContain('shinzou')
  })

  it('長音を書かない ei→e の別表記は romajiKeys の索引に載る（#130）', () => {
    expect(romajiKeys('けいつい')).toContain('ketui')
    expect(romajiKeys('けいつい')).toContain('keitui')
    // 長音の省き方は種類ごとに独立（ou だけ省く・ei だけ省く）
    expect(romajiKeys('じょうわんこつ')).toContain('zyowankotu')
    expect(romajiKeys('じょうわんこつ')).toContain('zyouwankotu')
  })

  it('カタカナの読みは入口で平仮名に寄せる', () => {
    expect(kanaToRomaji('ホネ')).toContain('hone')
    expect(kanaToRomaji('シンゾウ')).toContain('sinzou')
    // 促音も平仮名と同じ扱いになる
    expect(kanaToRomaji('ロッコツ')).toContain('rokkotsu')
  })
})
