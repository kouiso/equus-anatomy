/**
 * VIA 2 / makesense.ai(VGG) / COCO で採った座標を regions JSON へ変換する。
 *
 *   pnpm import:annotations <入力ファイル> <向き left|front|rear> [出力先]
 *
 * どのツールも原寸ピクセルで吐くので、このアプリの viewBox（画像実寸）とは倍率変換が要らん。
 * label は structures.ts の id そのままか、日本語名で書いておく。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { STRUCTURES } from '../src/core/data/structures'
import { AREA_PRESETS } from '../src/core/data/areas'
import { centroid } from '../src/core/geometry'
import type { Point } from '../src/core/types'

type Shape = { kind: 'area' | 'part'; id: string; points: Point[] }

const [input, view, output] = process.argv.slice(2)
if (!input || !view || !['left', 'front', 'rear'].includes(view)) {
  console.error('使い方: pnpm import:annotations <入力.json> <left|front|rear> [出力.json]')
  process.exit(2)
}
const out = output ?? `src/core/data/regions/${view}.json`
if (!existsSync(input)) {
  console.error(`入力が無い: ${input}`)
  process.exit(2)
}

/** ラベルから id を引く。id そのもの → 日本語名 → 大まかな場所 の順で探す。 */
function resolve(label: string): { kind: 'area' | 'part'; id: string } | null {
  const t = label.trim()
  const byId = STRUCTURES.find((s) => s.id === t)
  if (byId) return { kind: 'part', id: byId.id }
  const byJa = STRUCTURES.find((s) => s.nameJa === t)
  if (byJa) return { kind: 'part', id: byJa.id }
  const area = AREA_PRESETS.find((a) => a.id === t || a.nameJa === t)
  if (area) return { kind: 'area', id: area.id }
  return null
}

const raw: unknown = JSON.parse(readFileSync(input, 'utf8'))
const shapes: Shape[] = []
const unknown: string[] = []
const skipped: string[] = []

const push = (label: string, points: Point[]) => {
  const hit = resolve(label)
  if (!hit) return unknown.push(label)
  if (points.length < 3) return skipped.push(`${label}（頂点 ${points.length} 個）`)
  shapes.push({ kind: hit.kind, id: hit.id, points })
}

if (isCoco(raw)) {
  const cats = new Map(raw.categories.map((c) => [c.id, c.name]))
  for (const ann of raw.annotations) {
    const label = cats.get(ann.category_id) ?? String(ann.category_id)
    for (const seg of ann.segmentation ?? []) {
      const pts: Point[] = []
      for (let i = 0; i + 1 < seg.length; i += 2) pts.push([Math.round(seg[i]!), Math.round(seg[i + 1]!)])
      push(label, pts)
    }
  }
  console.log(`COCO として読み込み: annotations ${raw.annotations.length} 件`)
} else {
  // VIA 2 / VGG JSON: { "<file>": { regions: [ { shape_attributes, region_attributes } ] } }
  const entries = Object.values(raw as Record<string, unknown>).filter(isViaEntry)
  for (const e of entries) {
    for (const r of e.regions) {
      const sa = r.shape_attributes
      const label = String(
        r.region_attributes?.label ?? r.region_attributes?.name ?? Object.values(r.region_attributes ?? {})[0] ?? '',
      )
      if (sa.name === 'polygon' || sa.name === 'polyline') {
        const xs = sa.all_points_x ?? []
        const ys = sa.all_points_y ?? []
        push(label, xs.map((x, i) => [Math.round(x), Math.round(ys[i] ?? 0)] as Point))
      } else if (sa.name === 'point') {
        // 点は当たり判定にならんので、周囲 30px の四角へ広げる（後で /calibrate で整える前提）
        const [cx, cy] = [Math.round(sa.cx ?? 0), Math.round(sa.cy ?? 0)]
        const r30 = 30
        push(label, [
          [cx - r30, cy - r30],
          [cx + r30, cy - r30],
          [cx + r30, cy + r30],
          [cx - r30, cy + r30],
        ])
      }
    }
  }
  console.log(`VIA/VGG として読み込み: 画像 ${entries.length} 件`)
}

const base = existsSync(out)
  ? (JSON.parse(readFileSync(out, 'utf8')) as Record<string, unknown>)
  : { view, size: {}, images: {}, measuredOn: 'muscle-superficial' }

const areas = shapes
  .filter((s) => s.kind === 'area')
  .map((s) => ({ id: s.id, nameJa: AREA_PRESETS.find((a) => a.id === s.id)?.nameJa ?? s.id, points: s.points }))
const parts = shapes
  .filter((s) => s.kind === 'part')
  .map((s) => {
    const st = STRUCTURES.find((x) => x.id === s.id)!
    const o: Record<string, unknown> = { id: s.id, layer: st.layer }
    if (st.depth) o.depth = st.depth
    o.points = s.points
    o.labelAt = centroid(s.points).map((n) => Math.round(n))
    return o
  })

writeFileSync(out, `${JSON.stringify({ ...base, view, areas, parts }, null, 2)}\n`)
console.log(`部位 ${parts.length} 件 / 大まかな場所 ${areas.length} 件 → ${out}`)
if (unknown.length > 0) console.warn(`\n対応する部位が見つからんラベル（無視した）: ${[...new Set(unknown)].join(', ')}`)
if (skipped.length > 0) console.warn(`頂点が足りず飛ばした: ${skipped.join(', ')}`)
console.log('\n次に: pnpm validate:coords で背景に落ちとらんか確かめる')

type Coco = {
  categories: { id: number; name: string }[]
  annotations: { category_id: number; segmentation?: number[][] }[]
}
function isCoco(v: unknown): v is Coco {
  return typeof v === 'object' && v !== null && Array.isArray((v as Coco).annotations) && Array.isArray((v as Coco).categories)
}
type ViaEntry = {
  regions: {
    shape_attributes: { name: string; all_points_x?: number[]; all_points_y?: number[]; cx?: number; cy?: number }
    region_attributes?: Record<string, unknown>
  }[]
}
function isViaEntry(v: unknown): v is ViaEntry {
  return typeof v === 'object' && v !== null && Array.isArray((v as ViaEntry).regions)
}
