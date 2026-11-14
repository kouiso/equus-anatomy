import { expect, test } from '@playwright/test'
import { pickCatalogFilter } from './tools/catalog-filter'

/**
 * 図鑑の「すべて解除」は、絞り込みボタンと同じ折り返しの行に並び、
 * チップと同じ高さ 44px を持つ（#256 / #257、デザイン: review-2026-11-catalog）。
 */
test('390×844 で絞り込み中、「すべて解除」は絞り込みボタンと同じ行にあり、高さ44px以上', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await pickCatalogFilter(page, 'layer', '骨格')

  const reset = page.getByTestId('catalog-filter-reset')
  await expect(reset).toBeVisible()
  const resetBox = (await reset.boundingBox())!
  const layerBox = (await page.getByTestId('catalog-filter-layer').boundingBox())!
  const notLearnedBox = (await page.getByTestId('catalog-filter-not-learned').boundingBox())!

  const centerY = (b: { y: number; height: number }) => b.y + b.height / 2
  expect(Math.abs(centerY(resetBox) - centerY(layerBox)), '縦の中心が絞り込みボタンと同じ行').toBeLessThanOrEqual(4)
  expect(Math.abs(centerY(resetBox) - centerY(notLearnedBox)), '縦の中心が「まだ」ボタンと同じ行').toBeLessThanOrEqual(4)
  expect(resetBox.height, '高さ 44px 以上').toBeGreaterThanOrEqual(44)
})
