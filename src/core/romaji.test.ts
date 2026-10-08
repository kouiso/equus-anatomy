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
})
