/**
 * 左側望の内臓。
 *
 * 【この層だけの注意】元の絵が AI 生成で、心臓と肺の位置関係が解剖学的に怪しい。
 * 絵が間違うとる所へ正しくラベルを置いても、間違いを教えることになる。
 * ここは絵ごと差し替える（権威ある図版へ）判断が要る可能性が高い。座標より前に絵を疑うこと。
 *
 * 図から確かに見分けられるものだけ置く。盲腸と膀胱は、この図では他の腸管と区別がつかんので置かん。
 * 推測で置いたら「間違った位置を教える」ことになる。空にしといて「未配置」と出す方がマシ。
 *
 * 見分けの根拠:
 *   紫色の細長い臓器          → 脾臓（この図で唯一はっきり色が違う）
 *   その右のそら豆型           → 腎臓
 *   胸腔の暗赤色・血管が集まる  → 心臓
 *   その後ろの淡紅色・細かい質感 → 肺
 *   横隔膜の後ろ、鋭い縁の暗褐色 → 肝臓
 *   湾曲した淡色の袋           → 胃
 *   細かく巻いた管の塊         → 小腸
 *   太くて滑らかな輪           → 大結腸
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
  'organ-heart': [[520, 404], [662, 398], [676, 498], [646, 602], [556, 612], [510, 506]],
  'organ-lung': [[688, 392], [806, 400], [812, 530], [760, 600], [700, 578], [678, 470]],
  'organ-liver': [[814, 394], [958, 402], [966, 494], [900, 532], [830, 512], [806, 448]],
  'organ-stomach': [[956, 418], [1058, 412], [1066, 500], [1010, 534], [960, 512]],
  'organ-spleen': [[1042, 358], [1150, 372], [1156, 470], [1102, 516], [1054, 470]],
  'organ-kidney': [[1148, 406], [1214, 400], [1222, 480], [1178, 502], [1146, 460]],
  'organ-intestine': [[812, 498], [1004, 508], [1006, 604], [860, 610], [808, 566]],
  'organ-colon': [[1000, 508], [1152, 512], [1148, 600], [1010, 606]],
}

/** この図では他の腸管と区別がつかんので置かん。 */
const SKIPPED: Record<string, string> = {
  'organ-cecum': '左側望では他の腸管に隠れて輪郭が取れん',
  'organ-bladder': '骨盤腔の中で、この図には描かれとらん',
}

const PALETTE: [number, number, number][] = [
  [255, 90, 90], [255, 180, 60], [120, 220, 255], [140, 255, 130],
  [230, 120, 255], [255, 120, 180], [120, 255, 220], [255, 240, 100],
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
    `${id.padEnd(16)} ${st.nameJa.padEnd(4)} 頂点 ${String(poly.length).padStart(2)}  重心 (${Math.round(c[0])},${Math.round(c[1])})` +
      (problems.length ? `  !! ${problems.map((p) => p.message).join(' / ')}` : ''),
  )
  if (problems.length) bad++
})

for (const [id, why] of Object.entries(SKIPPED)) {
  console.log(`${id.padEnd(16)} ${STRUCTURE_BY_ID.get(id)?.nameJa.padEnd(4) ?? ''} 置かん — ${why}`)
}

renderDebug({ imageFile: 'organs_left.jpg', overlays, dots, out: 'shots/debug-organs.jpg' })

const path = 'src/core/data/regions/left.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as { parts?: Record<string, unknown>[] }
const others = (file.parts ?? []).filter((p) => p.layer !== 'organs')
writeFileSync(path, `${JSON.stringify({ ...file, parts: [...others, ...parts] }, null, 2)}\n`)
console.log(`\n内臓 ${parts.length} 件（見送り ${Object.keys(SKIPPED).length} 件）→ ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
