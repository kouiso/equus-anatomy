import { describe, expect, it } from 'vitest'
import { bbox, flipPointX } from '../geometry'
import { pointInPolygon } from '../hit-test'
import { GEOMETRY } from './index'

/**
 * 咬筋は頬骨弓・顔面稜から下顎枝と下顎角に付く（UMN Large Animal Anatomy「neck-head」/ PubMed 39462227）。
 * 左側望の骨格図（skeleton_left.jpg、筋肉図と同じ座標）で読んだランドマーク:
 *   - 下顎枝の前縁（臼歯列の後端）: x≈255
 *   - 下顎枝・下顎角の後縁: x≈337。x≥340 は環椎・頸椎、その間は黒い隙間
 *   - 顔面稜〜顎関節の高さ: y≈160、下顎角の下縁: y≈310
 * 旧ポリゴン（x204–292）は臼歯の上の下顎体＝頬の前寄りに乗っとった（獣医指摘）。
 */
const RAMUS = { xMin: 250, xMax: 340, yMin: 155, yMax: 316 } as const
const OLD_CHEEK_ANCHOR = [247, 282] as const

const masseterOf = (view: 'left' | 'right') => {
  const p = GEOMETRY[view].parts.find((q) => q.id === 'muscle-masseter')
  if (!p?.labelAt) throw new Error(`${view}: muscle-masseter の labelAt が無い`)
  return { points: p.points, labelAt: p.labelAt }
}

describe('咬筋の位置（下顎枝〜下顎角）', () => {
  it('left: 輪郭が下顎枝の範囲に収まり、臼歯の上にも頸椎側にもはみ出さない', () => {
    const b = bbox(masseterOf('left').points)
    expect(b.x).toBeGreaterThanOrEqual(RAMUS.xMin)
    expect(b.x + b.w).toBeLessThanOrEqual(RAMUS.xMax)
    expect(b.y).toBeGreaterThanOrEqual(RAMUS.yMin)
    expect(b.y + b.h).toBeLessThanOrEqual(RAMUS.yMax)
  })

  it('left: 点は輪郭の中、下顎枝の上にある', () => {
    const m = masseterOf('left')
    expect(pointInPolygon(m.labelAt, m.points)).toBe(true)
    expect(m.labelAt[0]).toBeGreaterThanOrEqual(270)
    expect(m.labelAt[0]).toBeLessThanOrEqual(320)
  })

  it('left: 頸椎（環椎・軸椎）の輪郭に入らない', () => {
    const atlas = GEOMETRY.left.parts.find((q) => q.id === 'bone-atlas-axis')
    expect(atlas).toBeDefined()
    const m = masseterOf('left')
    expect(bbox(m.points).x + bbox(m.points).w).toBeLessThanOrEqual(bbox(atlas!.points).x)
  })

  it('left: 板状筋の前端は下顎枝の後ろに収まる', () => {
    // 旧データは前端が x≈296 まで出ていて、下顎枝の後縁（x≈337）に置き直した
    // 咬筋と重なっていた。前端が枝の後ろで止まっていることを固定する
    const splenius = GEOMETRY.left.parts.find((q) => q.id === 'muscle-splenius')
    expect(splenius).toBeDefined()
    expect(bbox(splenius!.points).x).toBeGreaterThanOrEqual(338)
  })

  it('left: 旧位置（臼歯の上の頬）を叩いても咬筋にならない', () => {
    expect(pointInPolygon([...OLD_CHEEK_ANCHOR], masseterOf('left').points)).toBe(false)
  })

  it('right: 左のミラーで同じ位置に出る', () => {
    const w = GEOMETRY.left.size.w
    const l = masseterOf('left')
    const r = masseterOf('right')
    expect(r.labelAt).toEqual(flipPointX(l.labelAt, w))
    expect(pointInPolygon(r.labelAt, r.points)).toBe(true)
    expect(pointInPolygon(flipPointX([...OLD_CHEEK_ANCHOR], w), r.points)).toBe(false)
  })
})
