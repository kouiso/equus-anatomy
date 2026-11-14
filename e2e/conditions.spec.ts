import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * 表示条件モーダルの「図が無い条件」の回帰（Issue #64）と、深層筋の直URL（F12・#296）。
 *
 * 実際に踏んだ不具合: 図鑑から深層筋（棘上筋）へ「図で見る」で飛ぶと depth=deep のまま
 * 表示条件モーダルが開き、深層筋チップが「グレー(disabled)なのに選択中」の曖昧表示になる。
 * さらに「この条件の図はまだ登録されていません」と出るのに「この条件で表示」が押せて、
 * 押すと真っ暗なキャンバスへ戻されるだけの行き止まりだった。
 *
 * 期待: 開いた時点で有効な深さ（表層筋）へ寄り、disabled と選択中が混ざらない。
 * 今は `/?part=` も `focusAnatomyPart` が最初から表層筋の板へ寄せるので、depth=deep で開くのは
 * `/overlay?...&depth=deep` を直接指定した時だけ。その場合も状態へは有効な深さしか書かない。
 */
const deepChip = (page: Page) => page.getByRole('radio', { name: '深層筋', exact: true })
const shallowChip = (page: Page) => page.getByRole('radio', { name: '表層筋', exact: true })
const applyButton = (page: Page) => page.getByRole('button', { name: 'この条件で表示', exact: true })

test.describe('表示条件: 図が無い条件を選べない', () => {
  test('深層筋の部位から開くと、深層筋チップは選択中にならず適用で表層筋の図へ戻る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    // 図鑑の「図で見る」と同じ導線。棘上筋は深層筋だが、図が無い向きなので最初から表層筋の板で開く
    await page.goto('/?part=muscle-supraspinatus')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('棘上筋')
    // 深層筋の図は未登録だが、開く時点で表層筋の板へ寄るので図は出る（F12）
    await expect(page.getByTestId('anatomy-image')).toBeVisible()

    await page.getByRole('button', { name: '表示条件', exact: true }).click()

    // 深層筋チップは押せない。そして「disabled なのに選択中」に見えないこと
    await expect(deepChip(page)).toBeDisabled()
    await expect(deepChip(page)).not.toHaveAttribute('aria-checked', 'true')
    // 代わりに有効な表層筋が選択中になっている（フォールバック）
    await expect(shallowChip(page)).toBeEnabled()
    await expect(shallowChip(page)).toHaveAttribute('aria-checked', 'true')

    // 適用できるのは「図が存在する条件」だけ。表層筋へ寄っているので押せる
    await expect(applyButton(page)).toBeEnabled()
    await applyButton(page).click()

    // 行き止まりではなく表層筋の図が出る
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    await expect(page.getByText(/左側望 · 筋肉 · 表層筋/)).toBeVisible()
  })

  test('深さ=deep を直接指定して開いても、有効な深さへ寄る', async ({ page }) => {
    await page.goto('/overlay?kind=conditions&view=left&layer=muscle&depth=deep')
    await expect(deepChip(page)).toBeDisabled()
    await expect(deepChip(page)).not.toHaveAttribute('aria-checked', 'true')
    await expect(shallowChip(page)).toHaveAttribute('aria-checked', 'true')
    await expect(applyButton(page)).toBeEnabled()
  })
})

test.describe('一覧モーダル ?kind=parts に depth=deep を直接指定 (#296 の持ち越し)', () => {
  // 図が無い深さ（左向きの深層筋）を URL で持ち込んでも、状態へ書き戻さずに表層筋の板へ寄せる。
  // 書き戻すと解剖画面が存在しない板を指して、図が出ない（anatomy-no-image）
  test('部位を選んで戻ると、表層筋の図が出る', async ({ page }) => {
    await page.goto('/overlay?kind=parts&view=left&layer=muscle&depth=deep')
    await page.getByRole('button', { name: /棘上筋/ }).first().click()
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    await expect(page.getByTestId('anatomy-no-image')).toHaveCount(0)
    await expect(page.getByText(/左側望 · 筋肉 · 表層筋/)).toBeVisible()
  })

  test('場所を選んで戻ると、表層筋の図が出る', async ({ page }) => {
    await page.goto('/overlay?kind=parts&view=left&layer=muscle&depth=deep')
    await page.getByRole('button', { name: '前肢', exact: true }).click()
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    await expect(page.getByTestId('anatomy-no-image')).toHaveCount(0)
    await expect(page.getByText(/左側望 · 筋肉 · 表層筋/)).toBeVisible()
  })
})

test.describe('直URL ?part= で深層筋を開く (F12)', () => {
  test('1440px: 深さのチップは表層筋が選択中、深層筋は押せないまま', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/?part=muscle-supraspinatus')
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    await expect(shallowChip(page)).toHaveAttribute('aria-checked', 'true')
    // 図の無い深さのチップは名前が「深層筋（図なし）」になり、押せないまま
    const deepNoPlate = page.getByRole('radio', { name: '深層筋（図なし）', exact: true })
    await expect(deepNoPlate).toBeDisabled()
    await expect(deepNoPlate).not.toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText(/左側望 · 筋肉 · 表層筋/)).toBeVisible()
  })
})

test.describe('直URL ?part= で深層筋を開く (F12): 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, locale: 'ja-JP', deviceScaleFactor: 2 })

  test('表層筋の図が出て、位置未登録の注記を（スクロールして）画面内に出し、印は立てない', async ({ page }) => {
    await page.goto('/?part=muscle-supraspinatus')
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    await expect(page.getByTestId('anatomy-no-image')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('棘上筋')
    // 注記は 390×844 では折り返しの下（anatomy-panel-scroll の中）にある。スクロールして初めて見える
    const note = page.getByText('この部位は現在の図では位置が未登録です。')
    await note.scrollIntoViewIfNeeded()
    await expect(note).toBeVisible()
    // toBeVisible は画面の外でも通るので、画面（と、それを包むスクロール枠）の内側かを座標で見る
    const viewport = page.viewportSize()
    const box = await note.boundingBox()
    const panel = await page.getByTestId('anatomy-panel-scroll').boundingBox()
    expect(viewport).not.toBeNull()
    expect(box).not.toBeNull()
    expect(panel).not.toBeNull()
    if (!viewport || !box || !panel) return
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    expect(box.y).toBeGreaterThanOrEqual(panel.y)
    expect(box.y + box.height).toBeLessThanOrEqual(panel.y + panel.height)
    // 場所の印（marker-dot-<場所>）は出るが、この部位自身の印は位置が無いので立たない
    await expect(page.locator('[data-testid="marker-dot-muscle-supraspinatus"]')).toHaveCount(0)
    await expect(page.getByText(/左側望 · 筋肉 · 表層筋/)).toBeVisible()
    // 画像は証跡を撮り直す時（EQUUS_DEEP_PART_EVIDENCE=1）だけ書く。既定の実行では doc/ を書き換えない
    if (process.env.EQUUS_DEEP_PART_EVIDENCE === '1') {
      mkdirSync('doc/evidence/deep-part-url', { recursive: true })
      await page.screenshot({ path: 'doc/evidence/deep-part-url/after-390x844-scrolled.png' })
    }
  })
})
