import { expect, test, type Locator } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('操作の矩形を取得できない')
  return box
}

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(locale, () => {
    test.use({ locale })
    for (const width of [320, 390]) {
      for (const largeText of [false, true]) {
        test(`part selector ${width} text ${largeText ? '2x' : '1x'}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 844 })
          if (largeText) await installTwoTimesTextScale(page)
          await page.goto('/')
          await expect(page.getByTestId('demo-note')).toBeVisible()
          expect(await page.getByTestId('demo-note').evaluate(element => element.scrollHeight <= element.clientHeight), '監修前の注記が途中で切れている').toBe(true)
          const selector = page.getByTestId('part-selector')
          await expect(selector).toBeVisible({ timeout: 3000 })
          const button = await boxOf(selector)
          const canvas = await boxOf(page.getByTestId('anatomy-svg'))
          const zoom = await boxOf(page.getByTestId('zoom-in'))
          expect(button.x - canvas.x).toBeCloseTo(12, 0)
          expect(button.y - canvas.y).toBeCloseTo(12, 0)
          expect(button.height).toBeGreaterThanOrEqual(48)
          expect(button.width).toBeGreaterThanOrEqual(48)
          expect(button.x + button.width).toBeLessThanOrEqual(zoom.x - 12)
          for (const id of ['zoom-in', 'zoom-out', 'zoom-reset']) {
            const rect = await boxOf(page.getByTestId(id))
            expect(rect.height).toBeGreaterThanOrEqual(48)
            expect(rect.width).toBeGreaterThanOrEqual(48)
          }
          await page.getByTestId('zoom-in').click()
          const back = page.getByTestId('step-back')
          await expect(back).toBeVisible()
          const backBox = await boxOf(back)
          expect(backBox.y).toBeGreaterThanOrEqual(button.y + button.height + 12)
          expect(backBox.height).toBeGreaterThanOrEqual(48)
          await back.click()
          await expect(back).toHaveCount(0)
          if (process.env.EQUUS_EVIDENCE_DIR) {
            await page.screenshot({ path: `${process.env.EQUUS_EVIDENCE_DIR}/${locale}-${width}-${largeText ? '2x' : '1x'}.png` })
          }
          // 表示条件は図の左下に重なり、パネルの真上で、上段の操作と重ならない(Issue #178)
          const conditions = page.getByTestId('conditions')
          await expect(conditions).toBeVisible()
          const cond = await boxOf(conditions)
          expect(cond.x - canvas.x).toBeCloseTo(12, 0)
          expect(canvas.y + canvas.height - (cond.y + cond.height)).toBeCloseTo(12, 0)
          expect(cond.height).toBeGreaterThanOrEqual(48)
          expect(cond.width).toBeGreaterThanOrEqual(48)
          expect(cond.x + cond.width).toBeLessThanOrEqual(canvas.x + canvas.width - 12)
          expect(cond.y).toBeGreaterThanOrEqual(button.y + button.height + 12)
          await expect(page.getByTestId('anatomy-panel').getByRole('button')).toHaveCount(0)
          await selector.click()
          await expect(page).toHaveURL(/kind=parts/)
          await expect(page.getByRole('heading', { name: locale === 'ja-JP' ? '場所・部位一覧' : 'Areas & parts', exact: true })).toBeVisible()
          await page.getByTestId('overlay-close').click()
          await expect(selector).toBeVisible()
          await page.getByRole('button', { name: locale === 'ja-JP' ? '表示条件' : 'View options', exact: true }).click()
          await expect(page).toHaveURL(/kind=conditions/)
        })
      }
    }

    // 部位を選ぶと詳しく読むが表示条件の上に積まれ、どちらも戻る操作と重ならない(Issue #178)
    for (const width of [320, 375, 390]) {
      test(`overlay actions stack above the panel ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 })
        await installTwoTimesTextScale(page)
        await page.goto('/?part=muscle-brachiocephalicus')
        await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
        const canvas = await boxOf(page.getByTestId('anatomy-svg'))
        const read = await boxOf(page.getByTestId('read-more'))
        const conditions = await boxOf(page.getByTestId('conditions'))
        const back = await boxOf(page.getByTestId('step-back'))
        const zoom = await boxOf(page.getByTestId('zoom-in'))
        for (const box of [read, conditions]) {
          expect(box.height).toBeGreaterThanOrEqual(48)
          expect(box.x - canvas.x).toBeCloseTo(12, 0)
          expect(box.x + box.width).toBeLessThanOrEqual(canvas.x + canvas.width - 12)
        }
        expect(read.y + read.height + 12).toBeLessThanOrEqual(conditions.y + 0.5)
        expect(canvas.y + canvas.height - (conditions.y + conditions.height)).toBeCloseTo(12, 0)
        expect(read.y).toBeGreaterThanOrEqual(back.y + back.height + 12)
        expect(read.x + read.width <= zoom.x || read.y >= zoom.y + zoom.height).toBe(true)
        for (const id of ['read-more', 'conditions']) {
          const clipped = await page.getByTestId(id).evaluate((el) => {
            const text = el.querySelector('div') ?? el
            return text.scrollWidth > text.clientWidth
          })
          expect(clipped, `${id} の文字が省略されている`).toBe(false)
        }
        await page.getByTestId('read-more').click()
        await expect(page.getByTestId('part-sheet')).toBeVisible()
      })
    }

    // 横向きの低い画面でも、戻る操作が図の枠内に収まり押せること。
    test('step back stays inside a short landscape canvas', async ({ page }) => {
      await page.setViewportSize({ width: 568, height: 320 })
      await page.goto('/')
      await expect(page.getByTestId('part-selector')).toBeVisible({ timeout: 3000 })
      await page.getByTestId('zoom-in').click()
      const back = page.getByTestId('step-back')
      await expect(back).toBeVisible()
      const canvas = await boxOf(page.getByTestId('anatomy-svg'))
      const backBox = await boxOf(back)
      const selector = await boxOf(page.getByTestId('part-selector'))
      const zoom = await boxOf(page.getByTestId('zoom-in'))
      expect(backBox.y + backBox.height, '戻る操作の下端が図の枠を越えている').toBeLessThanOrEqual(canvas.y + canvas.height)
      expect(backBox.height).toBeGreaterThanOrEqual(48)
      expect(backBox.x, '部位一覧と重なっている').toBeGreaterThanOrEqual(selector.x + selector.width)
      expect(backBox.x + backBox.width, 'ズーム操作と重なっている').toBeLessThanOrEqual(zoom.x)
      await back.click()
      await expect(back).toHaveCount(0)
    })

    // 図が低すぎて左下に収まらん時は、表示条件と詳しく読むが下のパネルに残り押せる(Issue #178 の退避経路)
    test('actions fall back to the panel in a short landscape canvas', async ({ page }) => {
      await page.setViewportSize({ width: 568, height: 320 })
      await page.goto('/?part=muscle-brachiocephalicus')
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
      await expect(page.getByTestId('canvas-actions')).toHaveCount(0)
      const panelButtons = page.getByTestId('anatomy-panel').getByRole('button')
      await expect(panelButtons.filter({ hasText: locale === 'ja-JP' ? '表示条件' : 'View options' })).toHaveCount(1)
      await expect(panelButtons.filter({ hasText: locale === 'ja-JP' ? '詳しく読む' : 'Read more' })).toHaveCount(1)
      for (const button of await panelButtons.all()) {
        expect((await boxOf(button)).height).toBeGreaterThanOrEqual(44)
      }
    })
  })
}
