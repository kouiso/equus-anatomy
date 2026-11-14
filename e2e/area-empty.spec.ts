import { expect, test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'

/**
 * 今の向き・層に部位が無い場所は、点も場所一覧も押せない状態で出す（深層筋（図なし）チップと同じ規則）。
 * 後面・内臓の「尾」は部位が0件、「体幹」は腎臓（#215）を持つ。
 */
const chip = (page: Page, id: string) => page.getByTestId(`chip-${id}`)
const viewBoxOf = (page: Page) => page.getByTestId('anatomy-svg').getAttribute('viewBox')

async function clickCenter(page: Page, testId: string) {
  await waitForCanvasLayout(page)
  const box = await page.getByTestId(testId).first().boundingBox()
  if (!box) throw new Error(`${testId} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function openRearOrgans(page: Page) {
  await page.goto('/')
  await chip(page, 'rear').click()
  await chip(page, 'organs').click()
  await expect(chip(page, 'organs')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('marker-dot-trunk').waitFor()
}

test.describe('部位が無い場所は押せない（390px）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('後面・内臓: 尾の点は理由つきで薄く出て、叩いても寄らない', async ({ page }) => {
    await openRearOrgans(page)
    await expect(page.getByTestId('marker-label-tail')).toContainText('尾（部位なし）')
    await expect(page.getByTestId('marker-label-tail')).toHaveAttribute('opacity', '0.4')
    await expect(page.getByTestId('marker-label-trunk')).not.toContainText('部位なし')

    await waitForCanvasLayout(page)
    const before = await viewBoxOf(page)
    await clickCenter(page, 'marker-dot-tail')
    await page.waitForTimeout(700)
    expect(await viewBoxOf(page), '尾を叩いたのに図が動いた').toBe(before)
    await expect(page.getByTestId('step-back')).toHaveCount(0)
    await expect(page.getByTestId('marker-dot-trunk')).toBeVisible()
  })

  test('後面・内臓: 体幹を押すと腎臓へ寄り、腎臓を選べる', async ({ page }) => {
    await openRearOrgans(page)
    const before = await viewBoxOf(page)
    await clickCenter(page, 'marker-dot-trunk')
    await page.waitForTimeout(700)
    expect(await viewBoxOf(page)).not.toBe(before)
    await page.getByTestId('marker-dot-organ-kidney').waitFor()
    await clickCenter(page, 'marker-dot-organ-kidney')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('腎臓')
  })

  test('部位が有る場所は今までどおり押せる（後面・筋肉の後肢）', async ({ page }) => {
    await page.goto('/')
    await chip(page, 'rear').click()
    await page.getByTestId('marker-dot-hind').waitFor()
    await expect(page.getByTestId('marker-label-hind')).not.toContainText('部位なし')
    await expect(page.getByTestId('marker-label-hind')).toHaveAttribute('opacity', '1')
    const before = await viewBoxOf(page)
    await clickCenter(page, 'marker-dot-hind')
    await page.waitForTimeout(700)
    expect(await viewBoxOf(page)).not.toBe(before)
    // 同じ後面でも筋肉の層では体幹に部位が無い
    await page.goto('/')
    await chip(page, 'rear').click()
    await expect(page.getByTestId('marker-label-trunk')).toContainText('体幹（部位なし）')
  })

  test('場所・部位一覧: 部位が無い場所は押せず、有る場所は押せる。体幹から腎臓へ辿れる', async ({ page }) => {
    await openRearOrgans(page)
    await page.getByTestId('part-selector').click()
    await expect(page).toHaveURL(/kind=parts/)
    const tail = page.getByTestId('area-tail')
    await expect(tail).toBeDisabled()
    await expect(tail).toContainText('尾（部位なし）')
    await expect(page.getByTestId('area-hind')).toBeDisabled()
    const trunk = page.getByTestId('area-trunk')
    await expect(trunk).toBeEnabled()
    await expect(trunk).toHaveText('体幹')
    await trunk.click()
    await expect(page).not.toHaveURL(/kind=parts/)
    await page.getByTestId('marker-dot-organ-kidney').waitFor()
  })
})
