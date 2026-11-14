import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './data'
import { fallbackDepth, hasLayerPlate, hasPlate, layerHasDepth, normalizeDepth } from './plate-availability'
import type { Depth, ImageRef, Layer, ViewGeometry } from './types'

/** テスト用の最小ジオメトリ。画像の有無だけ見るので他は空でよい。 */
function stub(images: ViewGeometry['images']): ViewGeometry {
  return {
    view: 'left',
    size: { w: 100, h: 100 },
    images,
    measuredOn: 'skin',
    frame: [],
    mask: { block: 1, bw: 1, bh: 1, size: { w: 100, h: 100 }, bits: new Uint8Array(1) },
    areas: [],
    parts: [],
  }
}

const img: ImageRef = { src: 'x.webp', hash: 'h' }

describe('hasPlate', () => {
  it('実データ: 深層筋の図は全向きで未登録、他は揃っている', () => {
    for (const g of Object.values(GEOMETRY)) {
      expect(hasPlate(g, 'muscle', 'deep'), `${g.view} muscle-deep`).toBe(false)
      expect(hasPlate(g, 'muscle', 'superficial'), `${g.view} muscle-superficial`).toBe(true)
      expect(hasPlate(g, 'skin', 'superficial')).toBe(true)
      expect(hasPlate(g, 'skeleton', 'superficial')).toBe(true)
      expect(hasPlate(g, 'organs', 'superficial')).toBe(true)
    }
  })

  it('筋肉以外の層は深さを無視する（skin+deep でも skin の図を見る）', () => {
    expect(hasPlate(GEOMETRY.left, 'skin', 'deep')).toBe(true)
    expect(hasPlate(stub({ skin: img }), 'skin', 'deep')).toBe(true)
    expect(hasPlate(stub({}), 'skin', 'superficial')).toBe(false)
  })
})

describe('hasLayerPlate', () => {
  it('筋肉は表層か深層どちらかの図があれば選んでよい', () => {
    expect(hasLayerPlate(stub({ 'muscle-superficial': img }), 'muscle')).toBe(true)
    expect(hasLayerPlate(stub({ 'muscle-deep': img }), 'muscle')).toBe(true)
    expect(hasLayerPlate(stub({}), 'muscle')).toBe(false)
  })

  it('筋肉以外はその層の図の有無そのもの', () => {
    expect(hasLayerPlate(stub({ skeleton: img }), 'skeleton')).toBe(true)
    expect(hasLayerPlate(stub({}), 'skeleton')).toBe(false)
  })
})

describe('fallbackDepth', () => {
  it('選んだ深さの図があるならそのまま返す', () => {
    expect(fallbackDepth(GEOMETRY.left, 'superficial')).toBe('superficial')
    expect(fallbackDepth(stub({ 'muscle-deep': img }), 'deep')).toBe('deep')
  })

  it('深層筋の図が無いとき表層筋へ寄せる（Issue #64 の行き止まり防止）', () => {
    expect(fallbackDepth(GEOMETRY.left, 'deep')).toBe('superficial')
  })

  it('表層が無く深層だけあるなら深層へ寄せる', () => {
    expect(fallbackDepth(stub({ 'muscle-deep': img }), 'superficial')).toBe('deep')
  })

  it('どちらの図も無ければ元の値を返す（呼び出し側で適用不可にする）', () => {
    expect(fallbackDepth(stub({}), 'deep')).toBe('deep')
    expect(fallbackDepth(stub({}), 'superficial')).toBe('superficial')
  })
})

/**
 * 特性化テスト（R2）: 層ごとに「深さがどこへ寄るか」を、今の挙動のまま固定する。
 * 筋肉だけが深さで図が分かれ、他の層は深さを触らない。
 * 画面（解剖・条件オーバーレイ）はこの寄せ方に頼っているので、規則を動かしても表は変えない。
 */
describe('層ごとの深さの寄せ先（特性化）', () => {
  const plates = {
    なし: stub({}),
    表層のみ: stub({ 'muscle-superficial': img }),
    深層のみ: stub({ 'muscle-deep': img }),
    両方: stub({ 'muscle-superficial': img, 'muscle-deep': img }),
  }
  type Case = { plate: keyof typeof plates; layer: Layer; depth: Depth; expected: Depth }
  const cases: Case[] = []
  const muscleExpected: Record<keyof typeof plates, Record<Depth, Depth>> = {
    なし: { superficial: 'superficial', deep: 'deep' },
    表層のみ: { superficial: 'superficial', deep: 'superficial' },
    深層のみ: { superficial: 'deep', deep: 'deep' },
    両方: { superficial: 'superficial', deep: 'deep' },
  }
  for (const plate of Object.keys(plates) as (keyof typeof plates)[]) {
    for (const depth of ['superficial', 'deep'] as const) {
      cases.push({ plate, layer: 'muscle', depth, expected: muscleExpected[plate][depth] })
      for (const layer of ['skin', 'skeleton', 'organs'] as const) {
        cases.push({ plate, layer, depth, expected: depth })
      }
    }
  }

  it.each(cases)('図=$plate 層=$layer 深さ=$depth → $expected', ({ plate, layer, depth, expected }) => {
    expect(normalizeDepth(plates[plate], layer, depth)).toBe(expected)
  })

  it('layerHasDepth は筋肉だけが真', () => {
    expect(layerHasDepth('muscle')).toBe(true)
    for (const layer of ['skin', 'skeleton', 'organs'] as const) expect(layerHasDepth(layer)).toBe(false)
  })
})
