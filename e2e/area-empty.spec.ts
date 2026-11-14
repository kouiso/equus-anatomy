import { expect, test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'

/**
 * 今の向き・層に部位が無い場所は、点も場所一覧も押せない状態で出す（深層筋（図なし）チップと同じ規則）。
 * 後面・内臓は後肢も尾も部位が0件なので、場所が全部押せない。
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
  await page.getByTestId('marker-dot-tail').waitFor()
}

test.describe('部位が無い場所は押せない（390px）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('後面・内臓: 後肢も尾も理由つきで薄く出て、叩いても寄らない', async ({ page }) => {
    await openRearOrgans(page)
    for (const [id, name] of [['tail', '尾'], ['hind', '後肢']] as const) {
      await expect(page.getByTestId(`marker-label-${id}`)).toContainText(`${name}（部位なし）`)
      await expect(page.getByTestId(`marker-label-${id}`)).toHaveAttribute('opacity', '0.4')
    }
    await waitForCanvasLayout(page)
    const before = await viewBoxOf(page)
    for (const id of ['tail', 'hind']) {
      await clickCenter(page, `marker-dot-${id}`)
      await page.waitForTimeout(700)
      expect(await viewBoxOf(page), `${id} を叩いたのに図が動いた`).toBe(before)
      await expect(page.getByTestId('step-back')).toHaveCount(0)
    }
    await expect(page.getByTestId('marker-dot-tail')).toBeVisible()
  })

  test('部位が有る場所は今までどおり押せる（後面・筋肉の後肢）', async ({ page }) => {
    await page.goto('/')
    await chip(page, 'rear').click()
    await page.getByTestId('marker-dot-hind').waitFor()
    await expect(page.getByTestId('marker-label-hind')).not.toContainText('部位なし')
    await expect(page.getByTestId('marker-label-hind')).toHaveAttribute('opacity', '1')
    // 同じ後面でも筋肉の層で尾は空
    await expect(page.getByTestId('marker-label-tail')).toContainText('尾（部位なし）')
    const before = await viewBoxOf(page)
    await clickCenter(page, 'marker-dot-hind')
    await page.waitForTimeout(700)
    expect(await viewBoxOf(page)).not.toBe(before)
  })

  test('場所・部位一覧: 部位が無い場所は押せず、有る場所は押せる', async ({ page }) => {
    await openRearOrgans(page)
    await page.getByTestId('part-selector').click()
    await expect(page).toHaveURL(/kind=parts/)
    await expect(page.getByTestId('area-tail')).toBeDisabled()
    await expect(page.getByTestId('area-tail')).toContainText('尾（部位なし）')
    await expect(page.getByTestId('area-hind')).toBeDisabled()
    await page.getByTestId('overlay-close').click()
    await chip(page, 'muscle').click()
    await page.getByTestId('part-selector').click()
    await expect(page.getByTestId('area-hind')).toBeEnabled()
    await expect(page.getByTestId('area-hind')).toHaveText('後肢')
    await expect(page.getByTestId('area-tail')).toBeDisabled()
  })
})
