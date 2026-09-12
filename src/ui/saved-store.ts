import { useSyncExternalStore } from 'react'
import { storage } from './saved-storage'

type Snapshot = { readonly list: readonly string[]; readonly ready: boolean }

const listeners = new Set<() => void>()
/** 静的書き出しと hydrate の1回目はこれで描く。実値で描くと書き出した HTML と食い違う */
const SERVER: Snapshot = { list: [], ready: true }

function parse(raw: string | null): readonly string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    // 壊れた JSON でも画面は動かなアカン
    return []
  }
}

// 同期で読める環境（Web）は旧版どおり最初の描画から本物を出す。読めん環境は届くまで ready=false
let snapshot: Snapshot = storage.sync ? { list: parse(storage.getItemSync()), ready: true } : { list: [], ready: false }
let loadStarted = storage.sync
/** 読み込み完了前の操作。読めた一覧の上に同じ順で当て直す。古い値で消さんし、操作も落とさん */
const pending: { id: string; on: boolean }[] = []

function apply(list: readonly string[], id: string, on: boolean): readonly string[] {
  if (!on) return list.filter((x) => x !== id)
  return list.includes(id) ? list : [...list, id]
}

function commit(next: Snapshot) {
  snapshot = next
  for (const l of listeners) l()
}

function persist(list: readonly string[]) {
  // 書き込みは待たん。失敗しても、その場の表示は続ける（プライベートモードや容量不足）
  storage.setItem(JSON.stringify(list)).catch(() => {
    // 握り潰す。ここで throw すると toggle を押した画面ごと落ちる
  })
}

function loadOnce() {
  if (loadStarted) return
  loadStarted = true
  storage
    .getItem()
    .then((raw) => {
      let list = parse(raw)
      for (const p of pending) list = apply(list, p.id, p.on)
      const replayed = pending.length > 0
      pending.length = 0
      commit({ list, ready: true })
      if (replayed) persist(list)
    })
    .catch(() => {
      // ストレージが読めん環境でも、それまでの操作は残したまま動かす
      commit({ list: snapshot.list, ready: true })
    })
}

function toggle(id: string) {
  const on = !snapshot.list.includes(id)
  const list = apply(snapshot.list, id, on)
  if (!snapshot.ready) pending.push({ id, on })
  commit({ list, ready: snapshot.ready })
  // 読み込み前に書くと、保存済みの一覧をこの1件で上書きしてまう。読めてから当て直して書く
  if (snapshot.ready) persist(list)
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  loadOnce()
  return () => {
    listeners.delete(cb)
  }
}

export function useSaved() {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => SERVER)
  return { saved: snap.list, ready: snap.ready, toggle, has: (id: string) => snap.list.includes(id) }
}
