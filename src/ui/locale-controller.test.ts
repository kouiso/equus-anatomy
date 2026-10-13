import { describe, expect, it, vi } from 'vitest'
import { LocaleController } from './locale-controller'
import type { LocaleStorage } from './locale-key'

function memory(initial: string | null, sync: boolean): LocaleStorage & { value: string | null } {
  const store = {
    value: initial,
    sync,
    getItemSync: () => store.value,
    getItem: () => Promise.resolve(store.value),
    setItem: (raw: string) => {
      store.value = raw
      return Promise.resolve()
    },
  }
  return store
}

describe('LocaleController', () => {
  it('未選択なら端末の言語で始まる', () => {
    const c = new LocaleController(memory(null, true), () => 'en')
    expect(c.getSnapshot()).toEqual({ locale: 'en', explicit: false, ready: true })
  })

  it('同期で読める保存値があれば端末の言語より優先する', () => {
    const c = new LocaleController(memory('ja', true), () => 'en')
    expect(c.getSnapshot()).toEqual({ locale: 'ja', explicit: true, ready: true })
  })

  it('壊れた保存値は無視して端末の言語へ落ちる', () => {
    const c = new LocaleController(memory('klingon', true), () => 'ja')
    expect(c.getSnapshot()).toEqual({ locale: 'ja', explicit: false, ready: true })
  })

  it('同期読みで例外が出ても端末の言語で起動する', () => {
    const storage = { ...memory(null, true), getItemSync: () => { throw new Error('denied') } }
    expect(new LocaleController(storage, () => 'en').getSnapshot().locale).toBe('en')
  })

  it('非同期の保存値は load 後に反映し、それまでは ready=false', async () => {
    const c = new LocaleController(memory('ja', false), () => 'en')
    expect(c.getSnapshot()).toEqual({ locale: 'en', explicit: false, ready: false })
    const listener = vi.fn()
    c.subscribe(listener)
    await c.load()
    expect(c.getSnapshot()).toEqual({ locale: 'ja', explicit: true, ready: true })
    expect(listener).toHaveBeenCalled()
  })

  it('読み込みに失敗しても ready になり端末の言語のまま進む', async () => {
    const storage = { ...memory(null, false), getItem: () => Promise.reject(new Error('io')) }
    const c = new LocaleController(storage, () => 'ja')
    await c.load()
    expect(c.getSnapshot()).toEqual({ locale: 'ja', explicit: false, ready: true })
  })

  it('読み込み中に利用者が選んだ言語は、後から届いた保存値で上書きされない', async () => {
    const c = new LocaleController(memory('ja', false), () => 'ja')
    const loading = c.load()
    c.setLocale('en')
    await loading
    expect(c.getSnapshot().locale).toBe('en')
  })

  it('setLocale は通知して保存する。保存に失敗しても画面の言語は変わる', async () => {
    const ok = memory(null, true)
    const c = new LocaleController(ok, () => 'ja')
    const listener = vi.fn()
    c.subscribe(listener)
    c.setLocale('en')
    expect(c.getSnapshot()).toEqual({ locale: 'en', explicit: true, ready: true })
    expect(listener).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(ok.value).toBe('en')

    const failing = { ...memory(null, true), setItem: () => Promise.reject(new Error('quota')) }
    const c2 = new LocaleController(failing, () => 'ja')
    c2.setLocale('en')
    expect(c2.getSnapshot().locale).toBe('en')
  })
})
