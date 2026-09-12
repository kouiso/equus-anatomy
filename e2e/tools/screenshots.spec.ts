import { test, type Page } from '@playwright/test'

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 860 }
const settle = (p: Page, ms = 1500) => p.waitForTimeout(ms)
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`
const partPath = (id: string) => `path[data-testid="part-${id}"]`

async function pickArea(page: Page, id: string) {
  await page.locator(markerDot(id)).waitFor()
  const b = (await page.locator(markerDot(id)).boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 900)
}
async function tapPart(page: Page, id: string) {
  const b = (await page.locator(partPath(id)).boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 600)
}

test('4層それぞれ（スマホ）', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize(PHONE)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.screenshot({ path: 'shots/1-場所を選ぶ.png' })

  await pickArea(page, 'fore')
  await tapPart(page, 'muscle-triceps')
  await page.screenshot({ path: 'shots/2-筋肉.png' })

  await page.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '皮膚' }).click()
  await settle(page, 1200)
  await pickArea(page, 'fore')
  await tapPart(page, 'skin-cannon')
  await page.screenshot({ path: 'shots/3-皮膚.png' })

  await page.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '骨格' }).click()
  await settle(page, 1200)
  await pickArea(page, 'hind')
  await tapPart(page, 'bone-pelvis')
  await page.screenshot({ path: 'shots/4-骨格.png' })

  await page.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '内臓' }).click()
  await settle(page, 1200)
  await pickArea(page, 'trunk')
  await tapPart(page, 'organ-spleen')
  await page.screenshot({ path: 'shots/5-内臓.png' })
})

test('デスクトップ', async ({ page }) => {
  test.setTimeout(300_000)
  await page.setViewportSize(DESKTOP)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.getByRole('radio', { name: '骨格' }).click()
  await settle(page, 1200)
  await pickArea(page, 'neck')
  await tapPart(page, 'bone-cervical')
  await page.screenshot({ path: 'shots/6-デスクトップ骨格.png' })
})
