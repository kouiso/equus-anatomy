import { describe, expect, it } from 'vitest'
import { STRUCTURE_BY_ID } from './data'
import { areaOfStructure } from './area-map'
import { isStructureVisible, visibleStructures } from './visible-parts'
import type { Structure } from './types'

const ALL = [...STRUCTURE_BY_ID.values()]

function structure(overrides: Partial<Structure>): Structure {
  return {
    id: 'x',
    layer: 'organs',
    nameJa: 'x',
    nameLa: 'x',
    nameEn: 'x',
    region: '腹腔',
    summary: '',
    body: '',
    function: '',
    views: ['left'],
    ...overrides,
  } as Structure
}

describe('isStructureVisible', () => {
  it('出さない向きでは、場所・層・深さが合っても出さない', () => {
    const leftOnly = structure({ views: ['left'] })
    expect(isStructureVisible(leftOnly, { view: 'left', areaId: 'trunk', layer: 'organs', depth: 'superficial' })).toBe(true)
    expect(isStructureVisible(leftOnly, { view: 'right', areaId: 'trunk', layer: 'organs', depth: 'superficial' })).toBe(false)
  })

  it('場所が null なら場所では絞らず、指定があれば別の場所を落とす', () => {
    const trunk = structure({ region: '腹腔', views: ['left'] })
    expect(isStructureVisible(trunk, { view: 'left', areaId: null })).toBe(true)
    expect(isStructureVisible(trunk, { view: 'left', areaId: 'neck' })).toBe(false)
  })

  it('層・深さは渡した時だけ絞り、depth を持たない部位はどの深さでも出す', () => {
    const noDepth = structure({ layer: 'skeleton' })
    const deep = structure({ layer: 'muscle', depth: 'deep' })
    expect(isStructureVisible(noDepth, { view: 'left', areaId: null, layer: 'skeleton', depth: 'deep' })).toBe(true)
    expect(isStructureVisible(noDepth, { view: 'left', areaId: null, layer: 'organs' })).toBe(false)
    expect(isStructureVisible(deep, { view: 'left', areaId: null, layer: 'muscle', depth: 'superficial' })).toBe(false)
    expect(isStructureVisible(deep, { view: 'left', areaId: null })).toBe(true)
  })
})

describe('visibleStructures（実データ）', () => {
  it('右側望・体幹・内臓に、左だけの部位（胃・脾臓）が入らない', () => {
    const ids = visibleStructures(ALL, { view: 'right', areaId: 'trunk', layer: 'organs', depth: 'superficial' }).map((s) => s.id)
    const leftOnly = ALL.filter((s) => s.layer === 'organs' && areaOfStructure(s) === 'trunk' && !s.views.includes('right'))
    expect(leftOnly.length).toBeGreaterThan(0)
    for (const s of leftOnly) expect(ids).not.toContain(s.id)
  })
})
