import { expect, test, type Page } from '@playwright/test'

/**
 * 表示条件モーダルの「図が無い条件」の回帰（Issue #64）。
 *
 * 実際に踏んだ不具合: 図鑑から深層筋（棘上筋）へ「図で見る」で飛ぶと depth=deep のまま
 * 表示条件モーダルが開き、深層筋チップが「グレー(disabled)なのに選択中」の曖昧表示になる。
 * さらに「この条件の図はまだ登録されていません」と出るのに「この条件で表示」が押せて、
 * 押すと真っ暗なキャンバスへ戻されるだけの行き止まりだった。
 *
 * 期待: 開いた時点で有効な深さ（表層筋）へ寄り、disabled と選択中が混ざらない。
 */
const deepChip = (page: Page) => page.getByRole('radio', { name: '深層筋', exact: true })
const shallowChip = (page: Page) => page.getByRole('radio', { name: '表層筋', exact: true })
const applyButton = (page: Page) => page.getByRole('button', { name: 'この条件で表示', exact: true })

test.describe('表示条件: 図が無い条件を選べない', () => {
  test('深層筋の部位から開くと、深層筋チップは選択中にならず適用で表層筋の図へ戻る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    // 図鑑の「図で見る」と同じ導線。棘上筋は深層筋なので depth=deep で開く
    await page.goto('/?part=muscle-supraspinatus')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('棘上筋')
    // 深層筋の図は未登録なので、画面側は未登録表示になっている（ここは仕様）
    await expect(page.getByTestId('anatomy-no-image')).toBeVisible()

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
