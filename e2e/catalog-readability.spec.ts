import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { STRUCTURE_BY_ID } from '../src/core/data'
import { structureName } from '../src/core/i18n'
import { installTwoTimesTextScale } from './tools/text-scale'

const part = STRUCTURE_BY_ID.get('muscle-brachiocephalicus')!

/** DOM に全文があっても、省略や横幅ゼロで名前を読めない行は合格にしない。 */
async function expectFullText(locator: Locator) {
  const size = await locator.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
    contentWidth: element.scrollWidth,
    contentHeight: element.scrollHeight,
  }))
  expect(size.width, `${await locator.textContent()} の表示幅`).toBeGreaterThan(0)
  expect(size.contentWidth, `${await locator.textContent()} が横で省略される`).toBeLessThanOrEqual(size.width + 1)
  expect(size.contentHeight, `${await locator.textContent()} が縦で省略される`).toBeLessThanOrEqual(size.height + 1)
}

async function capture(page: Page, name: string) {
  // 証跡採取時だけ指定する。通常の回帰試験はリポジトリへ画像を書き込まない。
  const phase = process.env.EQUUS_UI_EVIDENCE
  if (!phase) return
  // タブ切替の途中でヘッダが畳まれた瞬間を比較画像にしない。
  await expect(page.getByTestId('demo-note')).toBeInViewport()
  await expect(page.getByTestId('language-toggle')).toBeInViewport()
  await page.evaluate(() => document.fonts.ready)
  const directory = 'doc/review/2026-10-22-catalog-readability/evidence'
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: `${directory}/${phase}-${name}.png` })
}

for (const locale of ['en', 'ja'] as const) {
  test.describe(`${locale}: 一覧で部位名を全文読んで図へ進める`, () => {
    test.use({ locale: locale === 'en' ? 'en-US' : 'ja-JP' })
    for (const [width, height, scale] of [[375, 812, 1], [320, 568, 2], [1280, 800, 1]]) {
      test(`${width}px・文字${scale}倍`, async ({ page }) => {
        await page.setViewportSize({ width: width!, height: height! })
        if (scale === 2) await installTwoTimesTextScale(page)
        await page.goto('/catalog')
        await page.getByTestId('catalog-search').fill(part.nameEn)
        const catalogRow = page.getByTestId(`catalog-row-${part.id}`)
        await catalogRow.scrollIntoViewIfNeeded()
        await expect(catalogRow).toContainText(structureName(part, locale))
        await page.evaluate(() => document.fonts.ready)
        await capture(page, `${locale}-${width}-${scale}x-catalog`)
        // 保存側も同条件で採取してから、両方の実際の表示領域を検査する。
        const catalogNames = await catalogRow.getByText(structureName(part, locale), { exact: true }).evaluate((element) => ({
          width: element.clientWidth, contentWidth: element.scrollWidth,
        }))
        await catalogRow.click()
        await page.getByTestId('save-toggle').click()
        await page.getByTestId('catalog-back').click()
        await page.getByTestId('tab-saved').click()
        const savedRow = page.getByTestId(`saved-row-${part.id}`)
        await expect(savedRow).toBeVisible()
        await capture(page, `${locale}-${width}-${scale}x-saved`)
        await expectFullText(savedRow.getByText(structureName(part, locale), { exact: true }))
        await expectFullText(savedRow.getByText(part.nameLa, { exact: true }))
        expect(catalogNames.contentWidth, '図鑑の部位名が省略される').toBeLessThanOrEqual(catalogNames.width + 1)

        const map = page.getByTestId(`saved-map-${part.id}`)
        const mapBox = await map.boundingBox()
        expect(mapBox!.height).toBeGreaterThanOrEqual(44)
        expect(mapBox!.x).toBeGreaterThanOrEqual(0)
        expect(mapBox!.x + mapBox!.width).toBeLessThanOrEqual(width!)
        await map.click()
        await expect(page.getByRole('heading', { level: 2 })).toHaveText(structureName(part, locale))
        await expect(page.getByTestId(`marker-dot-${part.id}`)).toBeVisible()

        await page.getByTestId('tab-catalog').click()
        await expect(page.getByTestId('catalog-search')).toHaveValue(part.nameEn)
        await catalogRow.scrollIntoViewIfNeeded()
        await expectFullText(catalogRow.getByText(structureName(part, locale), { exact: true }))
        await expectFullText(catalogRow.getByText(part.nameLa, { exact: true }))
        await page.getByTestId(`map-${part.id}`).click()
        await expect(page.getByRole('heading', { level: 2 })).toHaveText(structureName(part, locale))
      })
    }
  })
}
