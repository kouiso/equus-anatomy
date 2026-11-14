import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'

/**
 * #176 配布済みの web で部位選択とガイドの証跡を取る道具。検証の本体は e2e/*.spec.ts。
 *
 *   EQUUS_BASE_URL=<配布URL> EQUUS_EVIDENCE_DIR=doc/evidence/176 pnpm exec playwright test \
 *     --config <webServer を外した設定> e2e/tools/part-selection-evidence.spec.ts
 *
 * 画面に出とる原画の SHA-256 を regions/*.json の値と照らして、同じ原画での操作やと残す。
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'test-results/part-selection-evidence'
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`
const sheetHeading = (page: Page) => page.getByRole('heading', { level: 2 })
const log: string[] = []

async function clickCenter(page: Page, selector: string) {
  await waitForCanvasLayout(page)
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function shot(page: Page, name: string, note: string) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  log.push(`- ${name}.png: ${note}`)
}

/** 画面の原画を取り直して SHA を出す。regions の hash と一致すれば同じ原画 */
async function imageSha(page: Page): Promise<{ href: string; sha: string }> {
  const href = await page.getByTestId('anatomy-image').first().evaluate((el) => el.getAttribute('href') ?? el.getAttribute('xlink:href') ?? '')
  const body = await page.request.get(new URL(href, page.url()).href)
  expect(body.ok(), href).toBe(true)
  return { href, sha: `sha256:${createHash('sha256').update(await body.body()).digest('hex')}` }
}

/** 既定の表示は筋肉（表層）のプレート。そのプレートの hash とだけ照らす */
const plateHash = (view: string, plate = 'muscle-superficial') =>
  (JSON.parse(readFileSync(`src/core/data/regions/${view}.json`, 'utf8')) as { images: Record<string, { hash: string }> }).images[plate]?.hash

test('部位選択とガイド（配布済み web）', async ({ page, baseURL }) => {
  test.setTimeout(180_000)
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByTestId('demo-note')).toBeVisible()
  log.push(`- URL: ${baseURL}`)
  log.push(`- 未監修の注記: 「${(await page.getByTestId('demo-note').innerText()).trim()}」`)

  const left = await imageSha(page)
  expect(left.sha).toBe(plateHash('left'))
  log.push(`- 左側望の原画 ${left.href} → ${left.sha}（regions/left.json と一致）`)
  await shot(page, '01-home-390', '左上に部位一覧の入口。監修前の注記が見える')

  await page.getByTestId('part-selector').click()
  await expect(page).toHaveURL(/kind=parts/)
  await expect(page.getByRole('heading', { name: '場所・部位一覧', exact: true })).toBeVisible()
  await shot(page, '02-part-list-390', '部位一覧を開いた')
  await page.getByTestId('overlay-close').click()

  await clickCenter(page, markerDot('fore'))
  await page.waitForTimeout(700)
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(sheetHeading(page)).toHaveText('上腕三頭筋')
  await expect(page.locator('path[data-testid="part-muscle-triceps"]')).toHaveCount(1)
  await shot(page, '03-select-triceps-390', '前肢→上腕三頭筋。輪郭のガイドと解説が出る')

  const viewBox = async () => ((await page.getByTestId('anatomy-svg').getAttribute('viewBox')) ?? '').split(/\s+/).map(Number)
  const vbBefore = await viewBox()
  await page.getByTestId('zoom-in').click()
  await page.getByTestId('zoom-in').click()
  await expect.poll(async () => (await viewBox())[2]!, { message: '拡大で viewBox の幅が縮まん' }).toBeLessThan(vbBefore[2]!)
  const vbZoomed = await viewBox()
  const svg = (await page.getByTestId('anatomy-svg').boundingBox())!
  await page.mouse.move(svg.x + svg.width / 2, svg.y + svg.height / 2)
  await page.mouse.down()
  await page.mouse.move(svg.x + svg.width / 2 + 40, svg.y + svg.height / 2 + 30, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => (await viewBox())[0]!, { message: '移動で viewBox の原点が動かん' }).not.toBe(vbZoomed[0]!)
  const vbPanned = await viewBox()
  expect(vbPanned[2]).toBeCloseTo(vbZoomed[2]!, 3)
  // 選んだままやと押し損ねても見出しが残るので、いったん解除してから押し直す
  await page.getByRole('button', { name: '選択を解除', exact: true }).click()
  await expect(sheetHeading(page)).toHaveCount(0)
  expect(await viewBox()).toEqual(vbPanned)
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(sheetHeading(page)).toHaveText('上腕三頭筋')
  log.push(`- viewBox: 拡大前 ${vbBefore.join(' ')} → 拡大2段 ${vbZoomed.join(' ')} → 移動 ${vbPanned.join(' ')}`)
  log.push('- 移動の後に選択を解除し、点を押し直して選ばれた')
  await shot(page, '04-zoom-pan-select-390', '拡大して動かした後も同じ部位を押せる')

  await page.getByTestId('step-back').click()
  await expect(sheetHeading(page)).toHaveCount(0)
  await shot(page, '05-step-back-390', '1つ戻るで選択から戻れる')

  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  await page.getByRole('radio', { name: '右側望', exact: true }).click()
  await page.getByRole('button', { name: 'この条件で表示' }).click()
  const right = await imageSha(page)
  expect(right.sha).toBe(plateHash('left'))
  // 同じ原画を左右反転して出しとることを、描画の transform で確かめる
  const transform = await page.getByTestId('anatomy-image').first().getAttribute('transform')
  expect(transform ?? '').toMatch(/scale\(-1[ ,]+1\)/)
  log.push(`- 右側望の原画 ${right.href} → ${right.sha}（左側望と同じ原画。transform="${transform}" で左右反転）`)
  await clickCenter(page, markerDot('fore'))
  await page.waitForTimeout(700)
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(sheetHeading(page)).toHaveText('上腕三頭筋')
  await shot(page, '06-right-select-triceps-390', '右側望（反転）でも同じ部位を押せる')

  writeFileSync(`${OUT}/run-log.md`, `${log.join('\n')}\n`)
})
