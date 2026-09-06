import { describe, expect, it } from 'vitest'
import { hitTestAreas, hitTestParts, pointInPolygon, visibleParts } from './hit-test'
import type { Area, Part, Polygon } from './types'

const big: Polygon = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
]
const small: Polygon = [
  [40, 40],
  [60, 40],
  [60, 60],
  [40, 60],
]

describe('pointInPolygon', () => {
  it('内側', () => expect(pointInPolygon([50, 50], big)).toBe(true))
  it('外側', () => expect(pointInPolygon([150, 50], big)).toBe(false))
  it('辺の上は内側扱い', () => expect(pointInPolygon([0, 50], big)).toBe(true))
  it('頂点の上は内側扱い', () => expect(pointInPolygon([100, 100], big)).toBe(true))
  it('頂点と同じ高さを通る水平線でも二重カウントせん', () => {
    const spike: Polygon = [
      [0, 0],
      [50, 50],
      [100, 0],
      [100, 100],
      [0, 100],
    ]
    expect(pointInPolygon([50, 20], spike)).toBe(false)
    expect(pointInPolygon([50, 80], spike)).toBe(true)
  })
  it('線分は領域にならん', () => {
    expect(
      pointInPolygon(
        [1, 1],
        [
          [0, 0],
          [10, 10],
        ],
      ),
    ).toBe(false)
  })
})

const parts: readonly Part[] = [
  { id: 'big-muscle', layer: 'muscle', depth: 'superficial', points: big, source: 'measured' },
  { id: 'small-muscle', layer: 'muscle', depth: 'superficial', points: small, source: 'measured' },
  { id: 'deep-muscle', layer: 'muscle', depth: 'deep', points: big, source: 'draft' },
  { id: 'bone', layer: 'skeleton', points: big, source: 'measured' },
]

describe('hitTestParts', () => {
  it('入れ子は小さい方を返す（描画順に依存せん）', () => {
    expect(hitTestParts([50, 50], parts, { layer: 'muscle', depth: 'superficial' })?.id).toBe('small-muscle')
    expect(hitTestParts([50, 50], [...parts].reverse(), { layer: 'muscle', depth: 'superficial' })?.id).toBe(
      'small-muscle',
    )
  })

  it('小領域の外なら大きい方', () => {
    expect(hitTestParts([10, 10], parts, { layer: 'muscle', depth: 'superficial' })?.id).toBe('big-muscle')
  })

  it('どこにも当たらんかったら null', () => {
    expect(hitTestParts([500, 500], parts, { layer: 'muscle', depth: 'superficial' })).toBeNull()
  })

  it('深さで絞り込む', () => {
    expect(hitTestParts([10, 10], parts, { layer: 'muscle', depth: 'deep' })?.id).toBe('deep-muscle')
  })

  it('depth を持たん部位は層が合えば出る（骨格・内臓に深さの概念はない）', () => {
    expect(visibleParts(parts, { layer: 'skeleton' }).map((p) => p.id)).toEqual(['bone'])
  })
})

describe('hitTestAreas', () => {
  const areas: readonly Area[] = [
    { id: 'trunk', nameJa: '体幹', points: big, source: 'measured' },
    { id: 'neck', nameJa: '頸部', points: small, source: 'measured' },
  ]
  it('小さい場所を優先する', () => {
    expect(hitTestAreas([50, 50], areas)?.id).toBe('neck')
  })
})
