import { test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const fixture = readFileSync(new URL('../fixtures/draft.json', import.meta.url), 'utf8')
const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 860 }

async function seed(page: Page) {
  await page.addInitScript((v) => window.localStorage.setItem('equus.calibrate.draft.v1', v as string), fixture)
}
async function settle(page: Page, ms = 1600) {
  await page.waitForTimeout(ms)
}

test('座標が空の現状（スマホ）', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize(PHONE)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.screenshot({ path: 'shots/01-座標なし-解剖.png' })
})

test('図鑑と詳細と保存', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize(PHONE)
  await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
  await settle(page, 1200)
  await page.screenshot({ path: 'shots/02-図鑑.png' })
  await page.getByRole('link', { name: /中臀筋/ }).first().click()
  await settle(page, 700)
  await page.screenshot({ path: 'shots/03-図鑑詳細.png' })
  await page.getByRole('button', { name: '保存' }).click()
  await settle(page, 400)
  await page.goto('/saved', { waitUntil: 'domcontentloaded' })
  await settle(page, 800)
  await page.screenshot({ path: 'shots/04-保存.png' })
})

test('座標を入れた状態（スマホ）', async ({ page }) => {
  test.setTimeout(180_000)
  await seed(page)
  await page.setViewportSize(PHONE)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-part="muscle-gluteus"]').waitFor()
  await settle(page)
  await page.screenshot({ path: 'shots/05-座標あり-解剖.png' })

  const box = (await page.locator('[data-part="muscle-gluteus"]').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await settle(page, 600)
  await page.screenshot({ path: 'shots/06-部位を選択.png' })

  await page.getByRole('button', { name: '閉じる' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '拡大' }).click()
  await settle(page, 700)
  await page.screenshot({ path: 'shots/07-3回拡大.png' })

  await page.getByRole('button', { name: '全体に戻る' }).click()
  await page.getByRole('radio', { name: '右側望' }).click()
  await settle(page, 900)
  await page.screenshot({ path: 'shots/08-右側望.png' })

  await page.getByRole('radio', { name: '左側望' }).click()
  await page.getByRole('radio', { name: '骨格' }).click()
  await settle(page, 1200)
  await page.screenshot({ path: 'shots/09-骨格-座標なし.png' })
})

test('キャリブレーション', async ({ page }) => {
  test.setTimeout(180_000)
  await seed(page)
  await page.setViewportSize(PHONE)
  await page.goto('/calibrate', { waitUntil: 'domcontentloaded' })
  await settle(page, 2000)
  await page.screenshot({ path: 'shots/10-キャリブレーション.png' })
})

test('デスクトップ', async ({ page }) => {
  test.setTimeout(180_000)
  await seed(page)
  await page.setViewportSize(DESKTOP)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-part="muscle-gluteus"]').waitFor()
  await settle(page)
  const box = (await page.locator('[data-part="muscle-triceps"]').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await settle(page, 700)
  await page.screenshot({ path: 'shots/11-デスクトップ.png' })
})
