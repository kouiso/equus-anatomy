import { expect, test, type Page } from '@playwright/test'

/**
 * 表示言語（#72）。英語ファーストで作ったので、英語の端末で開いた時に英語で出ることを先に見る。
 * 既存の検証は playwright.config.ts で ja-JP に固定しとる。ここだけ英語の端末として開く。
 */
const LOCALE_KEY = 'equus.locale.v1'

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

const nav = (page: Page) => page.getByTestId('bottom-nav')

test.describe('英語の端末', () => {
  test.use({ locale: 'en-US' })

  test('初回は英語で開き、静的 HTML との食い違いエラーも出さない', async ({ page }) => {
    const errors = watchErrors(page)
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await expect(nav(page).getByText('Catalog', { exact: true })).toBeVisible()
    await expect(nav(page).getByText('Anatomy', { exact: true })).toBeVisible()
    await expect(nav(page).getByText('Saved', { exact: true })).toBeVisible()
    await expect(page.getByTestId('demo-note')).toHaveText('Learning demo — anatomy not yet expert-reviewed')
    for (const n of ['Head', 'Neck', 'Trunk', 'Forelimb', 'Hindlimb', 'Tail']) {
      await expect(page.locator('svg text').filter({ hasText: n }).first()).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'View options', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(errors, 'console/page エラーが出ている').toEqual([])
  })

  test('切替ボタンで日本語へ移り、再読み込みしても選んだ言語のまま', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByTestId('catalog-count')).toHaveText('52 parts')
    await page.getByTestId('language-toggle').click()
    await expect(page.getByTestId('catalog-count')).toHaveText('52 部位')
    await expect(nav(page).getByText('図鑑', { exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
    expect(await page.evaluate((key) => localStorage.getItem(key), LOCALE_KEY)).toBe('ja')

    await page.reload()
    await expect(page.getByTestId('catalog-count')).toHaveText('52 部位')
    await expect(page.getByTestId('language-toggle')).toHaveText('English')

    await page.getByTestId('language-toggle').click()
    await expect(page.getByTestId('catalog-count')).toHaveText('52 parts')
    await page.reload()
    await expect(page.getByTestId('catalog-count')).toHaveText('52 parts')
  })

  test('英語表示でも英名・和名のどちらでも検索でき、行は英名で出る', async ({ page }) => {
    await page.goto('/catalog')
    const search = page.getByTestId('catalog-search')
    await expect(search).toHaveAttribute('aria-label', 'Search parts')
    await expect(search).toHaveAttribute('placeholder', 'Search parts')
    await search.fill('liver')
    await expect(page.getByTestId('catalog-row-organ-liver')).toContainText('Liver')
    await search.fill('肝臓')
    await expect(page.getByTestId('catalog-row-organ-liver')).toContainText('Liver')
    await search.fill('zzzz')
    await expect(page.getByTestId('catalog-empty')).toHaveText('No matching parts.')
  })

  test('詳細は英名を見出しにし、英訳の無い解説は日本語のみと明示する', async ({ page }) => {
    await page.goto('/catalog/organ-liver')
    await expect(page.getByTestId('detail-name-ja')).toHaveText('Liver')
    await expect(page.getByTestId('detail-ja-only')).toBeVisible()
    await expect(page.getByTestId('save-toggle')).toHaveText('Save')
    await page.getByTestId('save-toggle').click()
    await expect(page.getByTestId('save-toggle')).toHaveText('Saved')
    await expect(page.getByTestId('catalog-back')).toHaveText('← Back to catalog')

    await page.getByTestId('language-toggle').click()
    await expect(page.getByTestId('detail-name-ja')).toHaveText('肝臓')
    await expect(page.getByTestId('detail-ja-only')).toHaveCount(0)
  })

  test('overlay を直接開いても英語で出て、ハイドレーションエラーにならない', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/overlay?kind=conditions')
    await expect(page.getByRole('heading', { name: 'View options' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Left lateral', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show with these options' })).toBeVisible()
    expect(errors).toEqual([])
  })
})

test.describe('対応外の言語の端末', () => {
  test.use({ locale: 'fr-FR' })

  test('ja / en 以外は英語で開く', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByTestId('catalog-count')).toHaveText('52 parts')
  })
})

test.describe('日本語の端末', () => {
  test('既定は日本語。英語を選ぶと検索・詳細も英語になる', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByTestId('catalog-count')).toHaveText('52 部位')
    const search = page.getByTestId('catalog-search')
    await expect(search).toHaveAttribute('aria-label', '部位を検索')
    await search.fill('liver')
    await expect(page.getByTestId('catalog-row-organ-liver')).toContainText('肝臓')

    await page.getByTestId('language-toggle').click()
    await expect(search).toHaveAttribute('aria-label', 'Search parts')
    await expect(search).toHaveValue('liver')
    await expect(page.getByTestId('catalog-row-organ-liver')).toContainText('Liver')
  })
})
