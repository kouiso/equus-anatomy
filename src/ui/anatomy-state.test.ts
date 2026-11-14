import { beforeEach, describe, expect, it, vi } from 'vitest'
import { areaOfStructure } from '../core/area-map'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import { hasPlate } from '../core/plate-availability'
import { fit } from '../core/zoom'

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
    // pick-guard 中はタップ由来の選択が効かんので、挙動で猶予が生きていると分かる
    mod.pickAnatomyPartByTap('organ-liver')
    expect(read().selectedPartId).toBeNull()
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

  it('寄りがfit相当に戻ったら「寄り」の段を持たせない', async () => {
    const { mod, read } = await load()
    // 明示ズームはfitと違う視野 = 「寄り」の段
    mod.setAnatomyViewBox((vb) => ({ ...vb, w: vb.w / 2, h: vb.h / 2 }))
    expect(read().zoom).not.toBeNull()
    // ジェスチャがfit相当に戻った時点で段を消す(偽の寄りを残さない)
    mod.setAnatomyViewBox(() => fit(GEOMETRY.left.size))
    expect(read().zoom).toBeNull()
    expect(mod.stepBackAnatomy()).toBe(false)
  })

  it('fitからの僅かなパンは真の寄りとして段に残す', async () => {
    const { mod, read } = await load()
    mod.setAnatomyViewBox((vb) => ({ ...vb, x: vb.x + 10 }))
    expect(read().zoom).not.toBeNull()
    expect(mod.stepBackAnatomy()).toBe(true)
    expect(read().zoom).toBeNull()
  })
})

describe('emptyTapBack', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('場所だけ選んだ状態でも空白タップで全体図へ戻る', async () => {
    const { mod, read } = await load()
    const area = GEOMETRY.left.areas.find((a) => a.id === 'fore')
    if (!area) throw new Error('左側望に前肢の場所が無い')
    mod.pickAnatomyArea(area)
    expect(read()).toMatchObject({ selectedPartId: null, areaId: 'fore' })
    // pick-guard の猶予が切れてからのタップという時刻に進める
    vi.useFakeTimers({ now: Date.now() + 500 })
    mod.emptyTapBack()
    expect(read()).toMatchObject({ selectedPartId: null, areaId: null, zoom: null })
  })

  it('部位を選んだ状態では部位だけを外し、場所と寄りは残す', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('muscle-triceps')
    vi.useFakeTimers({ now: Date.now() + 500 })
    mod.emptyTapBack()
    expect(read()).toMatchObject({ selectedPartId: null, areaId: 'fore' })
    expect(read().zoom).not.toBeNull()
  })

  it('場所を選んだ直後(pick-guard 中)の空白タップは効かん', async () => {
    vi.useFakeTimers({ now: 10_000 })
    const { mod, read } = await load()
    const area = GEOMETRY.left.areas.find((a) => a.id === 'fore')
    if (!area) throw new Error('左側望に前肢の場所が無い')
    mod.pickAnatomyArea(area)
    mod.emptyTapBack()
    expect(read()).toMatchObject({ areaId: 'fore' })
  })
})

describe('重なった部位の候補', () => {
  it('タップの優先部位を保ち、候補からの選び直しは図を動かさない', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('bone-cannon')
    const zoom = read().zoom
    mod.pickAnatomyPartByTap('bone-sesamoid', ['bone-sesamoid', 'bone-cannon'])
    mod.selectAnatomyCandidate('bone-cannon')
    expect(read()).toMatchObject({ selectedPartId: 'bone-cannon', candidatePartIds: ['bone-sesamoid', 'bone-cannon'], zoom })
    mod.selectAnatomyCandidate('organ-heart')
    expect(read().selectedPartId).toBe('bone-cannon')
    mod.stepBackAnatomy()
    expect(read().candidatePartIds).toEqual([])
  })

  it('単独ヒット・空白・条件変更・ズーム・リセットで古い候補を消す', async () => {
    const { mod, read } = await load()
    for (const clear of [
      () => mod.pickAnatomyPartByTap('bone-cannon', ['bone-cannon']),
      () => mod.emptyTapBack(),
      () => mod.changeConditions('right', 'skeleton', 'superficial'),
      () => mod.setAnatomyViewBox((vb) => ({ ...vb, w: vb.w / 2 })),
      () => mod.resetAnatomy(),
    ]) {
      mod.pickAnatomyPartByTap('bone-sesamoid', ['bone-sesamoid', 'bone-cannon'])
      expect(read().candidatePartIds).toHaveLength(2)
      clear()
      expect(read().candidatePartIds).toEqual([])
    }
  })

  it('場所選択直後の誤タップからは候補も出さない', async () => {
    vi.useFakeTimers({ now: 10_000 })
    const { mod, read } = await load()
    mod.pickAnatomyArea(GEOMETRY.left.areas.find((a) => a.id === 'fore')!)
    mod.pickAnatomyPartByTap('bone-sesamoid', ['bone-sesamoid', 'bone-cannon'])
    expect(read().candidatePartIds).toEqual([])
    vi.useRealTimers()
  })
})

describe('反対側で見る', () => {
  it('選択ID・場所・層・深さを保ち、視野を左右反転して往復する', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('muscle-masseter')
    const before = read()
    mod.pickAnatomyPartByTap('muscle-masseter', ['muscle-masseter', 'muscle-splenius'])
    mod.showOppositeAnatomySide()
    expect(read()).toMatchObject({ view: 'right', selectedPartId: before.selectedPartId, areaId: before.areaId, layer: before.layer, depth: before.depth, candidatePartIds: [] })
    expect(read().zoom).toEqual({ ...before.zoom, x: GEOMETRY.right.size.w - before.zoom!.x - before.zoom!.w })
    mod.showOppositeAnatomySide()
    expect(read()).toEqual(before)
  })

  it('片側の臓器と正面では切り替えず、全体表示では全体表示を保つ', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('organ-spleen')
    const spleen = read()
    mod.showOppositeAnatomySide()
    expect(read()).toEqual(spleen)
    mod.focusAnatomyPart('muscle-masseter')
    mod.updateAnatomy({ view: 'front' })
    const front = read()
    mod.showOppositeAnatomySide()
    expect(read()).toEqual(front)
    mod.updateAnatomy({ view: 'left', zoom: null })
    mod.showOppositeAnatomySide()
    expect(read()).toMatchObject({ view: 'right', zoom: null })
  })
})

describe('場所を選んだ時の寄せ先', () => {
  it('右側望・体幹・内臓では、右に出さない部位（胃・脾臓）の図形を寄せ先に入れない', async () => {
    const { mod, read } = await load()
    mod.changeConditions('right', 'organs', 'superficial')
    const area = GEOMETRY.right.areas.find((a) => a.id === 'trunk')
    if (!area) throw new Error('右側望に体幹の場所が無い')
    mod.pickAnatomyArea(area)
    // 寄せ先の上端は、右に出る臓器の図形だけで決まる（胃・脾臓を入れると 118.4 まで上がる）
    expect(read().zoom?.y).toBeCloseTo(134.4, 1)
  })
})

describe('changeConditions（層・深さ・向きのチップが通る入口）', () => {
  it('層や深さを替えても場所と寄りは残り、選択中の部位だけが外れる', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('muscle-triceps')
    const before = read()
    expect(before.areaId).toBe('fore')
    expect(before.zoom).not.toBeNull()

    mod.changeConditions(before.view, 'skeleton', before.depth)
    expect(read()).toMatchObject({ layer: 'skeleton', areaId: 'fore', selectedPartId: null })
    expect(read().zoom).toEqual(before.zoom)

    // 深さは今の図では深層筋が未登録でチップから選べないが、状態の側の規則として固定する
    mod.changeConditions(before.view, 'muscle', 'deep')
    expect(read()).toMatchObject({ layer: 'muscle', depth: 'deep', areaId: 'fore' })
    expect(read().zoom).toEqual(before.zoom)
  })

  it('向きを替えると場所と寄りが外れる', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('muscle-triceps')
    mod.changeConditions('front', 'muscle', 'superficial')
    expect(read()).toMatchObject({ view: 'front', areaId: null, zoom: null, selectedPartId: null })
  })
})

describe('focusAnatomyPart（直URL ?part= が通る入口）', () => {
  // 深層筋は図が未登録。そのまま depth=deep で開くと存在しない板を指して図が出ん (F12)
  const deepIds = ['muscle-supraspinatus', 'muscle-infraspinatus', 'muscle-iliopsoas', 'muscle-subclavius']

  it.each(deepIds)('深層筋 %s は図のある表層筋の板へ寄せて開く', async (id) => {
    const { mod, read } = await load()
    mod.focusAnatomyPart(id)
    const state = read()
    expect(state).toMatchObject({ selectedPartId: id, layer: 'muscle', depth: 'superficial', zoom: null })
    expect(hasPlate(GEOMETRY[state.view], state.layer, state.depth)).toBe(true)
  })

  it('臓器（位置未登録の膀胱）の行き先は変えない', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('organ-bladder')
    expect(read()).toMatchObject({
      view: 'left',
      layer: 'organs',
      depth: 'superficial',
      selectedPartId: 'organ-bladder',
      areaId: 'trunk',
      zoom: null,
    })
  })
})

// 特性化: 画面側（overlay・index）が updateAnatomy へ直接渡していた patch の結果を固定する。
// 先に updateAnatomy 直呼びで通してから、同じ期待値のまま操作名へ付け替えた
describe('向き変更で zoom が外れる（一覧からの選択）', () => {
  it('向きが変わると zoom が外れ、同じ向きなら zoom は残る', async () => {
    const { mod, read } = await load()
    const triceps = STRUCTURE_BY_ID.get('muscle-triceps')
    if (!triceps) throw new Error('muscle-triceps が無い')
    mod.focusAnatomyPart('muscle-triceps')
    const zoomed = read().zoom
    expect(zoomed).not.toBeNull()

    mod.selectPartFromList('left', 'muscle', 'superficial', triceps)
    expect(read().zoom).toEqual(zoomed)

    mod.selectPartFromList('right', 'muscle', 'superficial', triceps)
    expect(read()).toMatchObject({ view: 'right', zoom: null })
  })
})

describe('一覧から選ぶと area も決まる', () => {
  it('選んだ部位の場所・層・深さ・向きが状態に入り、古い候補は消える', async () => {
    const { mod, read } = await load()
    const liver = STRUCTURE_BY_ID.get('organ-liver')
    if (!liver) throw new Error('organ-liver が無い')
    mod.selectPartFromList('left', 'organs', 'superficial', liver)
    expect(read()).toMatchObject({ view: 'left', layer: 'organs', depth: 'superficial', areaId: areaOfStructure(liver), selectedPartId: 'organ-liver', candidatePartIds: [] })
  })

  it('渡した深さが今の状態の深さと違えば、渡した深さが入る', async () => {
    const { mod, read } = await load()
    const triceps = STRUCTURE_BY_ID.get('muscle-triceps')
    if (!triceps) throw new Error('muscle-triceps が無い')
    mod.changeConditions('left', 'muscle', 'deep')
    expect(read().depth).toBe('deep')
    mod.selectPartFromList('left', 'muscle', 'superficial', triceps)
    expect(read()).toMatchObject({ depth: 'superficial', selectedPartId: 'muscle-triceps' })
  })

  it('重なりの候補が出ている状態から選ぶと、候補は消える', async () => {
    const { mod, read } = await load()
    const liver = STRUCTURE_BY_ID.get('organ-liver')
    if (!liver) throw new Error('organ-liver が無い')
    mod.pickAnatomyPartByTap('muscle-triceps', ['muscle-triceps', 'muscle-deltoid'])
    expect(read().candidatePartIds.length).toBeGreaterThan(1)
    mod.selectPartFromList('left', 'organs', 'superficial', liver)
    expect(read().candidatePartIds).toEqual([])
  })
})

describe('部位の選択解除（閉じるボタン）', () => {
  it('部位だけ外し、場所・寄り・条件は残す', async () => {
    const { mod, read } = await load()
    mod.focusAnatomyPart('muscle-triceps')
    const before = read()
    mod.deselectAnatomyPart()
    expect(read()).toMatchObject({ selectedPartId: null, areaId: before.areaId, view: before.view, layer: before.layer, depth: before.depth })
    expect(read().zoom).toEqual(before.zoom)
  })
})
