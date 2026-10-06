import { describe, expect, it } from 'vitest'
import { centroid } from '../geometry'
import { onHorse } from '../mask'
import type { View } from '../types'
import { fit, pan, pinch, zoomByStep } from '../zoom'
import { GEOMETRY } from './index'

const VIEWS: readonly View[] = ['left', 'right', 'front', 'rear']

const center = (vb: { x: number; y: number; w: number; h: number }) => [vb.x + vb.w / 2, vb.y + vb.h / 2] as const

/**
 * #65 回帰。左側望で「上限ズーム → パン繰り返し → 全面黒」が起きた。
 * 実データのマスクで、どれだけ端へパン/ピンチしても画面中心が馬体の上に
 * 留まる（= 絵が必ず画面内に残る）ことを確かめる。
 */
describe('馬体マスク（#65）', () => {
  it.each(VIEWS)('%s: 上限ズームで四端へパンしても画面中心は馬体の上に留まる', (view) => {
    const g = GEOMETRY[view]
    let vb = fit(g.size)
    for (let i = 0; i < 12; i++) vb = zoomByStep(vb, 1.6, g.size, g.mask)
    const extremes = [
      [1e6, 0],
      [-1e6, 0],
      [0, 1e6],
      [0, -1e6],
      [1e6, 1e6],
      [-1e6, -1e6],
      [1e6, -1e6],
      [-1e6, 1e6],
    ] as const
    for (const [dx, dy] of extremes) {
      const after = pan(vb, dx, dy, g.size, g.mask)
      const [cx, cy] = center(after)
      expect(onHorse(g.mask, cx, cy), `${view} center (${cx},${cy})`).toBe(true)
    }
  })

  it.each(VIEWS)('%s: 黒背景を狙ったピンチ連打でも画面中心は馬体の上に留まる', (view) => {
    const g = GEOMETRY[view]
    // 四隅方向のアンカーでピンチインし続ける（実機でも同症状に到達した手順）
    for (const anchor of [
      [0, 0],
      [g.size.w, 0],
      [0, g.size.h],
      [g.size.w, g.size.h],
    ] as const) {
      let vb = fit(g.size)
      for (let i = 0; i < 30; i++) vb = pinch(vb, anchor, 1.4, g.size, g.mask)
      const [cx, cy] = center(vb)
      expect(onHorse(g.mask, cx, cy), `${view} anchor ${anchor} center (${cx},${cy})`).toBe(true)
    }
  })

  it('どの向きのどの層でも、部位の点は馬体の上（＝どの部位へも寄れる）', () => {
    for (const view of VIEWS) {
      const g = GEOMETRY[view]
      for (const p of g.parts) {
        const at = p.labelAt ?? centroid(p.points)
        expect(onHorse(g.mask, at[0], at[1]), `${view}/${p.id}`).toBe(true)
      }
      for (const a of g.areas) {
        const at = a.labelAt ?? centroid(a.points)
        expect(onHorse(g.mask, at[0], at[1]), `${view}/area:${a.id}`).toBe(true)
      }
    }
  })

  it('右側望のマスクは左側望の左右反転', () => {
    const l = GEOMETRY.left.mask
    const r = GEOMETRY.right.mask
    expect(r.bw).toBe(l.bw)
    expect(r.bh).toBe(l.bh)
    for (let y = 0; y < l.bh; y++) {
      for (let x = 0; x < l.bw; x++) {
        expect(r.bits[y * r.bw + (r.bw - 1 - x)]).toBe(l.bits[y * l.bw + x])
      }
    }
  })
})
