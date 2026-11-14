import { expect, test } from '@playwright/test'
import { pickCatalogFilter } from './tools/catalog-filter'

/**
 * 図鑑の「すべて解除」は、絞り込みボタンと同じ折り返しの行（catalog-filters）の中にあり、
 * チップと同じ高さ 44px・文字 14px を持つ（#256 / #257、デザイン: review-2026-11-catalog）。
 * 390px では4つのボタンで行が埋まるので、デザインどおり2行目の左端（最初のチップと同じ x）に折り返す。
 */
test('390×844 で絞り込み中、「すべて解除」は絞り込みの行の中にあり、44px・14px・左端がチップに揃う', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()

  const reset = page.getByTestId('catalog-filter-reset')
  await expect(reset, '絞り込みが無い時は出ない').toHaveCount(0)

  await pickCatalogFilter(page, 'layer', '骨格')
  await expect(reset).toBeVisible()

  await expect(page.getByTestId('catalog-filters').getByTestId('catalog-filter-reset'), '絞り込みの行の中にある').toHaveCount(1)

  const resetBox = (await reset.boundingBox())!
  const layerBox = (await page.getByTestId('catalog-filter-layer').boundingBox())!
  expect(resetBox.height, '高さ 44px 以上').toBeGreaterThanOrEqual(44)
  expect(Math.abs(resetBox.x - layerBox.x), '左端が最初のチップに揃う').toBeLessThanOrEqual(1)

  const fontSize = await reset.getByText('すべて解除').evaluate((el) => getComputedStyle(el).fontSize)
  expect(fontSize, '文字 14px').toBe('14px')

  await reset.click()
  await expect(reset).toHaveCount(0)
})
