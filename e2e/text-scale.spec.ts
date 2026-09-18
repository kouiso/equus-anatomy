import { expect, test } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

test.use({ viewport: { width: 320, height: 568 } })


test('本文文字を2倍にした320×568でも主要操作をスクロールして完了できる', async ({ page }) => {
  await installTwoTimesTextScale(page)

  await page.goto('/catalog')
  const count = page.getByTestId('catalog-count')
  await expect(count).toHaveAttribute('data-e2e-text-scale', '2')
  expect(await count.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28)
  const search = page.getByTestId('catalog-search')
  await search.fill('中殿筋')
  await expect(page.getByTestId('catalog-count')).toContainText('1 部位')
  await page.getByTestId('catalog-search-clear').click()
  await expect(search).toHaveValue('')
  await expect(page.getByTestId('catalog-count')).toContainText('52 部位')
  const muscle = page.getByRole('radio', { name: '筋肉', exact: true })
  await muscle.click()
  await expect(muscle).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('catalog-row-muscle-gluteus').click()
  await expect(page.getByTestId('detail-name-ja')).toHaveText('中殿筋')
  await page.getByTestId('catalog-back').click()
  await expect(page.getByTestId('catalog-row-muscle-gluteus')).toBeVisible()
  await expect(page.getByRole('radio', { name: '筋肉', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('catalog-filter-reset').click()
  await expect(page.getByTestId('catalog-count')).toContainText('52 部位')

  await page.goto('/?part=muscle-brachiocephalicus')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
  await page.getByRole('button', { name: '詳しく読む', exact: true }).click()
  await expect(page.getByTestId('part-sheet')).toContainText('腕頭筋')
  await page.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(page.getByTestId('anatomy-svg')).toBeVisible()
})
