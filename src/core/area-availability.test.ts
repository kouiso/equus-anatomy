import { describe, expect, it } from 'vitest'
import { GEOMETRY, STRUCTURE_BY_ID } from './data'
import { areaHasParts } from './area-availability'
import { areaOfStructure } from './area-map'
import { centroid } from './geometry'
import { hitTestAreas, pointInPolygon } from './hit-test'
import { normalizeDepth } from './plate-availability'
import type { Depth, Layer, Point, Structure, View } from './types'

const ALL = [...STRUCTURE_BY_ID.values()]
const LAYERS: readonly Layer[] = ['skin', 'muscle', 'skeleton', 'organs']

const has = (view: View, areaId: string, layer: Layer) => areaHasParts(ALL, areaId, { view, layer })

describe('areaHasParts（実データ）', () => {
  it('後面・内臓: 尾も後肢も部位が無い（後面に出す内臓は無い）', () => {
    expect(has('rear', 'tail', 'organs')).toBe(false)
    expect(has('rear', 'hind', 'organs')).toBe(false)
  })

  it('後面・筋肉: 後肢は部位を持ち、尾は持たない', () => {
    expect(has('rear', 'hind', 'muscle')).toBe(true)
    expect(has('rear', 'tail', 'muscle')).toBe(false)
  })

  it('正面・皮膚: 体幹は無く、頭部は有る。正面・内臓: 体幹は有る（心臓・肺）', () => {
    expect(has('front', 'trunk', 'skin')).toBe(false)
    expect(has('front', 'head', 'skin')).toBe(true)
    expect(has('front', 'trunk', 'organs')).toBe(true)
  })

  it('左側望・内臓: 体幹だけが部位を持つ', () => {
    const withParts = ['head', 'neck', 'trunk', 'fore', 'hind', 'tail'].filter((id) => has('left', id, 'organs'))
    expect(withParts).toEqual(['trunk'])
  })

  it('層を替えると答えが替わる（左側望の尾: 皮膚・骨格は有り、筋肉・内臓は無い）', () => {
    expect(LAYERS.map((layer) => has('left', 'tail', layer))).toEqual([true, false, true, false])
  })

  it('深さは渡した時だけ絞る（左側望の筋肉・尾は表層でも深層でも無い）', () => {
    expect(areaHasParts(ALL, 'tail', { view: 'left', layer: 'muscle', depth: 'deep' })).toBe(false)
    expect(areaHasParts(ALL, 'hind', { view: 'left', layer: 'muscle', depth: 'superficial' })).toBe(true)
  })

  it('存在しない場所は false', () => {
    expect(areaHasParts(ALL, 'nowhere', { view: 'left', layer: 'skin' })).toBe(false)
  })

  it('向きに出さない部位は数えない（右側望に出さない部位だけの場所は空になる）', () => {
    const leftOnly: Structure = {
      id: 'x', layer: 'organs', nameJa: 'x', nameLa: 'x', nameEn: 'x', region: '腹腔',
      summary: '', body: '', function: '', views: ['left'],
    }
    expect(areaHasParts([leftOnly], 'trunk', { view: 'left', layer: 'organs' })).toBe(true)
    expect(areaHasParts([leftOnly], 'trunk', { view: 'right', layer: 'organs' })).toBe(false)
  })

  it('判定は部位データの独立な数え直しと一致し、置いた図形が有る場所は必ず押せる', () => {
    for (const view of ['left', 'right', 'front', 'rear'] as const) {
      for (const area of GEOMETRY[view].areas) {
        for (const layer of LAYERS) {
          const byData = ALL.some((s) => s.layer === layer && s.views.includes(view) && areaOfStructure(s) === area.id)
          expect(has(view, area.id, layer), `${view}/${area.id}/${layer}`).toBe(byData)
          const placed = GEOMETRY[view].parts.some((part) => {
            const s = STRUCTURE_BY_ID.get(part.id)
            return part.layer === layer && s !== undefined && areaOfStructure(s) === area.id
          })
          if (placed) expect(has(view, area.id, layer), `${view}/${area.id}/${layer} 図形あり`).toBe(true)
        }
      }
    }
  })

  it('空の組み合わせの一覧（左側望・正面・後面）。データが増減したらここで気づく', () => {
    const empty = (view: View) =>
      GEOMETRY[view].areas.flatMap((area) => LAYERS.filter((layer) => !has(view, area.id, layer)).map((layer) => `${area.id}/${layer}`))
    expect(empty('left')).toEqual(['head/organs', 'neck/organs', 'fore/organs', 'hind/organs', 'tail/muscle', 'tail/organs'])
    expect(empty('front')).toEqual(['head/organs', 'neck/organs', 'trunk/skin', 'trunk/muscle', 'fore/organs'])
    // 後面の体幹（下書き）は腎臓だけを持つので、皮膚・筋肉・骨格では空
    expect(empty('rear')).toEqual(['hind/organs', 'trunk/skin', 'trunk/muscle', 'trunk/skeleton', 'tail/muscle', 'tail/skeleton', 'tail/organs'])
    // 右側望は左側望の鏡像で、空の組み合わせも同じ 6 件（合計 18/52 には数えん）
    expect(empty('right')).toEqual(empty('left'))
    // 合計 18 / 52（左側望 6/24・正面 5/16・後面 7/12）
    const total = (['left', 'front', 'rear'] as const).map((view) => GEOMETRY[view].areas.length * LAYERS.length)
    expect(total.reduce((a, b) => a + b)).toBe(52)
    expect(empty('left').length + empty('front').length + empty('rear').length).toBe(18)
  })
})

describe('点の無い所のタップの落ち先（実データ・後面）', () => {
  const rear = GEOMETRY.rear
  const trunk = rear.areas.find((a) => a.id === 'trunk')
  if (!trunk) throw new Error('後面に体幹の場所が無い')
  // 体幹の帯の中で、後肢にも入り、尾には入らん点（帯の左端寄り）
  const xs = trunk.points.map((p) => p[0])
  const ys = trunk.points.map((p) => p[1])
  const inBand: Point = [Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * 0.25, (Math.min(...ys) + Math.max(...ys)) / 2]
  const pick = (layer: Layer) => hitTestAreas(inBand, rear.areas, (a) => has('rear', a.id, layer))?.id ?? null

  it('点は体幹と後肢の両方に入り、尾には入らん（前提）', () => {
    const ids = rear.areas.filter((a) => pointInPolygon(inBand, a.points)).map((a) => a.id)
    expect(ids.sort()).toEqual(['hind', 'trunk'])
  })

  it('皮膚・筋肉・骨格では体幹を飛ばして後肢、内臓では体幹', () => {
    expect(LAYERS.map(pick)).toEqual(['hind', 'hind', 'hind', 'trunk'])
  })
})

describe('点の無い所のタップの落ち先（実データ・正面・左右側望・後面の重なり）', () => {
  // 一番小さい場所をそのまま取る（部位の有無を見ない）と、部位の無い場所で行き止まりになる。
  // plain はその素朴な答え、byLayer は部位の無い場所を飛ばした今の答え（皮膚・筋肉・骨格・内臓の順）。
  // 両方を並べて、どの重なりで答えが替わったかを残す
  type Case = {
    readonly name: string
    readonly view: View
    readonly at: Point
    readonly inside: readonly string[]
    readonly plain: string
    readonly byLayer: readonly (string | null)[]
  }
  const W = GEOMETRY.left.size.w
  // 右側望は左側望を x → W - x で反転したデータなので、点も同じ式で反転して同じ答えになるかを見る
  const mirrored = (c: Case): Case => ({ ...c, name: c.name.replace('左側望', '右側望'), view: 'right', at: [W - c.at[0], c.at[1]] })

  const leftFore: Case = {
    // 前肢の上端は体幹の前寄りに食い込む。y=500 では体幹の左端が x≈636、前肢が x≈500〜747。
    // 頸部（x≦620）には入らん
    name: '左側望・前肢と体幹の重なり', view: 'left', at: [700, 500],
    inside: ['fore', 'trunk'], plain: 'fore', byLayer: ['fore', 'fore', 'fore', 'trunk'],
  }
  const leftHind: Case = {
    // 体幹の右端は x=1116（y=300〜564）、後肢の左端は x=1060（y=308〜588）。その間の帯。尾（x≧1292）には入らん
    name: '左側望・後肢と体幹の重なり', view: 'left', at: [1090, 450],
    inside: ['hind', 'trunk'], plain: 'hind', byLayer: ['hind', 'hind', 'hind', 'trunk'],
  }
  const leftTail: Case = {
    // 尾の付け根（左端 x=1292）が後肢の右端（y=397 で x≈1314）より内側に入り込んだ細い所。
    // 内臓は尾にも後肢にも部位が無く、体幹は指の下に無いので落ち先が無い
    name: '左側望・尾と後肢の重なり', view: 'left', at: [1304, 397],
    inside: ['hind', 'tail'], plain: 'tail', byLayer: ['tail', 'hind', 'tail', null],
  }
  const cases: readonly Case[] = [
    {
      // 体幹（y=396〜676）と前肢の上の箱（体幹と同じ輪郭）が重なる所。y=600 では左端が x≈116。
      // 頸部の下端 y=508 より下で、体幹の点 (261,529) から離れた左寄りに取る
      name: '正面・体幹と前肢の重なり', view: 'front', at: [150, 600],
      inside: ['fore', 'trunk'], plain: 'trunk', byLayer: ['fore', 'fore', 'trunk', 'trunk'],
    },
    {
      // 頸部の下半分（y=396〜508、左端 x=140）は体幹と前肢の上の箱に重なる。
      // 頭部の下端 y=388 より下で、頸部・体幹の点から離れた左寄りに取る
      name: '正面・頸部と体幹の重なり', view: 'front', at: [160, 470],
      inside: ['fore', 'neck', 'trunk'], plain: 'neck', byLayer: ['neck', 'neck', 'neck', 'trunk'],
    },
    leftFore, mirrored(leftFore),
    leftHind, mirrored(leftHind),
    leftTail, mirrored(leftTail),
    {
      // 尾の上の帯（x=212〜、右端は y=410 で x≈308）が体幹の帯（y=380〜532）と後肢をまたぐ所。
      // 後肢の股の切れ込み（y≧484）より上で、尾・体幹の点から離れた上寄りに取る
      name: '後面・尾と体幹の重なり', view: 'rear', at: [280, 410],
      inside: ['hind', 'tail', 'trunk'], plain: 'tail', byLayer: ['tail', 'hind', 'hind', 'trunk'],
    },
  ]
  // 場所の点の当たり半径は画面で 22px。全体表示の電話幅では画像でおよそ 40〜60px になる。
  // それより十分離して、点ではなく場所の多角形で落ち先が決まる所だと分かるようにする
  const FAR_FROM_MARKER = 80

  // 画面と同じく、深さは図のある方へ寄せてから数える（筋肉は今どの向きも表層の図だけ）
  const pick = (c: Case, layer: Layer, depth: Depth) => {
    const geometry = GEOMETRY[c.view]
    const scope = { view: c.view, layer, depth: normalizeDepth(geometry, layer, depth) }
    return hitTestAreas(c.at, geometry.areas, (a) => areaHasParts(ALL, a.id, scope))?.id ?? null
  }

  for (const c of cases) {
    describe(c.name, () => {
      const areas = GEOMETRY[c.view].areas

      it('点は狙った場所の重なりに入り、場所の点からは離れている（前提）', () => {
        expect(areas.filter((a) => pointInPolygon(c.at, a.points)).map((a) => a.id).sort()).toEqual(c.inside)
        for (const a of areas) {
          const at = a.labelAt ?? centroid(a.points)
          expect(Math.hypot(c.at[0] - at[0], c.at[1] - at[1]), `${a.id} の点から`).toBeGreaterThan(FAR_FROM_MARKER)
        }
      })

      it('部位の有無を見ずに一番小さい場所を取った時の答え（層に依らない）', () => {
        expect(hitTestAreas(c.at, areas)?.id).toBe(c.plain)
      })

      it('部位の無い場所を飛ばすと、層ごとの落ち先になる（表層・深層とも）', () => {
        for (const depth of ['superficial', 'deep'] as const) {
          expect(LAYERS.map((layer) => pick(c, layer, depth)), depth).toEqual(c.byLayer)
        }
      })
    })
  }
})
