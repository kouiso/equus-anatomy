import { describe, expect, it } from 'vitest'
import { layoutLabels, type LabelItem } from './label-layout'

const vb = { x: 0, y: 0, w: 1600, h: 1200 }
const item = (id: string, x: number, y: number): LabelItem => ({ id, at: [x, y], w: 90, h: 26 })

describe('ラベルの重なり回避', () => {
  it('離れとるラベルは全部そのまま上に置く', () => {
    const r = layoutLabels({ items: [item('a', 100, 100), item('b', 800, 800)], viewBox: vb, unitToPx: 1 })
    expect(r.every((p) => !p.hidden)).toBe(true)
    expect(r[0]!.dy).toBeLessThan(0)
    expect(r[1]!.dy).toBeLessThan(0)
  })

  it('同じ場所に3枚あっても互いに重ならん', () => {
    const items = [item('a', 500, 500), item('b', 505, 505), item('c', 510, 495)]
    const r = layoutLabels({ items, viewBox: vb, unitToPx: 1 })
    const boxes = r.map((p, i) => ({
      x: items[i]!.at[0] + p.dx - 45,
      y: items[i]!.at[1] + p.dy - 13,
    }))
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const overlap =
          Math.abs(boxes[i]!.x - boxes[j]!.x) < 90 && Math.abs(boxes[i]!.y - boxes[j]!.y) < 26
        expect(overlap, `${items[i]!.id} と ${items[j]!.id}`).toBe(false)
      }
    }
  })

  it('選択中のラベルは必ず出る（先に場所を取る）', () => {
    const items = [item('a', 500, 500), item('b', 502, 502), item('keepme', 501, 501)]
    const r = layoutLabels({ items, viewBox: vb, unitToPx: 1, keep: 'keepme' })
    const keep = r.find((p) => p.id === 'keepme')!
    expect(keep.hidden).toBe(false)
    expect(keep.dy).toBe(-16 - 13) // 既定の真上に置けとる
  })

  it('入力の順番が変わっても結果は同じ（描画順に左右されん）', () => {
    const items = [item('a', 500, 500), item('b', 505, 505), item('c', 510, 495)]
    const forward = layoutLabels({ items, viewBox: vb, unitToPx: 1 })
    const backward = layoutLabels({ items: [...items].reverse(), viewBox: vb, unitToPx: 1 })
    for (const f of forward) {
      const b = backward.find((x) => x.id === f.id)!
      expect([b.dx, b.dy], f.id).toEqual([f.dx, f.dy])
    }
  })

  it('ズームすると画面上で離れるので、真上に戻る', () => {
    const items = [item('a', 500, 500), item('b', 560, 500)]
    const near = layoutLabels({ items, viewBox: vb, unitToPx: 0.25 })
    const far = layoutLabels({ items, viewBox: { x: 400, y: 400, w: 400, h: 300 }, unitToPx: 2 })
    expect(near[1]!.dy).not.toBe(near[0]!.dy) // 縮んどる時はぶつかるので逃げる
    expect(far[0]!.dy).toBe(far[1]!.dy) // 寄っとる時は両方とも真上
  })

  it('返す順番は入力と同じ', () => {
    const items = [item('z', 900, 100), item('a', 100, 900)]
    expect(layoutLabels({ items, viewBox: vb, unitToPx: 1 }).map((p) => p.id)).toEqual(['z', 'a'])
  })
})
