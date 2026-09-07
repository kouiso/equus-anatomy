import { useCallback, useSyncExternalStore } from 'react'

const KEY = 'equus.saved.v1'
const listeners = new Set<() => void>()

function read(): readonly string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    // プライベートモードやストレージ無効でも画面は動かなアカン
    return []
  }
}

let cache = read()

function write(next: readonly string[]) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 保存でけへんかっても、その場の表示は続ける
  }
  for (const l of listeners) l()
}

export function useSaved() {
  const saved = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => cache,
    () => cache,
  )
  const toggle = useCallback((id: string) => {
    write(cache.includes(id) ? cache.filter((x) => x !== id) : [...cache, id])
  }, [])
  return { saved, toggle, has: (id: string) => saved.includes(id) }
}
