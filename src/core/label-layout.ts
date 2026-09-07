import type { Point, ViewBox } from './types'

/**
 * ラベルの重なりを避けて置き場所を決める。
 *
 * 筋は隣り合っとるので重心も近い。素直に点の真上へ置くと、肩まわりで5枚が重なって読めん。
 * 画面上の CSS px で当たりを見て、空いとる向きへ逃がす。
 * 画面 px で解くのは、ラベルが逆スケールで常に同じ大きさに描かれるから。
 */
export type LabelItem = {
  readonly id: string
  /** 画像座標での引き出し元 */
  readonly at: Point
  /** 画面上のラベル寸法（CSS px） */
  readonly w: number
  readonly h: number
}

export type LabelPlacement = {
  readonly id: string
  /** 点からの相対位置（CSS px）。renderer は逆スケール済みの座標系でそのまま使える。 */
  readonly dx: number
  readonly dy: number
  /** 置き場所が無くて省いたか */
  readonly hidden: boolean
}

type Box = { x: number; y: number; w: number; h: number }

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/**
 * @param unitToPx 画像1単位が画面何 px か。markerScale の逆数。
 * @param keep 必ず出したいラベル（選択中のもの）。最初に置いて他を避けさせる。
 */
export function layoutLabels(args: {
  items: readonly LabelItem[]
  viewBox: ViewBox
  unitToPx: number
  gap?: number
  keep?: string | null
}): readonly LabelPlacement[] {
  const { items, viewBox, unitToPx } = args
  const gap = args.gap ?? 16
  const placed: Box[] = []
  const out = new Map<string, LabelPlacement>()

  // 選択中を先に置く。あとは左から順に置くと、同じ入力なら必ず同じ結果になる（描画順に依存せん）
  const ordered = [...items].sort((a, b) => {
    if (a.id === args.keep) return -1
    if (b.id === args.keep) return 1
    return a.at[0] - b.at[0] || a.at[1] - b.at[1] || (a.id < b.id ? -1 : 1)
  })

  for (const it of ordered) {
    const sx = (it.at[0] - viewBox.x) * unitToPx
    const sy = (it.at[1] - viewBox.y) * unitToPx
    // 上 → 下 → 右 → 左 → 斜め の順に空きを探す
    const candidates: [number, number][] = [
      [0, -gap - it.h / 2],
      [0, gap + it.h / 2],
      [it.w / 2 + gap, 0],
      [-it.w / 2 - gap, 0],
      [it.w / 2 + gap, -gap - it.h / 2],
      [-it.w / 2 - gap, -gap - it.h / 2],
      [it.w / 2 + gap, gap + it.h / 2],
      [-it.w / 2 - gap, gap + it.h / 2],
      [0, -2 * (gap + it.h)],
      [0, 2 * (gap + it.h)],
    ]
    let chosen: LabelPlacement | null = null
    for (const [dx, dy] of candidates) {
      const box: Box = { x: sx + dx - it.w / 2, y: sy + dy - it.h / 2, w: it.w, h: it.h }
      if (placed.some((p) => overlaps(p, box))) continue
      placed.push(box)
      chosen = { id: it.id, dx, dy, hidden: false }
      break
    }
    out.set(it.id, chosen ?? { id: it.id, dx: 0, dy: -gap - it.h / 2, hidden: true })
  }
  return items.map((i) => out.get(i.id)!)
}
