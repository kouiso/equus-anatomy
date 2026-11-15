import { describe, expect, it } from 'vitest'
import { hitTestAreas, hitTestMarkers, hitTestPartCandidates, hitTestParts, pointInPolygon, visibleParts } from './hit-test'
import type { Area, Part, Point, Polygon } from './types'

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
  it('重なる全候補を小さい順に返し、別の層・深さは含めない', () => {
    const snapshot = [...parts]
    expect(hitTestPartCandidates([50, 50], parts, { layer: 'muscle', depth: 'superficial' }).map((p) => p.id)).toEqual(['small-muscle', 'big-muscle'])
    expect(parts).toEqual(snapshot)
    expect(hitTestPartCandidates([500, 500], parts, { layer: 'muscle', depth: 'superficial' })).toEqual([])
  })
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

  // 判定 C: 今の層に部位が無い場所は飛ばして、次に小さい「部位の有る場所」へ落とす
  describe('選べない場所の飛ばし', () => {
    const mid: Polygon = [
      [20, 20],
      [80, 20],
      [80, 80],
      [20, 80],
    ]
    const nested: readonly Area[] = [
      { id: 'hind', nameJa: '後肢', points: big, source: 'measured' },
      { id: 'tail', nameJa: '尾', points: mid, source: 'measured' },
      { id: 'trunk', nameJa: '体幹', points: small, source: 'draft' },
    ]
    const only = (...ids: string[]) => (a: Area) => ids.includes(a.id)

    it('一番小さい場所が選べんなら、次に小さい選べる場所を返す', () => {
      expect(hitTestAreas([50, 50], nested, only('hind', 'tail'))?.id).toBe('tail')
    })

    it('選べん場所が二重に重なっても、さらに外の選べる場所まで落ちる', () => {
      expect(hitTestAreas([50, 50], nested, only('hind'))?.id).toBe('hind')
    })

    it('指の下に選べる場所が無ければ null（指の下に無い場所は選べても拾わん）', () => {
      const far: Area = { id: 'far', nameJa: '遠く', points: [[200, 200], [300, 200], [300, 300]], source: 'draft' }
      expect(hitTestAreas([50, 50], nested, only())).toBe(null)
      expect(hitTestAreas([50, 50], [...nested, far], only('far'))).toBe(null)
    })

    it('一番小さい場所が選べるなら、外の場所も選べても小さい方を返す', () => {
      expect(hitTestAreas([50, 50], nested, only('hind', 'trunk'))?.id).toBe('trunk')
    })
  })
})

describe('点の当たり判定', () => {
  const markers = [
    { value: 'a', at: [100, 100] as Point },
    { value: 'b', at: [120, 100] as Point },
  ]

  it('半径の内側なら拾う', () => {
    expect(hitTestMarkers([105, 100], markers, 22)).toBe('a')
  })

  it('半径の外なら拾わん。多角形の判定へ落ちる', () => {
    expect(hitTestMarkers([100, 140], markers, 22)).toBe(null)
  })

  it('重なった時は近い方が勝つ。描いた順に依らん', () => {
    expect(hitTestMarkers([118, 100], markers, 22)).toBe('b')
    expect(hitTestMarkers([102, 100], markers, 22)).toBe('a')
  })

  it('点が無ければ何も返さん', () => {
    expect(hitTestMarkers([0, 0], [], 22)).toBe(null)
  })
})
