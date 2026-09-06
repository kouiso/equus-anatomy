/**
 * 大まかな場所（頭部・頸部・体幹・前肢・後肢・尾）を、実測マスクから切り出す。
 *
 * 人の判断が入るのは「切り取り線」だけ。輪郭そのものは馬体の実測値をなぞる。
 * 引いた線が合っとるかは shots/debug-areas.jpg を目で見て確かめる。
 * 数字だけ見て進めたら前身と同じ間違いをやる。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { regionFromMask } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { area as polyArea, centroid } from '../src/core/geometry'
import type { Point, Polygon } from '../src/core/types'

const mask = loadMask('muscle_left.jpg')

/**
 * 切り取り線の根拠（scripts/analyze-silhouette.ts の実測値）:
 *   x=228 で上端が y=52 に跳ねる  → 耳
 *   x=100 が最前端                → 鼻端
 *   x=740..1092 で下端が y=660    → 腹線（脚が無い区間）
 *   y=860 で塊が5個に分かれる      → 前肢2本・後肢2本・尾
 *   x=1412 以降 上端 y=436        → 尾の付け根より下
 */
const ROI: Record<string, { nameJa: string; roi: Polygon }> = {
  head: {
    nameJa: '頭部',
    // 鼻端から耳まで。下顎枝の後ろで頸と切る
    roi: [
      [60, 20], [440, 20], [430, 260], [395, 395], [280, 410], [60, 400],
    ],
  },
  neck: {
    nameJa: '頸部',
    // 項から肩の前まで。前縁は下顎の線、後縁は肩甲骨の前縁に沿わせる
    roi: [
      [300, 20], [640, 150], [610, 330], [520, 520], [430, 545], [395, 390], [430, 255], [440, 20],
    ],
  },
  trunk: {
    nameJa: '体幹',
    // 鬐甲から尻まで、腹線より上。前は肩甲骨の後縁、後ろは寛の前
    roi: [
      [600, 170], [1120, 250], [1120, 690], [700, 700], [620, 640], [640, 400], [700, 250],
    ],
  },
  fore: {
    nameJa: '前肢',
    // 肩甲骨から蹄まで。前縁は肩の前、後縁は肘の後ろを通す
    roi: [
      [600, 175], [700, 250], [745, 430], [770, 640], [740, 780], [745, 1180],
      [500, 1180], [500, 700], [480, 560], [520, 420],
    ],
  },
  hind: {
    nameJa: '後肢',
    // 寛から蹄まで。尾に食い込まんよう後縁を x=1400 で止める
    roi: [
      [1060, 260], [1300, 290], [1330, 480], [1360, 1180], [1100, 1180], [1090, 700], [1060, 620],
    ],
  },
  tail: {
    nameJa: '尾',
    // 尾根から毛先まで。後肢の後ろだけを拾う
    roi: [
      [1290, 300], [1520, 300], [1520, 940], [1395, 940], [1395, 500], [1290, 430],
    ],
  },
}

const COLORS: Record<string, [number, number, number]> = {
  head: [255, 90, 90],
  neck: [255, 200, 60],
  trunk: [90, 200, 255],
  fore: [140, 255, 120],
  hind: [220, 120, 255],
  tail: [255, 140, 200],
}

const overlays: Overlay[] = []
const dots: { at: Point; color: [number, number, number] }[] = []
const areas: { id: string; nameJa: string; source: 'measured'; points: number[][] }[] = []

for (const [id, { nameJa, roi }] of Object.entries(ROI)) {
  const poly = regionFromMask(mask, roi, 14)
  if (poly.length < 3) {
    console.error(`${id}: 輪郭が取れんかった。切り取り線を見直す`)
    continue
  }
  const c = centroid(poly)
  overlays.push({ points: poly, color: COLORS[id]! })
  dots.push({ at: c, color: COLORS[id]! })
  // 実測マスクの輪郭そのもの。人が引いたんは切り取り線だけなので measured 扱いにする
  areas.push({ id, nameJa, source: 'measured', points: poly.map((p) => [Math.round(p[0]), Math.round(p[1])]) })
  console.log(
    `${id.padEnd(6)} ${nameJa.padEnd(4)} 頂点 ${String(poly.length).padStart(3)}  ` +
      `面積 ${String(Math.round(polyArea(poly) / 1000)).padStart(4)}k px²  重心 (${Math.round(c[0])},${Math.round(c[1])})`,
  )
}

renderDebug({ imageFile: 'muscle_left.jpg', overlays, dots, out: 'shots/debug-areas.jpg' })

const path = 'src/core/data/regions/left.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
writeFileSync(path, `${JSON.stringify({ ...file, areas }, null, 2)}\n`)
console.log(`\n${areas.length} 件 → ${path}`)
console.log('→ shots/debug-areas.jpg を見て、線が合っとるか確かめる')
