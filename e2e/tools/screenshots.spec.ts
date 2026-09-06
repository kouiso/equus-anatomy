import { test } from '@playwright/test'
import { readFileSync } from 'node:fs'
const fixture = readFileSync(new URL('./fixtures/draft.json', import.meta.url), 'utf8')

test('スクショ', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript((v) => window.localStorage.setItem('equus.calibrate.draft.v1', v as string), fixture)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-part="muscle-gluteus"]').waitFor()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'shots/anatomy-phone.png' })
  const box = await page.locator('[data-part="muscle-gluteus"]').boundingBox()
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'shots/anatomy-selected.png' })
  await page.goto('/calibrate', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'shots/calibrate.png' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'shots/anatomy-desktop.png' })
})
