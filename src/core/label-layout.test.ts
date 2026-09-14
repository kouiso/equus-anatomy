import { describe, expect, it } from 'vitest'
import { centroid } from './geometry'
import { GEOMETRY, STRUCTURE_BY_ID } from './data'
import { visibleParts } from './hit-test'
import { hitTestLabels, layoutLabels, type LabelItem, type LabelPlacement, type MarkerObstacle, type ScreenRect } from './label-layout'
import { imageToScreen } from './screen-to-image'
import type { Depth, Layer, Point, Size, ViewBox } from './types'

const viewport: Size = { w: 390, h: 328 }
const item = (id: string, x: number, y: number, w = 90): LabelItem => ({ id, at: [x, y], w, h: 26 })
const marker = (id: string, x: number, y: number): MarkerObstacle => ({ id, at: [x, y] })

function overlaps(a: ScreenRect, b: ScreenRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function distanceFromRect(point: Point, rect: ScreenRect): number {
  const x = Math.max(rect.x, Math.min(point[0], rect.x + rect.w))
  const y = Math.max(rect.y, Math.min(point[1], rect.y + rect.h))
  return Math.hypot(point[0] - x, point[1] - y)
}

function expectValid(placements: readonly LabelPlacement[], markers: readonly MarkerObstacle[], size = viewport) {
  const visible = placements.filter((p) => !p.hidden)
  for (const placement of visible) {
    expect(placement.rect.x, `${placement.id}: left`).toBeGreaterThanOrEqual(2)
    expect(placement.rect.y, `${placement.id}: top`).toBeGreaterThanOrEqual(2)
    expect(placement.rect.x + placement.rect.w, `${placement.id}: right`).toBeLessThanOrEqual(size.w - 2)
    expect(placement.rect.y + placement.rect.h, `${placement.id}: bottom`).toBeLessThanOrEqual(size.h - 2)
    for (const dot of markers) {
      if (dot.id === placement.id) continue
      expect(distanceFromRect(dot.at, placement.rect), `${placement.id} label / ${dot.id} dot`).toBeGreaterThanOrEqual(24)
    }
  }
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      expect(overlaps(visible[i]!.rect, visible[j]!.rect), `${visible[i]!.id} / ${visible[j]!.id}`).toBe(false)
    }
  }
}

describe('ラベルの重なり回避', () => {
  it('別の点の24px当たり領域、別ラベル、画面端を避ける', () => {
    const items = [item('fore', 145, 180), item('neck', 166, 145), item('hind', 292, 177), item('tail', 326, 150)]
    const markers = items.map((v) => marker(v.id, v.at[0], v.at[1]))
    const result = layoutLabels({ items, markers, viewport })
    expect(result.every((p) => !p.hidden)).toBe(true)
    expectValid(result, markers)
  })

  it('点が画面端にあっても、収まる候補を選ぶ', () => {
    const items = [item('top-left', 4, 4, 70), item('bottom-right', 386, 324, 70)]
    const markers = items.map((v) => marker(v.id, v.at[0], v.at[1]))
    const result = layoutLabels({ items, markers, viewport })
    expect(result.every((p) => !p.hidden)).toBe(true)
    expectValid(result, markers)
  })

  it('右上に重なる操作領域を避けてラベルを置く', () => {
    const items = [item('selected', 340, 70)]
    const markers = [marker('selected', 340, 70)]
    const reserved = { x: viewport.w - 12 - 144, y: 12, w: 144, h: 44 }
    const result = layoutLabels({ items, markers, viewport, reservedRects: [reserved] })
    expect(result[0]!.hidden).toBe(false)
    expect(result[0]!.dy).toBeGreaterThan(0)
    expect(overlaps(result[0]!.rect, reserved)).toBe(false)
  })

  it('点の中心が画面外なら、端にラベルだけを残さない', () => {
    const items = [item('left-out', -1, 120), item('bottom-out', 180, viewport.h + 1)]
    const result = layoutLabels({ items, markers: items, viewport })
    expect(result.map((placement) => placement.hidden)).toEqual([true, true])
  })

  it('安全な置き場所がないラベルは、選択中相当でも無理に表示しない', () => {
    const tiny: Size = { w: 60, h: 40 }
    const result = layoutLabels({ items: [item('selected', 30, 20, 90)], markers: [marker('selected', 30, 20)], viewport: tiny })
    expect(result[0]!.hidden).toBe(true)
  })

  it('入力の順序が変わっても各ラベルの結果が同じ', () => {
    const items = [item('a', 150, 150), item('b', 155, 155), item('c', 160, 145)]
    const markers = items.map((v) => marker(v.id, v.at[0], v.at[1]))
    const forward = layoutLabels({ items, markers, viewport })
    const backward = layoutLabels({ items: [...items].reverse(), markers: [...markers].reverse(), viewport })
    for (const placement of forward) {
      expect(backward.find((p) => p.id === placement.id), placement.id).toEqual(placement)
    }
  })

  it('返却順は入力順を維持する', () => {
    const items = [item('z', 300, 100), item('a', 100, 250)]
    expect(layoutLabels({ items, markers: items, viewport }).map((p) => p.id)).toEqual(['z', 'a'])
  })
})

describe('ラベルの当たり判定', () => {
  it('描画矩形の端を含み、非表示ラベルは拾わない', () => {
    const visible: LabelPlacement = { id: 'a', dx: 0, dy: 0, rect: { x: 10, y: 20, w: 80, h: 26 }, hidden: false }
    const hidden: LabelPlacement = { id: 'b', dx: 0, dy: 0, rect: { x: 100, y: 20, w: 80, h: 26 }, hidden: true }
    const labels = [{ value: 'a', placement: visible }, { value: 'b', placement: hidden }]
    expect(hitTestLabels([10, 20], labels)).toBe('a')
    expect(hitTestLabels([90, 46], labels)).toBe('a')
    expect(hitTestLabels([120, 30], labels)).toBe(null)
  })
})

describe('実データの全向き・層・倍率', () => {
  const filters: readonly { layer: Layer; depth: Depth }[] = [
    { layer: 'skin', depth: 'superficial' },
    { layer: 'muscle', depth: 'superficial' },
    { layer: 'muscle', depth: 'deep' },
    { layer: 'skeleton', depth: 'superficial' },
    { layer: 'organs', depth: 'superficial' },
  ]

  for (const geometry of Object.values(GEOMETRY)) {
    const viewBoxes: readonly ViewBox[] = [
      { x: 0, y: 0, w: geometry.size.w, h: geometry.size.h },
      { x: geometry.size.w / 4, y: geometry.size.h / 4, w: geometry.size.w / 2, h: geometry.size.h / 2 },
    ]
    for (const [scaleIndex, viewBox] of viewBoxes.entries()) {
      it(`${geometry.view} area ${scaleIndex === 0 ? '全体' : '2倍'}`, () => {
        const markers = geometry.areas.map((area) => ({ id: area.id, at: imageToScreen(area.labelAt ?? centroid(area.points), viewBox, viewport) }))
        const items = geometry.areas.map((area, index) => ({ ...markers[index]!, w: Math.max(52, area.nameJa.length * 13 * 1.15 + 18), h: 26 }))
        const result = layoutLabels({ items, markers, viewport, markerClearance: 24 })
        expectValid(result, markers)
      })

      for (const filter of filters) {
        const parts = visibleParts(geometry.parts, filter)
        if (parts.length === 0) continue
        it(`${geometry.view} ${filter.layer}/${filter.depth} ${scaleIndex === 0 ? '全体' : '2倍'}`, () => {
          const markers = parts.map((part) => ({ id: part.id, at: imageToScreen(part.labelAt ?? centroid(part.points), viewBox, viewport) }))
          const items = parts.map((part, index) => {
            const label = STRUCTURE_BY_ID.get(part.id)?.nameJa ?? part.id
            return { ...markers[index]!, w: Math.max(52, label.length * 13 * 1.15 + 18), h: 26 }
          })
          const result = layoutLabels({ items, markers, viewport, markerClearance: 24 })
          expectValid(result, markers)
        })
      }
    }
  }
})
