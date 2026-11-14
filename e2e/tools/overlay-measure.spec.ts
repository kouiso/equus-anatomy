import { mkdirSync, writeFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * #175 到達性の試験（src/core/data/reachability.test.ts）が使う図の箱とボタンの矩形を実測する道具。
 * 配置が変わったら取り直して、試験の値を合わせる。
 *
 *   EQUUS_BASE_URL=<配布URL> EQUUS_EVIDENCE_DIR=doc/evidence/175 pnpm exec playwright test \
 *     --config <webServer を外した設定> e2e/tools/overlay-measure.spec.ts
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'test-results/overlay-measure'

async function clickDot(page: Page, id: string) {
  await waitForCanvasLayout(page)
  const box = await page.locator(`[data-testid="marker-dot-${id}"]`).boundingBox()
  if (!box) throw new Error(`marker-dot-${id} が無い`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

test('図の箱と重ねたボタンの矩形（部位を選んだ状態）', async ({ page, baseURL }) => {
  mkdirSync(OUT, { recursive: true })
  const result: Record<string, unknown>[] = []
  for (const [w, h] of [
    [390, 844],
    [900, 1000],
  ] as const) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/')
    await clickDot(page, 'fore')
    await page.waitForTimeout(700)
    await clickDot(page, 'muscle-triceps')
    await page.getByRole('heading', { level: 2 }).waitFor()
    const svg = await page.getByTestId('anatomy-svg').boundingBox()
    const row: Record<string, unknown> = { viewport: [w, h], canvas: svg }
    for (const id of ['part-selector', 'step-back', 'zoom-in', 'read-more', 'conditions']) {
      const b = await page.getByTestId(id).first().boundingBox()
      // 図の箱の左上からの相対位置で残す。試験はこの座標系で見る
      row[id] = b && svg ? { x: b.x - svg.x, y: b.y - svg.y, w: b.width, h: b.height } : null
    }
    result.push(row)
  }
  writeFileSync(`${OUT}/overlay-measure.json`, `${JSON.stringify({ url: baseURL, locale: 'ja-JP', result }, null, 2)}\n`)
})
