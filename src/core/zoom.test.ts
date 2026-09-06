import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, clamp, fit, pan, pinch, scaleOf, zoomAt, zoomByStep, zoomToPolygon } from './zoom'
import type { Point, Polygon, Size } from './types'

const size: Size = { w: 1600, h: 1200 }
const aspect = size.w / size.h

describe('fit', () => {
  it('画像全体', () => expect(fit(size)).toEqual({ x: 0, y: 0, w: 1600, h: 1200 }))
})

describe('clamp', () => {
  it('アスペクトを画像に固定する', () => {
    const vb = clamp({ x: 0, y: 0, w: 800, h: 999 }, size)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
  it('画像の外へ出さん', () => {
    const vb = clamp({ x: -500, y: -500, w: 800, h: 600 }, size)
    expect(vb.x).toBe(0)
    expect(vb.y).toBe(0)
  })
  it('右下もはみ出さん', () => {
    const vb = clamp({ x: 5000, y: 5000, w: 800, h: 600 }, size)
    expect(vb.x + vb.w).toBeLessThanOrEqual(size.w)
    expect(vb.y + vb.h).toBeLessThanOrEqual(size.h)
  })
  it('全体より引けん', () => {
    expect(clamp({ x: 0, y: 0, w: 99999, h: 99999 }, size).w).toBe(size.w)
  })
  it('上限を超えて寄れん', () => {
    expect(scaleOf(clamp({ x: 800, y: 600, w: 1, h: 1 }, size), size)).toBeLessThanOrEqual(MAX_ZOOM)
  })
})

describe('zoomAt', () => {
  it('アンカーは画面上の同じ相対位置に留まる', () => {
    const start = { x: 0, y: 0, w: 1600, h: 1200 }
    const anchor: Point = [400, 300]
    const relBefore = [(anchor[0] - start.x) / start.w, (anchor[1] - start.y) / start.h]
    const after = zoomAt(start, anchor, 2, size)
    const relAfter = [(anchor[0] - after.x) / after.w, (anchor[1] - after.y) / after.h]
    expect(relAfter[0]).toBeCloseTo(relBefore[0]!, 6)
    expect(relAfter[1]).toBeCloseTo(relBefore[1]!, 6)
  })

  it('端でクランプが効いた時もアスペクトは崩れん', () => {
    const after = zoomAt({ x: 0, y: 0, w: 1600, h: 1200 }, [0, 0], 4, size)
    expect(after.w / after.h).toBeCloseTo(aspect, 9)
  })

  it('倍率どおりに寄る', () => {
    expect(scaleOf(zoomAt(fit(size), [800, 600], 2, size), size)).toBeCloseTo(2, 6)
  })
})

describe('zoomByStep', () => {
  it('3回押しても上限で止まる', () => {
    let vb = fit(size)
    for (let i = 0; i < 10; i++) vb = zoomByStep(vb, 1.6, size)
    expect(scaleOf(vb, size)).toBeLessThanOrEqual(MAX_ZOOM + 1e-9)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
})

describe('zoomToPolygon', () => {
  const neck: Polygon = [
    [300, 260],
    [620, 260],
    [620, 430],
    [300, 430],
  ]
  it('その領域が viewBox の中に完全に入る', () => {
    const vb = zoomToPolygon(neck, size)
    expect(vb.x).toBeLessThanOrEqual(300)
    expect(vb.y).toBeLessThanOrEqual(260)
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(620)
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(430)
  })
  it('アスペクトは画像のまま', () => {
    const vb = zoomToPolygon(neck, size)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
})

describe('pan', () => {
  it('指の動きと逆向きに viewBox が動く（絵は指についてくる）', () => {
    const vb = pan({ x: 400, y: 300, w: 800, h: 600 }, 100, 0, size)
    expect(vb.x).toBe(300)
  })
  it('全体表示では動かせん', () => {
    expect(pan(fit(size), 100, 100, size)).toEqual(fit(size))
  })
})

describe('pinch', () => {
  it('比が 0 以下や NaN でも壊れん', () => {
    const vb = { x: 0, y: 0, w: 800, h: 600 }
    expect(pinch(vb, [400, 300], 0, size)).toEqual(vb)
    expect(pinch(vb, [400, 300], Number.NaN, size)).toEqual(vb)
  })
  it('広げたら寄る', () => {
    expect(scaleOf(pinch(fit(size), [800, 600], 2, size), size)).toBeCloseTo(2, 6)
  })
})
