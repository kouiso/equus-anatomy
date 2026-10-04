import { describe, expect, it } from 'vitest'
import { TopInsetMemory } from './top-inset'

// in-place リロード後に safe-area プロバイダが insets.top=0 を返す件 (#62) の退避ロジック。
// react-native には触らへん純粋部分だけここで検証する。
describe('TopInsetMemory', () => {
  it('passes a positive measurement through and remembers it', () => {
    const memory = new TopInsetMemory()
    expect(memory.resolve(24, 0)).toBe(24)
    expect(memory.resolve(48, 24)).toBe(48)
  })

  it('falls back to the last measured value when the provider reports 0', () => {
    const memory = new TopInsetMemory()
    memory.resolve(24, 0)
    // リロード直後にプロバイダが 0 を返し続ける状態。直前の実測でヘッダを守る。
    expect(memory.resolve(0, 0)).toBe(24)
  })

  it('falls back to the platform estimate when a reload wiped the memory', () => {
    // JS リロードで module state ごと消えた後でも、端末定数(StatusBar.currentHeight 等)から復元できる。
    const memory = new TopInsetMemory()
    expect(memory.resolve(0, 24)).toBe(24)
  })

  it('prefers the larger of the remembered value and the platform estimate', () => {
    const memory = new TopInsetMemory()
    memory.resolve(48, 0)
    expect(memory.resolve(0, 24)).toBe(48)
    expect(memory.resolve(0, 59)).toBe(59)
  })

  it('returns 0 when nothing was ever measured or estimated (web has no status bar)', () => {
    const memory = new TopInsetMemory()
    expect(memory.resolve(0, 0)).toBe(0)
  })

  it('trusts the provider again once it reports a real value', () => {
    const memory = new TopInsetMemory()
    memory.resolve(0, 24)
    expect(memory.resolve(30, 24)).toBe(30)
  })
})
