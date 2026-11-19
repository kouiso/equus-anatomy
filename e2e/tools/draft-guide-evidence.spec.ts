import { mkdirSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * #173 下書きのガイド線（破線・「下書き」の札・パネルの凡例）の証跡を撮る道具。検証の本体は e2e/*.spec.ts。
 *
 *   EQUUS_EVIDENCE_DIR=doc/evidence/173 EQUUS_SHOT_PREFIX=after pnpm exec playwright test \
 *     --config playwright.shots.config.ts e2e/tools/draft-guide-evidence.spec.ts
 *
 * 「前」は develop の写し、「後」は作業ブランチの写しを同じ手順で撮る。
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'test-results/draft-guide-evidence'
const PREFIX = process.env.EQUUS_SHOT_PREFIX ?? 'run'
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`

async function clickCenter(page: Page, selector: string) {
  await waitForCanvasLayout(page)
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('下書きのガイド線と凡例（証跡撮り）', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator(markerDot('fore')).waitFor()

  // 前肢へ寄る。筋肉の層の前肢は下書きの部位が多い
  await clickCenter(page, markerDot('fore'))
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${PREFIX}-parts-fore-390.png`, fullPage: true })

  // 下書きの部位を選ぶ。上腕三頭筋は source: draft
  await clickCenter(page, markerDot('muscle-triceps'))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-draft-selected-390.png`, fullPage: true })

  // 2 段寄ると全ての札が出る。実測（骨色の実線）と下書き（補助色の破線）が並ぶ
  await page.getByTestId('zoom-in').click()
  await page.getByTestId('zoom-in').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-draft-zoomed-390.png`, fullPage: true })
})
