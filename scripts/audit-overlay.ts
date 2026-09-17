/** 層ごとの画像へ部位ポリゴンと点を重ねて焼く監査用。ズレの一次審査に使う。 */
import { mkdirSync, readFileSync } from 'node:fs'
import { renderDebug, type Overlay } from './debug-render'
import { centroid } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { Part } from '../src/core/types'

const LAYER_IMAGE: Record<string, string> = {
  skin: 'skin',
  'muscle-superficial': 'muscle-superficial',
  'muscle-deep': 'muscle-superficial',
  skeleton: 'skeleton',
  organs: 'organs',
}

const PALETTE: [number, number, number][] = [
  [255, 80, 80], [80, 200, 255], [255, 200, 60], [160, 255, 120], [255, 130, 255],
  [255, 160, 60], [90, 255, 220], [200, 160, 255], [255, 255, 90], [120, 180, 255],
  [255, 110, 160], [140, 255, 160], [255, 200, 160], [160, 220, 255], [230, 160, 255],
]

for (const view of ['left', 'front', 'rear']) {
  const rf = JSON.parse(readFileSync(`src/core/data/regions/${view}.json`, 'utf8')) as {
    images: Record<string, { src: string }>
    parts: Part[]
  }
  const byImage = new Map<string, Part[]>()
  for (const p of rf.parts) {
    const key = `${p.layer}${p.depth ? `-${p.depth}` : ''}`
    const img = LAYER_IMAGE[key]
    if (!img) continue
    const list = byImage.get(img) ?? []
    list.push(p)
    byImage.set(img, list)
  }
  for (const [imgKey, parts] of byImage) {
    const src = rf.images[imgKey]?.src.replace('/anatomy/', '')
    if (!src) continue
    const overlays: Overlay[] = parts.map((p, i) => ({
      points: p.points,
      color: PALETTE[i % PALETTE.length]!,
      label: STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id,
    }))
    const dots = parts.map((p, i) => ({
      at: p.labelAt ?? centroid(p.points),
      color: PALETTE[i % PALETTE.length]!,
    }))
    mkdirSync('shots/audit', { recursive: true })
    const out = `shots/audit/${view}-${imgKey}.jpg`
    renderDebug({ imageFile: src, overlays, dots, out })
    console.log(out, parts.map((p) => `${STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id}`).join(','))
  }
}
