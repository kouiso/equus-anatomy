import { describe, expect, it } from 'vitest'
import { CHIP_HEIGHT, DETAIL_BACK_HIT_SLOP, FILTER_CHIP_HIT_SLOP, FILTER_ROW_SPACE, TAP_TARGET_MIN, tapHeight } from './tap-target'

// hitSlop は react-native-web では効かんので、e2e（Web）では測れん。押せる高さは値で確かめる（#267）
describe('図鑑の押せる高さ (#267)', () => {
  it('見た目はデザインの 44 のまま', () => {
    expect(CHIP_HEIGHT).toBe(44)
  })

  it('絞り込み行のボタン（層・場所・向き・すべて解除）は押せる高さが 48 以上', () => {
    expect(tapHeight(CHIP_HEIGHT, FILTER_CHIP_HIT_SLOP)).toBeGreaterThanOrEqual(TAP_TARGET_MIN)
  })

  it('絞り込み行の hitSlop は行の余白の中に収まり、折り返した行どうしで重ならん', () => {
    // Android は親の枠の外の点を拾わんので、はみ出した分は効かん
    expect(FILTER_CHIP_HIT_SLOP.top).toBeLessThanOrEqual(FILTER_ROW_SPACE.top)
    expect(FILTER_CHIP_HIT_SLOP.bottom).toBeLessThanOrEqual(FILTER_ROW_SPACE.bottom)
    expect(FILTER_CHIP_HIT_SLOP.top + FILTER_CHIP_HIT_SLOP.bottom).toBeLessThanOrEqual(FILTER_ROW_SPACE.gap)
  })

  it('詳細の戻るは押せる高さが 48 以上で、空きの無い上へは広げない', () => {
    expect(tapHeight(CHIP_HEIGHT, DETAIL_BACK_HIT_SLOP)).toBeGreaterThanOrEqual(TAP_TARGET_MIN)
    expect(DETAIL_BACK_HIT_SLOP.top).toBe(0)
  })
})
