import { expect, test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'

/**
 * #173 — 下書き（source: draft）の部位を実測の部位と見分けられるようにする。
 * 誘導線と点の輪は補助色の破線、札は「下書き」、説明欄には
 * 「実線 = 測定済み・破線 = 下書き（未測定）」の凡例が出る（b173 列4）。
 *
 * 実データで見る。下書きは左側望・筋肉・前肢の上腕三頭筋、
 * 実測は左側望・皮膚・頸部（regions/left.json の source を根拠に選んどる）。
 */
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`
const markerLabel = (id: string) => `[data-testid="marker-label-${id}"]`
const legend = (page: Page) => page.getByTestId('draft-legend')

async function clickCenter(page: Page, selector: string) {
  await waitForCanvasLayout(page)
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function pickArea(page: Page, id: string) {
  await page.locator(markerDot(id)).waitFor()
  await clickCenter(page, markerDot(id))
  // 場所→部位切替直後のタップは pick-guard で捨てられる(#67)
  await page.waitForTimeout(700)
}

test.describe('下書きのガイド線（#173）', () => {
  test('場所の段では凡例は出ず、破線の部位がある部位の段では凡例が出る', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(legend(page)).toHaveCount(0)
    await pickArea(page, 'fore')
    await expect(legend(page)).toContainText('測定済み')
    await expect(legend(page)).toContainText('下書き（未測定）')
  })

  test('下書きの部位は破線の点・誘導線と「下書き」の札。選ぶと札は名前に替わる', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'fore')
    // 選んでいない下書きの札は「下書き」。札は寄ると全部出る（showLabel の zoomed>=2）
    await page.getByTestId('zoom-in').click()
    await page.getByTestId('zoom-in').click()
    const label = page.locator(markerLabel('muscle-triceps'))
    await expect(label).toContainText('下書き')
    // 誘導線は破線（stroke-dasharray が付いた線がある。高さ 0 の線は visible と見なされんので数で見る）
    await expect(label.locator('line[stroke-dasharray]')).toHaveCount(1)
    // 点の輪も破線
    await expect(page.getByTestId('marker-draft-muscle-triceps')).toBeVisible()

    // 選ぶと札は名前に替わる。誘導線・点の輪は破線のまま（多角形と同じく、選択中も下書きと分かる）
    await clickCenter(page, markerDot('muscle-triceps'))
    await expect(label).toContainText('上腕三頭筋')
    await expect(label.locator('line[stroke-dasharray]')).toHaveCount(1)
    await expect(page.getByTestId('marker-draft-muscle-triceps')).toBeVisible()
  })

  test('実測の部位は実線と名前の札のまま', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    // 頸（皮膚）は source: measured。直URLで選ぶ
    await page.goto('/?part=skin-neck')
    const label = page.locator(markerLabel('skin-neck'))
    await expect(label).toContainText('頸')
    await expect(label.locator('line[stroke-dasharray]')).toHaveCount(0)
    await expect(page.getByTestId('marker-draft-skin-neck')).toHaveCount(0)
  })
})
