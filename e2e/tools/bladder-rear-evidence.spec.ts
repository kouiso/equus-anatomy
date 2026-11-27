import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'

/**
 * #215 後面・内臓の膀胱（下書き）の証跡を撮る道具。検証の本体は e2e/*.spec.ts と src/core/data/*.test.ts。
 *
 *   EQUUS_EVIDENCE_DIR=doc/evidence/215-bladder-rear EQUUS_SHOT_PREFIX=after pnpm exec playwright test \
 *     --config playwright.shots.config.ts e2e/tools/bladder-rear-evidence.spec.ts --trace off
 *
 * 「前」は develop の写し、「後」は作業ブランチの写しを同じ手順で撮る。前には後面の膀胱が無いので、その段は飛ばす。
 * 膀胱は体幹の枠の外にあって点が出んので、部位一覧から選ぶ（腎臓の #308 と同じ）。
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'test-results/bladder-rear-evidence'
const PREFIX = process.env.EQUUS_SHOT_PREFIX ?? 'run'

test('後面・内臓の膀胱（証跡撮り）', async ({ page }) => {
  test.setTimeout(120_000)
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByTestId('chip-rear').click()
  await page.getByTestId('chip-organs').click()
  await page.getByTestId('marker-dot-tail').waitFor()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-rear-organs-390.png`, fullPage: true })

  // 膀胱は体幹の枠の外にあって点が出んので、部位一覧から選ぶ。前は一覧に膀胱が無いので、一覧の絵だけ撮って終わる
  await page.getByTestId('part-selector').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-part-list-390.png`, fullPage: true })
  const row = page.getByText('膀胱', { exact: true }).first()
  if ((await row.count()) === 0) return
  await row.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${PREFIX}-bladder-selected-390.png`, fullPage: true })
})
