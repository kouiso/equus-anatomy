import { describe, expect, it } from 'vitest'
import { decodeBits, flipMaskX, makeMask, nearestOnHorse, onHorse, unionMasks } from './mask'
import type { HorseMask } from './types'

/** on(bx,by) が true のブロックを立てただけの試験用マスク。 */
const maskFrom = (bw: number, bh: number, on: (bx: number, by: number) => boolean): HorseMask => {
  const bits = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (on(x, y)) bits[y * bw + x] = 1
    }
  }
  return makeMask({ block: 8, bw, bh, size: { w: bw * 8, h: bh * 8 }, bits })
}

describe('onHorse', () => {
  const m = maskFrom(10, 10, (x, y) => x === 5 && y === 5)
  it('ブロック内の点は true、外は false', () => {
    expect(onHorse(m, 44, 44)).toBe(true)
    expect(onHorse(m, 39, 39)).toBe(false)
    expect(onHorse(m, -1, 44)).toBe(false)
    expect(onHorse(m, 44, 999)).toBe(false)
  })
})

describe('nearestOnHorse', () => {
  const m = maskFrom(20, 20, (x, y) => (x >= 5 && x <= 9 && y >= 5 && y <= 9) || (x === 18 && y === 18))
  it('もう馬体の上ならその点をそのまま返す', () => {
    expect(nearestOnHorse(m, 45, 48)).toEqual([45, 48])
  })
  it('一番近いブロックへ、しかしブロック内で一番近い点へ寄せる', () => {
    // (15*8+4, 9*8+4) = (124, 76) のすぐ外。最近ブロックは (9,9) の角ではなく辺 (9,9) or (10?) ではなく
    // 実際: (124,76) → ブロック (15,9)。最近の馬体は (9,9)。x は 9*8+7=79 に、y は 76 のまま。
    expect(nearestOnHorse(m, 124, 76)).toEqual([79, 76])
  })
  it('遠い孤立ブロック上の点はそのまま返る', () => {
    expect(nearestOnHorse(m, 148, 148)).toEqual([148, 148])
  })
  it('馬体が無いマスクでは null', () => {
    const empty = maskFrom(5, 5, () => false)
    expect(nearestOnHorse(empty, 20, 20)).toBeNull()
  })
})

describe('unionMasks', () => {
  it('どれかが立っとれば立つ', () => {
    const a = maskFrom(4, 4, (x) => x === 1)
    const b = maskFrom(4, 4, (x) => x === 2)
    const u = unionMasks([a, b])!
    expect(u.bits[1]).toBe(1)
    expect(u.bits[2]).toBe(1)
    expect(u.bits[3]).toBe(0)
  })
  it('空なら null', () => expect(unionMasks([])).toBeNull())
})

describe('flipMaskX', () => {
  it('左右が入れ替わる', () => {
    const m = maskFrom(4, 2, (x, y) => x === 0 && y === 1)
    const f = flipMaskX(m)
    expect(f.bits[1 * 4 + 3]).toBe(1)
    expect(f.bits[1 * 4 + 0]).toBe(0)
  })
})

describe('decodeBits', () => {
  it('base64 をバイト列に戻す', () => {
    expect(decodeBits('AAEC+v8=')).toEqual(new Uint8Array([0, 1, 2, 250, 255]))
  })
})
