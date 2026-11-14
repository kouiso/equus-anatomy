import { describe, expect, it } from 'vitest'
import { isCompactRow } from './compact-row'

describe('isCompactRow', () => {
  it('幅を文字の倍率で割って 600 未満なら縦積み', () => {
    expect(isCompactRow(390, 1)).toBe(true)
    expect(isCompactRow(1000, 2)).toBe(true)
    expect(isCompactRow(599, 1)).toBe(true)
  })

  it('600 以上なら横並び', () => {
    expect(isCompactRow(600, 1)).toBe(false)
    expect(isCompactRow(1280, 1)).toBe(false)
    expect(isCompactRow(1440, 2)).toBe(false)
  })

  it('静的書き出しの幅 0 は縦積みになる（マウント前の値と同じ）', () => {
    expect(isCompactRow(0, 1)).toBe(true)
  })
})
