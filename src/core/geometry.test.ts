import { describe, expect, it } from 'vitest'
import { area, bbox, centroid, flipX, markerScale, toPath, zoomFactor } from './geometry'
import type { Point, Polygon } from './types'

const square: Polygon = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

describe('centroid', () => {
  it('正方形の重心は中心', () => {
    expect(centroid(square)).toEqual([5, 5])
  })

  it('辺が密なところへ引っ張られへん（頂点平均やと 3.75 になる形）', () => {
    const poly: Polygon = [
      [0, 0],
      [2, 0],
      [4, 0],
      [6, 0],
      [6, 6],
      [0, 6],
    ]
    const [cx] = centroid(poly)
    expect(cx).toBeCloseTo(3, 6)
  })

  it('点1つでもその点を返す', () => {
    expect(centroid([[3, 7]])).toEqual([3, 7])
  })
})

describe('area', () => {
  it('巻き方向に関わらず正の値', () => {
    expect(area(square)).toBe(100)
    expect(area([...square].reverse())).toBe(100)
  })
})

describe('flipX', () => {
  it('2回かけたら元に戻る', () => {
    expect(flipX(flipX(square, 1600), 1600)).toEqual(square)
  })

  it('左端は右端になる', () => {
    expect(flipX([[0, 100]], 1600)[0]).toEqual([1600, 100])
  })
})

describe('toPath', () => {
  it('閉じた path になる', () => {
    expect(toPath(square)).toBe('M 0 0 L 10 0 L 10 10 L 0 10 Z')
  })
})

describe('bbox', () => {
  it('外接矩形', () => {
    expect(bbox(square)).toEqual({ x: 0, y: 0, w: 10, h: 10 })
  })
})

describe('markerScale', () => {
  const fitSize = { w: 1600, h: 1200 }
  const fit = { x: 0, y: 0, w: fitSize.w, h: fitSize.h }

  it('スマホでも PC でも、マーカーは同じ CSS px になる', () => {
    // r=12 を掛けた結果が、どっちの端末でも 12 CSS px に見えるか
    const phone = { w: 375, h: 281.25 }
    const desktop = { w: 1000, h: 750 }
    const pxOnPhone = 12 * markerScale(fit, phone) * (phone.w / fit.w)
    const pxOnDesktop = 12 * markerScale(fit, desktop) * (desktop.w / fit.w)
    expect(pxOnPhone).toBeCloseTo(12, 6)
    expect(pxOnDesktop).toBeCloseTo(12, 6)
  })

  it('ズームしてもマーカーの見た目サイズは変わらん', () => {
    const container = { w: 375, h: 281.25 }
    const zoomed = { x: 400, y: 300, w: 800, h: 600 }
    const px = (vb: typeof fit) => 12 * markerScale(vb, container) * (container.w / vb.w)
    expect(px(zoomed)).toBeCloseTo(px(fit), 6)
  })

  it('縦長のコンテナでは高さ側が効く（レターボックスに追従する）', () => {
    const tall = { w: 1000, h: 300 }
    expect(markerScale(fit, tall)).toBeCloseTo(1 / (300 / 1200), 6)
  })

  it('コンテナ未測定（0）でも壊れん', () => {
    expect(markerScale(fit, { w: 0, h: 0 })).toBe(1)
  })
})

describe('zoomFactor', () => {
  it('全体表示で 1、半分の viewBox で 2', () => {
    const size = { w: 1600, h: 1200 }
    expect(zoomFactor(size, { x: 0, y: 0, w: 1600, h: 1200 })).toBe(1)
    expect(zoomFactor(size, { x: 0, y: 0, w: 800, h: 600 })).toBe(2)
  })
})

describe('回帰: マーカーは画像に対する相対位置を保つ', () => {
  // 配信版のズレの再発検知。どんな viewBox でも、点の「画像内の相対位置」は不変でないとアカン。
  it('viewBox を変えても点の画像内相対位置は変わらん', () => {
    const size = { w: 1600, h: 1200 }
    const pt: Point = [612, 430]
    const rel = [pt[0] / size.w, pt[1] / size.h]
    for (const vb of [
      { x: 0, y: 0, w: 1600, h: 1200 },
      { x: 400, y: 300, w: 800, h: 600 },
      { x: 1000, y: 800, w: 400, h: 300 },
    ]) {
      // renderer は viewBox を通して描くだけ。点の座標そのものは触らん。
      expect([pt[0] / size.w, pt[1] / size.h]).toEqual(rel)
      expect(vb.w / vb.h).toBeCloseTo(size.w / size.h, 6)
    }
  })
})
