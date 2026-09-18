import { test, expect, type Page } from '@playwright/test'
const settle = (p: Page, ms = 1400) => p.waitForTimeout(ms)
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`
const partPath = (id: string) => `path[data-testid="part-${id}"]`
async function pickArea(page: Page, id: string) {
  await page.locator(markerDot(id)).waitFor()
  const b = (await page.locator(markerDot(id)).boundingBox())!
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page, 900)
}
async function changeAnatomyCondition(page: Page, name: string) {
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  await page.getByRole('radio', { name, exact: true }).click()
  await page.getByRole('button', { name: 'この条件で表示' }).click()
  await expect(page.getByRole('button', { name: '表示条件', exact: true })).toBeVisible()
}

// views で向きを限定した臓器が、図にも一覧にも反対側へ出ないことを見る。
// 脾臓・胃は左だけ、肝臓・盲腸は右だけ。反転表示で嘘を描かせないための仕様。
test('側性のある臓器は存在する側にだけ出る', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)

  // 左側望・内臓: 肝臓は出ない、脾臓・胃は出る
  await changeAnatomyCondition(page, '内臓')
  await settle(page)
  await pickArea(page, 'trunk')
  await expect(page.locator(partPath('organ-liver'))).toHaveCount(0)
  await expect(page.locator(partPath('organ-spleen'))).toBeVisible()
  await expect(page.locator(partPath('organ-stomach'))).toBeVisible()
  await page.screenshot({ path: 'shots/v1-左側望-内臓.png' })

  // 右側望・内臓: 脾臓・胃は出ない、肝臓は反転表示で出る
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await changeAnatomyCondition(page, '右側望')
  await settle(page)
  await pickArea(page, 'trunk')
  await expect(page.locator(partPath('organ-spleen'))).toHaveCount(0)
  await expect(page.locator(partPath('organ-stomach'))).toHaveCount(0)
  await expect(page.locator(partPath('organ-liver'))).toBeVisible()
  await page.screenshot({ path: 'shots/v2-右側望-内臓.png' })
})

// 蹄は左（Fable修正済み・draft）・正面（measured）・右（左の反転）の3経路で出る。
// どれも馬体の蹄に乗っていることを実写で見る。
test('蹄の点は全ての向きで蹄の上に出る', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)

  // 左側望・皮膚: 修正済みの蹄ポリゴン（既定は筋肉層なので皮膚へ切替）
  await changeAnatomyCondition(page, '皮膚')
  await settle(page)
  await pickArea(page, 'fore')
  await expect(page.locator(partPath('skin-hoof'))).toBeVisible()
  await page.screenshot({ path: 'shots/h1-左側望-蹄.png' })

  // 右側望・皮膚: 左計測図形の反転表示
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await changeAnatomyCondition(page, '右側望')
  await settle(page)
  await pickArea(page, 'fore')
  await expect(page.locator(partPath('skin-hoof'))).toBeVisible()
  await page.screenshot({ path: 'shots/h2-右側望-蹄.png' })

  // 正面・皮膚: measured 座標が前肢の蹄に乗ること
  await page.getByRole('button', { name: '全体に戻る' }).click()
  await changeAnatomyCondition(page, '正面')
  await settle(page)
  await pickArea(page, 'fore')
  await expect(page.locator(partPath('skin-hoof'))).toBeVisible()
  await page.screenshot({ path: 'shots/h3-正面-蹄.png' })
})
