import { useSyncExternalStore } from 'react'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import { AREA_PRESETS } from '../core/data/areas'
import type { Area, Part, Point, View, ViewGeometry } from '../core/types'

export const DRAFT_KEY = 'equus.calibrate.draft.v1'
type Shape = { kind: 'area' | 'part'; id: string; points: Point[] }

/**
 * /calibrate の下書きを解剖画面にそのまま重ねる。
 * 「測った座標が本番と同じ描画で即座に見える」ループが無いと、
 * 出力した JSON が正しいかどうかを確かめる手段が無くなる。
 */
function readRaw(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

const listeners = new Set<() => void>()
let snapshot = readRaw()

function refresh() {
  const next = readRaw()
  if (next === snapshot) return
  snapshot = next
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', refresh)
  window.addEventListener('equus:draft-changed', refresh)
}

export function notifyDraftChanged() {
  refresh()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('equus:draft-changed'))
}

function parse(raw: string): Record<string, Shape[]> {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, Shape[]>
  } catch {
    return {}
  }
}

export function useDraftShapes(view: View): readonly Shape[] {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => snapshot,
    () => snapshot,
  )
  // 右側望は左側望を反転して使うので、下書きも左側望のものを見る
  return parse(raw)[view === 'right' ? 'left' : view] ?? []
}

/** 確定済みの座標に下書きを重ねた ViewGeometry を返す。同じ id は下書きが勝つ。 */
export function mergeDraft(view: View, shapes: readonly Shape[]): ViewGeometry {
  const base = GEOMETRY[view]
  if (shapes.length === 0) return base
  const w = base.size.w
  const mirror = (pts: Point[]): Point[] => (view === 'right' ? pts.map(([x, y]) => [w - x, y] as Point) : pts)

  const draftAreas: Area[] = shapes
    .filter((s) => s.kind === 'area')
    .map((s) => ({
      id: s.id,
      nameJa: AREA_PRESETS.find((a) => a.id === s.id)?.nameJa ?? s.id,
      points: mirror(s.points),
    }))

  const draftParts: Part[] = shapes
    .filter((s) => s.kind === 'part')
    .flatMap((s) => {
      const st = STRUCTURE_BY_ID.get(s.id)
      if (!st) return []
      const base_: Part = { id: s.id, layer: st.layer, points: mirror(s.points) }
      return [st.depth === undefined ? base_ : { ...base_, depth: st.depth }]
    })

  const draftIds = new Set([...draftAreas.map((a) => a.id), ...draftParts.map((p) => p.id)])
  return {
    ...base,
    areas: [...base.areas.filter((a) => !draftIds.has(a.id)), ...draftAreas],
    parts: [...base.parts.filter((p) => !draftIds.has(p.id)), ...draftParts],
  }
}
