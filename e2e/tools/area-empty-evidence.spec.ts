import { test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * 証跡撮り専用（pnpm shots 系。既定の実行には入らん）。
 * 後面・内臓で、部位が無い「尾」と、腎臓を持つ「体幹」を撮る。
 * EQUUS_AREA_EVIDENCE=<出力ディレクトリ>/<接頭辞> を渡した時だけ書き出す。
 */
const out = process.env.EQUUS_AREA_EVIDENCE

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ja-JP' })

async function tap(page: Page, testId: string) {
  await waitForCanvasLayout(page)
  const box = await page.getByTestId(testId).first().boundingBox()
  if (!box) throw new Error(`${testId} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(900)
}

async function rearOrgans(page: Page) {
  await page.goto('/')
  await page.getByTestId('chip-rear').click()
  await page.getByTestId('chip-organs').click()
  await page.getByTestId('marker-dot-tail').waitFor()
  await waitForCanvasLayout(page)
}

test('尾（部位なし）', async ({ page }) => {
  test.skip(!out, 'EQUUS_AREA_EVIDENCE が無い')
  await rearOrgans(page)
  await page.screenshot({ path: `${out}-1-rear-organs-areas.png` })
  await tap(page, 'marker-dot-tail')
  await page.screenshot({ path: `${out}-2-after-tap-tail.png` })
})

test('体幹 → 腎臓', async ({ page }) => {
  test.skip(!out, 'EQUUS_AREA_EVIDENCE が無い')
  await rearOrgans(page)
  if ((await page.getByTestId('marker-dot-trunk').count()) === 0) return
  await tap(page, 'marker-dot-trunk')
  await page.screenshot({ path: `${out}-3-trunk-kidney.png` })
})
