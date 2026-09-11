import { describe, expect, it } from 'vitest'
import { markerScale } from './geometry'
import { imageToScreen, screenToImage } from './screen-to-image'
import type { Point, ViewBox } from './types'

const full: ViewBox = { x: 0, y: 0, w: 1600, h: 1200 }

describe('screenToImage', () => {
  it('横長コンテナ: 高さで合わせて左右に余白', () => {
    const c = { w: 1280, h: 600 } // 高さ基準 scale=0.5、幅 800、左右 240 の余白
    expect(screenToImage([240, 0], full, c)).toEqual([0, 0])
    expect(screenToImage([1040, 600], full, c)).toEqual([1600, 1200])
    expect(screenToImage([640, 300], full, c)).toEqual([800, 600])
    // 余白を押したら画像の外（負）になる。呼び側で「何も選ばん」に落とす
    expect(screenToImage([0, 300], full, c)[0]).toBeLessThan(0)
  })

  it('縦長コンテナ: 幅で合わせて上下に余白', () => {
    const c = { w: 390, h: 844 } // 幅基準 scale=390/1600、高さ 292.5、上下 275.75 の余白
    const scale = 390 / 1600
    const oy = (844 - 1200 * scale) / 2
    const p = screenToImage([195, oy + 600 * scale], full, c)
    expect(p[0]).toBeCloseTo(800, 6)
    expect(p[1]).toBeCloseTo(600, 6)
    expect(screenToImage([0, oy], full, c)).toEqual([0, 0])
  })

  it('ズーム後の viewBox でも原点と倍率がずれん', () => {
    const vb: ViewBox = { x: 400, y: 300, w: 800, h: 600 }
    const c = { w: 800, h: 800 } // 幅基準 scale=1、上下 100 の余白
    expect(screenToImage([0, 100], vb, c)).toEqual([400, 300])
    expect(screenToImage([400, 400], vb, c)).toEqual([800, 600])
  })

  it('markerScale の k と逆数の関係', () => {
    const vb: ViewBox = { x: 100, y: 50, w: 800, h: 600 }
    const c = { w: 1000, h: 500 }
    const k = markerScale(vb, c)
    // 画面で 1px 動かすと画像で k 単位動く
    const a = screenToImage([300, 200], vb, c)
    const b = screenToImage([301, 200], vb, c)
    expect(b[0] - a[0]).toBeCloseTo(k, 9)
  })

  it('imageToScreen は逆変換', () => {
    const vb: ViewBox = { x: 123, y: 45, w: 700, h: 525 }
    const c = { w: 390, h: 844 }
    const pts: Point[] = [[123, 45], [500, 300], [823, 570]]
    for (const p of pts) {
      const back = screenToImage(imageToScreen(p, vb, c), vb, c)
      expect(back[0]).toBeCloseTo(p[0], 9)
      expect(back[1]).toBeCloseTo(p[1], 9)
    }
  })

  it('コンテナ未計測（0）なら恒等変換に落ちて NaN を出さん', () => {
    expect(screenToImage([10, 20], full, { w: 0, h: 0 })).toEqual([10, 20])
  })
})
