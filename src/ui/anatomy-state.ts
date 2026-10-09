import { useSyncExternalStore } from 'react'
import { areaOfStructure } from '../core/area-map'
import { backStepPatch } from '../core/back-step'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import { mappableViews } from '../core/map-entry'
import { pickGuardActive } from '../core/pick-guard'
import type { Area, Depth, Layer, View, ViewBox } from '../core/types'
import { fit, zoomToPolygon, zoomToPolygons } from '../core/zoom'

// 表示名は言語リソースの view.* / layer.* / depth.* から引く（#72）
export const VIEWS = [{ id: 'left' }, { id: 'right' }, { id: 'front' }, { id: 'rear' }] as const

export const LAYERS = [{ id: 'skin' }, { id: 'muscle' }, { id: 'skeleton' }, { id: 'organs' }] as const

export const DEPTHS = [{ id: 'superficial' }, { id: 'deep' }] as const

interface State {
  view: View
  layer: Layer
  depth: Depth
  selectedPartId: string | null
  areaId: string | null
  zoom: ViewBox | null
}

const initial: State = {
  view: 'left',
  layer: 'muscle',
  depth: 'superficial',
  selectedPartId: null,
  areaId: null,
  zoom: null,
}

let state = initial
const listeners = new Set<() => void>()

export function updateAnatomy(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function useAnatomy() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => initial,
  )
}

export function resetAnatomy() {
  updateAnatomy({ zoom: null, areaId: null, selectedPartId: null })
}

export function changeConditions(view: View, layer: Layer, depth: Depth) {
  updateAnatomy({
    view,
    layer,
    depth,
    selectedPartId: null,
    ...(view !== state.view ? { zoom: null, areaId: null } : {}),
  })
}

export function setAnatomyViewBox(update: (viewBox: ViewBox) => ViewBox) {
  updateAnatomy({ zoom: update(state.zoom ?? fit(GEOMETRY[state.view].size)) })
}

// 場所→部位への切替時刻。切替直後の部位判定を猶予する pickGuardActive が見る(#67)
let lastAreaPickAt: number | null = null

export function partPickGuarded(): boolean {
  return pickGuardActive(lastAreaPickAt, Date.now())
}

// キャンバスのタップ由来の選択・解除はここを通す。部位一覧・閉じるボタン・
// 部位ジャンプは迷いタップではないので猶予を掛けず、呼び出し側へ
// 不変条件を分散させない(#67)
export function pickAnatomyPartByTap(id: string | null) {
  if (partPickGuarded()) return
  updateAnatomy({ selectedPartId: id })
}

export function pickAnatomyArea(area: Area) {
  const geometry = GEOMETRY[state.view]
  const ids = new Set(
    [...STRUCTURE_BY_ID.values()]
      .filter((structure) => areaOfStructure(structure) === area.id)
      .map((structure) => structure.id),
  )
  const targets = geometry.parts.filter(
    (part) =>
      ids.has(part.id) &&
      part.layer === state.layer &&
      (part.depth ?? state.depth) === state.depth,
  )
  // 切替時刻は zoom 確定の直前に記録する。ここから猶予が始まる
  lastAreaPickAt = Date.now()
  updateAnatomy({
    areaId: area.id,
    selectedPartId: null,
    zoom: targets.length
      ? zoomToPolygons(targets.map((part) => part.points), geometry.size, 0.2, geometry.mask)
      : zoomToPolygon(area.points, geometry.size, 0.25, geometry.mask),
  })
}

export function focusAnatomyPart(id: string) {
  const structure = STRUCTURE_BY_ID.get(id)
  if (!structure) return

  // 入口（canOpenOnMap）と同じ基準で向きを選ぶ。出せる向きが無い部位は
  // 入口側で止めるのが本筋で、ここは直URLなどへの保険として宣言先頭へ落とす
  const view =
    mappableViews(structure)[0] ??
    structure.views.find((candidate) =>
      GEOMETRY[candidate].parts.some((part) => part.id === id),
    ) ?? structure.views[0] ?? 'left'
  const geometry = GEOMETRY[view]
  const part = geometry.parts.find((candidate) => candidate.id === id)
  updateAnatomy({
    view,
    layer: structure.layer,
    depth: structure.depth ?? 'superficial',
    areaId: areaOfStructure(structure),
    selectedPartId: id,
    zoom: part ? zoomToPolygon(part.points, geometry.size, 0.25, geometry.mask) : null,
  })
}

/**
 * 端末の戻るで選択を1段だけ解除する。解除したら true(戻るを消費)、
 * 解除するものが無ければ false で画面遷移に任せる。
 * タップ由来の選択ではないので pick-guard は通さない。
 */
export function stepBackAnatomy(): boolean {
  const patch = backStepPatch(state)
  if (patch === null) return false
  updateAnatomy(patch)
  return true
}
