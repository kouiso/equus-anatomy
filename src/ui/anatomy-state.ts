import { useSyncExternalStore } from 'react'
import { areaOfStructure } from '../core/area-map'
import { backStepPatch } from '../core/back-step'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import { mappableViews, oppositeLateralView } from '../core/map-entry'
import { pickGuardActive } from '../core/pick-guard'
import { fallbackDepth } from '../core/plate-availability'
import { visibleStructures } from '../core/visible-parts'
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
  candidatePartIds: readonly string[]
  areaId: string | null
  zoom: ViewBox | null
}

const initial: State = {
  view: 'left',
  layer: 'muscle',
  depth: 'superficial',
  selectedPartId: null,
  candidatePartIds: [],
  areaId: null,
  zoom: null,
}

let state = initial
const listeners = new Set<() => void>()

export function updateAnatomy(patch: Partial<State>) {
  state = { ...state, candidatePartIds: [], ...patch }
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

export function showOppositeAnatomySide() {
  const structure = state.selectedPartId ? STRUCTURE_BY_ID.get(state.selectedPartId) : undefined
  if (!structure) return
  const view = oppositeLateralView(structure, state.view)
  if (view === null) return
  const zoom = state.zoom
  updateAnatomy({ view, zoom: zoom ? { ...zoom, x: GEOMETRY[view].size.w - zoom.x - zoom.w } : null })
}

// 現在の視野が fit と一致するか。ピンチ/パンの結果が偶然ぴったり fit に
// 戻った時でも非 null で残すと、実態のない「寄り」の段が出続ける(#158)
function isFitViewBox(vb: ViewBox, fitted: ViewBox): boolean {
  const eps = 0.01
  return (
    Math.abs(vb.x - fitted.x) < eps &&
    Math.abs(vb.y - fitted.y) < eps &&
    Math.abs(vb.w - fitted.w) < eps &&
    Math.abs(vb.h - fitted.h) < eps
  )
}

export function setAnatomyViewBox(update: (viewBox: ViewBox) => ViewBox) {
  const fitted = fit(GEOMETRY[state.view].size)
  const next = update(state.zoom ?? fitted)
  updateAnatomy({ zoom: isFitViewBox(next, fitted) ? null : next })
}

// 場所→部位への切替時刻。切替直後の部位判定を猶予する pickGuardActive が見る(#67)
let lastAreaPickAt: number | null = null

function partPickGuarded(): boolean {
  return pickGuardActive(lastAreaPickAt, Date.now())
}

// キャンバスのタップ由来の選択・解除はここを通す。部位一覧・閉じるボタン・
// 部位ジャンプは迷いタップではないので猶予を掛けず、呼び出し側へ
// 不変条件を分散させない(#67)
export function pickAnatomyPartByTap(id: string | null, candidates: readonly string[] = []) {
  if (partPickGuarded()) return
  updateAnatomy({
    selectedPartId: id,
    candidatePartIds: id !== null && candidates.length > 1 ? [...new Set([id, ...candidates])] : [],
  })
}

export function selectAnatomyCandidate(id: string) {
  if (!state.candidatePartIds.includes(id)) return
  updateAnatomy({ selectedPartId: id, candidatePartIds: state.candidatePartIds })
}

// 図の空白(馬体の外)のタップ。端末の戻ると同じく選択を1段ずつ解除する。
// 部位だけでなく場所・寄りの段でも効かせる。見える「1つ戻る」チップがある今でも、
// 図を触る流れの中で空白を叩いたときに何も起きないのは不自然なので残す。
// タップ由来なので迷いタップの猶予(pick-guard)は通す
export function emptyTapBack() {
  if (partPickGuarded()) return
  const patch = backStepPatch(state)
  if (patch) updateAnatomy(patch)
}

export function pickAnatomyArea(area: Area) {
  const geometry = GEOMETRY[state.view]
  // 図形・一覧と同じ条件で集める。向きを見んと、右に出さない臓器まで寄せ先に入る (#277)
  const ids = new Set(
    visibleStructures(STRUCTURE_BY_ID.values(), { view: state.view, areaId: area.id }).map((structure) => structure.id),
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
  const wantedDepth = structure.depth ?? 'superficial'
  updateAnatomy({
    view,
    layer: structure.layer,
    // 深層筋は図が未登録の向きが多い。存在しない板を指すと図が出んので、
    // 表示条件モーダル・タブ画面と同じ fallbackDepth で図のある深さへ寄せる
    depth: structure.layer === 'muscle' ? fallbackDepth(geometry, wantedDepth) : wantedDepth,
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
