import { areaOfStructure } from './area-map'
import type { Depth, Layer, Structure, View } from './types'

/**
 * 「今この図に出る部位」の条件。解剖画面の図形・一覧・計数と、場所を選んだ時の寄せ先が
 * 同じ集合を見るように、条件はここ1か所に置く。
 *
 * - 向き: 側性のある臓器（脾臓は左だけ等）は views で出す向きを限る
 * - 場所: 場所を選んだら、その場所に属する部位だけにする（null なら絞らない）
 * - 層・深さ: 渡した時だけ絞る。depth を持たない部位はどの深さでも出す
 */
export type VisibleScope = {
  readonly view: View
  readonly areaId: string | null
  readonly layer?: Layer
  readonly depth?: Depth
}

export function isStructureVisible(structure: Structure, scope: VisibleScope): boolean {
  if (!structure.views.includes(scope.view)) return false
  if (scope.areaId !== null && areaOfStructure(structure) !== scope.areaId) return false
  if (scope.layer !== undefined && structure.layer !== scope.layer) return false
  if (scope.depth !== undefined && (structure.depth ?? scope.depth) !== scope.depth) return false
  return true
}

export function visibleStructures(structures: Iterable<Structure>, scope: VisibleScope): Structure[] {
  return [...structures].filter((structure) => isStructureVisible(structure, scope))
}
