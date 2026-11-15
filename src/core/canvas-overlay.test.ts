import { describe, expect, it } from 'vitest'
import { canvasOverlayRects, conditionsBeside, rightBelowMaxWidth, selectorMaxWidth, TOP_ACTION_GAP } from './canvas-overlay'

describe('canvasOverlayRects', () => {
  it('右上のズームと左上の部位一覧は常に塞ぐ', () => {
    expect(canvasOverlayRects({ canvasWidth: 390, showBack: false, shortCanvas: false })).toEqual([
      { x: 222, y: 12, w: 156, h: 48 },
      { x: 12, y: 12, w: 198, h: 48 },
    ])
  })
  it('戻る操作は低い図では塞がん', () => {
    expect(canvasOverlayRects({ canvasWidth: 390, showBack: true, shortCanvas: false })).toHaveLength(3)
    expect(canvasOverlayRects({ canvasWidth: 390, showBack: true, shortCanvas: true })).toHaveLength(2)
  })
  it('左下は計測した幅、未計測なら最大幅で塞ぐ', () => {
    const at = (width: number) =>
      canvasOverlayRects({ canvasWidth: 390, showBack: false, shortCanvas: false, bottom: { canvasHeight: 481, height: 108, width } })[2]
    expect(at(95)).toEqual({ x: 12, y: 361, w: 95, h: 108 })
    expect(at(0)).toEqual({ x: 12, y: 361, w: 366, h: 108 })
    expect(at(1000)?.w).toBe(366)
  })
})

describe('表示条件の置き場（#323）', () => {
  it('390px の日本語・英語は部位一覧の右に並ぶ（手元の書き出しで測った幅）', () => {
    expect(conditionsBeside({ canvasWidth: 390, selectorWidth: 109, conditionsWidth: 70 })).toBe(true)
    expect(conditionsBeside({ canvasWidth: 390, selectorWidth: 97, conditionsWidth: 91 })).toBe(true)
  })
  it('320px は並ばず右の列へ送る', () => {
    expect(conditionsBeside({ canvasWidth: 320, selectorWidth: 109, conditionsWidth: 70 })).toBe(false)
  })
  it('ちょうど入る幅までは並べる', () => {
    const max = selectorMaxWidth(390)
    expect(conditionsBeside({ canvasWidth: 390, selectorWidth: 100, conditionsWidth: max - 100 - TOP_ACTION_GAP })).toBe(true)
    expect(conditionsBeside({ canvasWidth: 390, selectorWidth: 100, conditionsWidth: max - 100 - TOP_ACTION_GAP + 1 })).toBe(false)
  })
  it('未計測の間は並べる', () => {
    expect(conditionsBeside({ canvasWidth: 320, selectorWidth: 0, conditionsWidth: 70 })).toBe(true)
    expect(conditionsBeside({ canvasWidth: 320, selectorWidth: 109, conditionsWidth: 0 })).toBe(true)
  })
  it('右の列で上限まで縮んだ幅を測り直しても、並べる側へ戻らん（往復しない）', () => {
    for (const canvasWidth of [280, 320, 390, 600, 832]) {
      for (let selectorWidth = 48; selectorWidth <= selectorMaxWidth(canvasWidth); selectorWidth += 7) {
        const shrunk = rightBelowMaxWidth(canvasWidth, selectorWidth)
        expect(conditionsBeside({ canvasWidth, selectorWidth, conditionsWidth: shrunk }), `${canvasWidth}/${selectorWidth}`).toBe(false)
      }
    }
  })
  it('右の列の表示条件は、部位一覧の右端から12px離れた所までしか広がらん', () => {
    expect(rightBelowMaxWidth(320, 128)).toBe(320 - 24 - 128 - 12)
    expect(12 + 128 + 12).toBeLessThanOrEqual(320 - 12 - rightBelowMaxWidth(320, 128))
  })
  it('左上は測った列の高さで、右の列へ送った表示条件はズームの下で塞ぐ', () => {
    const rects = canvasOverlayRects({ canvasWidth: 320, showBack: false, shortCanvas: false, topLeftHeight: 78, rightBelow: { width: 122, height: 48 } })
    expect(rects).toEqual([
      { x: 152, y: 12, w: 156, h: 48 },
      { x: 12, y: 12, w: 128, h: 78 },
      { x: 186, y: 72, w: 122, h: 48 },
    ])
  })
})
