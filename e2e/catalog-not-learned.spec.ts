import { expect, test, type Page } from '@playwright/test'
import { STRUCTURES } from '../src/core/data'
import { pickCatalogFilter } from './tools/catalog-filter'

/**
 * 図鑑の「まだ」（覚えていない部位だけ）と「覚えた」の札（#257 / #268 / #269）。
 */

const TOTAL = STRUCTURES.length

async function markLearned(page: Page, id: string) {
  await page.goto(`/catalog/${id}`)
  await page.getByRole('button', { name: '覚えたにする' }).click()
  await expect(page.getByRole('button', { name: '覚えた' })).toBeVisible()
}

test('「まだ」を押すと覚えた部位が外れて件数もその数になり、ほかの絞り込みと一緒に使え、すべて解除で外れる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await markLearned(page, 'skin-head')
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await expect(page.getByTestId('learned-badge-skin-head')).toHaveText('覚えた')
  await expect(page.getByTestId('learned-badge-skin-ear')).toHaveCount(0)

  const toggle = page.getByTestId('catalog-filter-not-learned')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('catalog-count')).toHaveText(`${TOTAL - 1} 部位`)
  await expect(page.getByTestId('catalog-row-skin-head')).toHaveCount(0)
  await expect(page.getByTestId('catalog-row-skin-ear')).toBeVisible()

  const skin = STRUCTURES.filter((s) => s.layer === 'skin').length
  await pickCatalogFilter(page, 'layer', '皮膚')
  await expect(page.getByTestId('catalog-count')).toHaveText(`${skin - 1} 部位`)

  await page.getByTestId('catalog-filter-reset').click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('catalog-count')).toHaveText(`${TOTAL} 部位`)
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
})

test('覚えた部位の行の読み上げ名に、覚えた状態が入る', async ({ page }) => {
  await markLearned(page, 'skin-head')
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toHaveAttribute('aria-label', /覚えた$/)
  await expect(page.getByTestId('catalog-row-skin-ear')).not.toHaveAttribute('aria-label', /覚えた/)
})

test('学習記録が壊れていても、一覧が出て「まだ」で落ちない', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => window.localStorage.setItem('equus.mastery.v1', 'not json ['))
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await page.getByTestId('catalog-filter-not-learned').click()
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await expect(page.getByTestId('catalog-count')).toHaveText(`${TOTAL} 部位`)
  expect(errors).toEqual([])
})
