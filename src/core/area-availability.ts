import type { Structure } from './types'
import { visibleStructures, type VisibleScope } from './visible-parts'

/**
 * 「この場所は、今の向き・層に部位を1つでも持つか」。
 * 0 件の場所は選んでも寄せ先が無く、何も無い所へズームするだけの行き止まりになる。
 * 場所の点・場所一覧は、この判定が false の場所を押せない状態で出す
 * （図のない深さを押せなくする #255 の hasPlate と同じ考え方）。
 *
 * 数え方は図形・一覧・場所を選んだ時の寄せ先と同じ visibleStructures に任せる。
 * 場所への寄せ（area-map）は向きごとに替えん。向きに出ん場所は出さずに、ここで押せなくする。
 */
export type AreaScope = Omit<VisibleScope, 'areaId'>

export function areaHasParts(structures: Iterable<Structure>, areaId: string, scope: AreaScope): boolean {
  return visibleStructures(structures, { ...scope, areaId }).length > 0
}
