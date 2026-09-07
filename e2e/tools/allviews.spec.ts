import { test, type Page } from '@playwright/test'
const settle = (p: Page, ms = 1400) => p.waitForTimeout(ms)
async function pickArea(page: Page, id: string) {
  await page.locator(`[data-marker="${id}"]`).waitFor()
  const b = (await page.locator(`[data-marker="${id}"] circle`).first().boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 900)
}
test('正面と後面', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.getByRole('radio', { name: '正面' }).click()
  await settle(page)
  await page.screenshot({ path: 'shots/f1-正面-場所.png' })
  await pickArea(page, 'fore')
  const b = (await page.locator('[data-part="muscle-pectoral"]').boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 700)
  await page.screenshot({ path: 'shots/f2-正面-胸筋.png' })

  await page.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '後面' }).click()
  await settle(page)
  await page.screenshot({ path: 'shots/f3-後面-場所.png' })
  await pickArea(page, 'hind')
  const c = (await page.locator('[data-part="muscle-gluteus"]').boundingBox())!
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2)
  await settle(page, 700)
  await page.screenshot({ path: 'shots/f4-後面-中臀筋.png' })
})
