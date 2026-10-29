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
import { regionFromMask } from './contour'
import { rewriteRegionParts } from './region-json'
import { loadMask, renderDebug, type Overlay } from './debug-render'
import { checkPolygon } from './coord-gate'
import { REVIEWED_SKIN_PARTS_LEFT } from './reviewed-coords-left'
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
type Def =
  | { roi: Polygon; labelAt?: Point; source: CoordSource; why: string }
  // マスクから取り直すと崩れる部位は、レビュー済みの頂点をそのまま使う（reviewed-coords-left.ts）
  | { points: Polygon; labelAt: Point; source: CoordSource; why: string }

const DEF: Record<string, Def> = {
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
  'skin-tail': REVIEWED_SKIN_PARTS_LEFT['skin-tail']!,
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
  'skin-hoof': REVIEWED_SKIN_PARTS_LEFT['skin-hoof']!,
  'skin-hock': {
    roi: [[1170, 730], [1276, 730], [1276, 840], [1170, 840]],
    source: 'measured',
    why: '後縁が張り出す区間',
  },
  // ↓ JRA 馬体名称・HB Points の外貌標識。塊の中の区分なので全部下書き扱い
  'skin-muzzle': {
    roi: [[60, 240], [205, 240], [200, 390], [60, 390]],
    source: 'draft',
    why: '鼻孔・唇の吻端。頭部の前下部を切る',
  },
  'skin-eye': {
    roi: [[195, 162], [255, 162], [255, 212], [198, 212]],
    source: 'draft',
    why: '顔面側面の眼の周り。点状標識を小さく囲む',
  },
  'skin-forehead': {
    roi: [[240, 178], [300, 178], [300, 218], [240, 218]],
    source: 'draft',
    why: '眼の上・耳の下の額面。耳の重心を内包せんよう下げてある',
  },
  'skin-poll': {
    roi: [[302, 60], [375, 68], [375, 152], [305, 148]],
    source: 'draft',
    why: '両耳の間の隆起。耳ROI(x<=312)とはほぼ接するだけ',
  },
  'skin-throatlatch': {
    roi: [[285, 335], [415, 345], [410, 455], [295, 450]],
    source: 'draft',
    why: '頭の裏から頸への移行部。頭ROIの下端と頸の境',
  },
  'skin-jugular': {
    roi: [[390, 410], [510, 455], [545, 510], [470, 545], [405, 495], [380, 445]],
    labelAt: [470, 470],
    source: 'draft',
    // 頸腹側の溝。重心が胸前(skin-chest)に入ると小さい側どうしの順序が崩れるので点を上へ寄せる
    why: '頸静脈溝。頸の腹縁に沿う帯',
  },
  'skin-shoulder': {
    roi: [[590, 330], [735, 345], [745, 470], [700, 540], [605, 500], [585, 400]],
    source: 'draft',
    why: '肩甲骨・肩関節を覆う面',
  },
  'skin-elbow': {
    roi: [[548, 575], [615, 580], [612, 670], [555, 672]],
    source: 'draft',
    why: '肘頭の突起。胸前の右縁の外側に置く',
  },
  'skin-forearm': {
    roi: [[562, 642], [705, 645], [705, 792], [566, 792]],
    source: 'draft',
    why: '肘から腕節までの柱',
  },
  'skin-knee': {
    roi: [[552, 776], [655, 776], [655, 858], [554, 858]],
    source: 'draft',
    why: '腕節(手根関節)の膨らみ。管の直上',
  },
  'skin-fetlock': REVIEWED_SKIN_PARTS_LEFT['skin-fetlock']!,
  'skin-pastern': {
    // 蹄(skin-hoof)の図形は蹄匣だけなので、繋はその上の斜めの柱だけを切る。
    // 蹄全体を囲むと蹄の点が中に入って面積順序が壊れるので左の斜面に寄せる
    roi: [[520, 1055], [560, 1055], [558, 1102], [522, 1102]],
    labelAt: [540, 1078],
    source: 'draft',
    why: '球節と蹄冠の間の斜めの柱',
  },
  'skin-coronet': {
    roi: [[545, 1050], [605, 1056], [604, 1074], [548, 1070]],
    source: 'draft',
    why: '被毛と蹄壁の境の帯。蹄の上縁に沿う',
  },
  'skin-loin': {
    roi: [[1040, 265], [1165, 275], [1160, 420], [1045, 415]],
    source: 'draft',
    why: '背と尻をつなぐ腰椎上の橋',
  },
  'skin-flank': {
    roi: [[1100, 435], [1195, 445], [1190, 575], [1095, 565]],
    source: 'draft',
    why: '後肢前の窪み。大腿の前縁に被るが小さい側なので併存できる',
  },
  'skin-abdomen': {
    roi: [[700, 520], [1075, 505], [1115, 575], [1040, 675], [745, 675], [695, 600]],
    source: 'draft',
    why: '帯径の下の腹面',
  },
  'skin-thigh': {
    roi: [[1085, 395], [1350, 405], [1360, 560], [1330, 690], [1160, 685], [1085, 520]],
    source: 'draft',
    why: '後躯の筋の塊。大腿の表出面全体',
  },
  'skin-stifle': {
    roi: [[1098, 600], [1188, 608], [1185, 698], [1102, 692]],
    source: 'draft',
    why: '後肢前面の膝(大腿脛骨関節)。大腿の中に入るが小さい側',
  },
  'skin-gaskin': {
    roi: [[1145, 697], [1265, 697], [1272, 772], [1152, 772]],
    labelAt: [1210, 725],
    source: 'draft',
    // 飛節(skin-hock)の重心を内包しないよう下端を止め、点は飛節の上縁より上に固定
    why: '膝蓋と飛節の間の柱',
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
  const poly = 'points' in def ? def.points : regionFromMask(mask, def.roi, 10)
  if (poly.length < 3) {
    console.error(`${id}: 輪郭が取れんかった`)
    bad++
    return
  }
  const problems = checkPolygon({ mask, size: mask.size, kind: 'part', id, points: poly })
  const c = centroid(poly)
  const labelAt: Point = def.labelAt ?? [Math.round(c[0]), Math.round(c[1])]
  const color = PALETTE[i % PALETTE.length]!
  overlays.push({ points: poly, color })
  dots.push({ at: c, color })
  parts.push({
    id,
    layer: st.layer,
    points: poly.map((p) => [Math.round(p[0]), Math.round(p[1])]),
    labelAt,
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
rewriteRegionParts(path, 'skin', parts)
console.log(`\n皮膚 ${parts.length} 件 → ${path}${bad ? `  （要注意 ${bad} 件）` : ''}`)
