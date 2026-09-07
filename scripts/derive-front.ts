/**
 * 正面ビューの座標。大まかな場所と部位をまとめて作る。
 *
 * 正面には後肢・尾が写らんので、場所は 頭部・頸部・体幹・前肢 の4つだけ作る。
 * 部位が1件も無い場所を作ると「選んだのに何も出ん」行き止まりになる。
 *
 * 実測の根拠（scripts で測った断面）:
 *   y=80〜320 で幅 136〜144px の柱      → 頭
 *   y=400 で幅が 280px に広がる          → 頸から胸へ
 *   y=560 で最大 328px                  → 胸の一番広い所
 *   y=720 で 72px の柱が2本に分かれる     → 左右の前肢
 *   y=1000 で 64px、その下で蹄           → 管と蹄
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { regionFromMask } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { checkPolygon } from './coord-gate'
import { centroid } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { CoordSource, Point, Polygon } from '../src/core/types'

const mask = loadMask('muscle_front.jpg')
/**
 * 座標は crop-images.ts で切り詰めた後の画像を基準にする。
 * 目盛りを読んだ拡大図は切る前のものなので、その分をここで引く。
 */
const OFF_X = 596
const OFF_Y = 8
const box = (x1: number, y1: number, x2: number, y2: number): Polygon => [
  [x1 - OFF_X, y1 - OFF_Y],
  [x2 - OFF_X, y1 - OFF_Y],
  [x2 - OFF_X, y2 - OFF_Y],
  [x1 - OFF_X, y2 - OFF_Y],
]
const pt = (x: number, y: number): Point => [x - OFF_X, y - OFF_Y]

const AREAS: Record<string, { nameJa: string; roi: Polygon; source: CoordSource; labelAt?: Point }> = {
  head: { nameJa: '頭部', roi: box(750, 20, 950, 400), source: 'measured' },
  neck: { nameJa: '頸部', roi: box(730, 335, 970, 520), source: 'draft' },
  trunk: { nameJa: '体幹', roi: box(680, 400, 1040, 690), source: 'draft' },
  // 前肢の枠は胸から蹄まで伸びるので、重心が体幹の内側（前脚の間の胸）に落ちる。
  // 点は実際の前脚の上に出す
  fore: { nameJa: '前肢', roi: box(680, 400, 1040, 1110), source: 'measured', labelAt: pt(776, 808) },
}

/** labelAt は「点をどこに出すか」。重心が別の部位の中に落ちる時だけ指定する。 */
const PARTS: Record<string, { roi: Polygon; source: CoordSource; labelAt?: Point }> = {
  'skin-head': { roi: box(758, 22, 942, 366), source: 'measured' },
  'skin-neck': { roi: box(748, 352, 952, 470), source: 'draft' },
  'skin-chest': { roi: box(698, 470, 1022, 662), source: 'draft' },
  'skin-cannon': { roi: box(746, 845, 830, 1006), source: 'measured' },
  'skin-hoof': { roi: box(726, 1032, 812, 1104), source: 'measured' },

  'muscle-masseter': { roi: box(766, 214, 824, 332), source: 'draft' },
  'muscle-brachiocephalicus': { roi: box(754, 350, 830, 500), source: 'draft' },
  'muscle-deltoid': { roi: box(690, 408, 750, 490), source: 'draft' },
  'muscle-triceps': { roi: box(684, 496, 780, 624), source: 'draft' },
  'muscle-pectoral': { roi: box(792, 492, 958, 642), source: 'draft' },
  'muscle-ecr': { roi: box(738, 648, 808, 802), source: 'draft' },

  'bone-skull': { roi: box(764, 48, 916, 298), source: 'draft' },
  'bone-mandible': { roi: box(810, 300, 894, 372), source: 'draft' },
  'bone-cervical': { roi: box(806, 378, 894, 452), source: 'draft' },
  'bone-scapula': { roi: box(706, 362, 788, 468), source: 'draft' },
  'bone-humerus': { roi: box(726, 472, 804, 568), source: 'draft' },
  'bone-radius': { roi: box(736, 552, 798, 698), source: 'draft' },
  'bone-cannon': { roi: box(748, 845, 828, 1006), source: 'draft' },
  // 胸骨が胸郭の正中にあるので、重心のままやと点が胸骨の上に乗ってタップが取られる
  'bone-ribs': { roi: box(702, 432, 1018, 688), source: 'draft', labelAt: pt(948, 560) },
  'bone-sternum': { roi: box(832, 452, 884, 648), source: 'draft' },

  'organ-heart': { roi: box(806, 458, 908, 598), source: 'draft' },
  'organ-lung': { roi: box(730, 422, 802, 598), source: 'draft' },
}

/** 深層筋の図は存在せんので置けん。 */
const SKIPPED: Record<string, string> = {
  'muscle-subclavius': '深層筋の図が無い',
}

const PALETTE: [number, number, number][] = [
  [255, 90, 90], [255, 180, 60], [120, 220, 255], [140, 255, 130], [230, 120, 255],
  [255, 120, 180], [120, 255, 220], [255, 240, 100], [180, 160, 255], [255, 160, 120],
  [100, 220, 160], [200, 255, 90],
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
  const c = centroid(poly)
  overlays.push({ points: poly, color: PALETTE[i]! })
  dots.push({ at: c, color: PALETTE[i]! })
  const areaOut: Record<string, unknown> = { id, nameJa: def.nameJa, source: def.source, points: poly.map((p) => [Math.round(p[0]), Math.round(p[1])]) }
  if (def.labelAt) areaOut.labelAt = [Math.round(def.labelAt[0]), Math.round(def.labelAt[1])]
  areas.push(areaOut)
  console.log(`場所 ${id.padEnd(6)} ${def.nameJa.padEnd(4)} ${def.source.padEnd(8)} 重心 (${Math.round(c[0])},${Math.round(c[1])})`)
})

console.log()
Object.entries(PARTS).forEach(([id, def], i) => {
  const st = STRUCTURE_BY_ID.get(id)
  if (!st) {
    console.error(`${id}: structures.ts に無い`)
    bad++
    return
  }
  if (!st.views.includes('front')) {
    console.error(`${id}: 正面に出さん部位として定義されとる`)
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
  const color = PALETTE[(i + 3) % PALETTE.length]!
  overlays.push({ points: poly, color })
  dots.push({ at: c, color })
  const o: Record<string, unknown> = { id, layer: st.layer }
  if (st.depth) o.depth = st.depth
  o.points = poly.map((p) => [Math.round(p[0]), Math.round(p[1])])
  o.labelAt = def.labelAt ?? [Math.round(c[0]), Math.round(c[1])]
  o.source = def.source
  parts.push(o)
  console.log(
    `${id.padEnd(26)} ${st.nameJa.padEnd(7)} ${def.source.padEnd(8)} 重心 (${Math.round(c[0])},${Math.round(c[1])})` +
      (problems.length ? `  !! ${problems.map((p) => p.message).join(' / ')}` : ''),
  )
  if (problems.length) bad++
})

for (const [id, why] of Object.entries(SKIPPED)) {
  console.log(`${id.padEnd(26)} ${STRUCTURE_BY_ID.get(id)?.nameJa.padEnd(7) ?? ''} 置かん — ${why}`)
}

renderDebug({ imageFile: 'muscle_front.jpg', overlays, dots, out: 'shots/debug-front.jpg' })

const path = 'src/core/data/regions/front.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
writeFileSync(path, `${JSON.stringify({ ...file, areas, parts }, null, 2)}\n`)
console.log(`\n場所 ${areas.length} 件 / 部位 ${parts.length} 件（見送り ${Object.keys(SKIPPED).length} 件）→ ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
