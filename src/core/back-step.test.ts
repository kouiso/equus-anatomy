import { describe, expect, it } from 'vitest'
import { backStepPatch, nextBackStep, type BackStepState } from './back-step'
import type { ViewBox } from './types'

const ZOOM: ViewBox = { x: 100, y: 100, w: 400, h: 300 }
const none: BackStepState = { selectedPartId: null, areaId: null, zoom: null }

describe('nextBackStep', () => {
  it('部位を選んでいれば、まず部位の選択を解除する', () => {
    expect(nextBackStep({ selectedPartId: 'muscle-triceps', areaId: 'fore', zoom: ZOOM })).toBe('part')
    expect(nextBackStep({ ...none, selectedPartId: 'muscle-triceps' })).toBe('part')
  })

  it('部位が無く場所を選んでいれば、場所の選択を解除する', () => {
    expect(nextBackStep({ ...none, areaId: 'fore', zoom: ZOOM })).toBe('area')
    expect(nextBackStep({ ...none, areaId: 'fore' })).toBe('area')
  })

  it('手動で寄っただけなら寄りを戻す', () => {
    expect(nextBackStep({ ...none, zoom: ZOOM })).toBe('zoom')
  })

  it('何も選んでいなければ画面遷移に任せる', () => {
    expect(nextBackStep(none)).toBeNull()
  })
})

describe('backStepPatch', () => {
  it('部位の段は場所と寄りを残す', () => {
    expect(backStepPatch({ selectedPartId: 'muscle-triceps', areaId: 'fore', zoom: ZOOM })).toEqual({
      selectedPartId: null,
    })
  })

  it('場所の段は寄りもまとめて戻す', () => {
    expect(backStepPatch({ ...none, areaId: 'fore', zoom: ZOOM })).toEqual({
      selectedPartId: null,
      areaId: null,
      zoom: null,
    })
  })

  it('寄りの段は寄りだけ戻す', () => {
    expect(backStepPatch({ ...none, zoom: ZOOM })).toEqual({ zoom: null })
  })

  it('解除するものが無ければ null', () => {
    expect(backStepPatch(none)).toBeNull()
  })

  it('繰り返し当てると 部位 → 場所 → 遷移 の順に剥がれる', () => {
    let state: BackStepState = { selectedPartId: 'muscle-triceps', areaId: 'fore', zoom: ZOOM }
    const steps: (string | null)[] = []
    for (;;) {
      const step = nextBackStep(state)
      steps.push(step)
      const patch = backStepPatch(state)
      if (patch === null) break
      state = { ...state, ...patch }
    }
    expect(steps).toEqual(['part', 'area', null])
  })
})
