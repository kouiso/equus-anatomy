import { useSyncExternalStore } from 'react'
import { applyAnswer, applyMark, isLearned, recordOf, type MasteryMap } from '../core/mastery'
import { storage } from './mastery-storage'

type Snapshot = { readonly map: MasteryMap; readonly ready: boolean }
/** 読み込み完了前の操作。読めた記録の上に同じ順で当て直す。古い値で消さんし、操作も落とさん */
type Op = { readonly id: string; readonly kind: 'mark'; readonly on: boolean } | { readonly id: string; readonly kind: 'answer'; readonly ok: boolean; readonly now: number }

const listeners = new Set<() => void>()
/** 静的書き出しと hydrate の1回目はこれで描く。実値で描くと書き出した HTML と食い違う */
const SERVER: Snapshot = { map: {}, ready: true }

function isRecord(v: unknown): v is MasteryMap[string] {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.correct === 'number' &&
    typeof r.wrong === 'number' &&
    typeof r.streak === 'number' &&
    typeof r.lastAt === 'number' &&
    typeof r.marked === 'boolean'
  )
}

function parse(raw: string | null): MasteryMap {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    // 形の合わん記録は捨てる。混ぜたまま進むと isLearned(null) で画面ごと落ちる
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => isRecord(v))) as MasteryMap
  } catch {
    // 壊れた JSON でも画面は動かなアカン
    return {}
  }
}

function applyOp(map: MasteryMap, op: Op): MasteryMap {
  const rec = recordOf(map, op.id)
  const next =
    op.kind === 'mark' ? applyMark(rec, op.on, Date.now()) : applyAnswer(rec, op.ok, op.now)
  return { ...map, [op.id]: next }
}

// 同期で読める環境（Web）は最初の描画から本物を出す。読めん環境は届くまで ready=false
let snapshot: Snapshot = storage.sync ? { map: parse(storage.getItemSync()), ready: true } : { map: {}, ready: false }
let loadStarted = storage.sync
const pending: Op[] = []

function commit(next: Snapshot) {
  snapshot = next
  for (const l of listeners) l()
}

function persist(map: MasteryMap) {
  // 書き込みは待たん。失敗しても、その場の表示は続ける（プライベートモードや容量不足）
  storage.setItem(JSON.stringify(map)).catch(() => {
    // 握り潰す。ここで throw すると操作した画面ごと落ちる
  })
}

function loadOnce() {
  if (loadStarted) return
  loadStarted = true
  storage
    .getItem()
    .then((raw) => {
      let map = parse(raw)
      for (const op of pending) map = applyOp(map, op)
      const replayed = pending.length > 0
      pending.length = 0
      commit({ map, ready: true })
      if (replayed) persist(map)
    })
    .catch(() => {
      // ストレージが読めん環境でも、それまでの操作は残したまま動かす
      commit({ map: snapshot.map, ready: true })
    })
}

function mutate(op: Op) {
  const map = applyOp(snapshot.map, op)
  if (!snapshot.ready) pending.push(op)
  commit({ map, ready: snapshot.ready })
  // 読み込み前に書くと、保存済みの記録をこの1件で上書きしてまう。読めてから当て直して書く
  if (snapshot.ready) persist(map)
}

function mark(id: string, on: boolean) {
  mutate({ id, kind: 'mark', on })
}

/** クイズ（#6）の解答を記録する口。画面側は「正解した/しなかった」だけ渡す */
function recordAnswer(id: string, ok: boolean) {
  mutate({ id, kind: 'answer', ok, now: Date.now() })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  loadOnce()
  return () => {
    listeners.delete(cb)
  }
}

export function useMastery() {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => SERVER)
  return {
    map: snap.map,
    ready: snap.ready,
    record: (id: string) => recordOf(snap.map, id),
    learned: (id: string) => isLearned(recordOf(snap.map, id)),
    learnedCount: Object.values(snap.map).filter(isLearned).length,
    mark,
    recordAnswer,
  }
}
