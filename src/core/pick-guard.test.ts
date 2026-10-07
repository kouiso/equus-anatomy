import { describe, expect, it } from 'vitest'
import { PART_PICK_GUARD_MS, pickGuardActive } from './pick-guard'

describe('pickGuardActive', () => {
  it('切替前は猶予が効かない', () => {
    expect(pickGuardActive(null, 1000)).toBe(false)
  })

  it('切替直後は部位判定を猶予する', () => {
    expect(pickGuardActive(1000, 1000)).toBe(true)
    expect(pickGuardActive(1000, 1000 + PART_PICK_GUARD_MS - 1)).toBe(true)
  })

  it('猶予時間を過ぎたら通常通り判定する', () => {
    expect(pickGuardActive(1000, 1000 + PART_PICK_GUARD_MS)).toBe(false)
    expect(pickGuardActive(1000, 1000 + PART_PICK_GUARD_MS + 500)).toBe(false)
  })
})
