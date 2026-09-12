/**
 * 「測られてへん座標」を機械で弾くゲート。
 *
 * 今回のズレ（頭部が喉の下、耳介が首、鬐甲が肩）は全部「点が馬体の外か、別の部位の上」に落ちとった。
 * 目視レビューでは何度でも見逃す。CI で落とせば二度と入らん。
 */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isOnHorse, type Mask } from './silhouette'
import { checkPolygon, maskFromEntry } from './coord-gate'
import { STRUCTURES } from '../src/core/data/structures'
import type { Point, Polygon, View } from '../src/core/types'

type SilFile = { entries: { file: string; hash: string; size: { w: number; h: number }; bw: number; bh: number; mask: string }[] }
type RegionFile = {
  view: View
  size: { w: number; h: number }
  images: Record<string, { src: string; hash: string }>
  measuredOn: string
  areas: { id: string; nameJa: string; points: Point[]; source?: string }[]
  parts: { id: string; layer: string; depth?: string; points: Point[]; labelAt?: Point; source?: string }[]
}

const VIEWS: View[] = ['left', 'front', 'rear']
const problems: string[] = []
const notes: string[] = []
const fail = (m: string) => problems.push(m)

const sil: SilFile = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8'))
const maskOf = (file: string): Mask | null => {
  const e = sil.entries.find((x) => x.file === file)
  return e ? maskFromEntry(e) : null
}

const byId = new Map(STRUCTURES.map((s) => [s.id, s]))
let placedTotal = 0
let draftTotal = 0

for (const view of VIEWS) {
  const path = `src/core/data/regions/${view}.json`
  if (!existsSync(path)) {
    fail(`${path} が無い`)
    continue
  }
  const rf: RegionFile = JSON.parse(readFileSync(path, 'utf8'))

  // 画像の差し替え検知。画像が変わったら座標は全部無効になる。
  for (const [plate, ref] of Object.entries(rf.images)) {
    const file = ref.src.replace('/anatomy/', '')
    const disk = `assets/anatomy/${file}`
    if (!existsSync(disk)) {
      fail(`${view}/${plate}: 画像が無い ${disk}`)
      continue
    }
    const actual = `sha256:${createHash('sha256').update(readFileSync(disk)).digest('hex')}`
    if (actual !== ref.hash) fail(`${view}/${plate}: 画像が差し替わっとる。座標を測り直すこと (${file})`)
    const e = sil.entries.find((x) => x.file === file)
    if (e && (e.size.w !== rf.size.w || e.size.h !== rf.size.h)) {
      fail(`${view}/${plate}: 画像 ${e.size.w}x${e.size.h} と座標系 ${rf.size.w}x${rf.size.h} が食い違う`)
    }
  }

  const measuredFile = rf.images[rf.measuredOn]?.src.replace('/anatomy/', '')
  const mask = measuredFile ? maskOf(measuredFile) : null
  if (!mask) {
    fail(`${view}: measuredOn=${rf.measuredOn} のマスクが取れん。pnpm measure:silhouette を先に走らせる`)
    continue
  }

  const check = (kind: string, id: string, points: Polygon) => {
    for (const p of checkPolygon({ mask, size: rf.size, kind, id, points })) {
      if (p.level === 'error') fail(`${view} ${p.message}`)
      else notes.push(`${view} ${p.message}`)
    }
  }

  for (const a of rf.areas) check('area', a.id, a.points)

  const seen = new Set<string>()
  for (const p of rf.parts) {
    const key = `${p.id}:${p.depth ?? ''}`
    if (seen.has(key)) fail(`${view} part ${p.id}: 重複`)
    seen.add(key)
    const s = byId.get(p.id)
    if (!s) {
      fail(`${view} part ${p.id}: structures.ts に無い id`)
    } else {
      if (s.layer !== p.layer) fail(`${view} part ${p.id}: layer が解説(${s.layer})と座標(${p.layer})で食い違う`)
      if ((s.depth ?? null) !== (p.depth ?? null)) fail(`${view} part ${p.id}: depth が食い違う`)
      if (!s.views.includes(view)) fail(`${view} part ${p.id}: この向きに出さん部位として定義されとる`)
    }
    check('part', p.id, p.points)
    if (p.labelAt && !isOnHorse(mask, p.labelAt[0], p.labelAt[1], 4)) {
      notes.push(`${view} part ${p.id}: labelAt が馬体から遠い（引き出し線なら問題なし）`)
    }
    placedTotal++
    if (p.source !== 'measured') draftTotal++
  }

  const expected = STRUCTURES.filter((s) => s.views.includes(view)).length
  const drafts = rf.parts.filter((p) => p.source !== 'measured').length
  notes.push(
    `${view}: 配置済み ${rf.parts.length} / 対象 ${expected}  未配置 ${expected - rf.parts.length} 件、` +
      `大まかな場所 ${rf.areas.length} 件、うち下書き ${drafts} 件`,
  )
}

for (const n of notes) console.log(`  ${n}`)
if (problems.length > 0) {
  console.error(`\n✗ 座標ゲート NG（${problems.length}件）`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`\n✓ 座標ゲート OK（配置済み ${placedTotal} 件は全て馬体の上）`)
if (draftTotal > 0) {
  // 落とさん。ゲートは「背景に落ちとる」しか見られんので、下書きの正しさは人が見るしかない
  console.log(
    `  ただし ${draftTotal} 件は AI が引いた下書き（source: draft）。` +
      `馬体の上には乗っとるが、境界が解剖学的に正しいかは人の確認が要る。`,
  )
}
