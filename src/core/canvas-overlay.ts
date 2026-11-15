import type { ScreenRect } from './label-layout'

/** マーカーの当たり半径と輪の半径（画面 CSS px）。描画と当たり判定と試験で同じ値を使う。 */
export const MARKER_HIT_R = 22
export const MARKER_RING_R = 10

/** 左上の部位一覧と「1つ戻る」が使える最大幅。右上のズーム操作に重ならん幅 */
export function selectorMaxWidth(canvasWidth: number): number {
  return Math.max(96, canvasWidth - 192)
}

/** 上段で部位一覧と表示条件の間に空ける幅 */
export const TOP_ACTION_GAP = 6
/** 上段の右の列（ズームの下）の始まり。ズーム（上から12px・高さ48px）の下に12px空ける */
export const RIGHT_BELOW_TOP = 72

/**
 * 表示条件を部位一覧の右に並べるか（#323）。並ばん時は右の列（ズームの下）へ送る。
 * 幅は描いてみるまで分からんので、2つのボタンの測った幅で決める。未計測（0）の間は並べる。
 *
 * 測る → 置く → 測り直す、で置き場が往復しないための決まり:
 * - 部位一覧の幅は置き場に依らん（どちらでも上限は selectorMaxWidth、縮めない）
 * - 表示条件は並べた時は縮めんので、測った幅が本当の幅
 * - 右の列では rightBelowMaxWidth まで縮むことがあるが、その上限はここで並べる上限より必ず広い。
 *   縮んだ幅を測り直しても「並べる」には戻らん
 */
export function conditionsBeside(args: { canvasWidth: number; selectorWidth: number; conditionsWidth: number }): boolean {
  if (args.selectorWidth <= 0 || args.conditionsWidth <= 0) return true
  return args.selectorWidth + TOP_ACTION_GAP + args.conditionsWidth <= selectorMaxWidth(args.canvasWidth) + 0.5
}

/**
 * 右の列（ズームの下）へ送った表示条件が使える最大幅。部位一覧の右端から12px離す。
 * 部位一覧は文字拡大で2行になってズームより低く伸びることがあるので、横で離す
 */
export function rightBelowMaxWidth(canvasWidth: number, selectorWidth: number): number {
  return Math.max(96, canvasWidth - 24 - selectorWidth - 12)
}

/** 左下に重ねる操作（詳しく読む）が使える最大幅 */
export function bottomOverlayMaxWidth(canvasWidth: number): number {
  return Math.max(96, canvasWidth - 24)
}

/**
 * 解剖図の上に重ねた操作（右上のズーム・左上の部位一覧と表示条件・その下の「1つ戻る」・左下の詳しく読む）に
 * ラベルを置かんための矩形。実際のボタンは文字の幅しか取らんので、ボタンの当たり範囲より広い。
 * topLeftHeight は左上の列の測った高さ（文字拡大で部位一覧が2行になると48pxより高い）。
 * rightBelow は右の列（ズームの下）へ送った表示条件（#323）。
 * bottom は左下の操作（#178、#202）。縦に並ぶので高さは個数で決まり、幅は描いてみるまで分からん。
 * 幅が未計測（0）の間は最大幅で塞ぐ。
 */
export function canvasOverlayRects(args: {
  canvasWidth: number
  showBack: boolean
  shortCanvas: boolean
  topLeftHeight?: number
  rightBelow?: { width: number; height: number }
  bottom?: { canvasHeight: number; height: number; width: number }
}): ScreenRect[] {
  const selectorMaxW = selectorMaxWidth(args.canvasWidth)
  const bottomMaxW = bottomOverlayMaxWidth(args.canvasWidth)
  return [
    { x: args.canvasWidth - 168, y: 12, w: 156, h: 48 },
    { x: 12, y: 12, w: selectorMaxW, h: Math.max(48, args.topLeftHeight ?? 0) },
    ...(args.rightBelow !== undefined
      ? [{ x: args.canvasWidth - 12 - args.rightBelow.width, y: RIGHT_BELOW_TOP, w: args.rightBelow.width, h: args.rightBelow.height }]
      : []),
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
