/** 図鑑・保存の行を縦積みにする境目（文字の倍率で割った幅、dp）。 */
export const COMPACT_ROW_MAX_WIDTH = 600

/**
 * 行を縦積み（層・名前・場所を縦に読む）にするか。
 * 小画面と文字拡大では名前の列が潰れるので、幅を文字の倍率で割って決める。
 */
export function isCompactRow(width: number, fontScale: number): boolean {
  return width / fontScale < COMPACT_ROW_MAX_WIDTH
}
