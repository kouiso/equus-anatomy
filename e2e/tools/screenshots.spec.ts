import { test, type Page } from '@playwright/test'

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 860 }
const settle = (p: Page, ms = 1600) => p.waitForTimeout(ms)

async function pickArea(page: Page, id: string) {
  await page.locator(`[data-marker="${id}"]`).waitFor()
  const b = (await page.locator(`[data-marker="${id}"] circle`).first().boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 900)
}

test('解剖の流れ（スマホ）', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize(PHONE)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.screenshot({ path: 'shots/1-場所を選ぶ.png' })

  await pickArea(page, 'fore')
  await page.screenshot({ path: 'shots/2-前肢へ寄る.png' })

  const b = (await page.locator('[data-part="muscle-triceps"]').boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 700)
  await page.screenshot({ path: 'shots/3-上腕三頭筋.png' })

  await page.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await pickArea(page, 'hind')
  await page.screenshot({ path: 'shots/4-後肢へ寄る.png' })

  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '右側望' }).click()
  await settle(page, 1000)
  await page.screenshot({ path: 'shots/5-右側望.png' })
})

test('デスクトップ', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize(DESKTOP)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await pickArea(page, 'neck')
  const b = (await page.locator('[data-part="muscle-brachiocephalicus"]').boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 700)
  await page.screenshot({ path: 'shots/6-デスクトップ.png' })
})
