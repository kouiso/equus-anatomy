import { describe, expect, it } from 'vitest'
import { kanaToRomaji } from './romaji'

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

  it('カタカナの読みは入口で平仮名に寄せる', () => {
    expect(kanaToRomaji('ホネ')).toContain('hone')
    expect(kanaToRomaji('シンゾウ')).toContain('sinzou')
    // 促音も平仮名と同じ扱いになる
    expect(kanaToRomaji('ロッコツ')).toContain('rokkotsu')
  })
})
