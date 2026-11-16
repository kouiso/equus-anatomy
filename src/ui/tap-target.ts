/**
 * 押せる高さ。Android の目安は 48dp で、Pixel 7 Pro で測ると図鑑の絞り込みと戻るは 44dp で足りんかった（#267）。
 * 見た目の高さはデザインの 44px のまま据え、足りん分は hitSlop で足す。
 * react-native に依存せん値だけここに置く（node の vitest で確かめるため）。
 *
 * hitSlop は Android では親の枠の外まで届かん（TouchTargetHelper が親の外の点を捨てる）。Web（react-native-web）では効かん。
 * 広げる量は、親の中に空きがある向きにだけ取る。
 */
export const TAP_TARGET_MIN = 48

/** 図鑑の絞り込み行のボタン（層・場所・向き・すべて解除）と、詳細の戻るの見た目の高さ */
export const CHIP_HEIGHT = 44

export type VerticalHitSlop = { top: number; bottom: number }

/** 図鑑の絞り込み行の上下の余白と、折り返した時の行間。ボタンの hitSlop がこの中に収まるようにする */
export const FILTER_ROW_SPACE = { top: 6, bottom: 8, gap: 6 } as const

/** 絞り込み行は上下に余白があるので、上下 2 ずつ広げる。折り返した行どうしでも 2 + 2 が行間 6 に収まって重ならん */
export const FILTER_CHIP_HIT_SLOP: VerticalHitSlop = { top: 2, bottom: 2 }

/** 詳細の戻るは本文の列の先頭で、列の上に空きが無い。上へ広げても切られるので、見出しとの間（16）へだけ広げる */
export const DETAIL_BACK_HIT_SLOP: VerticalHitSlop = { top: 0, bottom: 4 }

/** 絞り込みシートの選択肢の行の高さ。デザイン（review-2026-11-catalog）の .li は 60px。48 を超えるので hitSlop は要らん */
export const SHEET_OPTION_HEIGHT = 60

export function tapHeight(visible: number, slop: VerticalHitSlop): number {
  return visible + slop.top + slop.bottom
}
