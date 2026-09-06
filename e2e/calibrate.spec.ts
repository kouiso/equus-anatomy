import { expect, test, type Page } from '@playwright/test'

/**
 * 測る → 出す → 本番の絵に出る、の往復。
 * ここが繋がってへんかったら「測る道具」として意味がない。
 */
const IMAGE = { w: 1600, h: 1200 }

async function imageRect(page: Page, testId: string) {
  const box = await page.locator(`[data-testid="${testId}"] image`).first().boundingBox()
  if (!box) throw new Error('画像の矩形が取れん')
  return box
}

test('キャリブレーションで置いた座標が、そのまま解剖画面に出る', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/calibrate', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="calibrate-svg"] image').waitFor()
  await page.waitForTimeout(800)

  // 広背筋（胴の中ほど＝確実に馬体の上）を四角でなぞる
  await page.getByLabel('なぞる対象').selectOption('muscle-latissimus')
  const img = await imageRect(page, 'calibrate-svg')
  const toScreen = (x: number, y: number) => ({
    x: img.x + (x / IMAGE.w) * img.width,
    y: img.y + (y / IMAGE.h) * img.height,
  })
  const corners: [number, number][] = [
    [780, 460],
    [900, 460],
    [900, 560],
    [780, 560],
  ]
  for (const [x, y] of corners) {
    const p = toScreen(x, y)
    await page.mouse.click(p.x, p.y)
  }
  await expect(page.getByRole('button', { name: /確定（4点）/ })).toBeEnabled()
  await page.getByRole('button', { name: /確定（4点）/ }).click()
  await expect(page.getByText('この向きで確定済み 1 件', { exact: false })).toBeVisible()

  // 解剖画面へ。下書きが重なって、置いた位置に出とるはず
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const path = page.locator('[data-part="muscle-latissimus"]')
  await path.waitFor()
  const anatomyImg = await imageRect(page, 'anatomy-svg')
  const box = (await path.boundingBox())!

  const cx = (box.x + box.width / 2 - anatomyImg.x) / anatomyImg.width
  const cy = (box.y + box.height / 2 - anatomyImg.y) / anatomyImg.height
  // 置いた四角の中心 (840,510)
  expect(cx).toBeCloseTo(840 / IMAGE.w, 2)
  expect(cy).toBeCloseTo(510 / IMAGE.h, 2)

  // タップしたら広背筋の解説が出る
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('広背筋')
})

test('右側望では左側望の座標が左右反転して出る', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'equus.calibrate.draft.v1',
      JSON.stringify({
        left: [
          {
            kind: 'part',
            id: 'muscle-latissimus',
            points: [
              [780, 460],
              [900, 460],
              [900, 560],
              [780, 560],
            ],
          },
        ],
      }),
    )
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const relOf = async () => {
    const img = await imageRect(page, 'anatomy-svg')
    const box = (await page.locator('[data-part="muscle-latissimus"]').boundingBox())!
    return (box.x + box.width / 2 - img.x) / img.width
  }
  await page.locator('[data-part="muscle-latissimus"]').waitFor()
  const leftRel = await relOf()
  await page.getByRole('radio', { name: '右側望' }).click()
  await page.waitForTimeout(500)
  const rightRel = await relOf()

  expect(leftRel).toBeCloseTo(840 / IMAGE.w, 2)
  expect(rightRel).toBeCloseTo(1 - 840 / IMAGE.w, 2)
})
