import { describe, expect, it } from 'vitest'
import { areaOfRegion, unmappedRegions } from './area-map'
import { STRUCTURES } from './data/structures'
import { AREA_PRESETS } from './data/areas'

describe('region と場所の対応', () => {
  it('解説データに出てくる region が全部どこかの場所に落ちる', () => {
    expect(unmappedRegions(STRUCTURES)).toEqual([])
  })

  it('対応先は必ず実在する場所', () => {
    const ids = new Set<string>(AREA_PRESETS.map((a) => a.id))
    for (const s of STRUCTURES) {
      const a = areaOfRegion(s.region)
      expect(a, `${s.id} の region ${s.region}`).not.toBeNull()
      expect(ids.has(a!), `${a} は AREA_PRESETS に無い`).toBe(true)
    }
  })

  it('内臓の胸腔・腹腔は体幹に寄る', () => {
    expect(areaOfRegion('胸腔')).toBe('trunk')
    expect(areaOfRegion('腹腔')).toBe('trunk')
  })

  it('前躯（肩まわり）は前肢に寄る', () => {
    expect(areaOfRegion('前躯')).toBe('fore')
  })

  it('知らん region は null（黙って別の場所へ落とさん）', () => {
    expect(areaOfRegion('そんな区分はない')).toBeNull()
  })
})
