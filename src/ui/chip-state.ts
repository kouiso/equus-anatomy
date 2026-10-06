/**
 * チップの見た目は3択のどれか1つ。
 * 「押せない(disabled)」と「選択中(on)」を同時に成立させると、
 * グレーなのに選ばれとるのか判別できん曖昧表示になる（Issue #64）。
 * disabled を最優先にして、選択中は押せるチップにだけ付ける。
 */
export type ChipVisual = 'on' | 'off' | 'disabled'

export function chipVisual(selected: boolean, disabled: boolean): ChipVisual {
  if (disabled) return 'disabled'
  return selected ? 'on' : 'off'
}
