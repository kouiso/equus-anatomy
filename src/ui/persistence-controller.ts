export type PersistenceProblem = 'read' | 'corrupt' | 'write'

export type PersistenceState<T> = {
  readonly value: T
  readonly loaded: boolean
  readonly dirty: boolean
  readonly phase: 'loading' | 'saved' | 'pending' | 'error'
  readonly problem?: PersistenceProblem
}

export type PersistenceStorage = {
  readonly sync: boolean
  getItemSync(): string | null
  getItem(): Promise<string | null>
  setItem(raw: string): Promise<void>
}

type Options<T, Op> = {
  storage: PersistenceStorage
  initial: T
  parse(raw: string | null): T
  serialize(value: T): string
  apply(value: T, op: Op): T
}

export class CorruptPersistenceValue extends Error {}

/** Safe in-memory edits backed by a read-first, per-key serialized writer. */
export class PersistenceController<T, Op> {
  private listeners = new Set<() => void>()
  private pending: Op[] = []
  private revision = 0
  private readInFlight = false
  private writeInFlight = false
  private state: PersistenceState<T>

  constructor(private readonly options: Options<T, Op>) {
    this.state = { value: options.initial, loaded: false, dirty: false, phase: 'loading' }
    if (options.storage.sync) this.readSync()
  }

  getSnapshot = (): PersistenceState<T> => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (!this.state.loaded && !this.readInFlight && this.state.phase !== 'error') this.read()
    return () => this.listeners.delete(listener)
  }

  mutate = (op: Op): void => {
    if (!this.state.loaded) this.pending.push(op)
    this.revision += 1
    this.commit({
      ...this.state,
      value: this.options.apply(this.state.value, op),
      dirty: true,
      phase: this.state.problem ? 'error' : 'pending',
    })
    if (this.state.loaded) this.write()
  }

  retry = (): void => {
    if (this.readInFlight || this.writeInFlight) return
    if (!this.state.loaded) this.read()
    else if (this.state.dirty || this.state.problem === 'write') this.write()
  }

  private readSync(): void {
    try {
      const value = this.options.parse(this.options.storage.getItemSync())
      this.state = { value, loaded: true, dirty: false, phase: 'saved' }
    } catch (error) {
      this.state = {
        ...this.state,
        phase: 'error',
        problem: error instanceof CorruptPersistenceValue ? 'corrupt' : 'read',
      }
    }
  }

  private read(): void {
    if (this.readInFlight || this.state.loaded) return
    this.readInFlight = true
    Promise.resolve()
      .then(() => this.options.storage.getItem())
      .then((raw) => {
        let value = this.options.parse(raw)
        for (const op of this.pending) value = this.options.apply(value, op)
        const dirty = this.pending.length > 0
        this.pending = []
        this.readInFlight = false
        this.commit({ value, loaded: true, dirty, phase: dirty ? 'pending' : 'saved' })
        if (dirty) this.write()
      })
      .catch((error: unknown) => {
        this.readInFlight = false
        this.commit({
          ...this.state,
          phase: 'error',
          problem: error instanceof CorruptPersistenceValue ? 'corrupt' : 'read',
        })
      })
  }

  private write(): void {
    if (!this.state.loaded || !this.state.dirty || this.writeInFlight) return
    this.writeInFlight = true
    const writtenRevision = this.revision
    const raw = this.options.serialize(this.state.value)
    this.commit({ value: this.state.value, loaded: true, dirty: true, phase: 'pending' })
    Promise.resolve()
      .then(() => this.options.storage.setItem(raw))
      .then(() => {
        this.writeInFlight = false
        if (writtenRevision === this.revision) {
          this.commit({ value: this.state.value, loaded: true, dirty: false, phase: 'saved' })
        } else {
          this.write()
        }
      })
      .catch(() => {
        this.writeInFlight = false
        this.commit({ ...this.state, dirty: true, phase: 'error', problem: 'write' })
      })
  }

  private commit(next: PersistenceState<T>): void {
    this.state = next
    for (const listener of this.listeners) listener()
  }
}
