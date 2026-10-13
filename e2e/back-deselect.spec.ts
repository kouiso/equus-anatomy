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
  await page.locator(markerDot('muscle-triceps')).waitFor()
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(sheetHeading(page)).toHaveText('上腕三頭筋')
}

// 「空白タップ」用の点。elementFromPoint で図上の部品(チップ・マーカー・ボタン)
// ではなく本当に背景であることを確認してから返す。図左上は「1つ戻る」チップが
// 浮いていて空白に見せかけたボタン押下になるので候補から外す
async function emptyPoint(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('anatomy-svg').boundingBox()
  if (!box) throw new Error('anatomy-svg が見つからない')
  const fractions: [number, number][] = [
    [0.5, 0.95],
    [0.08, 0.9],
    [0.92, 0.9],
    [0.5, 0.02],
    [0.95, 0.5],
    [0.05, 0.5],
  ]
  for (const [fx, fy] of fractions) {
    const x = box.x + box.width * fx
    const y = box.y + box.height * fy
    const testid = await page.evaluate(
      (p) => document.elementFromPoint(p.x, p.y)?.getAttribute('data-testid') ?? null,
      { x, y },
    )
    if (testid === 'anatomy-svg' || testid === null) return { x, y }
  }
  throw new Error('背景(馬体・ボタンの無い点)が見つからない')
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

    // 部位だけ解除し、場所は残す(場所の解除は「1つ戻る」チップ)
    await deselect.click()
    await expect(sheetHeading(page)).toHaveCount(0)
    await expect(page.getByTestId('deselect-hint')).toHaveCount(0)
    const stepBack = page.getByTestId('step-back')
    await expect(stepBack).toBeVisible()
    await expect(stepBack.locator('svg')).toHaveCount(1)
    // Label in Name: アクセシブル名は可視ラベル「1つ戻る」で始まる
    await expect(page.getByRole('button', { name: /^1つ戻る/ })).toBeVisible()

    await stepBack.click()
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
  })

  test('図の空白をタップすると部位の選択が解除される', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await pickAreaThenPart(page)
    // elementFromPoint で背景と確かめた点だけを押す(チップの陰で誤爆しない)
    const p = await emptyPoint(page)
    await page.mouse.click(p.x, p.y)
    await expect(sheetHeading(page)).toHaveCount(0)
    await expect(page.getByTestId('step-back')).toBeVisible()
  })

  test('場所だけ選んだ状態でも図の空白タップで全体図へ戻る', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator(markerDot('fore')).waitFor()
    await clickCenter(page, markerDot('fore'))
    await expect(page.getByTestId('step-back')).toBeVisible()
    // 場所→部位切替直後のタップは pick-guard で捨てられる(#67)
    await page.waitForTimeout(700)
    // elementFromPoint で背景と確かめた点だけを押す(チップの陰で誤爆しない)
    const p = await emptyPoint(page)
    await page.mouse.click(p.x, p.y)
    await expect(page.getByTestId('step-back')).toHaveCount(0)
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
  })

  test('pick-guard 中でも「1つ戻る」は効き、図のタップだけが捨てられる', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator(markerDot('fore')).waitFor()
    await clickCenter(page, markerDot('fore'))
    const stepBack = page.getByTestId('step-back')
    // guard(400ms)を待たずに押す: 迷いタップ猶予は図のタップにだけ掛かり、
    // 明示的なボタン押下は猶予中でも即座に効く
    await stepBack.click()
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
    // 逆に guard 中の図タップは捨てられる: 場所を選び直し直後に部位を押しても選ばれない
    await clickCenter(page, markerDot('fore'))
    await clickCenter(page, markerDot('muscle-triceps'))
    await expect(sheetHeading(page)).toHaveCount(0)
  })

  test('「1つ戻る」チップが部位→場所→寄りの順に1段ずつ戻り、全体図では出ない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator(markerDot('fore')).waitFor()
    const stepBack = page.getByTestId('step-back')
    // 全体図(何も選んでない)では出ない → 過剰に戻る操作は物理的に存在しない
    await expect(stepBack).toHaveCount(0)

    // 場所だけ → 1回で全体図
    await clickCenter(page, markerDot('fore'))
    await expect(stepBack).toBeVisible()
    await stepBack.click()
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
    await expect(stepBack).toHaveCount(0)

    // 部位 → 1回目は場所の図に留まる(別の場所・部位に取り違えない) → 2回目で全体図
    await pickAreaThenPart(page)
    await expect(stepBack).toBeVisible()
    await stepBack.click()
    await expect(sheetHeading(page)).toHaveCount(0)
    await expect(stepBack).toBeVisible()
    await stepBack.click()
    await expect(page.getByText('大まかな場所を選んでください')).toBeVisible()
    await expect(stepBack).toHaveCount(0)

    // 寄りだけ → 1回で全体図
    await page.getByTestId('zoom-in').click()
    await expect(stepBack).toBeVisible()
    await stepBack.click()
    await expect(stepBack).toHaveCount(0)

    // 部位を選んだ状態からの明示ボタン押下は迷いタップ判定を通らず効く
    // (guard 中の押下は別テストで検証)
    await pickAreaThenPart(page)
    await stepBack.click()
    await expect(sheetHeading(page)).toHaveCount(0)
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
