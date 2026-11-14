import { mkdirSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * b159 の差 3 件（場所名の見出し・向きチップの切れ・部位選択後の状態行）の前後を同じ条件で撮る道具。
 * 検証の本体は e2e/*.spec.ts。
 *
 *   EQUUS_BASE_URL=http://127.0.0.1:4192 EQUUS_SHOT_PREFIX=before pnpm exec playwright test \
 *     --config <webServer を外した設定> e2e/tools/b159-followups-evidence.spec.ts
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'doc/evidence/b159-followups'
const PREFIX = process.env.EQUUS_SHOT_PREFIX ?? 'after'
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`

async function box(page: Page, testId: string) {
  const el = page.getByTestId(testId)
  if ((await el.count()) === 0) return null
  const b = await el.first().boundingBox()
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
}

async function dump(page: Page, label: string) {
  const panel = await box(page, 'anatomy-panel')
  const scroll = await page.getByTestId('anatomy-panel-scroll').evaluate((el) => ({ scrollH: el.scrollHeight, clientH: el.clientHeight }))
  const viewChip = page.getByRole('button', { name: '背側望', exact: true })
  const info = {
    label,
    panel,
    scroll,
    stepBack: await box(page, 'step-back'),
    chips: await box(page, 'condition-chips'),
    viewChip: (await viewChip.count()) ? await viewChip.first().boundingBox() : null,
    status: await page.getByText(/左側望 · /).first().boundingBox().catch(() => null),
  }
  console.log(JSON.stringify(info))
}

test('b159 follow-ups', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator(markerDot('fore')).waitFor()
  await waitForCanvasLayout(page)
  await page.locator(markerDot('fore')).first().click()
  await page.waitForTimeout(900)
  await page.locator(markerDot('muscle-triceps')).waitFor()
  await dump(page, 'area')
  await page.screenshot({ path: `${OUT}/${PREFIX}-area-390x844.png` })
  await waitForCanvasLayout(page)
  await page.locator(markerDot('muscle-triceps')).first().click()
  await page.waitForTimeout(900)
  await dump(page, 'part')
  await page.screenshot({ path: `${OUT}/${PREFIX}-part-390x844.png` })
})
