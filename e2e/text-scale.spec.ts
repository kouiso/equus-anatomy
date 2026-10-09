import { expect, test, type Locator, type Page } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

test.use({ viewport: { width: 320, height: 568 } })

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** 縦に1文字ずつ割れとらんか。行の高さ1.5行ぶん未満なら1行に収まっとる */
async function expectSingleLine(locator: Locator) {
  const { height, lineHeight } = await locator.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }))
  expect(height, `「${await locator.textContent()}」が折り返しとる`).toBeLessThan(lineHeight * 1.5)
}

/** パネルの押せるボタンが全部パネルの中・画面の中にあり、互いに重なっとらん */
async function expectPanelButtonsTappable(page: Page, viewport: { width: number; height: number }) {
  const panel = await boxOf(page.getByTestId('anatomy-panel'))
  const buttons = page.getByTestId('anatomy-panel').getByRole('button')
  const boxes: Box[] = []
  for (const button of await buttons.all()) {
    await expect(button).toBeVisible()
    const box = await boxOf(button)
    const name = await button.textContent()
    expect(box.height, `${name} が低すぎる`).toBeGreaterThanOrEqual(44)
    expect(box.x, `${name} が左へはみ出とる`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${name} が右へはみ出とる`).toBeLessThanOrEqual(viewport.width)
    expect(box.y, `${name} がパネルの上へはみ出とる`).toBeGreaterThanOrEqual(panel.y)
    expect(box.y + box.height, `${name} がパネルの下で切れとる`).toBeLessThanOrEqual(panel.y + panel.height + 0.5)
    for (const other of boxes) expect(overlaps(box, other), `${name} が他のボタンと重なっとる`).toBe(false)
    boxes.push(box)
  }
  return boxes.length
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`本文文字2倍の${viewport.width}×${viewport.height}で「1つ戻る」がボタン列に埋もれず押せる`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await installTwoTimesTextScale(page)
    await page.goto('/')
    const dot = page.getByTestId('marker-dot-fore')
    await dot.waitFor()
    const box = await boxOf(dot)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

    const stepBack = page.getByTestId('step-back')
    await expect(stepBack).toBeVisible()
    await expect(stepBack.getByText('1つ戻る')).toHaveAttribute('data-e2e-text-scale', '2')
    // パネル内は部位一覧・表示条件の2つ（1つ戻るは図の上に浮いてるので別枠で見る）
    expect(await expectPanelButtonsTappable(page, viewport)).toBe(2)
    // 図の左上に浮くチップが画面内・44px・ズーム系ボタンと重ならんこと
    const r = await boxOf(stepBack)
    expect(r.height, '1つ戻る が低すぎる').toBeGreaterThanOrEqual(44)
    expect(r.x, '1つ戻る が左へはみ出とる').toBeGreaterThanOrEqual(0)
    expect(r.y, '1つ戻る が上へはみ出とる').toBeGreaterThanOrEqual(0)
    expect(r.x + r.width, '1つ戻る が右へはみ出とる').toBeLessThanOrEqual(viewport.width)
    expect(overlaps(r, await boxOf(page.getByTestId('zoom-in'))), '1つ戻る がズームボタンと重なっとる').toBe(false)
    // 中心を叩いて他の要素に横取りされんこと（重なって隠れとったら別物に当たる）
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
    await expect(stepBack).toHaveCount(0)
    await expect(page.getByTestId('marker-dot-fore')).toBeVisible()

    await page.goto('/?part=muscle-brachiocephalicus')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
    // 詳しく読む・部位一覧・表示条件と、見出し横の選択を解除（1つ戻るは図の上）
    expect(await expectPanelButtonsTappable(page, viewport)).toBe(4)
    await expect(page.getByTestId('step-back')).toBeVisible()
    // 文字を大きくしても図が見えんほどパネルが伸びたらあかん
    const svg = await boxOf(page.getByTestId('anatomy-svg'))
    const panel = await boxOf(page.getByTestId('anatomy-panel'))
    expect(panel.height / (svg.height + panel.height)).toBeLessThanOrEqual(0.61)
  })
}

test('本文文字2倍で図鑑の絞り込み見出しと層バッジが縦に割れない', async ({ page }) => {
  await installTwoTimesTextScale(page)
  await page.goto('/catalog')
  for (const title of ['層', '場所', '向き']) {
    const heading = page.getByTestId('catalog-controls').getByText(title, { exact: true })
    await expect(heading).toHaveAttribute('data-e2e-text-scale', '2')
    await expectSingleLine(heading)
  }
  const badge = page.getByTestId('catalog-row-skin-head').getByText('皮膚', { exact: true })
  await expect(badge).toHaveAttribute('data-e2e-text-scale', '2')
  await expectSingleLine(badge)
})

test('本文文字2倍でも表示条件の選択肢が画面内に全部並ぶ', async ({ page }) => {
  await installTwoTimesTextScale(page)
  await page.goto('/')
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  for (const name of ['左側望', '右側望', '正面', '後面', '皮膚', '筋肉', '骨格', '内臓']) {
    const chip = page.getByRole('radio', { name, exact: true })
    await expect(chip).toBeVisible()
    const box = await boxOf(chip)
    expect(box.x, `${name} が左で切れとる`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${name} が右で切れとる`).toBeLessThanOrEqual(320)
  }
})


test('本文文字を2倍にした320×568でも主要操作をスクロールして完了できる', async ({ page }) => {
  await installTwoTimesTextScale(page)

  await page.goto('/catalog')
  const count = page.getByTestId('catalog-count')
  await expect(count).toHaveAttribute('data-e2e-text-scale', '2')
  expect(await count.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28)
  const search = page.getByTestId('catalog-search')
  await search.fill('中殿筋')
  await expect(page.getByTestId('catalog-count')).toContainText('1 部位')
  await page.getByTestId('catalog-search-clear').click()
  await expect(search).toHaveValue('')
  await expect(page.getByTestId('catalog-count')).toContainText('52 部位')
  const muscle = page.getByRole('radio', { name: '筋肉', exact: true })
  await muscle.click()
  await expect(muscle).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('catalog-row-muscle-gluteus').click()
  await expect(page.getByTestId('detail-name-ja')).toHaveText('中殿筋')
  await page.getByTestId('catalog-back').click()
  await expect(page.getByTestId('catalog-row-muscle-gluteus')).toBeVisible()
  await expect(page.getByRole('radio', { name: '筋肉', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('catalog-filter-reset').click()
  await expect(page.getByTestId('catalog-count')).toContainText('52 部位')

  await page.goto('/?part=muscle-brachiocephalicus')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
  await page.getByRole('button', { name: '詳しく読む', exact: true }).click()
  await expect(page.getByTestId('part-sheet')).toContainText('腕頭筋')
  await page.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(page.getByTestId('anatomy-svg')).toBeVisible()
})
