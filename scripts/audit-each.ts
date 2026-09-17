/** 部位を1つずつ拡大して焼く監査用。向きごとにディレクトリを分けて同名IDの上書きを防ぐ。 */
import { mkdirSync, readFileSync } from 'node:fs'
import { renderGrid } from './debug-render'
import { bbox } from '../src/core/geometry'
import type { Part } from '../src/core/types'

const LAYER_IMAGE: Record<string, string> = {
  skin: 'skin',
  'muscle-superficial': 'muscle-superficial',
  'muscle-deep': 'muscle-superficial',
  skeleton: 'skeleton',
  organs: 'organs',
}

for (const view of ['left', 'front', 'rear']) {
  const rf = JSON.parse(readFileSync(`src/core/data/regions/${view}.json`, 'utf8')) as {
    images: Record<string, { src: string }>
    parts: Part[]
  }
  const dir = `shots/audit/${view}`
  mkdirSync(dir, { recursive: true })
  for (const p of rf.parts) {
    const key = `${p.layer}${p.depth ? `-${p.depth}` : ''}`
    const src = rf.images[LAYER_IMAGE[key]!]?.src.replace('/anatomy/', '')
    if (!src) continue
    const b = bbox(p.points)
    const pad = Math.max(70, Math.max(b.w, b.h) * 0.45)
    renderGrid({
      imageFile: src,
      crop: {
        x: Math.round(b.x - pad),
        y: Math.round(b.y - pad),
        w: Math.round(b.w + pad * 2),
        h: Math.round(b.h + pad * 2),
      },
      step: 50,
      overlays: [{ points: p.points, color: [120, 255, 140] }],
      out: `${dir}/${p.id}.jpg`,
    })
  }
  console.log(`${view}: ${rf.parts.length}件 → ${dir}/`)
}
