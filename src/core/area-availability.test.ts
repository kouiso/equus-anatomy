import { describe, expect, it } from 'vitest'
import { GEOMETRY, STRUCTURE_BY_ID } from './data'
import { areaHasParts } from './area-availability'
import type { Layer, Structure, View } from './types'

const ALL = [...STRUCTURE_BY_ID.values()]
const LAYERS: readonly Layer[] = ['skin', 'muscle', 'skeleton', 'organs']

const has = (view: View, areaId: string, layer: Layer) => areaHasParts(ALL, areaId, { view, layer })

describe('areaHasParts（実データ）', () => {
  it('後面・内臓: 尾は部位が無く、体幹は腎臓を持つ', () => {
    expect(has('rear', 'tail', 'organs')).toBe(false)
    expect(has('rear', 'hind', 'organs')).toBe(false)
    expect(has('rear', 'trunk', 'organs')).toBe(true)
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

  it('図形を持つ場所の押せる/押せないが、部位の有無と食い違わない（置いた部位が有る場所は必ず押せる）', () => {
    for (const view of ['left', 'right', 'front', 'rear'] as const) {
      for (const area of GEOMETRY[view].areas) {
        for (const layer of LAYERS) {
          const placed = GEOMETRY[view].parts.some(
            (part) => part.layer === layer && areaHasParts([STRUCTURE_BY_ID.get(part.id)!], area.id, { view, layer }),
          )
          if (placed) expect(has(view, area.id, layer), `${view}/${area.id}/${layer}`).toBe(true)
        }
      }
    }
  })

  it('空の組み合わせの一覧（左側望・正面・後面）。データが増減したらここで気づく', () => {
    const empty = (view: View) =>
      GEOMETRY[view].areas.flatMap((area) => LAYERS.filter((layer) => !has(view, area.id, layer)).map((layer) => `${area.id}/${layer}`))
    expect(empty('left')).toEqual(['head/organs', 'neck/organs', 'fore/organs', 'hind/organs', 'tail/muscle', 'tail/organs'])
    expect(empty('front')).toEqual(['head/organs', 'neck/organs', 'trunk/skin', 'trunk/muscle', 'fore/organs'])
    expect(empty('rear')).toEqual(['hind/organs', 'trunk/skin', 'trunk/muscle', 'trunk/skeleton', 'tail/muscle', 'tail/skeleton', 'tail/organs'])
  })
})
