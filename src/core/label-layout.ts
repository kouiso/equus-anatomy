import type { Point, Size } from './types'

/** ラベルの配置・描画・当たり判定で共有する画面上の矩形（CSS px）。 */
export type ScreenRect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export type LabelItem = {
  readonly id: string
  /** コンテナ左上を原点にした、引き出し元の画面座標（CSS px）。 */
  readonly at: Point
  readonly w: number
  readonly h: number
}

export type MarkerObstacle = { readonly id: string; readonly at: Point }

export type LabelPlacement = {
  readonly id: string
  /** 点からラベル中央までの差（CSS px）。 */
  readonly dx: number
  readonly dy: number
  readonly rect: ScreenRect
  readonly hidden: boolean
}

const DEFAULT_MARKER_CLEARANCE = 24
const DEFAULT_LABEL_GAP = 4
const DEFAULT_EDGE_GAP = 2

function rectsOverlap(a: ScreenRect, b: ScreenRect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
}

function rectIntersectsCircle(rect: ScreenRect, center: Point, radius: number): boolean {
  const nearestX = Math.max(rect.x, Math.min(center[0], rect.x + rect.w))
  const nearestY = Math.max(rect.y, Math.min(center[1], rect.y + rect.h))
  return Math.hypot(center[0] - nearestX, center[1] - nearestY) < radius
}

function insideViewport(rect: ScreenRect, viewport: Size, edgeGap: number): boolean {
  return rect.x >= edgeGap && rect.y >= edgeGap && rect.x + rect.w <= viewport.w - edgeGap && rect.y + rect.h <= viewport.h - edgeGap
}

function candidateOffsets(item: LabelItem, markerClearance: number): readonly Point[] {
  const x = item.w / 2 + markerClearance
  const y = item.h / 2 + markerClearance
  const candidates: Point[] = []
  // 近い位置から外へ探す。向きと段数を固定して結果を決定的にする。
  for (let ring = 1; ring <= 4; ring++) {
    const rx = x + (ring - 1) * (item.w / 2 + DEFAULT_LABEL_GAP)
    const ry = y + (ring - 1) * (item.h + DEFAULT_LABEL_GAP)
    candidates.push([0, -ry], [0, ry], [rx, 0], [-rx, 0], [rx, -ry], [-rx, -ry], [rx, ry], [-rx, ry])
  }
  return candidates
}

/**
 * ラベルを画面座標で配置する。
 * SVG のレターボックスを呼び出し側の imageToScreen で反映し、ここでは CSS px だけを扱う。
 */
export function layoutLabels(args: {
  items: readonly LabelItem[]
  markers: readonly MarkerObstacle[]
  viewport: Size
  /** Canvas 上に重なる操作ボタンなど、ラベルを置かない画面座標の領域。 */
  reservedRects?: readonly ScreenRect[]
  markerClearance?: number
  labelGap?: number
  edgeGap?: number
}): readonly LabelPlacement[] {
  const markerClearance = args.markerClearance ?? DEFAULT_MARKER_CLEARANCE
  const labelGap = args.labelGap ?? DEFAULT_LABEL_GAP
  const edgeGap = args.edgeGap ?? DEFAULT_EDGE_GAP
  const placed: ScreenRect[] = []
  const out = new Map<string, LabelPlacement>()
  const ordered = [...args.items].sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1] || a.id.localeCompare(b.id))

  for (const item of ordered) {
    // パンで点の中心が画面外へ出た時、ラベルだけを端へ残すと引き出し線が宙に浮いて見える。
    if (item.at[0] < 0 || item.at[0] > args.viewport.w || item.at[1] < 0 || item.at[1] > args.viewport.h) {
      out.set(item.id, {
        id: item.id,
        dx: 0,
        dy: 0,
        rect: { x: item.at[0] - item.w / 2, y: item.at[1] - item.h / 2, w: item.w, h: item.h },
        hidden: true,
      })
      continue
    }
    let chosen: LabelPlacement | undefined
    for (const [dx, dy] of candidateOffsets(item, markerClearance)) {
      const rect: ScreenRect = { x: item.at[0] + dx - item.w / 2, y: item.at[1] + dy - item.h / 2, w: item.w, h: item.h }
      if (!insideViewport(rect, args.viewport, edgeGap)) continue
      if (placed.some((other) => rectsOverlap(rect, other, labelGap))) continue
      if ((args.reservedRects ?? []).some((reserved) => rectsOverlap(rect, reserved, labelGap))) continue
      if (args.markers.some((marker) => marker.id !== item.id && rectIntersectsCircle(rect, marker.at, markerClearance))) continue
      chosen = { id: item.id, dx, dy, rect, hidden: false }
      placed.push(rect)
      break
    }
    out.set(item.id, chosen ?? {
      id: item.id,
      dx: 0,
      dy: 0,
      rect: { x: item.at[0] - item.w / 2, y: item.at[1] - item.h / 2, w: item.w, h: item.h },
      hidden: true,
    })
  }
  return args.items.map((item) => out.get(item.id)!)
}

/** 表示中ラベルだけを、描画に使った同じ矩形で判定する。 */
export function hitTestLabels<T>(point: Point, labels: readonly { readonly value: T; readonly placement: LabelPlacement }[]): T | null {
  for (let i = labels.length - 1; i >= 0; i--) {
    const label = labels[i]!
    if (label.placement.hidden) continue
    const { rect } = label.placement
    if (point[0] >= rect.x && point[0] <= rect.x + rect.w && point[1] >= rect.y && point[1] <= rect.y + rect.h) return label.value
  }
  return null
}
