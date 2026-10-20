import { describe, expect, it } from 'vitest'
import { canvasOverlayRects } from './canvas-overlay'

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
