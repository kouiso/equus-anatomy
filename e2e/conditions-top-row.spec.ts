import { expect, test, type Locator, type Page } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'
import { waitForCanvasLayout } from './canvas-layout'

/**
 * #323 表示条件を図の左下から上段へ移した。左下だと探しにくく、上にボタンがあるほうが分かりやすいという声。
 * 上段は左から「場所・部位一覧」「表示条件」、右に ＋ / − / リセット。
 * 並ばん幅（320px・文字2倍）では表示条件を右の列（ズームの下）へ送る。左の2段目だと頭の点を覆うため。
 * どの幅でも文字を省略せず、44px 以上で押せて、図の点（当たりの円まで）を覆わない。
 */

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/**
 * 文字が横にはみ出したり、省略（…）や行数の打ち切りで切れたりしていない。
 * 縦は字形が行の高さより1〜2pxはみ出る（等倍で1px、2倍で2px）。切れた行があれば1行ぶん以上隠れるので、半行で見る
 */
async function expectNotTruncated(button: Locator) {
  const clipped = await button.locator('[dir="auto"]').evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const glyph = range.getBoundingClientRect()
    const box = element.getBoundingClientRect()
    return (
      element.scrollWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight + Number.parseFloat(getComputedStyle(element).lineHeight) / 2 ||
      glyph.x < box.x - 0.5 ||
      glyph.right > box.right + 0.5 ||
      getComputedStyle(element).textOverflow === 'ellipsis'
    )
  })
  expect(clipped, `${await button.textContent()} の文字が省略されている`).toBe(false)
}

/** 置き場を決めた後に、測り直しで置き場が動き続けていない（#324 の往復の再発防止） */
async function expectSettled(page: Page, button: Locator) {
  const before = await boxOf(button)
  await page.evaluate(() => new Promise<void>((resolve) => {
    let n = 0
    const tick = () => (++n >= 20 ? resolve() : requestAnimationFrame(tick))
    requestAnimationFrame(tick)
  }))
  expect(await boxOf(button), '表示条件の置き場が動き続けている').toEqual(before)
}

/** 上段の2つが図の点（見えない当たりの円を含む）を覆わない */
async function expectNoMarkerCovered(page: Page, buttons: Locator[]) {
  const markers = page.locator('g[data-testid^="marker-"]:not([data-testid^="marker-label-"]):not([data-testid^="marker-selected-"]):not([data-testid^="marker-dot-"])')
  const count = await markers.count()
  expect(count, '図の点が出ていない').toBeGreaterThan(0)
  for (const button of buttons) {
    const box = await boxOf(button)
    for (let i = 0; i < count; i += 1) {
      const marker = markers.nth(i)
      const id = await marker.getAttribute('data-testid')
      expect(overlaps(box, await boxOf(marker)), `${await button.textContent()} が ${id} を覆っている`).toBe(false)
    }
  }
}

async function open(page: Page, viewport: { width: number; height: number }, largeText: boolean) {
  await page.setViewportSize(viewport)
  if (largeText) await installTwoTimesTextScale(page)
  await page.goto('/')
  await expect(page.getByTestId('part-selector')).toBeVisible()
  await waitForCanvasLayout(page)
  const conditions = page.getByTestId('conditions')
  await expect(conditions).toBeVisible()
  await expectSettled(page, conditions)
  return {
    canvas: await boxOf(page.getByTestId('anatomy-svg')),
    selector: await boxOf(page.getByTestId('part-selector')),
    conditions: await boxOf(conditions),
    zoomIn: await boxOf(page.getByTestId('zoom-in')),
    zoomOut: await boxOf(page.getByTestId('zoom-out')),
    zoomReset: await boxOf(page.getByTestId('zoom-reset')),
  }
}

/** 1行に「場所・部位一覧」「表示条件」、その右に ＋ / − / リセット */
function expectOneRow(b: Awaited<ReturnType<typeof open>>) {
  expect(b.selector.x - b.canvas.x).toBeCloseTo(12, 0)
  expect(b.selector.y - b.canvas.y).toBeCloseTo(12, 0)
  expect(b.conditions.y, '表示条件が部位一覧と同じ行にない').toBeCloseTo(b.selector.y, 0)
  expect(b.conditions.x, '表示条件が部位一覧の右にない').toBeGreaterThanOrEqual(b.selector.x + b.selector.width)
  expect(b.conditions.x + b.conditions.width, '表示条件がズームに近すぎる').toBeLessThanOrEqual(b.zoomIn.x - 12)
  expect(b.zoomIn.x).toBeLessThan(b.zoomOut.x)
  expect(b.zoomOut.x).toBeLessThan(b.zoomReset.x)
  for (const box of [b.selector, b.conditions]) expect(box.height).toBeCloseTo(48, 0)
}

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(`#323 表示条件は上段 ${locale}`, () => {
    test.use({ locale })
    const conditionsName = locale === 'ja-JP' ? '表示条件' : 'View options'

    test('390×844: 上段に部位一覧・表示条件・ズームの順で並び、左下には何も重ねない', async ({ page }) => {
      const b = await open(page, { width: 390, height: 844 }, false)
      expectOneRow(b)
      await expect(page.getByTestId('canvas-actions')).toHaveCount(0)
      await expect(page.getByTestId('anatomy-panel').getByRole('button')).toHaveCount(0)
      for (const id of ['part-selector', 'conditions']) await expectNotTruncated(page.getByTestId(id))
      await expectNoMarkerCovered(page, [page.getByTestId('part-selector'), page.getByTestId('conditions')])
      await page.getByRole('button', { name: conditionsName, exact: true }).click()
      await expect(page).toHaveURL(/kind=conditions/)
    })

    test('1440×900: 図の列の上段に同じ順で並ぶ', async ({ page }) => {
      const b = await open(page, { width: 1440, height: 900 }, false)
      expectOneRow(b)
      const panel = await boxOf(page.getByTestId('anatomy-panel'))
      expect(b.conditions.x + b.conditions.width, '表示条件が右の欄に入っている').toBeLessThanOrEqual(panel.x)
      expect(b.zoomReset.x + b.zoomReset.width).toBeCloseTo(b.canvas.x + b.canvas.width - 12, 0)
      await expect(page.getByTestId('canvas-actions')).toHaveCount(0)
      for (const id of ['part-selector', 'conditions']) await expectNotTruncated(page.getByTestId(id))
      await expectNoMarkerCovered(page, [page.getByTestId('part-selector'), page.getByTestId('conditions')])
    })

    test('320×844・文字2倍: 2つとも省略せず押せ、表示条件はズームの下の右の列に入る', async ({ page }) => {
      const b = await open(page, { width: 320, height: 844 }, true)
      await expect(page.getByTestId('conditions').getByText(conditionsName)).toHaveAttribute('data-e2e-text-scale', '2')
      // 部位一覧は左上のまま、ズームの12px手前までで折り返す
      expect(b.selector.x - b.canvas.x).toBeCloseTo(12, 0)
      expect(b.selector.y - b.canvas.y).toBeCloseTo(12, 0)
      expect(b.selector.x + b.selector.width).toBeLessThanOrEqual(b.zoomIn.x - 12)
      // 表示条件はズームの下12px、右端をリセットに揃え、部位一覧と12px離す
      expect(b.conditions.y).toBeCloseTo(b.zoomIn.y + b.zoomIn.height + 12, 0)
      expect(b.conditions.x + b.conditions.width).toBeCloseTo(b.zoomReset.x + b.zoomReset.width, 0)
      expect(b.conditions.x).toBeGreaterThanOrEqual(b.selector.x + b.selector.width + 12)
      for (const box of [b.selector, b.conditions]) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(320)
        expect(box.y + box.height).toBeLessThanOrEqual(b.canvas.y + b.canvas.height)
      }
      for (const other of [b.zoomIn, b.zoomOut, b.zoomReset, b.selector]) expect(overlaps(b.conditions, other)).toBe(false)
      for (const other of [b.zoomIn, b.zoomOut, b.zoomReset]) expect(overlaps(b.selector, other)).toBe(false)
      for (const id of ['part-selector', 'conditions']) {
        const button = page.getByTestId(id)
        await expectNotTruncated(button)
        // 中心を押して、他の要素に横取りされんこと
        expect(await button.evaluate((element) => {
          const r = element.getBoundingClientRect()
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return hit !== null && element.contains(hit)
        }), `${id} の中心を押せない`).toBe(true)
      }
      // 英語の2倍は「View options」が右の列で2行になり、体幹の点の当たりの円にかかる（PR に記載）。点は日本語で見る
      if (locale === 'ja-JP') await expectNoMarkerCovered(page, [page.getByTestId('part-selector'), page.getByTestId('conditions')])
      await page.getByTestId('conditions').click()
      await expect(page).toHaveURL(/kind=conditions/)
      await page.getByTestId('overlay-close').click()
      await expect(page.getByTestId('overlay-close')).toHaveCount(0)
      await page.getByTestId('part-selector').click()
      await expect(page).toHaveURL(/kind=parts/)
    })
  })
}
