/**
 * 同じ層の部位どうしがどれだけ重なっとるかを測る。
 *
 * 「境界は概算」で終わらせると、どれくらい概算なのか誰にも分からん。
 * 隣り合う筋が大きく重なっとったら、境界の引き方が間違うとる証拠になる。
 * 完全に重ならんのが正しいわけでもない（骨や内臓は投影上ほんまに重なる）ので、
 * 落とすんやのうて数字を出して人が判断する材料にする。
 */
import { readFileSync } from 'node:fs'
import { BLOCK } from './silhouette'
import { pointInPolygon } from '../src/core/hit-test'
import { area as polyArea, bbox } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { Point, Polygon } from '../src/core/types'

const view = process.argv[2] ?? 'left'
const rf = JSON.parse(readFileSync(`src/core/data/regions/${view}.json`, 'utf8')) as {
  size: { w: number; h: number }
  parts: { id: string; layer: string; depth?: string; points: Point[] }[]
}

/** ブロック格子に焼いて集合として扱う。多角形どうしの交差を厳密に解くより単純で十分。 */
function cells(poly: Polygon): Set<number> {
  const b = bbox(poly)
  const out = new Set<number>()
  const bw = Math.ceil(rf.size.w / BLOCK)
  for (let y = Math.floor(b.y / BLOCK); y <= Math.floor((b.y + b.h) / BLOCK); y++) {
    for (let x = Math.floor(b.x / BLOCK); x <= Math.floor((b.x + b.w) / BLOCK); x++) {
      if (pointInPolygon([x * BLOCK + BLOCK / 2, y * BLOCK + BLOCK / 2], poly)) out.add(y * bw + x)
    }
  }
  return out
}

const groups = new Map<string, typeof rf.parts>()
for (const p of rf.parts) {
  const key = `${p.layer}${p.depth ? `/${p.depth}` : ''}`
  groups.set(key, [...(groups.get(key) ?? []), p])
}

let worst = 0
for (const [key, parts] of groups) {
  console.log(`\n【${key}】${parts.length} 件`)
  const grid = new Map(parts.map((p) => [p.id, cells(p.points)]))
  const rows: string[] = []
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i]!
      const b = parts[j]!
      const ca = grid.get(a.id)!
      const cb = grid.get(b.id)!
      let shared = 0
      for (const c of ca) if (cb.has(c)) shared++
      if (shared === 0) continue
      // 小さい方に対する割合。小さい部位が大きい部位に飲まれとらんかを見る
      const ratio = shared / Math.min(ca.size, cb.size)
      if (ratio > worst) worst = ratio
      if (ratio >= 0.15) {
        rows.push(
          `  ${(STRUCTURE_BY_ID.get(a.id)?.nameJa ?? a.id).padEnd(8)} × ${(STRUCTURE_BY_ID.get(b.id)?.nameJa ?? b.id).padEnd(8)}` +
            ` 重なり ${(ratio * 100).toFixed(0)}%`,
        )
      }
    }
  }
  if (rows.length === 0) console.log('  重なり 15% 以上の組は無し')
  else rows.sort().forEach((r) => console.log(r))

  // 重心が他の部位の中に入っとらんか。入っとったらタップしても別の部位が出る恐れがある
  for (const p of parts) {
    const c = polyArea(p.points) > 0 ? centroidOf(p.points) : null
    if (!c) continue
    for (const q of parts) {
      if (q.id === p.id) continue
      if (pointInPolygon(c, q.points)) {
        const smaller = polyArea(p.points) <= polyArea(q.points)
        console.log(
          `  ! ${STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id} の重心が ${STRUCTURE_BY_ID.get(q.id)?.nameJa ?? q.id} の中` +
            (smaller ? '（自分の方が小さいのでタップは自分が勝つ）' : '（自分の方が大きいのでタップで別の部位が出る）'),
        )
      }
    }
  }
}

function centroidOf(poly: Polygon): Point {
  let a2 = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!
    const q = poly[(i + 1) % poly.length]!
    const c = p[0] * q[1] - q[0] * p[1]
    a2 += c
    cx += (p[0] + q[0]) * c
    cy += (p[1] + q[1]) * c
  }
  return [cx / (3 * a2), cy / (3 * a2)]
}

console.log(`\n最大の重なり ${(worst * 100).toFixed(0)}%`)
