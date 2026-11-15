/** 本文の内側スクロールに最低限残す高さ（dp）。これを割るほど操作が詰まる画面は「混み合い」扱い。 */
export const PANEL_SCROLL_MIN = 72
/** 本文を最低 1 行は読める高さ（dp）。 */
export const PANEL_BODY_MIN = 42
/** 図(320)とパネル最小ぶんが縦に共存できん高さは、全体スクロールに切り替える（dp）。 */
export const SHORT_ROOT_HEIGHT = 420

/** パネルの各部品を onLayout で計測した高さ（dp）。0 は未計測。 */
export type PanelRoom = {
  actions: number
  content: number
  heading: number
  /** 見出しのうち名前の行だけの高さ。見出しに状態の1行が加わっても、文字の倍率を名前の行から推すために持つ。 */
  title?: number
}

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
  // 本文1行(note 16px + 上余白8)を同じ倍率で見積もり、読める最小のパネル高の床にする。
  // 見出しの下に状態の1行が入ると見出し全体の高さでは倍率を大きく見誤るので、名前の行が測れていればそちらを使う
  const textScale = room.title !== undefined && room.title > 0
    ? Math.max(1, room.title / 26)
    : room.heading > 0 ? Math.max(1, (room.heading - (short ? 4 : 8)) / 26) : 1
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

/** 状態の1行（向き・層・深さ）の置き場。beside: 名前の右 / below: 名前の下 / body: 本文の中（スクロールの先）。 */
export type StatusPlace = 'beside' | 'below' | 'body'

/**
 * 状態の1行の置き場を決めるために測った幅（dp）。0 は未計測。
 * box と status は、同じ置き場（at）で測った組としてだけ比べる。本文は Web では縦のスクロールバー（15px）のぶん
 * 見出しより狭いので、本文で測った幅と見出しで測った幅を混ぜると、折り返す行で置き場が往復し続ける（PR #324 の指摘）。
 */
export type StatusFit = {
  /** 見出しの行の幅。 */
  row: number
  /** 名前の幅。 */
  title: number
  /** box と status を測った置き場。 */
  at: StatusPlace
  /** その置き場で状態の1行が使える幅（器の幅）。名前の右は縮めずに並べるので Infinity。 */
  box: number
  /** 状態の1行の幅。器いっぱい（box と同じ）なら折り返している。 */
  status: number
}

export const EMPTY_STATUS_FIT: StatusFit = { row: 0, title: 0, at: 'body', box: 0, status: 0 }

/**
 * 測った幅を1つ取り込む。at は、その値を測った要素が描かれていた置き場。
 * 置き場が変わったら前の置き場の組は捨てて、新しい置き場で測り直す（違う器の幅を組にしない）。
 */
export function measureStatusFit(prev: StatusFit, key: 'row' | 'title' | 'box' | 'status', value: number, at: StatusPlace): StatusFit {
  // 詳細シートの開閉の間に届く 0 は化けた値なので捨てる（AnatomyPanel の measure と同じ）
  if (value <= 0) return prev
  if (key === 'row' || key === 'title') return prev[key] === value ? prev : { ...prev, [key]: value }
  if (prev.at !== at) {
    const box = at === 'beside' ? Infinity : key === 'box' ? value : 0
    return { ...prev, at, box, status: key === 'status' ? value : 0 }
  }
  if (key === 'box' && at === 'beside') return prev
  return prev[key] === value ? prev : { ...prev, [key]: value }
}

/** 名前と状態の1行を横に並べる時の間隔（dp）。 */
export const STATUS_GAP = 8

/**
 * 部位を選んだ縦長で、状態の1行をどこに置くか。
 * 見出しはスクロールしないので、ここで増えた高さはそのまま図を削る。名前の右に入れば高さは増えない。
 * 名前の下に1行で入る時だけ1行ぶん増やし、2行以上に折り返す時（英語・文字200%など）は本文に残して図の高さを守る。
 *
 * 往復しないための決まり: 器いっぱいに折り返した行は本当の幅が分からんので本文へ送り、本文で折り返した行は本文に留める。
 * 見出しへ上げるのは、測った器の中で折り返さずに収まった（本当の幅が分かった）時だけ。
 * 本文の器は見出しより狭いので、本文で収まった行は見出しでも同じ幅で収まり、戻ってこない。
 */
export function statusPlacement(fit: StatusFit): StatusPlace {
  if (fit.row <= 0 || fit.title <= 0) return 'body'
  // 新しい置き場の組が揃うまでは、その置き場のまま待つ
  if (fit.box <= 0 || fit.status <= 0) return fit.at
  if (fit.status >= fit.box - 1) return 'body'
  // 1px 残すのは、名前の右に置いた後で文言が伸びて名前が縮み、丁度の幅で「入る」と判定し続けるのを防ぐため
  const room = fit.row - 1
  if (fit.title + STATUS_GAP + fit.status < room) return 'beside'
  if (fit.status < room) return 'below'
  return 'body'
}
