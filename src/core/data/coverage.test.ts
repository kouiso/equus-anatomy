import { describe, expect, it } from 'vitest'
import { GEOMETRY, STRUCTURES } from './index'
import { areaOfStructure } from '../area-map'
import type { View } from '../types'

/**
 * 配置がどこまで進んどるかをテストで固定する。
 * 「いつの間にか減っとった」「いつの間にか下書きが実測に化けとった」を防ぐ。
 * 数を増やしたらここも直す。直さんとテストが落ちるので、状態が黙って変わらん。
 */
describe('座標の配置状況', () => {
  const placed = (v: View) => GEOMETRY[v].parts.length
  const expected = (v: View) => STRUCTURES.filter((s) => s.views.includes(v)).length

  it('左側望は 46 / 52。残り6件は置けん理由がはっきりしとる', () => {
    expect(placed('left')).toBe(46)
    expect(expected('left')).toBe(52)
    const ids = new Set(GEOMETRY.left.parts.map((p) => p.id))
    const missing = STRUCTURES.filter((s) => s.views.includes('left') && !ids.has(s.id)).map((s) => s.id)
    expect(missing.sort()).toEqual([
      // 深層筋の図が元アプリにも存在せん。絵が無いものは置けん
      'muscle-iliopsoas',
      'muscle-infraspinatus',
      'muscle-subclavius',
      'muscle-supraspinatus',
      // 左側望の図では他の腸管と見分けがつかん
      'organ-bladder',
      'organ-cecum',
    ])
  })

  it('右側望は左側望と同じ数（反転して使い回す）', () => {
    expect(placed('right')).toBe(placed('left'))
  })

  it('正面と後面はまだ空。隠さず 0 と分かる', () => {
    expect(placed('front')).toBe(0)
    expect(placed('rear')).toBe(0)
  })

  it('層ごとの内訳', () => {
    const count = (l: string) => GEOMETRY.left.parts.filter((p) => p.layer === l).length
    expect({ skin: count('skin'), muscle: count('muscle'), skeleton: count('skeleton'), organs: count('organs') }).toEqual(
      { skin: 11, muscle: 13, skeleton: 14, organs: 8 },
    )
  })

  it('実測は7件、下書きは39件。混ざっとらん', () => {
    const m = GEOMETRY.left.parts.filter((p) => p.source === 'measured').map((p) => p.id).sort()
    expect(m).toEqual([
      'skin-cannon',
      'skin-ear',
      'skin-head',
      'skin-hock',
      'skin-hoof',
      'skin-neck',
      'skin-tail',
    ])
    expect(GEOMETRY.left.parts.filter((p) => p.source === 'draft').length).toBe(39)
  })

  it('置いた部位は全部どこかの場所に属す（選んでも出てこん部位が無い）', () => {
    for (const p of GEOMETRY.left.parts) {
      const s = STRUCTURES.find((x) => x.id === p.id)!
      expect(areaOfStructure(s), p.id).not.toBeNull()
    }
  })

  it('どの場所を選んでも、その層に1件は出る組み合わせがある（行き止まりを作らん）', () => {
    for (const a of GEOMETRY.left.areas) {
      const inArea = GEOMETRY.left.parts.filter((p) => {
        const s = STRUCTURES.find((x) => x.id === p.id)!
        return areaOfStructure(s) === a.id
      })
      expect(inArea.length, `${a.nameJa} に部位が1件も無い`).toBeGreaterThan(0)
    }
  })
})
