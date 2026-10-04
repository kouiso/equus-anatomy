import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './data'
import { fallbackDepth, hasLayerPlate, hasPlate } from './plate-availability'
import type { ImageRef, ViewGeometry } from './types'

/** テスト用の最小ジオメトリ。画像の有無だけ見るので他は空でよい。 */
function stub(images: ViewGeometry['images']): ViewGeometry {
  return {
    view: 'left',
    size: { w: 100, h: 100 },
    images,
    measuredOn: 'skin',
    frame: [],
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
