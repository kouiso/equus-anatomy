import { describe, expect, it } from 'vitest'
import { GEOMETRY, STRUCTURE_BY_ID, STRUCTURES } from './data'
import { translator } from './i18n'
import { fitViewBox, locationMapCaption, locationMapOf, locationMapViewBox } from './location-map'
import { bbox } from './geometry'
import { canOpenOnMap, mappableViews } from './map-entry'
import type { HorseMask, Structure, ViewBox, ViewGeometry } from './types'

/**
 * 図鑑の詳細に置く「位置の小図」の選び方。
 * 小図は「解剖図で位置を見る」と同じ着地にしないと、小図と押した先の絵が食い違う。
 * なので向きは mappableViews の先頭、出す条件は canOpenOnMap と同じにする。
 */
const emptyMask: HorseMask = { block: 1, bw: 1, bh: 1, size: { w: 1000, h: 500 }, bits: new Uint8Array(1) }
const img = { src: 'x.jpg', hash: 'h' }
const square = [[100, 100], [200, 100], [200, 200], [100, 200]] as const

const geometry = (over: Partial<ViewGeometry> = {}): ViewGeometry => ({
  view: 'left',
  size: { w: 1000, h: 500 },
  images: { 'muscle-superficial': img, 'muscle-deep': img },
  measuredOn: 'muscle-superficial',
  frame: [[50, 50], [950, 50], [950, 450], [50, 450]],
  mask: emptyMask,
  areas: [],
  parts: [{ id: 'm1', layer: 'muscle', points: square, source: 'measured' }],
  ...over,
})

const muscle = (over: Partial<Omit<Structure, 'detail' | 'body' | 'function' | 'en'>> = {}): Structure => ({
  id: 'm1',
  layer: 'muscle',
  nameJa: '筋',
  nameLa: 'm',
  nameEn: 'm',
  region: 'head',
  summary: 's',
  views: ['left'],
  body: 'b',
  function: 'f',
  ...over,
})

const geos = (left: ViewGeometry, right: ViewGeometry = geometry({ view: 'right', parts: [] })) =>
  ({ ...GEOMETRY, left, right }) as typeof GEOMETRY

describe('locationMapOf', () => {
  it('図が出せる部位は、mappableViews の先頭の向きと自分の層・深さのプレートを返す', () => {
    const m = locationMapOf(muscle(), geos(geometry()))
    expect(m).not.toBeNull()
    expect(m?.view).toBe('left')
    expect(m?.plate).toBe('muscle-superficial')
    expect(m?.layer).toBe('muscle')
    expect(m?.depth).toBe('superficial')
    expect(m?.image).toBe(img)
    expect(m?.mirrored).toBe(false)
    expect(m?.draft).toBe(false)
  })

  it('深層筋は深層のプレートを使う', () => {
    const g = geometry({ parts: [{ id: 'm1', layer: 'muscle', depth: 'deep', points: square, source: 'measured' }] })
    const m = locationMapOf(muscle({ depth: 'deep' }), geos(g))
    expect(m?.plate).toBe('muscle-deep')
    expect(m?.depth).toBe('deep')
  })

  it('下書きの座標は draft として返す（測った値と区別して破線にするため）', () => {
    const g = geometry({ parts: [{ id: 'm1', layer: 'muscle', points: square, source: 'draft' }] })
    expect(locationMapOf(muscle(), geos(g))?.draft).toBe(true)
  })

  it('先頭の向きが右側望なら、絵は左側望の反転なので mirrored になる', () => {
    const right = geometry({ view: 'right' })
    const m = locationMapOf(muscle({ views: ['right', 'left'] }), geos(geometry({ parts: [] }), right))
    expect(m?.view).toBe('right')
    expect(m?.mirrored).toBe(true)
  })

  it('宣言した向きのうち図が出せないものは飛ばして、出せる最初の向きを使う', () => {
    const m = locationMapOf(muscle({ views: ['front', 'left'] }), geos(geometry(), geometry({ view: 'front', parts: [] })))
    expect(m?.view).toBe('left')
  })

  it('座標が無い・プレートの絵が無い部位は null（図鑑は準備中の文を出す）', () => {
    expect(locationMapOf(muscle(), geos(geometry({ parts: [] })))).toBeNull()
    expect(locationMapOf(muscle(), geos(geometry({ images: {} })))).toBeNull()
  })

  it('実データ: 小図が出るのは canOpenOnMap が true の部位だけで、向きも着地と同じ', () => {
    let some = 0
    for (const s of STRUCTURES) {
      const m = locationMapOf(s)
      expect(m !== null, s.id).toBe(canOpenOnMap(s))
      if (m !== null) {
        some += 1
        expect(m.view, s.id).toBe(mappableViews(s)[0])
        expect(m.mirrored, s.id).toBe(m.view === 'right')
      }
    }
    expect(some).toBeGreaterThan(0)
  })

  it('実データ: 咬筋は小図が出る', () => {
    const s = STRUCTURE_BY_ID.get('muscle-masseter')
    expect(s).toBeDefined()
    expect(locationMapOf(s!)).not.toBeNull()
  })
})

describe('fitViewBox', () => {
  const bounds = { w: 1000, h: 500 }
  const contains = (outer: ViewBox, inner: ViewBox) =>
    outer.x <= inner.x + 1e-6 &&
    outer.y <= inner.y + 1e-6 &&
    outer.x + outer.w >= inner.x + inner.w - 1e-6 &&
    outer.y + outer.h >= inner.y + inner.h - 1e-6

  it('対象を含み、指定の縦横比になる', () => {
    const target = { x: 100, y: 100, w: 100, h: 100 }
    for (const aspect of [350 / 150, 284 / 210, 1]) {
      const vb = fitViewBox(target, aspect, bounds)
      expect(contains(vb, target)).toBe(true)
      expect(vb.w / vb.h).toBeCloseTo(aspect, 5)
    }
  })

  it('余白を足す', () => {
    const target = { x: 400, y: 200, w: 100, h: 100 }
    const vb = fitViewBox(target, 1, bounds, 0.1)
    expect(vb.w).toBeGreaterThan(target.w)
  })

  it('画像の内側に収まる範囲では、画像の外へはみ出さない', () => {
    const target = { x: 0, y: 0, w: 100, h: 100 }
    const vb = fitViewBox(target, 350 / 150, bounds, 0.05)
    expect(vb.x).toBeGreaterThanOrEqual(0)
    expect(vb.y).toBeGreaterThanOrEqual(0)
    expect(vb.x + vb.w).toBeLessThanOrEqual(bounds.w + 1e-6)
    expect(vb.y + vb.h).toBeLessThanOrEqual(bounds.h + 1e-6)
  })

  it('縦横比が不正なら対象の枠をそのまま返す', () => {
    const target = { x: 1, y: 2, w: 30, h: 40 }
    expect(fitViewBox(target, 0, bounds)).toEqual(target)
    expect(fitViewBox(target, Number.NaN, bounds)).toEqual(target)
  })
})

describe('locationMapViewBox', () => {
  it('馬体の外接枠と部位の両方を含む（位置が馬体のどこかが分かる）', () => {
    const g = geometry()
    const m = locationMapOf(muscle(), geos(g))!
    const vb = locationMapViewBox(m, g, 350 / 150)
    const frame = bbox(g.frame)
    expect(vb.x).toBeLessThanOrEqual(frame.x)
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(frame.x + frame.w)
    expect(vb.y).toBeLessThanOrEqual(frame.y)
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(frame.y + frame.h)
  })

  it('外接枠の外に部位があっても部位を含む', () => {
    const outside = [[960, 460], [990, 460], [990, 490], [960, 490]] as const
    const g = geometry({ parts: [{ id: 'm1', layer: 'muscle', points: outside, source: 'measured' }] })
    const m = locationMapOf(muscle(), geos(g))!
    const vb = locationMapViewBox(m, g, 1)
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(990)
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(490)
  })

  it('実データ: 小図が出る全部位で、部位が viewBox に収まる', () => {
    for (const s of STRUCTURES) {
      const m = locationMapOf(s)
      if (m === null) continue
      const vb = locationMapViewBox(m, GEOMETRY[m.view], 350 / 150)
      const b = bbox(m.part.points)
      expect(vb.x, s.id).toBeLessThanOrEqual(b.x + 1e-6)
      expect(vb.y, s.id).toBeLessThanOrEqual(b.y + 1e-6)
      expect(vb.x + vb.w, s.id).toBeGreaterThanOrEqual(b.x + b.w - 1e-6)
      expect(vb.y + vb.h, s.id).toBeGreaterThanOrEqual(b.y + b.h - 1e-6)
    }
  })
})

describe('locationMapCaption', () => {
  const ja = translator('ja')
  const en = translator('en')
  const map = (over: Partial<NonNullable<ReturnType<typeof locationMapOf>>> = {}) => ({
    ...locationMapOf(muscle(), geos(geometry()))!,
    ...over,
  })

  it('向き・層を出す（測った座標には破線の注記を付けない）', () => {
    expect(locationMapCaption(map(), ja)).toBe('左側望 · 筋肉')
    expect(locationMapCaption(map(), en)).toBe('Left lateral · Muscles')
  })

  it('下書きの座標には破線の注記を足す', () => {
    expect(locationMapCaption(map({ draft: true }), ja)).toBe('左側望 · 筋肉 · 破線は下書きの位置')
  })

  it('深層筋は深層と分かるようにする', () => {
    expect(locationMapCaption(map({ depth: 'deep' }), ja)).toBe('左側望 · 筋肉（深層）')
  })

  it('筋肉以外では深さを書かない', () => {
    expect(locationMapCaption(map({ layer: 'skeleton', depth: 'superficial' }), ja)).toBe('左側望 · 骨格')
  })
})
