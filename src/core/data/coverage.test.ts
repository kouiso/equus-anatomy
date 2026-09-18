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

  it('左側望は 46 / 51。残り5件は置けん理由がはっきりしとる', () => {
    expect(placed('left')).toBe(46)
    expect(expected('left')).toBe(51)
    const ids = new Set(GEOMETRY.left.parts.map((p) => p.id))
    const missing = STRUCTURES.filter((s) => s.views.includes('left') && !ids.has(s.id)).map((s) => s.id)
    expect(missing.sort()).toEqual([
      // 深層筋の図が元アプリにも存在せん。絵が無いものは置けん
      'muscle-iliopsoas',
      'muscle-infraspinatus',
      'muscle-subclavius',
      'muscle-supraspinatus',
      // 膀胱は正中の臓器で、左側望の図では他の腸管と見分けがつかん
      'organ-bladder',
      // organ-cecum は右側の臓器なので左側望の対象外（views が ['right'] のみ）
    ])
  })

  it('右側望は左側望と同じ数（反転して使い回す）', () => {
    expect(placed('right')).toBe(placed('left'))
  })

  it('左右が違う臓器は存在する側にだけ載せる（反転表示で反対側に出すと解剖学的に嘘になる）', () => {
    const views = (id: string) => STRUCTURES.find((s) => s.id === id)!.views
    // 左だけ: 脾臓は左側の臓器。胃は主体が左（幽門部が正中を越える程度）
    expect(views('organ-spleen')).toEqual(['left'])
    expect(views('organ-stomach')).toEqual(['left'])
    // 右だけ: 盲腸は右側の臓器。右側望の図がまだ無いので位置は未登録のまま
    expect(views('organ-cecum')).toEqual(['right'])
  })

  it('正面は 22 / 23。残り1件は深層筋の図が無い', () => {
    expect(placed('front')).toBe(22)
    expect(expected('front')).toBe(23)
    const ids = new Set(GEOMETRY.front.parts.map((p) => p.id))
    expect(STRUCTURES.filter((s) => s.views.includes('front') && !ids.has(s.id)).map((s) => s.id)).toEqual([
      'muscle-subclavius',
    ])
  })

  it('後面は 10 / 10。全部置いてある', () => {
    expect(placed('rear')).toBe(10)
    expect(expected('rear')).toBe(10)
  })

  it('場所は「部位が1件以上ある区分」だけ作る（正面に後肢は無い）', () => {
    expect(GEOMETRY.front.areas.map((a) => a.id).sort()).toEqual(['fore', 'head', 'neck', 'trunk'])
    expect(GEOMETRY.rear.areas.map((a) => a.id).sort()).toEqual(['hind', 'tail'])
  })

  it('層ごとの内訳', () => {
    const count = (l: string) => GEOMETRY.left.parts.filter((p) => p.layer === l).length
    expect({ skin: count('skin'), muscle: count('muscle'), skeleton: count('skeleton'), organs: count('organs') }).toEqual(
      { skin: 11, muscle: 13, skeleton: 14, organs: 8 },
    )
  })

  it('実測は6件、下書きは40件。混ざっとらん', () => {
    const m = GEOMETRY.left.parts.filter((p) => p.source === 'measured').map((p) => p.id).sort()
    expect(m).toEqual([
      'skin-cannon',
      'skin-ear',
      'skin-head',
      'skin-hock',
      'skin-neck',
      'skin-tail',
    ])
    expect(GEOMETRY.left.parts.filter((p) => p.source === 'draft').length).toBe(40)
  })

  it('置いた部位は全部どこかの場所に属す（選んでも出てこん部位が無い）', () => {
    for (const p of GEOMETRY.left.parts) {
      const s = STRUCTURES.find((x) => x.id === p.id)!
      expect(areaOfStructure(s), p.id).not.toBeNull()
    }
  })

  it.each(['left', 'right', 'front', 'rear'] as const)(
    '%s: どの場所を選んでも1件は出る（行き止まりを作らん）',
    (view) => {
      for (const a of GEOMETRY[view].areas) {
        const inArea = GEOMETRY[view].parts.filter((p) => {
          const s = STRUCTURES.find((x) => x.id === p.id)!
          return areaOfStructure(s) === a.id
        })
        expect(inArea.length, `${view} の ${a.nameJa} に部位が1件も無い`).toBeGreaterThan(0)
      }
    },
  )

  it('4つの向きすべてに座標が入っとる', () => {
    for (const v of ['left', 'right', 'front', 'rear'] as const) {
      expect(GEOMETRY[v].parts.length, v).toBeGreaterThan(0)
      expect(GEOMETRY[v].areas.length, v).toBeGreaterThan(0)
    }
  })
})
