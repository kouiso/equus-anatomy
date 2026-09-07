import { test, type Page } from '@playwright/test'
const settle = (p: Page, ms = 1400) => p.waitForTimeout(ms)
async function pickArea(page: Page, id: string) {
  await page.locator(`[data-marker="${id}"]`).waitFor()
  const b = (await page.locator(`[data-marker="${id}"] circle`).first().boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 900)
}
test('右側望', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.getByRole('radio', { name: '右側望' }).click()
  await settle(page)
  await page.screenshot({ path: 'shots/r1-右側望-場所.png' })
  await pickArea(page, 'hind')
  const b = (await page.locator('[data-part="muscle-gluteus"]').boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 700)
  await page.screenshot({ path: 'shots/r2-右側望-中臀筋.png' })
  await page.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '骨格' }).click()
  await settle(page)
  await pickArea(page, 'fore')
  await page.screenshot({ path: 'shots/r3-右側望-骨格.png' })
})
