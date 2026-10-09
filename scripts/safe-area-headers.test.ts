import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// issue #62 の検知自動化: 各画面のヘッダが insets.top を消費しているかの静的チェック。
// overlay のヘッダはインセット未適用で「閉じる」がステータスバーと重なり得た。
// useSafeAreaInsets 直読みに戻るとリロード時の退避が効かんので、useStableTopInset 経由を縛る。
describe('screen headers consume the stabilized top inset', () => {
  it('tabs header (app-header) pads by the stabilized inset', () => {
    const src = readFileSync('src/ui/app-header.tsx', 'utf8')
    expect(src).toContain('useStableTopInset')
    expect(src).toMatch(/paddingTop/)
  })

  it('overlay header pads by the stabilized inset', () => {
    const src = readFileSync('src/app/overlay.tsx', 'utf8')
    expect(src).toContain('useStableTopInset')
    expect(src).toMatch(/paddingTop/)
  })
})
