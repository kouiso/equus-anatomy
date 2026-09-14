import { useSyncExternalStore } from 'react'
import { CorruptPersistenceValue, PersistenceController, type PersistenceState } from './persistence-controller'
import { storage } from './saved-storage'

type Op = { readonly id: string; readonly on: boolean; readonly index?: number }

function parse(raw: string | null): readonly string[] {
  if (raw === null || raw === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) throw new Error()
    return [...new Set(parsed)]
  } catch {
    throw new CorruptPersistenceValue('保存した部位のデータを読み取れません')
  }
}

function apply(list: readonly string[], op: Op): readonly string[] {
  if (!op.on) return list.filter((id) => id !== op.id)
  if (list.includes(op.id)) return list
  const index = Math.max(0, Math.min(op.index ?? list.length, list.length))
  return [...list.slice(0, index), op.id, ...list.slice(index)]
}

const controller = new PersistenceController<readonly string[], Op>({
  storage,
  initial: [],
  parse,
  serialize: JSON.stringify,
  apply,
})

const SERVER: PersistenceState<readonly string[]> = {
  value: [],
  loaded: false,
  dirty: false,
  phase: 'loading',
}

export function retrySavedPersistence(): void {
  controller.retry()
}

export function useSaved() {
  const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => SERVER)
  const setSaved = (id: string, on: boolean, index?: number) =>
    controller.mutate(index === undefined ? { id, on } : { id, on, index })
  return {
    saved: snap.value,
    ready: snap.loaded,
    persistence: snap,
    retryPersistence: retrySavedPersistence,
    setSaved,
    toggle: (id: string) => setSaved(id, !snap.value.includes(id)),
    has: (id: string) => snap.value.includes(id),
  }
}
