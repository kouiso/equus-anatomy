import { mkdirSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * #5 手根関節（joint-carpus）の証跡を撮る道具。検証の本体は e2e/*.spec.ts と src/core/data/*.test.ts。
 *
 *   EQUUS_EVIDENCE_DIR=doc/evidence/5-joint-carpus EQUUS_SHOT_PREFIX=after pnpm exec playwright test \
 *     --config playwright.shots.config.ts e2e/tools/joint-carpus-evidence.spec.ts
 *
 * 「前」は develop の写し、「後」は作業ブランチの写しを同じ手順で撮る。前には手根関節が無いので、その段は飛ばす。
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'test-results/joint-carpus-evidence'
const PREFIX = process.env.EQUUS_SHOT_PREFIX ?? 'run'
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`

async function clickCenter(page: Page, selector: string) {
  await waitForCanvasLayout(page)
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('骨格の前肢の手根関節（証跡撮り）', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByTestId('chip-skeleton').click()
  await page.locator(markerDot('fore')).waitFor()

  // 前肢へ寄る
  await clickCenter(page, markerDot('fore'))
  await page.waitForTimeout(700)
  // 2 段寄ると手根の辺りの札が読める
  await page.getByTestId('zoom-in').click()
  await page.getByTestId('zoom-in').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-skeleton-fore-zoomed-390.png`, fullPage: true })

  // 手根骨は前後とも選べる
  await clickCenter(page, markerDot('bone-carpus'))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-bone-carpus-selected-390.png`, fullPage: true })

  if ((await page.locator(markerDot('joint-carpus')).count()) === 0) return
  await clickCenter(page, markerDot('joint-carpus'))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-joint-carpus-selected-390.png`, fullPage: true })
})
