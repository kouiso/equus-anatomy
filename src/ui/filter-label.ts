import type { Translator } from '../core/i18n'

/**
 * 絞り込みボタンの読み上げ名。「層、すべて」「Layer, All」。
 * 区切りは言語ごとに違う（和文は「、」、英文は「, 」）ので、文字列を直に繋がず messages に持つ。
 */
export function filterButtonLabel(t: Translator, title: string, value: string): string {
  return t('catalog.filterButtonLabel', { title, value })
}
