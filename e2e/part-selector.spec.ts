import { expect, test, type Locator } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('操作の矩形を取得できない')
  return box
}

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(locale, () => {
    test.use({ locale })
    for (const width of [320, 390]) {
      for (const largeText of [false, true]) {
        test(`part selector ${width} text ${largeText ? '2x' : '1x'}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 844 })
          if (largeText) await installTwoTimesTextScale(page)
          await page.goto('/')
          await expect(page.getByTestId('demo-note')).toBeVisible()
          expect(await page.getByTestId('demo-note').evaluate(element => element.scrollHeight <= element.clientHeight), '監修前の注記が途中で切れている').toBe(true)
          const selector = page.getByTestId('part-selector')
          await expect(selector).toBeVisible({ timeout: 3000 })
          const button = await boxOf(selector)
          const canvas = await boxOf(page.getByTestId('anatomy-svg'))
          const zoom = await boxOf(page.getByTestId('zoom-in'))
          expect(button.x - canvas.x).toBeCloseTo(12, 0)
          expect(button.y - canvas.y).toBeCloseTo(12, 0)
          expect(button.height).toBeGreaterThanOrEqual(48)
          expect(button.width).toBeGreaterThanOrEqual(48)
          expect(button.x + button.width).toBeLessThanOrEqual(zoom.x - 12)
          for (const id of ['zoom-in', 'zoom-out', 'zoom-reset']) {
            const rect = await boxOf(page.getByTestId(id))
            expect(rect.height).toBeGreaterThanOrEqual(48)
            expect(rect.width).toBeGreaterThanOrEqual(48)
          }
          await page.getByTestId('zoom-in').click()
          const back = page.getByTestId('step-back')
          await expect(back).toBeVisible()
          const backBox = await boxOf(back)
          expect(backBox.y).toBeGreaterThanOrEqual(button.y + button.height + 12)
          expect(backBox.height).toBeGreaterThanOrEqual(48)
          await back.click()
          await expect(back).toHaveCount(0)
          if (process.env.EQUUS_EVIDENCE_DIR) {
            await page.screenshot({ path: `${process.env.EQUUS_EVIDENCE_DIR}/${locale}-${width}-${largeText ? '2x' : '1x'}.png` })
          }
          await selector.click()
          await expect(page).toHaveURL(/kind=parts/)
          await expect(page.getByRole('heading', { name: locale === 'ja-JP' ? '場所・部位一覧' : 'Areas & parts', exact: true })).toBeVisible()
          await page.getByTestId('overlay-close').click()
          await expect(selector).toBeVisible()
          await page.getByRole('button', { name: locale === 'ja-JP' ? '表示条件' : 'View options', exact: true }).click()
          await expect(page).toHaveURL(/kind=conditions/)
        })
      }
    }
  })
}
