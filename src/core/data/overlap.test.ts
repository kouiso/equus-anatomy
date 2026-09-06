import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './index'
import { area, bbox } from '../geometry'
import { pointInPolygon } from '../hit-test'
import { centroid } from '../geometry'
import type { Part, Polygon } from '../types'

const CELL = 8

/** ブロック格子に焼いて集合として扱う。多角形の厳密な交差を解くより単純で十分。 */
function cells(poly: Polygon): Set<string> {
  const b = bbox(poly)
  const out = new Set<string>()
  for (let y = Math.floor(b.y / CELL); y <= Math.floor((b.y + b.h) / CELL); y++) {
    for (let x = Math.floor(b.x / CELL); x <= Math.floor((b.x + b.w) / CELL); x++) {
      if (pointInPolygon([x * CELL + CELL / 2, y * CELL + CELL / 2], poly)) out.add(`${x},${y}`)
    }
  }
  return out
}

const groupsOf = (parts: readonly Part[]) => {
  const g = new Map<string, Part[]>()
  for (const p of parts) {
    const k = `${p.layer}${p.depth ? `/${p.depth}` : ''}`
    g.set(k, [...(g.get(k) ?? []), p])
  }
  return g
}

describe('部位どうしの重なり', () => {
  const parts = GEOMETRY.left.parts

  it('大きい部位の重心が小さい部位の中に入っとらん（タップで別の部位が出る状態を作らん）', () => {
    for (const [, group] of groupsOf(parts)) {
      for (const p of group) {
        const c = centroid(p.points)
        for (const q of group) {
          if (q.id === p.id) continue
          if (!pointInPolygon(c, q.points)) continue
          // 当たり判定は面積の小さい方が勝つ。自分の方が大きいと、自分の重心を叩いても q が出る
          expect(area(p.points), `${p.id} の重心が ${q.id} の中にあり、${p.id} の方が大きい`).toBeLessThanOrEqual(
            area(q.points),
          )
        }
      }
    }
  })

  it('筋どうしの重なりは 20% 以下（境界の引き方が崩れたら気づける）', () => {
    const muscles = parts.filter((p) => p.layer === 'muscle')
    const grid = new Map(muscles.map((p) => [p.id, cells(p.points)]))
    for (let i = 0; i < muscles.length; i++) {
      for (let j = i + 1; j < muscles.length; j++) {
        const a = grid.get(muscles[i]!.id)!
        const b = grid.get(muscles[j]!.id)!
        let shared = 0
        for (const c of a) if (b.has(c)) shared++
        const ratio = shared / Math.min(a.size, b.size)
        expect(ratio, `${muscles[i]!.id} × ${muscles[j]!.id}`).toBeLessThanOrEqual(0.2)
      }
    }
  })

  it('骨と内臓は投影上ほんまに重なるので、重なり自体は許す（肩甲骨は肋骨の上にある）', () => {
    const scapula = parts.find((p) => p.id === 'bone-scapula')!
    const ribs = parts.find((p) => p.id === 'bone-ribs')!
    const a = cells(scapula.points)
    const b = cells(ribs.points)
    let shared = 0
    for (const c of a) if (b.has(c)) shared++
    expect(shared / a.size).toBeGreaterThan(0.5)
    // 重なっとっても、小さい肩甲骨の方がタップで勝つ
    expect(area(scapula.points)).toBeLessThan(area(ribs.points))
  })

  it('どの部位も面積がゼロやない', () => {
    for (const p of parts) expect(area(p.points), p.id).toBeGreaterThan(0)
  })
})
