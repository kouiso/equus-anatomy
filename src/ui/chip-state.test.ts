import { describe, expect, it } from 'vitest'
import { chipVisual } from './chip-state'

describe('chipVisual', () => {
  it('通常時は selected だけで on/off が決まる', () => {
    expect(chipVisual(true, false)).toBe('on')
    expect(chipVisual(false, false)).toBe('off')
  })

  it('disabled は selected と共存しない: 押せないチップは選択中に見せない', () => {
    // Issue #64: 「グレー(disabled)なのに選択中」という曖昧表示の根絶
    expect(chipVisual(true, true)).toBe('disabled')
    expect(chipVisual(false, true)).toBe('disabled')
  })
})
