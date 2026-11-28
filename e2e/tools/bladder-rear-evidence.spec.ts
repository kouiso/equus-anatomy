import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'

/**
 * #215 後面・内臓の膀胱（下書き）の証跡を撮る道具。検証の本体は e2e/*.spec.ts と src/core/data/*.test.ts。
 *
 *   EQUUS_EVIDENCE_DIR=doc/evidence/215-bladder-rear EQUUS_SHOT_PREFIX=after pnpm exec playwright test \
 *     --config playwright.shots.config.ts e2e/tools/bladder-rear-evidence.spec.ts --trace off
 *
 * 「前」は develop の写し、「後」は作業ブランチの写しを同じ手順で撮る。前には後面の膀胱が無いので、その段は飛ばす。
 * 膀胱は体幹の枠の中にある（体幹の枠は膀胱の底まで取ってある）。全体表示では場所の点（体幹）が出るだけで、
 * 部位の点は場所を選んでから出る。そこで、図の上の膀胱そのものを叩いて体幹を選び、出てきた膀胱の点を叩く。
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'test-results/bladder-rear-evidence'
const PREFIX = process.env.EQUUS_SHOT_PREFIX ?? 'run'
// 膀胱の上の方の点（切り詰め後の画像座標）。下半分には薄い後肢の札が重なって出るので、札に掛からん所を叩く
const BLADDER_AT: [number, number] = [290, 580]

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

  // 部位一覧の絵だけ先に撮る（前は一覧に膀胱が無い）
  await page.getByTestId('part-selector').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${PREFIX}-part-list-390.png`, fullPage: true })
  await page.getByTestId('overlay-close').click()
  await page.getByTestId('marker-dot-tail').waitFor()
  await page.waitForTimeout(500)

  // 全体表示で、図の上の膀胱を叩く（画像座標を実 SVG の CTM で画面座標に直す）
  const pt = await page.getByTestId('anatomy-svg').evaluate((node, [ix, iy]) => {
    const ctm = (node as SVGSVGElement).getScreenCTM()
    if (ctm === null) throw new Error('anatomy-svg の getScreenCTM が取得できない')
    const p = new DOMPoint(ix, iy).matrixTransform(ctm)
    return { x: p.x, y: p.y }
  }, BLADDER_AT)
  await page.mouse.click(pt.x, pt.y)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${PREFIX}-trunk-selected-390.png`, fullPage: true })

  // 前は膀胱が無いので、膀胱の点が出なければここで終わる
  const dot = page.getByTestId('marker-dot-organ-bladder')
  if ((await dot.count()) === 0) return
  const box = await dot.first().boundingBox()
  if (!box) throw new Error('marker-dot-organ-bladder の矩形が取れん')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${PREFIX}-bladder-selected-390.png`, fullPage: true })
})
