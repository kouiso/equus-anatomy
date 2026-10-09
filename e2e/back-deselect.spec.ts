import { expect, test, type Page } from '@playwright/test'

/**
 * issue #82 — 「戻る」「選択解除」まわりの直感性。
 * 端末 BACK で選択を1段ずつ解除するのは Android の BackHandler だけで、Web のブラウザ戻るは
 * 従来どおり履歴(tab-history.spec.ts)の意味のまま。ここでは Web で見える部分を確かめる:
 * 解除手段が見えること、空白タップで解除できること、フッターの並び。
 */
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`
const sheetHeading = (page: Page) => page.getByRole('heading', { level: 2 })

async function clickCenter(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function pickAreaThenPart(page: Page) {
  await page.goto('/')
  await page.locator(markerDot('fore')).waitFor()
  await clickCenter(page, markerDot('fore'))
  // 場所→部位切替直後のタップは pick-guard で捨てられる(#67)
  await page.waitForTimeout(700)
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(sheetHeading(page)).toHaveText('上腕三頭筋')
}

test.describe('選択解除の発見性', () => {
  test('選択中は部位名の横に × 付きの解除ボタンと、空白タップでも解除できる旨が出る', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await pickAreaThenPart(page)

    const deselect = page.getByRole('button', { name: '選択を解除', exact: true })
    await expect(deselect).toBeVisible()
    await expect(deselect.locator('svg')).toHaveCount(1)
    const box = await deselect.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await expect(page.getByTestId('deselect-hint')).toHaveText('図の空白をタップしても解除できます')

    // 部位だけ解除し、場所は残す(場所の解除は「場所を選び直す」)
    await deselect.click()
    await expect(sheetHeading(page)).toHaveCount(0)
    await expect(page.getByTestId('deselect-hint')).toHaveCount(0)
    const reselectArea = page.getByRole('button', { name: '大まかな場所を選び直す' })
    await expect(reselectArea).toBeVisible()
    await expect(reselectArea.locator('svg')).toHaveCount(1)

    await reselectArea.click()
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
  })

  test('図の空白をタップすると部位の選択が解除される', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await pickAreaThenPart(page)
    // 前肢に寄った図の左上隅は背景。前肢以外の部位は当たり判定から外れとる
    const svg = await page.getByTestId('anatomy-svg').boundingBox()
    await page.mouse.click(svg!.x + 12, svg!.y + 12)
    await expect(sheetHeading(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: '大まかな場所を選び直す' })).toBeVisible()
  })

  test('場所だけ選んだ状態でも図の空白タップで全体図へ戻る', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator(markerDot('fore')).waitFor()
    await clickCenter(page, markerDot('fore'))
    await expect(page.getByRole('button', { name: '大まかな場所を選び直す' })).toBeVisible()
    // 場所→部位切替直後のタップは pick-guard で捨てられる(#67)
    await page.waitForTimeout(700)
    const svg = await page.getByTestId('anatomy-svg').boundingBox()
    await page.mouse.click(svg!.x + 12, svg!.y + 12)
    await expect(page.getByRole('button', { name: '大まかな場所を選び直す' })).toHaveCount(0)
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
  })

  test('Web のブラウザ戻るは選択解除に横取りせず、入口の画面へ戻る', async ({ page }) => {
    await page.goto('/catalog')
    await page.getByTestId('catalog-search').fill('肝')
    await page.getByTestId('map-organ-liver').click()
    await expect(sheetHeading(page)).toHaveText('肝臓')
    await page.goBack()
    await expect(page).toHaveURL(/\/catalog$/)
  })
})

test('フッターは 解剖 | 図鑑 | 保存 の順で、解剖が左端', async ({ page }) => {
  await page.goto('/')
  // Link asChild 越しなので role は link に落ちる。testID で並びを拾う
  const tabs = page.getByTestId('bottom-nav').locator('[data-testid^="tab-"]')
  await expect(tabs).toHaveText(['解剖', '図鑑', '保存'])
  const ids = await tabs.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')))
  expect(ids).toEqual(['tab-index', 'tab-catalog', 'tab-saved'])
  const [first, second] = await Promise.all([tabs.nth(0).boundingBox(), tabs.nth(1).boundingBox()])
  expect(first!.x).toBeLessThan(second!.x)
  await expect(tabs.nth(0)).toHaveAttribute('aria-current', 'page')
})
