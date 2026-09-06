/**
 * 左側望の骨格。骨は輪郭がはっきりしとるので、筋より読み取りやすい。
 * それでも投影上は骨どうしが重なるので、境界は概算＝下書き扱いにする。
 * 目盛りを焼いた拡大図（scripts/crop.ts）で位置を読んで、重ねて描いて直しとる。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { regionFromMask } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { checkPolygon } from './coord-gate'
import { centroid } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { Point, Polygon } from '../src/core/types'

const mask = loadMask('muscle_left.jpg')

const DEF: Record<string, Polygon> = {
  // 頭蓋: 歯列より上。鼻端から後頭部まで
  'bone-skull': [[95, 146], [318, 138], [348, 222], [302, 268], [162, 302], [92, 274]],
  // 下顎骨: 歯列と下顎枝
  'bone-mandible': [[106, 284], [292, 238], [330, 214], [354, 268], [346, 322], [238, 312], [128, 320]],
  // 頸椎: 後頭部から胸郭の入口まで
  'bone-cervical': [[356, 128], [430, 168], [520, 262], [566, 372], [548, 440], [468, 388], [396, 268], [340, 174]],
  // 肩甲骨: 胸郭の外側にある扁平な板
  'bone-scapula': [[562, 292], [682, 296], [694, 468], [622, 512], [556, 424]],
  // 上腕骨: 肩関節から肘へ
  'bone-humerus': [[576, 492], [662, 508], [668, 620], [606, 648], [566, 558]],
  // 橈骨: 肘から手根へ
  'bone-radius': [[572, 632], [648, 632], [654, 782], [588, 788]],
  // 中手骨: 管の骨
  'bone-cannon': [[576, 848], [640, 848], [640, 1018], [576, 1018]],
  // 肋骨: 胸郭全体
  'bone-ribs': [[600, 296], [1024, 318], [1034, 596], [896, 662], [700, 652], [602, 466]],
  // 胸骨: 胸郭の腹側の正中
  'bone-sternum': [[596, 606], [764, 618], [770, 668], [600, 660]],
  // 腰椎: 最後の肋骨から仙骨まで
  'bone-lumbar': [[946, 296], [1140, 296], [1142, 378], [948, 378]],
  // 仙骨: 骨盤に癒合した椎骨
  'bone-sacrum': [[1126, 306], [1242, 308], [1248, 392], [1128, 386]],
  // 骨盤: 腸骨翼から坐骨まで
  'bone-pelvis': [[1116, 348], [1334, 378], [1322, 486], [1156, 474]],
  // 大腿骨: 股関節から膝へ（前下方へ走る）
  'bone-femur': [[1198, 452], [1252, 470], [1186, 618], [1122, 600]],
  // 脛骨: 膝から飛節へ（後下方へ走る）
  'bone-tibia': [[1122, 598], [1194, 606], [1268, 758], [1198, 778]],
}

const PALETTE: [number, number, number][] = [
  [255, 90, 90], [255, 180, 60], [120, 220, 255], [140, 255, 130], [230, 120, 255],
  [255, 120, 180], [120, 255, 220], [255, 240, 100], [180, 160, 255], [255, 160, 120],
  [100, 220, 160], [200, 255, 90], [255, 100, 220], [160, 200, 255],
]

const overlays: Overlay[] = []
const dots: { at: Point; color: [number, number, number] }[] = []
const parts: Record<string, unknown>[] = []
let bad = 0

Object.entries(DEF).forEach(([id, roi], i) => {
  const st = STRUCTURE_BY_ID.get(id)
  if (!st) {
    console.error(`${id}: structures.ts に無い`)
    bad++
    return
  }
  const poly = regionFromMask(mask, roi, 8)
  if (poly.length < 3) {
    console.error(`${id}: 輪郭が取れんかった`)
    bad++
    return
  }
  const problems = checkPolygon({ mask, size: mask.size, kind: 'part', id, points: poly })
  const c = centroid(poly)
  const color = PALETTE[i % PALETTE.length]!
  overlays.push({ points: poly, color })
  dots.push({ at: c, color })
  parts.push({
    id,
    layer: st.layer,
    points: poly.map((p) => [Math.round(p[0]), Math.round(p[1])]),
    labelAt: [Math.round(c[0]), Math.round(c[1])],
    source: 'draft',
  })
  console.log(
    `${id.padEnd(16)} ${st.nameJa.padEnd(5)} 頂点 ${String(poly.length).padStart(2)}  重心 (${Math.round(c[0])},${Math.round(c[1])})` +
      (problems.length ? `  !! ${problems.map((p) => p.message).join(' / ')}` : ''),
  )
  if (problems.length) bad++
})

renderDebug({ imageFile: 'skeleton_left.jpg', overlays, dots, out: 'shots/debug-skeleton.jpg' })

const path = 'src/core/data/regions/left.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as { parts?: Record<string, unknown>[] }
const others = (file.parts ?? []).filter((p) => p.layer !== 'skeleton')
writeFileSync(path, `${JSON.stringify({ ...file, parts: [...others, ...parts] }, null, 2)}\n`)
console.log(`\n骨格 ${parts.length} 件 → ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
