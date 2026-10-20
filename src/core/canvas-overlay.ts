import type { ScreenRect } from './label-layout'

/** マーカーの当たり半径と輪の半径（画面 CSS px）。描画と当たり判定と試験で同じ値を使う。 */
export const MARKER_HIT_R = 22
export const MARKER_RING_R = 10

/**
 * 解剖図の上に重ねた操作（右上のズーム、左上の部位一覧、その下の「1つ戻る」）が占める画面の矩形。
 * ラベルを置かん場所であり、点がここに隠れると押せん。
 */
/** 左上の部位一覧と「1つ戻る」が使える最大幅。右上のズーム操作に重ならん幅 */
export function selectorMaxWidth(canvasWidth: number): number {
  return Math.max(96, canvasWidth - 192)
}

/** 左下に重ねる操作（表示条件・詳しく読む）が使える最大幅 */
export function bottomOverlayMaxWidth(canvasWidth: number): number {
  return Math.max(96, canvasWidth - 24)
}

/**
 * bottom は左下の操作（#178）。縦に並ぶので高さは個数で決まり、幅は描いてみるまで分からん。
 * 幅が未計測（0）の間は最大幅で塞ぐ。
 */
export function canvasOverlayRects(args: {
  canvasWidth: number
  showBack: boolean
  shortCanvas: boolean
  bottom?: { canvasHeight: number; height: number; width: number }
}): ScreenRect[] {
  const selectorMaxW = selectorMaxWidth(args.canvasWidth)
  const bottomMaxW = bottomOverlayMaxWidth(args.canvasWidth)
  return [
    { x: args.canvasWidth - 168, y: 12, w: 156, h: 48 },
    { x: 12, y: 12, w: selectorMaxW, h: 48 },
    ...(args.showBack && !args.shortCanvas ? [{ x: 12, y: 72, w: selectorMaxW, h: 48 }] : []),
    ...(args.bottom !== undefined
      ? [
          {
            x: 12,
            y: args.bottom.canvasHeight - 12 - args.bottom.height,
            w: Math.min(args.bottom.width || bottomMaxW, bottomMaxW),
            h: args.bottom.height,
          },
        ]
      : []),
  ]
}
