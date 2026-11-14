import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * 図鑑・保存の行の並び（#276 / #280）。
 *
 * 静的に書き出した HTML は幅 0 で描かれるので、縦積み（compact）の style が最初から入る。
 * 幅で決める見た目を最初の描画で決めると、hydration で属性が直らず、
 * 広い画面で直接開いても縦積みのまま残っていた。ここでは「直接開く」を見張る。
 */

const SAVED_KEY = 'equus.saved.v1'
const PART = 'muscle-masseter'
// 書き出した HTML に最初から入っている行（一覧の先頭）。後から描かれる行は hydration を通らず、
// 症状が出ない。先頭の行で見ないと main でも通ってしまう
const FIRST_ROW = 'catalog-row-skin-head'

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

async function direction(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).flexDirection)
}

/** 保存の行は、行の外枠（リンクの親）が縦積みになる */
function savedRowBox(page: Page) {
  return page.getByTestId(`saved-row-${PART}`).locator('xpath=..')
}

async function seedSaved(page: Page) {
  await page.addInitScript(
    ({ key, id }) => window.localStorage.setItem(key, JSON.stringify([id])),
    { key: SAVED_KEY, id: PART },
  )
}

for (const width of [1280, 1440]) {
  test(`${width}px で /catalog を直接開くと、行が横並びで出る`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/catalog')
    const row = page.getByTestId(FIRST_ROW)
    await expect(row).toBeVisible()
    await expect.poll(() => direction(row)).toBe('row')
    expect(errors, 'console/page エラーが出ている').toEqual([])
  })

  test(`${width}px で /saved を直接開くと、行が横並びで出る`, async ({ page }) => {
    const errors = watchErrors(page)
    await seedSaved(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/saved')
    await expect(page.getByTestId(`saved-row-${PART}`)).toBeVisible()
    await expect.poll(() => direction(savedRowBox(page))).toBe('row')
    expect(errors, 'console/page エラーが出ている').toEqual([])
  })
}

// Web では文字の倍率（fontScale）は常に 1。ブラウザの 200% ズームは CSS の幅が半分になる形で効くので、
// 「幅 1000px・文字 200%」は幅 500px で見る
for (const width of [390, 500]) {
  test(`${width}px で直接開くと、図鑑・保存とも今までどおり縦積みで出る`, async ({ page }) => {
    const errors = watchErrors(page)
    await seedSaved(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/catalog')
    const row = page.getByTestId(FIRST_ROW)
    await expect(row).toBeVisible()
    await expect.poll(() => direction(row)).toBe('column')
    await page.goto('/saved')
    await expect(page.getByTestId(`saved-row-${PART}`)).toBeVisible()
    await expect.poll(() => direction(savedRowBox(page))).toBe('column')
    expect(errors, 'console/page エラーが出ている').toEqual([])
  })
}

test('1440px で解剖タブから移った時と直接開いた時で、図鑑の行の並びが同じ', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/catalog')
  const row = page.getByTestId(FIRST_ROW)
  await expect(row).toBeVisible()
  await expect.poll(() => direction(row)).toBe('row')
  const direct = await row.boundingBox()

  await page.goto('/')
  await page.getByTestId('tab-catalog').click()
  await expect(row).toBeVisible()
  await expect.poll(() => direction(row)).toBe('row')
  const viaTab = await row.boundingBox()
  expect(viaTab?.height).toBeCloseTo(direct?.height ?? 0, 0)
})
