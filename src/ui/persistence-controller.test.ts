import { describe, expect, it, vi } from 'vitest'
import { CorruptPersistenceValue, PersistenceController, type PersistenceStorage } from './persistence-controller'

type Op = { id: string; on: boolean }
const parse = (raw: string | null): readonly string[] => {
  if (raw === null) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) throw new Error()
    return value
  } catch {
    throw new CorruptPersistenceValue()
  }
}
const apply = (value: readonly string[], op: Op): readonly string[] =>
  op.on ? [...value.filter((id) => id !== op.id), op.id] : value.filter((id) => id !== op.id)
const controller = (storage: PersistenceStorage) =>
  new PersistenceController({ storage, initial: [] as readonly string[], parse, serialize: JSON.stringify, apply })
const settle = async () => {
  for (let index = 0; index < 12; index += 1) await Promise.resolve()
}

describe('PersistenceController', () => {
  it('preserves stored and in-memory changes after an initial read failure recovers', async () => {
    let reads = 0
    const writes: string[] = []
    const subject = controller({
      sync: false,
      getItemSync: () => null,
      getItem: () => (reads++ === 0 ? Promise.reject(new Error('blocked')) : Promise.resolve('["old"]')),
      setItem: async (raw) => { writes.push(raw) },
    })
    subject.subscribe(() => {})
    await settle()
    subject.mutate({ id: 'new', on: true })
    expect(subject.getSnapshot()).toMatchObject({ value: ['new'], loaded: false, dirty: true, problem: 'read' })
    subject.retry()
    await settle()
    expect(subject.getSnapshot()).toMatchObject({ value: ['old', 'new'], loaded: true, dirty: false, phase: 'saved' })
    expect(writes).toEqual(['["old","new"]'])
  })

  it('does not overwrite corrupt non-empty data', async () => {
    const setItem = vi.fn(async () => {})
    const subject = controller({ sync: true, getItemSync: () => '{bad', getItem: async () => '{bad', setItem })
    subject.mutate({ id: 'new', on: true })
    await settle()
    expect(subject.getSnapshot()).toMatchObject({ loaded: false, dirty: true, problem: 'corrupt' })
    expect(setItem).not.toHaveBeenCalled()
  })

  it('physically serializes revisions and writes the latest absolute snapshot last', async () => {
    const resolvers: (() => void)[] = []
    const writes: string[] = []
    const subject = controller({
      sync: true,
      getItemSync: () => '[]',
      getItem: async () => '[]',
      setItem: (raw) => new Promise<void>((resolve) => { writes.push(raw); resolvers.push(resolve) }),
    })
    subject.mutate({ id: 'a', on: true })
    subject.mutate({ id: 'b', on: true })
    await settle()
    expect(writes).toEqual(['["a"]'])
    resolvers[0]?.()
    await settle()
    expect(writes).toEqual(['["a"]', '["a","b"]'])
    resolvers[1]?.()
    await settle()
    expect(subject.getSnapshot()).toMatchObject({ value: ['a', 'b'], dirty: false, phase: 'saved' })
  })

  it('retries the same latest snapshot when storage commits and then rejects', async () => {
    let physical = '[]'
    let calls = 0
    const writes: string[] = []
    const subject = controller({
      sync: true,
      getItemSync: () => physical,
      getItem: async () => physical,
      setItem: async (raw) => {
        physical = raw
        writes.push(raw)
        if (calls++ === 0) throw new Error('reported failure after commit')
      },
    })
    subject.mutate({ id: 'a', on: true })
    await settle()
    expect(subject.getSnapshot()).toMatchObject({ value: ['a'], dirty: true, problem: 'write' })
    subject.retry()
    await settle()
    expect(writes).toEqual(['["a"]', '["a"]'])
    expect(physical).toBe('["a"]')
    expect(subject.getSnapshot().dirty).toBe(false)
  })

  it('never lets a rejected older revision roll back a newer in-memory edit', async () => {
    let rejectFirst: ((reason?: unknown) => void) | undefined
    const writes: string[] = []
    const subject = controller({
      sync: true,
      getItemSync: () => '[]',
      getItem: async () => '[]',
      setItem: (raw) => {
        writes.push(raw)
        if (writes.length === 1) return new Promise<void>((_, reject) => { rejectFirst = reject })
        return Promise.resolve()
      },
    })
    subject.mutate({ id: 'a', on: true })
    subject.mutate({ id: 'b', on: true })
    await settle()
    rejectFirst?.(new Error('quota'))
    await settle()
    expect(subject.getSnapshot()).toMatchObject({ value: ['a', 'b'], dirty: true, problem: 'write' })
    subject.retry()
    await settle()
    expect(writes).toEqual(['["a"]', '["a","b"]'])
    expect(subject.getSnapshot()).toMatchObject({ value: ['a', 'b'], dirty: false, phase: 'saved' })
  })
})

it('merges queued answer events once and retries an absolute score after commit-then-reject', async () => {
  let canRead = false
  let physical = '4'
  let firstWrite = true
  const subject = new PersistenceController<number, number>({
    initial: 0,
    parse: (raw) => Number(raw ?? 0),
    serialize: String,
    apply: (score, increment) => score + increment,
    storage: {
      sync: true,
      getItemSync: () => { throw new Error('read blocked') },
      getItem: async () => { if (!canRead) throw new Error('read blocked'); return physical },
      setItem: async (raw) => {
        physical = raw
        if (firstWrite) { firstWrite = false; throw new Error('committed but acknowledgment failed') }
      },
    },
  })
  subject.mutate(1)
  subject.mutate(1)
  expect(physical).toBe('4')
  canRead = true
  subject.retry()
  await settle()
  expect(subject.getSnapshot()).toMatchObject({ value: 6, dirty: true, problem: 'write' })
  expect(physical).toBe('6')
  subject.retry()
  await settle()
  expect(subject.getSnapshot()).toMatchObject({ value: 6, dirty: false, phase: 'saved' })
  expect(physical).toBe('6')
})
