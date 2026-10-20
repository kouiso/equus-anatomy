import type { ScreenRect } from './label-layout'

/** マーカーの当たり半径と輪の半径（画面 CSS px）。描画と当たり判定と試験で同じ値を使う。 */
export const MARKER_HIT_R = 22
export const MARKER_RING_R = 10

/**
 * 解剖図の上に重ねた操作（右上のズーム、左上の部位一覧、その下の「1つ戻る」）が占める画面の矩形。
 * ラベルを置かん場所であり、点がここに隠れると押せん。
 */
export function canvasOverlayRects(args: { canvasWidth: number; showBack: boolean; shortCanvas: boolean }): ScreenRect[] {
  const selectorMaxW = Math.max(96, args.canvasWidth - 192)
  return [
    { x: args.canvasWidth - 168, y: 12, w: 156, h: 48 },
    { x: 12, y: 12, w: selectorMaxW, h: 48 },
    ...(args.showBack && !args.shortCanvas ? [{ x: 12, y: 72, w: selectorMaxW, h: 48 }] : []),
  ]
}
