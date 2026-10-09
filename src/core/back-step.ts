import type { ViewBox } from './types'

export interface BackStepState {
  selectedPartId: string | null
  areaId: string | null
  zoom: ViewBox | null
}

export type BackStep = 'part' | 'area' | 'zoom'

/**
 * 「戻る」1回で解除する段。部位 → 場所 → 寄り の順に1段ずつ剥がし、
 * 何も残っていなければ null を返して画面遷移(OS 既定の戻る)に任せる。
 * 場所を選ぶと寄りも付くので、場所の段で寄りもまとめて解除する。
 * 寄りだけの段はピンチ等で手動で寄った時にしか来ない。
 */
export function nextBackStep(state: BackStepState): BackStep | null {
  if (state.selectedPartId !== null) return 'part'
  if (state.areaId !== null) return 'area'
  if (state.zoom !== null) return 'zoom'
  return null
}

export function backStepPatch(state: BackStepState): Partial<BackStepState> | null {
  switch (nextBackStep(state)) {
    case 'part':
      return { selectedPartId: null }
    case 'area':
      return { selectedPartId: null, areaId: null, zoom: null }
    case 'zoom':
      return { zoom: null }
    case null:
      return null
  }
}
