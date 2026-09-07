/**
 * 後面ビューの座標。
 *
 * 後面に出る部位は10件で、区分は 後肢 と 尾 の2つだけ。
 * 部位が1件も無い場所は作らん（選んでも何も出ん行き止まりになる）。
 *
 * 実測の根拠:
 *   y=460 で最大幅 384px            → 尻の一番広い所
 *   y=900 で 72px の柱が2本         → 左右の後肢
 *   x=800〜900 が上から下まで繋がる  → 尾（暗いがマスクには乗っとる）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { regionFromMask } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { checkPolygon } from './coord-gate'
import { centroid } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { CoordSource, Point, Polygon } from '../src/core/types'

const mask = loadMask('muscle_rear.jpg')
/**
 * 座標は crop-images.ts で切り詰めた後の画像を基準にする。
 * 目盛りを読んだ拡大図は切る前のものなので、その分をここで引く。
 */
const OFF_X = 584
const OFF_Y = 4
const box = (x1: number, y1: number, x2: number, y2: number): Polygon => [
  [x1 - OFF_X, y1 - OFF_Y],
  [x2 - OFF_X, y1 - OFF_Y],
  [x2 - OFF_X, y2 - OFF_Y],
  [x1 - OFF_X, y2 - OFF_Y],
]
const pt = (x: number, y: number): Point => [x - OFF_X, y - OFF_Y]

const AREAS: Record<string, { nameJa: string; roi: Polygon; source: CoordSource; labelAt?: Point }> = {
  hind: { nameJa: '後肢', roi: box(660, 270, 1060, 1110), source: 'measured', labelAt: pt(742, 560) },
  tail: { nameJa: '尾', roi: box(796, 250, 906, 960), source: 'measured' },
}

const PARTS: Record<string, { roi: Polygon; source: CoordSource; labelAt?: Point }> = {
  // 尻は左右対称なので重心が正中の尾の上に落ちる。点は右の尻へずらす
  'skin-croup': { roi: box(688, 272, 1042, 452), source: 'draft', labelAt: pt(948, 348) },
  'skin-tail': { roi: box(796, 250, 906, 950), source: 'measured' },
  'skin-hock': { roi: box(712, 768, 798, 882), source: 'measured' },

  // 中臀筋は左右一対。尻を丸ごと囲うと尾を跨いだ帯になって筋に見えん。
  // 大腿二頭筋・腓腹筋と同じく片側だけを囲う
  'muscle-gluteus': { roi: box(680, 278, 790, 408), source: 'draft', labelAt: pt(760, 360) },
  // 中臀筋との境目はこの絵からは読み取れん。重ならんように接するだけにして draft のままにする
  'muscle-biceps-femoris': { roi: box(672, 412, 792, 646), source: 'draft' },
  'muscle-gastrocnemius': { roi: box(700, 652, 800, 786), source: 'draft' },

  'bone-pelvis': { roi: box(700, 300, 1032, 456), source: 'draft', labelAt: pt(760, 386) },
  'bone-sacrum': { roi: box(812, 262, 898, 366), source: 'draft' },
  'bone-femur': { roi: box(698, 422, 800, 626), source: 'draft' },
  'bone-tibia': { roi: box(706, 600, 802, 800), source: 'draft' },
}

const PALETTE: [number, number, number][] = [
  [255, 90, 90], [255, 180, 60], [120, 220, 255], [140, 255, 130], [230, 120, 255],
  [255, 120, 180], [120, 255, 220], [255, 240, 100], [180, 160, 255], [255, 160, 120], [100, 220, 160],
]

const overlays: Overlay[] = []
const dots: { at: Point; color: [number, number, number] }[] = []
const areas: Record<string, unknown>[] = []
const parts: Record<string, unknown>[] = []
let bad = 0

Object.entries(AREAS).forEach(([id, def], i) => {
  const poly = regionFromMask(mask, def.roi, 12)
  if (poly.length < 3) {
    console.error(`場所 ${id}: 輪郭が取れんかった`)
    bad++
    return
  }
  const c = def.labelAt ?? centroid(poly)
  overlays.push({ points: poly, color: PALETTE[i]! })
  dots.push({ at: c, color: PALETTE[i]! })
  const areaOut: Record<string, unknown> = { id, nameJa: def.nameJa, source: def.source, points: poly.map((p) => [Math.round(p[0]), Math.round(p[1])]) }
  // 重心が隣の領域に埋まる形の時は点の位置を明示する。落とすと押せん点になる
  if (def.labelAt) areaOut.labelAt = [Math.round(def.labelAt[0]), Math.round(def.labelAt[1])]
  areas.push(areaOut)
  console.log(`場所 ${id.padEnd(5)} ${def.nameJa.padEnd(3)} ${def.source.padEnd(8)} 点 (${Math.round(c[0])},${Math.round(c[1])})`)
})

console.log()
Object.entries(PARTS).forEach(([id, def], i) => {
  const st = STRUCTURE_BY_ID.get(id)
  if (!st || !st.views.includes('rear')) {
    console.error(`${id}: 後面に出す部位として定義されとらん`)
    bad++
    return
  }
  const poly = regionFromMask(mask, def.roi, 8)
  if (poly.length < 3) {
    console.error(`${id}: 輪郭が取れんかった`)
    bad++
    return
  }
  const problems = checkPolygon({ mask, size: mask.size, kind: 'part', id, points: poly })
  const c = centroid(poly)
  const color = PALETTE[(i + 2) % PALETTE.length]!
  overlays.push({ points: poly, color })
  dots.push({ at: def.labelAt ?? c, color })
  const o: Record<string, unknown> = { id, layer: st.layer }
  if (st.depth) o.depth = st.depth
  o.points = poly.map((p) => [Math.round(p[0]), Math.round(p[1])])
  o.labelAt = def.labelAt ?? [Math.round(c[0]), Math.round(c[1])]
  o.source = def.source
  parts.push(o)
  console.log(
    `${id.padEnd(24)} ${st.nameJa.padEnd(6)} ${def.source.padEnd(8)} 点 (${Math.round((def.labelAt ?? c)[0])},${Math.round((def.labelAt ?? c)[1])})` +
      (problems.length ? `  !! ${problems.map((p) => p.message).join(' / ')}` : ''),
  )
  if (problems.length) bad++
})

renderDebug({ imageFile: 'muscle_rear.jpg', overlays, dots, out: 'shots/debug-rear.jpg' })

const path = 'src/core/data/regions/rear.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
writeFileSync(path, `${JSON.stringify({ ...file, areas, parts }, null, 2)}\n`)
console.log(`\n場所 ${areas.length} 件 / 部位 ${parts.length} 件 → ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
