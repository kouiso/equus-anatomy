import { useSyncExternalStore } from 'react'
import { areaOfStructure } from '../core/area-map'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import type { Area, Depth, Layer, View, ViewBox } from '../core/types'
import { fit, zoomToPolygon, zoomToPolygons } from '../core/zoom'

export const VIEWS = [
  { id: 'left', label: '左側望' },
  { id: 'right', label: '右側望' },
  { id: 'front', label: '正面' },
  { id: 'rear', label: '後面' },
] as const

export const LAYERS = [
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const

export const DEPTHS = [
  { id: 'superficial', label: '表層筋' },
  { id: 'deep', label: '深層筋' },
] as const

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
  updateAnatomy({
    areaId: area.id,
    selectedPartId: null,
    zoom: targets.length
      ? zoomToPolygons(targets.map((part) => part.points), geometry.size)
      : zoomToPolygon(area.points, geometry.size),
  })
}

export function focusAnatomyPart(id: string) {
  const structure = STRUCTURE_BY_ID.get(id)
  if (!structure) return

  const view =
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
    zoom: part ? zoomToPolygon(part.points, geometry.size) : null,
  })
}
