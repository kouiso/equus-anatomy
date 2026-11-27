import { describe, expect, it } from 'vitest'
import { GEOMETRY, STRUCTURES } from './index'
import { areaOfStructure } from '../area-map'
import { pointInPolygon } from '../hit-test'
import type { View } from '../types'

/**
 * 配置がどこまで進んどるかをテストで固定する。
 * 「いつの間にか減っとった」「いつの間にか下書きが実測に化けとった」を防ぐ。
 * 数を増やしたらここも直す。直さんとテストが落ちるので、状態が黙って変わらん。
 */
describe('座標の配置状況', () => {
  const placed = (v: View) => GEOMETRY[v].parts.length
  const expected = (v: View) => STRUCTURES.filter((s) => s.views.includes(v)).length

  it('左側望は図形85件 / 期待89件。未配置は5件で理由がはっきりしとる（liver図形は右側望反転用に残す）', () => {
    expect(placed('left')).toBe(85)
    expect(expected('left')).toBe(89)
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
      // organ-cecum / organ-liver は右側の臓器なので左側望の対象外。
      // liver の図形は left.json に残し、右側望の反転表示にだけ使う
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
    // 右だけ: 盲腸は右側の臓器。肝臓も主体が右（解説文が「主に右側」と明言）。
    // 肝臓の図形は左側望計測のまま残し、右側望では反転して出す
    expect(views('organ-cecum')).toEqual(['right'])
    expect(views('organ-liver')).toEqual(['right'])
  })

  it('正面は 28 / 29。残り1件は深層筋の図が無い', () => {
    expect(placed('front')).toBe(28)
    expect(expected('front')).toBe(29)
    const ids = new Set(GEOMETRY.front.parts.map((p) => p.id))
    expect(STRUCTURES.filter((s) => s.views.includes('front') && !ids.has(s.id)).map((s) => s.id)).toEqual([
      'muscle-subclavius',
    ])
  })

  it('後面は 12 / 12。全部置いてある', () => {
    expect(placed('rear')).toBe(12)
    expect(expected('rear')).toBe(12)
  })

  it('場所は「どれかの層に部位が1件以上ある区分」だけ作る（正面に後肢は無い。後面の体幹は内臓の腎臓と膀胱だけ）', () => {
    expect(GEOMETRY.front.areas.map((a) => a.id).sort()).toEqual(['fore', 'head', 'neck', 'trunk'])
    expect(GEOMETRY.rear.areas.map((a) => a.id).sort()).toEqual(['hind', 'tail', 'trunk'])
  })

  it('後面の腎臓と膀胱は、輪郭の内側のどこを叩いても体幹に入る（全体表示で体幹が選べる）', () => {
    // 膀胱は後肢の間（馬体マスクの外）にも出るので、体幹の枠が膀胱の底まで無いと、
    // 全体表示で膀胱を叩いても後肢・尾にしか落ちず何も起きなかった（#215）
    const trunk = GEOMETRY.rear.areas.find((a) => a.id === 'trunk')
    expect(trunk, '後面の体幹').toBeDefined()
    for (const id of ['organ-kidney', 'organ-bladder']) {
      const part = GEOMETRY.rear.parts.find((p) => p.id === id)
      expect(part, id).toBeDefined()
      const xs = part!.points.map((p) => p[0])
      const ys = part!.points.map((p) => p[1])
      let samples = 0
      const outside: string[] = []
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) {
        for (let y = Math.min(...ys); y <= Math.max(...ys); y += 2) {
          if (!pointInPolygon([x, y], part!.points)) continue
          samples++
          if (!pointInPolygon([x, y], trunk!.points)) outside.push(`(${x},${y})`)
        }
      }
      expect(samples, `${id} の標本`).toBeGreaterThan(100)
      expect(outside.slice(0, 5), `${id}: 体幹の外に出る点 ${outside.length} / ${samples}`).toEqual([])
    }
  })

  it('層ごとの内訳', () => {
    const count = (l: string) => GEOMETRY.left.parts.filter((p) => p.layer === l).length
    expect({ skin: count('skin'), muscle: count('muscle'), skeleton: count('skeleton'), organs: count('organs') }).toEqual(
      { skin: 30, muscle: 17, skeleton: 30, organs: 8 },
    )
  })

  it('実測は6件、下書きは79件。混ざっとらん', () => {
    const m = GEOMETRY.left.parts.filter((p) => p.source === 'measured').map((p) => p.id).sort()
    expect(m).toEqual([
      'skin-cannon',
      'skin-ear',
      'skin-head',
      'skin-hock',
      'skin-neck',
      'skin-tail',
    ])
    expect(GEOMETRY.left.parts.filter((p) => p.source === 'draft').length).toBe(79)
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
