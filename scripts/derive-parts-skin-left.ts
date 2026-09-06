/**
 * 左側望の皮膚（外貌）の部位を切り出す。
 *
 * 皮膚の部位は体表のかたちそのものなので、筋と違うてシルエットから測れるものが多い。
 * ただし「どこからが背でどこからが尻か」は区分の判断なので、そこは下書き扱いにする。
 * 測った物と決めた物を混ぜんために、部位ごとに source を書き分けとる。
 *
 * 座標は muscle_left.jpg のマスクから取る。skin_left.jpg は暗い鹿毛の脚がマスクに乗りにくく、
 * 層どうしは 8px 以内で一致しとるので、きれいな方で測る方が正確になる。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { regionFromMask } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { checkPolygon } from './coord-gate'
import { centroid } from '../src/core/geometry'
import { STRUCTURE_BY_ID } from '../src/core/data/structures'
import type { CoordSource, Point, Polygon } from '../src/core/types'

const mask = loadMask('muscle_left.jpg')

/**
 * 実測の根拠（scripts で測った値）:
 *   x=228 で上端が y=52 に跳ねる               → 耳介
 *   y=880〜1000 で前肢が幅 40px の一定           → 管（中手部）
 *   y=1040 で幅 48、y=1080 で幅 64 に広がる      → 球節から蹄
 *   y=760〜800 で後肢の後縁が 1244→1260 に張る    → 飛節（踵の突起）
 *   背線の最下点 x=868 y=340、尻の最高点 x=1092〜1188 y=300
 */
const DEF: Record<string, { roi: Polygon; source: CoordSource; why: string }> = {
  'skin-ear': {
    roi: [[206, 24], [304, 24], [312, 150], [280, 176], [214, 168]],
    source: 'measured',
    why: '上端が跳ねる区間をそのまま切る',
  },
  'skin-head': {
    roi: [[60, 20], [440, 20], [430, 260], [395, 395], [280, 410], [60, 400]],
    source: 'measured',
    why: '頸が細まる所で切る。輪郭は実測どおり',
  },
  'skin-neck': {
    roi: [[300, 20], [640, 150], [610, 330], [520, 520], [430, 545], [395, 390], [430, 255], [440, 20]],
    source: 'measured',
    why: '頭と肩の間。輪郭は実測どおり',
  },
  'skin-withers': {
    roi: [[600, 180], [760, 250], [770, 360], [660, 360], [590, 280]],
    source: 'draft',
    why: 'たてがみが背線を覆うとるので、鬐甲の範囲は判断が入る',
  },
  'skin-back': {
    roi: [[760, 250], [1050, 250], [1050, 430], [770, 430]],
    source: 'draft',
    why: '背と腰の境は外から見て一意に決まらん',
  },
  'skin-croup': {
    roi: [[1050, 250], [1290, 250], [1300, 440], [1060, 440]],
    source: 'draft',
    why: '腰と尻の境は外から見て一意に決まらん',
  },
  'skin-tail': {
    roi: [[1290, 300], [1520, 300], [1520, 940], [1395, 940], [1395, 500], [1290, 430]],
    source: 'measured',
    why: '尾は輪郭で分かれる',
  },
  'skin-chest': {
    roi: [[450, 470], [560, 470], [575, 620], [500, 680], [440, 600]],
    source: 'draft',
    why: '胸前の範囲は判断が入る',
  },
  'skin-cannon': {
    roi: [[572, 852], [640, 852], [640, 1018], [572, 1018]],
    source: 'measured',
    why: '幅 40px の一定区間。膝と球節の間',
  },
  'skin-hoof': {
    roi: [[520, 1044], [612, 1044], [612, 1120], [520, 1120]],
    source: 'measured',
    why: '最下部で幅が広がる区間',
  },
  'skin-hock': {
    roi: [[1170, 730], [1276, 730], [1276, 840], [1170, 840]],
    source: 'measured',
    why: '後縁が張り出す区間',
  },
}

const PALETTE: [number, number, number][] = [
  [255, 90, 90], [255, 180, 60], [120, 220, 255], [140, 255, 130], [230, 120, 255],
  [255, 120, 180], [120, 255, 220], [255, 240, 100], [180, 160, 255], [255, 160, 120], [100, 220, 160],
]

const overlays: Overlay[] = []
const dots: { at: Point; color: [number, number, number] }[] = []
const parts: Record<string, unknown>[] = []
let bad = 0

Object.entries(DEF).forEach(([id, def], i) => {
  const st = STRUCTURE_BY_ID.get(id)
  if (!st) {
    console.error(`${id}: structures.ts に無い`)
    bad++
    return
  }
  const poly = regionFromMask(mask, def.roi, 10)
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
    source: def.source,
  })
  console.log(
    `${id.padEnd(14)} ${st.nameJa.padEnd(4)} ${def.source.padEnd(8)} 頂点 ${String(poly.length).padStart(2)}  ` +
      `重心 (${Math.round(c[0])},${Math.round(c[1])})  ${def.why}` +
      (problems.length ? `  !! ${problems.map((p) => p.message).join(' / ')}` : ''),
  )
  if (problems.length) bad++
})

renderDebug({ imageFile: 'skin_left.jpg', overlays, dots, out: 'shots/debug-skin.jpg' })

const path = 'src/core/data/regions/left.json'
const file = JSON.parse(readFileSync(path, 'utf8')) as { parts?: Record<string, unknown>[] }
const others = (file.parts ?? []).filter((p) => p.layer !== 'skin')
writeFileSync(path, `${JSON.stringify({ ...file, parts: [...others, ...parts] }, null, 2)}\n`)
console.log(`\n皮膚 ${parts.length} 件 → ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
