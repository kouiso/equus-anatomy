/**
 * 左側望で目視レビューを通した手修正座標の置き場。
 *
 * 生成スクリプト（derive-parts-skin-left.ts / derive-areas.ts）はここの値をそのまま使い、
 * reviewed-coords-left.test.ts が left.json との一致を見張る。
 * 再生成で手修正が消える事故（#97）を防ぐため、次の手修正もここへ足す。
 */
import type { CoordSource, Point, Polygon } from '../src/core/types'

export type ReviewedPart =
  // 輪郭ごと固定する部位
  | { points: Polygon; labelAt: Point; source: CoordSource; why: string }
  // 輪郭はマスクから取り、点の位置だけ固定する部位
  | { roi: Polygon; labelAt: Point; source: CoordSource; why: string }

export type ReviewedArea = { points: Polygon; labelAt: Point; why: string }

export const REVIEWED_SKIN_PARTS_LEFT: Record<string, ReviewedPart> = {
  'skin-hoof': {
    points: [
      [551, 1057],
      [566, 1062],
      [583, 1069],
      [603, 1079],
      [600, 1087],
      [595, 1093],
      [585, 1097],
      [565, 1099],
      [544, 1099],
      [532, 1097],
      [528, 1093],
      [532, 1085],
    ],
    labelAt: [568, 1078],
    source: 'draft',
    why: 'マスク再推定は被毛を含み蹄尖を欠くため、目視レビュー済みの明示座標を使う（2026-10-03 再レビュー）',
  },
  'skin-tail': {
    roi: [[1290, 300], [1520, 300], [1520, 940], [1395, 940], [1395, 500], [1290, 430]],
    // 重心 (1385,491) はポリゴン外で臀部側に見えるので、垂れた尾毛の上へ固定する（#24 由来の手修正）
    labelAt: [1440, 640],
    source: 'measured',
    why: '尾は輪郭で分かれる',
  },
}

export const REVIEWED_AREAS_LEFT: Record<string, ReviewedArea> = {
  tail: {
    // 垂れ下がった尾毛まで当たり判定を広げた手修正形状（#20/#21 由来）。
    // マスクから取り直すと毛先側が削れて点もポリゴン外へ出るので頂点を固定する
    points: [
      [1292, 340], [1396, 404], [1452, 604], [1464, 700], [1456, 812], [1420, 884],
      [1368, 936], [1376, 850], [1384, 760], [1396, 660], [1396, 628], [1380, 444],
      [1332, 380], [1348, 468], [1292, 428], [1292, 348],
    ],
    // 垂れた尾毛の上に点を置く
    labelAt: [1445, 740],
    why: '#20/#21 で尾毛まで広げた手修正頂点',
  },
}
