/** 筋を1つずつ拡大して焼く。まとめて見ると細かいズレを見逃す。 */
import { readFileSync } from 'node:fs'
import { renderGrid } from './debug-render'
import { bbox } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { Point } from '../src/core/types'

const view = process.argv[2] ?? 'left'
const only = process.argv.slice(3)
const rf = JSON.parse(readFileSync(`src/core/data/regions/${view}.json`, 'utf8')) as {
  images: Record<string, { src: string }>
  measuredOn: string
  parts: { id: string; points: Point[] }[]
}
const image = rf.images[rf.measuredOn]!.src.replace('/anatomy/', '')

for (const p of rf.parts) {
  if (only.length > 0 && !only.some((o) => p.id.includes(o))) continue
  const b = bbox(p.points)
  const pad = Math.max(70, Math.max(b.w, b.h) * 0.45)
  renderGrid({
    imageFile: image,
    crop: {
      x: Math.round(b.x - pad),
      y: Math.round(b.y - pad),
      w: Math.round(b.w + pad * 2),
      h: Math.round(b.h + pad * 2),
    },
    step: 50,
    overlays: [{ points: p.points, color: [120, 255, 140] }],
    out: `shots/audit-${p.id}.jpg`,
  })
  console.log(`shots/audit-${p.id}.jpg  ${STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id}`)
}
