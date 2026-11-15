import { test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * 証跡撮り専用（pnpm shots 系。既定の実行には入らん）。
 * 後面・内臓（場所が全部空）と、左側望・筋肉（尾だけ空）を撮る。
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

test('後面・内臓: 場所が全部空', async ({ page }) => {
  test.skip(!out, 'EQUUS_AREA_EVIDENCE が無い')
  await page.goto('/')
  await page.getByTestId('chip-rear').click()
  await page.getByTestId('chip-organs').click()
  await page.getByTestId('marker-dot-tail').waitFor()
  await waitForCanvasLayout(page)
  await page.screenshot({ path: `${out}-1-rear-organs-all-disabled.png` })
  await tap(page, 'marker-dot-tail')
  await tap(page, 'marker-dot-hind')
  await page.screenshot({ path: `${out}-2-rear-organs-after-taps.png` })
  await page.getByTestId('part-selector').click()
  await page.getByTestId('area-tail').waitFor()
  await page.screenshot({ path: `${out}-3-rear-organs-area-list.png` })
})

test('左側望・筋肉: 尾だけ空', async ({ page }) => {
  test.skip(!out, 'EQUUS_AREA_EVIDENCE が無い')
  await page.goto('/')
  await page.getByTestId('marker-dot-tail').waitFor()
  await waitForCanvasLayout(page)
  await page.screenshot({ path: `${out}-4-left-muscle-tail-disabled.png` })
  await tap(page, 'marker-dot-tail')
  await page.screenshot({ path: `${out}-5-left-muscle-after-tap-tail.png` })
})
