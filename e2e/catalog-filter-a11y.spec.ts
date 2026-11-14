import { expect, test } from '@playwright/test'

/**
 * 図鑑の絞り込みボタンの読み上げ。押すと選択肢のシートが開くことを、役割の外の属性で伝える。
 * 読み上げ名の区切りは言語ごと（和文「、」・英文「, 」）。
 */
test.describe('絞り込みボタンの a11y', () => {
  test('開く前は expanded=false、開くと true、閉じると false に戻る', async ({ page }) => {
    await page.goto('/catalog')
    const button = page.getByTestId('catalog-filter-layer')
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    await expect(page.getByTestId('catalog-filter-sheet')).toBeVisible()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await page.getByTestId('catalog-filter-sheet-close').click()
    await expect(page.getByTestId('catalog-filter-sheet')).toHaveCount(0)
    await expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  test('和文の読み上げ名は「、」で繋ぐ', async ({ page }) => {
    await page.goto('/catalog')
    const label = (await page.getByTestId('catalog-filter-layer').getAttribute('aria-label'))!
    expect(label).toContain('、')
  })
})

test.describe('英語', () => {
  test.use({ locale: 'en-US' })

  test('読み上げ名に和文の「、」を使わない', async ({ page }) => {
    await page.goto('/catalog')
    // 静的 HTML は和文で出て、hydration の後に端末の言語へ切り替わる。切り替わるまで待つ
    await expect(page.getByTestId('catalog-filter-layer')).toHaveAttribute('aria-label', 'Filter by layer, All')
    const label = (await page.getByTestId('catalog-filter-layer').getAttribute('aria-label'))!
    expect(label).not.toContain('、')
  })
})
