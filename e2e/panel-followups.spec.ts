import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * デザイン b159 の後追い 3 件（解剖画面の説明欄）。
 *  1. 場所を選んだら、説明欄に場所の名前を出す（A-2「前肢 — 部位を選んでください」）
 *  2. 場所を選んだ時、向きのチップが「1つ戻る」の帯で切れない
 *  3. 部位を選んだ後、今の向き・層（状態の1行）がスクロールせずに見える
 */
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

async function clickCenter(page: Page, selector: string) {
  await waitForCanvasLayout(page)
  const box = await boxOf(page.locator(selector).first())
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function pickArea(page: Page) {
  await page.goto('/')
  await page.locator(markerDot('fore')).waitFor()
  await clickCenter(page, markerDot('fore'))
  // 場所→部位切替直後のタップは pick-guard で捨てられる(#67)
  await page.waitForTimeout(700)
  await page.locator(markerDot('muscle-triceps')).waitFor()
}

async function pickPart(page: Page) {
  await pickArea(page)
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('上腕三頭筋')
  await waitForCanvasLayout(page)
}

test.describe('場所を選んだ説明欄 (b159 A-2)', () => {
  test('390×844: 説明欄に場所の名前を出し、向きのチップは「1つ戻る」の帯で切れない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await pickArea(page)
    const panel = page.getByTestId('anatomy-panel')
    await expect(panel.getByText('前肢 — 部位を選んでください', { exact: true })).toBeVisible()
    await expect(panel.getByText('点・ラベル・部位一覧から選べます')).toHaveCount(0)

    const stepBack = await boxOf(page.getByTestId('step-back'))
    for (const id of ['left', 'right', 'front', 'rear']) {
      const chip = page.getByTestId('anatomy-panel').getByTestId(`chip-${id}`)
      await expect(chip, id).toBeVisible()
      const b = await boxOf(chip)
      expect(b.y + b.height, `向きのチップ ${id} が「1つ戻る」の帯に食い込む`).toBeLessThanOrEqual(stepBack.y)
    }
  })

  test.describe('英語の端末', () => {
    test.use({ locale: 'en-US' })
    test('場所の名前が英語で出る', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await pickArea(page)
      await expect(page.getByTestId('anatomy-panel').getByText('Forelimb — choose a part', { exact: true })).toBeVisible()
    })
  })
})

async function expectStatusReadable(page: Page, viewport: { width: number; height: number }) {
  const panel = await boxOf(page.getByTestId('anatomy-panel'))
  const stepBack = await boxOf(page.getByTestId('step-back'))
  const status = page.getByText('左側望 · 筋肉 · 表層筋', { exact: true })
  await expect(status).toBeVisible()
  const s = await boxOf(status)
  expect(s.y, '状態の行が説明欄の上へはみ出す').toBeGreaterThanOrEqual(panel.y)
  expect(s.y + s.height, '状態の行が操作の列に隠れる（スクロールしないと読めない）').toBeLessThanOrEqual(stepBack.y)
  expect(s.y + s.height, '状態の行が画面の下へはみ出す').toBeLessThanOrEqual(viewport.height)
  expect(s.x + s.width, '状態の行が右へはみ出す').toBeLessThanOrEqual(viewport.width)
  for (const id of ['step-back', 'close-sheet', 'opposite-side']) {
    const b = await boxOf(page.getByTestId(id))
    expect(b.height, `${id} が 44px 未満`).toBeGreaterThanOrEqual(44)
    expect(b.x, `${id} が左へはみ出す`).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width, `${id} が右へはみ出す`).toBeLessThanOrEqual(viewport.width)
  }
}

test.describe('部位を選んだ後の状態の1行 (b159 列3)', () => {
  test('390×844: 向き・層の行が、スクロールせずに見える', async ({ page }) => {
    const viewport = { width: 390, height: 844 }
    await page.setViewportSize(viewport)
    await pickPart(page)
    await expectStatusReadable(page, viewport)
  })

  test('320×760・文字 200%: 状態の行が見え、ボタンは 44px 以上で何も切れない', async ({ page }) => {
    const viewport = { width: 320, height: 760 }
    await installTwoTimesTextScale(page)
    await page.setViewportSize(viewport)
    await pickPart(page)
    await expect(page.getByText('左側望 · 筋肉 · 表層筋', { exact: true })).toHaveAttribute('data-e2e-text-scale', '2')
    await expectStatusReadable(page, viewport)
  })
})
