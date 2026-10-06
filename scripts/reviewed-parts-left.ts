import type { CoordSource, Point, Polygon } from '../src/core/types'

export const REVIEWED_SKIN_PARTS_LEFT: Record<
  string,
  { points: Polygon; labelAt: Point; source: CoordSource; why: string }
> = {
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
}
