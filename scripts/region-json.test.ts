import { describe, expect, it } from 'vitest'
import { mergeLayerParts } from './region-json'

const part = (id: string, layer: string) => ({ id, layer })

describe('mergeLayerParts', () => {
  it('真ん中にある層を差し替えても元の位置に戻す', () => {
    const existing = [
      part('skin-a', 'skin'),
      part('muscle-a', 'muscle'),
      part('muscle-b', 'muscle'),
      part('bone-a', 'skeleton'),
    ]
    const merged = mergeLayerParts(existing, 'muscle', [part('muscle-x', 'muscle'), part('muscle-y', 'muscle')])
    expect(merged.map((p) => p.id)).toEqual(['skin-a', 'muscle-x', 'muscle-y', 'bone-a'])
  })

  it('同じ層を同じ中身で書き戻すと並びが変わらない', () => {
    const existing = [part('skin-a', 'skin'), part('muscle-a', 'muscle'), part('bone-a', 'skeleton')]
    expect(mergeLayerParts(existing, 'muscle', [part('muscle-a', 'muscle')])).toEqual(existing)
  })

  it('無い層は末尾に足す', () => {
    const existing = [part('skin-a', 'skin'), part('muscle-a', 'muscle')]
    const merged = mergeLayerParts(existing, 'organs', [part('organ-a', 'organs')])
    expect(merged.map((p) => p.id)).toEqual(['skin-a', 'muscle-a', 'organ-a'])
  })

  it('空配列を扱える', () => {
    expect(mergeLayerParts([], 'skin', [part('skin-a', 'skin')])).toEqual([part('skin-a', 'skin')])
    expect(mergeLayerParts([], 'skin', [])).toEqual([])
    const existing = [part('skin-a', 'skin'), part('muscle-a', 'muscle'), part('bone-a', 'skeleton')]
    expect(mergeLayerParts(existing, 'muscle', []).map((p) => p.id)).toEqual(['skin-a', 'bone-a'])
  })

  it('元の配列を書き換えない', () => {
    const existing = [part('skin-a', 'skin'), part('muscle-a', 'muscle')]
    const snapshot = structuredClone(existing)
    mergeLayerParts(existing, 'skin', [part('skin-x', 'skin')])
    expect(existing).toEqual(snapshot)
  })
})
