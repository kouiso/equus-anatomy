/**
 * 左側望の表層筋を配置する。
 *
 * 【重要】これは AI が図を見て引いた下書き（source: draft）で、実測値やない。
 * 目盛りを焼いた拡大図（scripts/crop.ts）で位置を読み、重ねて描いて目で直す、を繰り返しとる。
 * それでも「馬体の上には乗っとるが境界がずれとる」誤りは残る。人の確認が要る。
 *
 * ROI は馬体マスクで削るので、体の縁に接する筋は縁を実測どおりになぞる。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { regionFromMask } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { checkPolygon } from './coord-gate'
import { area as polyArea, centroid } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { Point, Polygon } from '../src/core/types'

const mask = loadMask('muscle_left.jpg')

const DRAFT: Record<string, Polygon> = {
  // 頬。眼の後ろから下顎枝まで。鼻筋へはみ出さんよう前縁を x=205 で止める
  'muscle-masseter': [[210, 236], [286, 242], [296, 296], [268, 346], [216, 342], [198, 286]],
  // 上部頸。たてがみの下。腕頭筋と重ならんよう下縁を上げとる
  'muscle-splenius': [[300, 200], [420, 206], [546, 256], [626, 316], [598, 356], [468, 300], [364, 254], [296, 232]],
  // 下部頸の帯。項から上腕骨へ向かう
  'muscle-brachiocephalicus': [[322, 308], [410, 342], [520, 412], [600, 480], [566, 530], [460, 462], [366, 384], [304, 340]],
  // 項から肩甲棘への扇
  'muscle-trapezius': [[520, 218], [604, 186], [702, 250], [716, 354], [648, 434], [576, 396], [528, 300]],
  // 肩甲棘の後ろ、肩関節の上
  'muscle-deltoid': [[650, 392], [716, 362], [744, 440], [712, 506], [658, 488]],
  // 肩甲骨後縁から肘頭までの三角。前縁を下げて三角筋を食わんようにする
  'muscle-triceps': [[628, 450], [716, 480], [754, 578], [706, 658], [622, 646], [594, 552]],
  // 前腕の前面
  'muscle-ecr': [[598, 620], [646, 610], [662, 722], [640, 802], [604, 796], [592, 700]],
  // 前肢の前、胸の前面
  'muscle-pectoral': [[468, 540], [542, 530], [562, 612], [530, 666], [478, 650], [452, 590]],
  // 肩甲骨の後ろ、肋骨の上に広がる
  'muscle-latissimus': [[700, 300], [882, 332], [922, 432], [830, 492], [720, 452], [688, 372]],
  // 脇腹から腹へ
  'muscle-oblique': [[820, 470], [1012, 470], [1062, 572], [990, 660], [858, 656], [798, 560]],
  // 尻。腸骨翼から大腿骨へ
  'muscle-gluteus': [[1018, 318], [1152, 302], [1234, 372], [1214, 466], [1104, 462], [1026, 398]],
  // 腿の後面
  'muscle-biceps-femoris': [[1180, 380], [1292, 402], [1332, 530], [1310, 682], [1230, 690], [1168, 560]],
  // 下腿。踵骨腱へ続く
  'muscle-gastrocnemius': [[1194, 640], [1276, 662], [1302, 762], [1264, 832], [1208, 810], [1178, 720]],
}

const PALETTE: [number, number, number][] = [
  [255, 90, 90], [255, 180, 60], [120, 220, 255], [140, 255, 130], [230, 120, 255],
  [255, 120, 180], [120, 255, 220], [255, 240, 100], [180, 160, 255], [255, 160, 120],
  [100, 200, 160], [200, 255, 90], [255, 100, 220],
]

const overlays: Overlay[] = []
const dots: { at: Point; color: [number, number, number] }[] = []
const parts: Record<string, unknown>[] = []
let bad = 0

Object.entries(DRAFT).forEach(([id, roi], i) => {
  const st = STRUCTURE_BY_ID.get(id)
  if (!st) {
    console.error(`${id}: structures.ts に無い`)
    bad++
    return
  }
  const poly = regionFromMask(mask, roi, 10)
  if (poly.length < 3) {
    console.error(`${id}: 輪郭が取れんかった（馬体と重なってへん可能性）`)
    bad++
    return
  }
  const problems = checkPolygon({ mask, size: mask.size, kind: 'part', id, points: poly })
  const c = centroid(poly)
  const color = PALETTE[i % PALETTE.length]!
  overlays.push({ points: poly, color })
  dots.push({ at: c, color })
  const o: Record<string, unknown> = { id, layer: st.layer }
  if (st.depth) o.depth = st.depth
  o.points = poly.map((p) => [Math.round(p[0]), Math.round(p[1])])
  o.labelAt = [Math.round(c[0]), Math.round(c[1])]
  o.source = 'draft'
  parts.push(o)
  console.log(
    `${id.padEnd(26)} ${st.nameJa.padEnd(9)} 頂点 ${String(poly.length).padStart(2)}  ` +
      `面積 ${String(Math.round(polyArea(poly) / 1000)).padStart(3)}k  重心 (${Math.round(c[0])},${Math.round(c[1])})` +
      (problems.length ? `  !! ${problems.map((p) => p.message).join(' / ')}` : ''),
  )
  if (problems.length) bad++
})

renderDebug({ imageFile: 'muscle_left.jpg', overlays, dots, out: 'shots/debug-parts.jpg' })

const path = 'src/core/data/regions/left.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
writeFileSync(path, `${JSON.stringify({ ...file, parts }, null, 2)}\n`)
console.log(`\n${parts.length} 件 → ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
console.log('→ shots/debug-parts.jpg を目で見て境界を直す')
