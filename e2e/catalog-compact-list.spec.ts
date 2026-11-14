import { expect, test, type Page } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * 図鑑の一覧を開いた最初の画面で、部位が7行ほど読める（#256 / #264 / #265）。
 * 絞り込みは1行のボタンに畳み、押すと選択肢が下から開く。
 */

/** 一覧の見える範囲に、上下とも全部入っている行の数 */
async function fullyVisibleRows(page: Page): Promise<number> {
  return page.getByTestId('catalog-list').evaluate((list) => {
    const view = list.getBoundingClientRect()
    const nav = document.querySelector('[data-testid="tab-catalog"]')?.getBoundingClientRect()
    const bottom = Math.min(view.bottom, nav ? nav.top : Infinity, window.innerHeight)
    return [...list.querySelectorAll('[data-testid^="catalog-row-"]')].filter((row) => {
      const r = row.getBoundingClientRect()
      return r.top >= view.top && r.bottom <= bottom && r.height > 0
    }).length
  })
}

test('390×844 で図鑑を開いた最初の画面に、部位の行が7行以上見える', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await expect.poll(() => fullyVisibleRows(page)).toBeGreaterThanOrEqual(7)
})

test('絞り込みは1行のボタンで、押すと選択肢が開き、選ぶと一覧が絞られてボタンに値が出る', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/catalog')
  await expect(page.getByText('絞り込み（横にスクロール）')).toHaveCount(0)
  const layer = page.getByTestId('catalog-filter-layer')
  const area = page.getByTestId('catalog-filter-area')
  const view = page.getByTestId('catalog-filter-view')
  const boxes = await Promise.all([layer, area, view].map((b) => b.boundingBox()))
  expect(new Set(boxes.map((b) => Math.round(b?.y ?? -1))).size, '3つのボタンが1行に並ぶ').toBe(1)
  await expect(page.getByTestId('catalog-filter-reset')).toHaveCount(0)

  await layer.click()
  const sheet = page.getByTestId('catalog-filter-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('radio', { name: 'すべて', exact: true })).toBeChecked()
  await sheet.getByRole('radio', { name: '骨格', exact: true }).click()
  await expect(sheet).toHaveCount(0)
  await expect(layer).toContainText('骨格')
  await expect(page.getByTestId('catalog-row-skin-head')).toHaveCount(0)
  await expect(page.getByTestId('catalog-filter-reset')).toBeVisible()

  await page.getByTestId('catalog-filter-reset').click()
  await expect(layer).not.toContainText('骨格')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await expect(page.getByTestId('catalog-filter-reset')).toHaveCount(0)
})

test('選択肢の画面は「閉じる」と Escape で、何も変えずに閉じる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/catalog')
  await page.getByTestId('catalog-filter-area').click()
  await page.getByTestId('catalog-filter-sheet-close').click()
  await expect(page.getByTestId('catalog-filter-sheet')).toHaveCount(0)
  await page.getByTestId('catalog-filter-view').click()
  const sheet = page.getByTestId('catalog-filter-sheet')
  await expect(sheet).toBeVisible()
  // Web の Modal は開く動き（slide）が終わってから Escape を受け付ける。終わるまで押し直す
  await expect(async () => {
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0, { timeout: 500 })
  }).toPass({ timeout: 5000 })
  await expect(page.getByTestId('catalog-filter-reset')).toHaveCount(0)
})

test('行は2段（1段目に名前、2段目にラテン名・層・場所）で、「図」のボタンは行の右にある', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/catalog')
  const row = page.getByTestId('catalog-row-skin-head')
  const name = row.getByText('頭部', { exact: true }).first()
  const second = row.getByTestId('catalog-row-meta-skin-head')
  await expect(second).toContainText('Caput')
  await expect(second).toContainText('皮膚')
  const [n, m, map] = await Promise.all([name.boundingBox(), second.boundingBox(), page.getByTestId('map-skin-head').boundingBox()])
  expect((m?.y ?? 0)).toBeGreaterThan((n?.y ?? 0))
  expect(map!.x).toBeGreaterThan(m!.x + m!.width - 1)
})

test('320×568・文字200% で、名前が省略されず、絞り込みのボタンが画面からはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await installTwoTimesTextScale(page)
  await page.goto('/catalog')
  for (const id of ['catalog-filter-layer', 'catalog-filter-area', 'catalog-filter-view']) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box, id).not.toBeNull()
    expect(box!.x, `${id} が左で切れる`).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, `${id} が右で切れる`).toBeLessThanOrEqual(320)
  }
  const name = page.getByTestId('catalog-row-skin-head').getByText('頭部', { exact: true }).first()
  const size = await name.evaluate((e) => ({ w: e.clientWidth, sw: e.scrollWidth, h: e.clientHeight, sh: e.scrollHeight }))
  expect(size.sw).toBeLessThanOrEqual(size.w + 1)
  expect(size.sh).toBeLessThanOrEqual(size.h + 1)
  const map = await page.getByTestId('map-skin-head').boundingBox()
  expect(map!.x + map!.width).toBeLessThanOrEqual(320)
})
