/**
 * 後面ビューの座標。
 *
 * 後面に出る部位は12件で、区分は 後肢・体幹・尾 の3つ。
 * どの層にも部位が1件も無い場所は作らん（選んでも何も出ん行き止まりになる）。
 * 体幹は腎臓と膀胱（腹腔 → trunk）を場所の流れから辿れるようにするための下書き。
 * 腎臓の輪郭が organs_rear.jpg の画像座標で x=163〜240, y=390〜520、
 * 膀胱が x=221〜333, y=470〜678 にあるので、枠はそれらを含むように取る（正面の trunk と同じく draft）。
 * 膀胱は後肢の間（馬体マスクの外）にも出るので、体幹の枠は、腎臓の帯（馬体マスクの輪郭）に、
 * 膀胱の輪郭（include）と膀胱の幅だけ下へ伸びる柱（TRUNK_ROI）を足した形にする。
 * 体幹の枠は帯の中では後肢の枠の内側に入るので、皮膚・筋肉・骨格（体幹に部位が無い層）で
 * 帯の中を叩くと一番小さい体幹に当たる。点の無い所のタップは部位の無い場所を飛ばして
 * 次に小さい場所へ落とす（hitTestAreas の selectable）ので、そこでは後肢が選ばれる。
 * 膀胱の柱は後肢の枠の外へも出る（後肢の間）が、そこは皮膚・筋肉・骨格の層では体幹が選べんので、
 * 選ばれる場所は変わらん（枠の下に場所が無く、何も選ばれんまま）。
 *
 * 実測の根拠:
 *   y=460 で最大幅 384px            → 尻の一番広い所
 *   y=900 で 72px の柱が2本         → 左右の後肢
 *   x=800〜900 が上から下まで繋がる  → 尾（暗いがマスクには乗っとる）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { clip, largestComponent, regionFromMask, simplify, traceContour } from './contour'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { BLOCK } from './silhouette'
import { checkPolygon } from './coord-gate'
import { centroid } from '../src/core/geometry'
import { pointInPolygon } from '../src/core/hit-test'
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

/**
 * 馬体マスクに、ある部位の輪郭（を少し太らせたもの）を足して場所の輪郭を取る。
 * 膀胱は後肢の間の尾の毛の上に描かれていて、マスクの外に半分ほど出る。
 * マスクだけで体幹の輪郭を取ると膀胱の右半分と下が体幹の外に落ち、全体表示で膀胱を叩いても何も起きん。
 * 足すのは roi の内側だけ（roi の外は切り取る）。太らせる幅は、ブロック化と間引き（simplify）で
 * 輪郭が内側へ削れる分（BLOCK/2 + 間引きの許容 12px）を見込んだ値。
 */
const GROW = BLOCK / 2 + 12
function distToPolygon(pt: Point, poly: Polygon): number {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / len2))
    best = Math.min(best, Math.hypot(pt[0] - (a[0] + t * dx), pt[1] - (a[1] + t * dy)))
  }
  return best
}
function areaFromMask(roi: Polygon, include?: Polygon): Polygon {
  const grid = clip(mask, roi)
  if (include) {
    for (let by = 0; by < mask.bh; by++) {
      for (let bx = 0; bx < mask.bw; bx++) {
        const p: Point = [bx * BLOCK + BLOCK / 2, by * BLOCK + BLOCK / 2]
        if (!pointInPolygon(p, roi)) continue
        if (pointInPolygon(p, include) || distToPolygon(p, include) <= GROW) grid.bits[by * mask.bw + bx] = 1
      }
    }
  }
  return simplify(traceContour(largestComponent(grid)), 12)
}

/**
 * 膀胱の輪郭（organs_rear.jpg の切り詰め後の画像座標）。部位の座標としても、体幹の枠に足す形としても使う。
 * 膀胱は organs_rear.jpg の中央にある、2 つの葉に見える塊を目で追った手描きの下書きです。
 * 上へ細くなる首（x 255〜292、y 470 あたりまで）も、塊に続くところまで含めて囲っています。
 */
const BLADDER: Polygon = [
  [264, 470], [286, 470], [289, 485], [292, 500], [298, 520], [308, 540], [320, 560], [329, 585],
  [333, 610], [331, 645], [316, 670], [290, 678], [262, 678], [238, 670], [222, 645], [221, 610],
  [227, 580], [235, 555], [245, 530], [254, 510], [258, 495], [261, 482],
]

/**
 * 体幹の切り取り枠。腎臓のある帯（y=380〜540）に、膀胱の下の端（切り詰め後 y=678 → 切る前 682）まで
 * 伸びる柱（膀胱の幅 x=221〜333 に左右の余白）を足した T 字。
 * 帯だけでは膀胱が体幹の外に出る。かといって全幅のまま下へ伸ばすと、内臓の層で太腿を叩いても
 * 体幹が選ばれる（それまでは何も起きんかった）ので、下は膀胱の幅だけにする。
 */
const TRUNK_ROI: Polygon = [
  pt(660, 380), pt(1060, 380), pt(1060, 540), pt(934, 540),
  pt(934, 700), pt(794, 700), pt(794, 540), pt(660, 540),
]

const AREAS: Record<string, { nameJa: string; roi: Polygon; source: CoordSource; labelAt?: Point; include?: Polygon }> = {
  hind: { nameJa: '後肢', roi: box(660, 270, 1060, 1110), source: 'measured', labelAt: pt(742, 560) },
  // 体幹の枠は腎臓（切り詰め後 x=163〜240, y=390〜520）と膀胱（同 x=221〜333, y=470〜678）を
  // 丸ごと含める（切る前は +OFF）。枠の下端を膀胱の底（y=678 → 切る前 682）より下に取らないと、
  // 全体表示（場所を選ばん状態）で膀胱の点が体幹に入らず、後肢・尾にしか落ちん。
  // 膀胱は後肢の間（マスクの外）にも出るので、include で膀胱の輪郭を足して丸ごと体幹に入れる。
  // 重心は尾の柱の上に落ちて尾の点と近づくので、点は腎臓の上へ明示する
  trunk: { nameJa: '体幹', roi: TRUNK_ROI, source: 'draft', labelAt: pt(776, 460), include: BLADDER },
  tail: { nameJa: '尾', roi: box(796, 250, 906, 960), source: 'measured' },
}

const PARTS: Record<
  string,
  { roi?: Polygon; poly?: Polygon; source: CoordSource; labelAt?: Point }
> = {
  // 尻は左右対称なので重心が正中の尾の上に落ちる。点は右の尻へずらす
  'skin-croup': { roi: box(688, 272, 1042, 452), source: 'draft', labelAt: pt(948, 348) },
  'skin-tail': { roi: box(796, 250, 906, 950), source: 'measured' },
  'skin-hock': { roi: box(712, 768, 798, 882), source: 'measured' },

  // 中殿筋は左右一対。尻を丸ごと囲うと尾を跨いだ帯になって筋に見えん。
  // 大腿二頭筋・腓腹筋と同じく片側だけを囲う
  'muscle-gluteus': { roi: box(680, 278, 790, 408), source: 'draft', labelAt: pt(760, 360) },
  // 中殿筋との境目はこの絵からは読み取れん。重ならんように接するだけにして draft のままにする
  'muscle-biceps-femoris': { roi: box(672, 412, 792, 646), source: 'draft' },
  'muscle-gastrocnemius': { roi: box(700, 652, 800, 786), source: 'draft' },

  'bone-pelvis': { roi: box(700, 300, 1032, 456), source: 'draft', labelAt: pt(760, 386) },
  'bone-sacrum': { roi: box(812, 262, 898, 366), source: 'draft' },
  'bone-femur': { roi: box(698, 422, 800, 626), source: 'draft' },
  'bone-tibia': { roi: box(706, 600, 802, 800), source: 'draft' },

  // 腎臓は organs_rear.jpg に描かれた腎臓の輪郭を目で追った手描きの下書き（座標は切り詰め後の画像そのまま）。
  // 内臓は馬体マスクの内側で輪郭が取れんので、roi ではなく poly で直接持つ。
  // 腎臓は左右一対やが、1 つの id に 1 つの図形しか持てんので、画像の左側（馬の左腎）だけを囲う。
  // 中殿筋が片側だけなのと同じ扱い。右腎は未配置（要判断）
  'organ-kidney': {
    poly: [
      [200, 390], [225, 392], [238, 402], [240, 420], [228, 436], [216, 442], [216, 466], [228, 474],
      [232, 490], [226, 508], [212, 518], [196, 520], [180, 510], [168, 490], [163, 457], [168, 425], [180, 404],
    ],
    source: 'draft',
    labelAt: [192, 456],
  },

  // 膀胱は organs_rear.jpg の中央にある、2 つの葉に見える塊を目で追った手描きの下書きです。
  // 上へ細くなる首（x 255〜292、y 470 あたりまで）も、塊に続くところまで含めて囲っています。尿管は図では塊の両脇を沿って下りていて、
  // 塊の中へは入っていません。AI 生成の図で、本当に膀胱かどうかは未確認です。
  // 獣医師レビュー（#13）に委ねます。座標は腎臓と同じく切り詰め後の画像そのままです。
  'organ-bladder': {
    poly: BLADDER,
    source: 'draft',
    labelAt: [277, 615],
  },
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
  const poly = areaFromMask(def.roi, def.include)
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
  const poly = def.poly ?? (def.roi ? regionFromMask(mask, def.roi, 8) : [])
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
