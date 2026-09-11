import { expect, test, type Page } from '@playwright/test'

/**
 * react-native-svg 版キャンバスのスパイク検証。
 * react-native-web の createElement は testID を data-testid に落とす（dist の DOM で確認済み）。
 * 当たり判定は core（screenToImage → hitTestMarkers/hitTestParts）が全部やるので、
 * ここでは「押した点の部位が選ばれる」「ズームしても点の大きさが変わらん」だけを見る。
 */
const marker = (id: string) => `[data-testid="marker-dot-${id}"]`

async function centerOf(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width, h: box.height }
}

async function open(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto('/')
  await page.locator('[data-testid="anatomy-svg"]').waitFor()
  await page.locator(marker('muscle-brachiocephalicus')).waitFor()
}

for (const vp of [
  { w: 390, h: 844 },
  { w: 1280, h: 800 },
]) {
  test(`${vp.w}x${vp.h}: 点を押したらその部位が選ばれ、別の点で切り替わる`, async ({ page }) => {
    await open(page, vp.w, vp.h)
    await expect(page.getByTestId('selected-name')).toHaveText('—')

    const a = await centerOf(page, marker('muscle-brachiocephalicus'))
    await page.mouse.click(a.x, a.y)
    await expect(page.getByTestId('selected-name')).toHaveText('腕頭筋')

    // 別の部位に切り替わること。古いレンダーの結果を見とるだけやと通らん
    const b = await centerOf(page, marker('muscle-gluteus'))
    await page.mouse.click(b.x, b.y)
    await expect(page.getByTestId('selected-name')).toHaveText('中臀筋')
  })
}

test('＋で2段寄っても点の見た目の大きさは変わらん（逆スケール）', async ({ page }) => {
  await open(page, 390, 844)
  const before = await centerOf(page, marker('muscle-brachiocephalicus'))
  await page.getByTestId('zoom-in').click()
  await page.getByTestId('zoom-in').click()
  // viewBox 更新は state 経由なので1フレーム待つ
  await page.waitForTimeout(200)
  const after = await centerOf(page, marker('muscle-brachiocephalicus'))
  expect(Math.abs(after.w - before.w)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.h - before.h)).toBeLessThanOrEqual(1)
  // 寄っとる証拠: 画面上の位置が動いとる（中心固定ズームなので端の点ほど外へ出る）
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(5)
})

test('馬の外（背景の隅）を押したら選択が消える', async ({ page }) => {
  await open(page, 1280, 800)
  const a = await centerOf(page, marker('muscle-brachiocephalicus'))
  await page.mouse.click(a.x, a.y)
  await expect(page.getByTestId('selected-name')).toHaveText('腕頭筋')

  const svg = await page.locator('[data-testid="anatomy-svg"]').boundingBox()
  if (!svg) throw new Error('svg が無い')
  // 1280x800 やと横に余白が出る（xMidYMid meet）。左上の隅は画像の外
  await page.mouse.click(svg.x + 4, svg.y + 4)
  await expect(page.getByTestId('selected-name')).toHaveText('—')
})
