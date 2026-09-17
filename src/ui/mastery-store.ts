import { useSyncExternalStore } from 'react'
import { applyMark, isLearned, recordOf, type MasteryMap } from '../core/mastery'
import { CorruptPersistenceValue, PersistenceController, type PersistenceState } from './persistence-controller'
import { storage } from './mastery-storage'

type Op = { readonly id: string; readonly kind: 'mark'; readonly on: boolean; readonly now: number }

function isRecord(value: unknown): value is MasteryMap[string] {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.correct === 'number' &&
    typeof record.wrong === 'number' &&
    typeof record.streak === 'number' &&
    typeof record.lastAt === 'number' &&
    typeof record.marked === 'boolean'
  )
}

function parse(raw: string | null): MasteryMap {
  if (raw === null || raw === '') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error()
    if (Object.values(parsed).some((value) => !isRecord(value))) throw new Error()
    return parsed as MasteryMap
  } catch {
    throw new CorruptPersistenceValue('学習記録を読み取れません')
  }
}

function apply(map: MasteryMap, op: Op): MasteryMap {
  const current = recordOf(map, op.id)
  const next = applyMark(current, op.on, op.now)
  return { ...map, [op.id]: next }
}

const controller = new PersistenceController<MasteryMap, Op>({
  storage,
  initial: {},
  parse,
  serialize: JSON.stringify,
  apply,
})

const SERVER: PersistenceState<MasteryMap> = { value: {}, loaded: false, dirty: false, phase: 'loading' }

export function retryMasteryPersistence(): void {
  controller.retry()
}

export function useMastery() {
  const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => SERVER)
  const mark = (id: string, on: boolean) => controller.mutate({ id, kind: 'mark', on, now: Date.now() })
  return {
    map: snap.value,
    ready: snap.loaded,
    persistence: snap,
    retryPersistence: retryMasteryPersistence,
    record: (id: string) => recordOf(snap.value, id),
    learned: (id: string) => isLearned(recordOf(snap.value, id)),
    learnedCount: Object.values(snap.value).filter(isLearned).length,
    mark,
  }
}
