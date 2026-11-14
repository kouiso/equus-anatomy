import { expect, test, type Locator, type Page } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * 図鑑の検索ボックスが画面の幅に収まる（T07 の回帰）。
 * 原因: web の <input> は文字の大きさに比例した最小幅を持つため、flex: 1 でも縮まず、
 * 320px・文字200% で右端が画面を越えた。
 */

async function rightEdge(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  return box ? box.x + box.width : Number.POSITIVE_INFINITY
}

/** 文字を2倍にする仕掛けは描画の後から効くので、効くまで待つ */
async function waitForScale(page: Page, scaled: boolean) {
  const search = page.getByTestId('catalog-search')
  const expected = scaled ? 28 : 14
  await expect.poll(() => search.evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize))).toBe(expected)
}

async function expectFits(page: Page, id: string, width: number) {
  const target = page.getByTestId(id)
  await expect.poll(() => rightEdge(target), { message: `${id} の右端が ${width}px を越える` }).toBeLessThanOrEqual(width)
  const box = await target.boundingBox()
  expect(box?.x ?? -1, `${id} の左端が画面の外`).toBeGreaterThanOrEqual(0)
}

for (const { name, width, height, scaled } of [
  { name: '320×568・文字200%', width: 320, height: 568, scaled: true },
  { name: '390×844・文字100%（ガード）', width: 390, height: 844, scaled: false },
]) {
  test.describe(name, () => {
    test.use({ viewport: { width, height }, locale: 'ja-JP' })

    test.beforeEach(async ({ page }) => {
      if (scaled) await installTwoTimesTextScale(page)
      await page.goto('/catalog')
      await expect(page.getByTestId('catalog-search')).toBeVisible()
      await waitForScale(page, scaled)
    })

    test('検索ボックスが画面に収まる', async ({ page }) => {
      await expectFits(page, 'catalog-search', width)
    })

    test('文字を入れて消去ボタンが出ても、検索ボックスと消去ボタンが収まる', async ({ page }) => {
      await page.getByTestId('catalog-search').fill('頭')
      await expect(page.getByTestId('catalog-search-clear')).toBeVisible()
      await expectFits(page, 'catalog-search', width)
      await expectFits(page, 'catalog-search-clear', width)
      // 並びが崩れて重なっていないこと
      const search = await page.getByTestId('catalog-search').boundingBox()
      const clear = await page.getByTestId('catalog-search-clear').boundingBox()
      expect(search && clear ? search.x + search.width <= clear.x + 1 : false, '検索ボックスと消去ボタンが重なる').toBe(true)
    })
  })
}
