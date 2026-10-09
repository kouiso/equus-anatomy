import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GEOMETRY } from '../core/data'

// anatomy-state は useSyncExternalStore 越しにしか状態を出さない。
// React を立てずに読むため、フックを getSnapshot の直呼びに差し替える
vi.mock('react', () => ({
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}))

async function load() {
  vi.resetModules()
  const mod = await import('./anatomy-state')
  return { mod, read: () => mod.useAnatomy() }
}

describe('stepBackAnatomy', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('図で見る(部位+場所+寄り)から 部位 → 場所 → 遷移 の順に1段ずつ戻る', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('muscle-triceps')
    expect(read()).toMatchObject({ selectedPartId: 'muscle-triceps', areaId: 'fore' })
    expect(read().zoom).not.toBeNull()

    expect(mod.stepBackAnatomy()).toBe(true)
    expect(read()).toMatchObject({ selectedPartId: null, areaId: 'fore' })
    expect(read().zoom).not.toBeNull()

    expect(mod.stepBackAnatomy()).toBe(true)
    expect(read()).toMatchObject({ selectedPartId: null, areaId: null, zoom: null })

    expect(mod.stepBackAnatomy()).toBe(false)
  })

  it('向き・層の条件は戻るで変えない', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('organ-liver')
    const { view, layer, depth } = read()
    while (mod.stepBackAnatomy()) {
      expect(read()).toMatchObject({ view, layer, depth })
    }
  })

  it('場所を選んだ直後(pick-guard 中)でも戻るは効く', async () => {
    vi.useFakeTimers({ now: 10_000 })
    const { mod, read } = await load()
    const area = GEOMETRY.left.areas.find((a) => a.id === 'fore')
    if (!area) throw new Error('左側望に前肢の場所が無い')
    mod.pickAnatomyArea(area)
    expect(mod.partPickGuarded()).toBe(true)
    expect(mod.stepBackAnatomy()).toBe(true)
    expect(read()).toMatchObject({ areaId: null, zoom: null })
  })

  it('手動で寄っただけなら寄りを戻し、次は遷移に任せる', async () => {
    const { mod, read } = await load()
    mod.setAnatomyViewBox((vb) => ({ ...vb, w: vb.w / 2, h: vb.h / 2 }))
    expect(read().zoom).not.toBeNull()
    expect(mod.stepBackAnatomy()).toBe(true)
    expect(read().zoom).toBeNull()
    expect(mod.stepBackAnatomy()).toBe(false)
  })
})
