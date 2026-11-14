/** 本文の内側スクロールに最低限残す高さ（dp）。これを割るほど操作が詰まる画面は「混み合い」扱い。 */
export const PANEL_SCROLL_MIN = 72
/** 本文を最低 1 行は読める高さ（dp）。 */
export const PANEL_BODY_MIN = 42
/** 図(320)とパネル最小ぶんが縦に共存できん高さは、全体スクロールに切り替える（dp）。 */
export const SHORT_ROOT_HEIGHT = 420

/** パネルの各部品を onLayout で計測した高さ（dp）。0 は未計測。 */
export type PanelRoom = { actions: number; content: number; heading: number }

export type PanelLayoutInput = {
  wide: boolean
  rootHeight: number
  /** 見出しの部品があるか。 */
  hasHeading: boolean
  /** 操作の部品が無い（null）か。 */
  actionsAbsent: boolean
  room: PanelRoom
}

export type PanelLayout = {
  /** 縦積みの時のパネルの高さ。横長の面板は使わない（高さ一杯に伸びる）。 */
  height: number
  /** 見出し・操作・本文最小が入らん極端に低い横長画面。全部を内側スクロールへ移す。 */
  tiny: boolean
  /** 操作が本文の最小スクロール域を食うので、操作の上に区切りを引く。 */
  crowded: boolean
  /** 短い画面。図とパネルは外側でスクロールする。 */
  short: boolean
}

/**
 * 解剖画面の下パネルの高さの決め方。文字拡大時は見出しと本文1行の可読性を優先する。
 * 残りの本文は内側、短画面の図とパネルは外側でスクロールする。
 */
export function panelLayout(input: PanelLayoutInput): PanelLayout {
  const { wide, rootHeight, room } = input
  const baseHeight = Math.min(200, rootHeight * 0.35)
  const actionsHeight = input.actionsAbsent ? 0 : room.actions
  const crowded = !wide && actionsHeight > 0 && actionsHeight + PANEL_SCROLL_MIN > baseHeight
  const short = !wide && rootHeight > 0 && rootHeight < SHORT_ROOT_HEIGHT
  // 計測が揃うまでの初回フレームも、見出し+操作2段+本文1行が入る高さを見積もっておく。
  // 高さ0に潰れたパネルでは操作の矩形だけが外にはみ出して、遷移直後の計測やタップを壊す
  const measured = (input.hasHeading ? room.heading > 0 : true) && (input.actionsAbsent || room.actions > 0)
  const fixedHeight = measured
    ? (input.hasHeading ? room.heading : 0) + actionsHeight + (crowded ? 9 : 0)
    : 210
  const requiredHeight = fixedHeight + Math.min(room.content > 0 ? room.content : PANEL_BODY_MIN, PANEL_BODY_MIN)
  // 見出し(selectedName)は常に1行なので、その計測高から文字の拡大倍率を推す。
  // 本文1行(note 16px + 上余白8)を同じ倍率で見積もり、読める最小のパネル高の床にする
  const textScale = room.heading > 0 ? Math.max(1, (room.heading - (short ? 4 : 8)) / 26) : 1
  const lineRoom = 8 + Math.ceil(16 * textScale)
  // 図は常に画面の6割以上を残す。上限内に見出し・操作・本文1行が収まらん時は、
  // 上限より可読性を優先する（本文の残りは内側のスクロールで読む）
  const panelCap = Math.floor(rootHeight * 0.4 - 1)
  const height = short
    ? Math.max(baseHeight, requiredHeight)
    : Math.min(Math.max(baseHeight, requiredHeight), Math.max(panelCap, fixedHeight + lineRoom))
  // 横の面板は高さ一杯に伸び、はみ出しは overflow:hidden で見えなくなる。
  // 固定部品(見出し・操作)と本文最小が入らん極端に低い画面では、全部を内側スクロールへ移す
  const tiny = wide && rootHeight > 0 && fixedHeight + PANEL_BODY_MIN > rootHeight
  return { height, tiny, crowded, short }
}
