import { test as base, expect, type LaunchOptions, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * 状態の1行（向き・層・深さ）が、見出しと本文の間を往復し続けないこと（PR #324 の指摘）。
 * 本文は縦のスクロールバーのぶん見出しより狭い。Playwright の Chromium は既定でスクロールバーを隠す
 * （--hide-scrollbars）ので、この試験だけはその引数を外して、利用者の Web と同じくスクロールバーを出す。
 * launchOptions はワーカー単位の設定なので、この試験はファイルを分けている。
 */
const test = base.extend<object, { launchOptions: LaunchOptions }>({
  launchOptions: [async ({ launchOptions }, use) => {
    await use({ ...launchOptions, ignoreDefaultArgs: ['--hide-scrollbars'] })
  }, { scope: 'worker' }],
})

/** 状態の1行が今どこにあるか。本文（anatomy-panel-scroll）の中か、見出しか。 */
async function statusPlace(page: Page) {
  return page.getByTestId('view-status').evaluate((element) => {
    const scroll = document.querySelector('[data-testid="anatomy-panel-scroll"]')
    return scroll?.contains(element) ? 'body' : 'heading'
  })
}

for (const c of [
  { name: '390×844・英語・文字200%', width: 390, height: 844, locale: 'en-US', textScale: true, heading: 'Masseter' },
  { name: '250×844・英語・等倍', width: 250, height: 844, locale: 'en-US', textScale: false, heading: 'Masseter' },
  { name: '390×844・日本語・等倍', width: 390, height: 844, locale: 'ja-JP', textScale: false, heading: '咬筋' },
]) {
  test.describe(c.name, () => {
    test.use({ locale: c.locale })
    test('スクロールバーが出る Chromium でも、状態の1行は1か所に落ち着く', async ({ page }) => {
      await page.setViewportSize({ width: c.width, height: c.height })
      if (c.textScale) await installTwoTimesTextScale(page)
      await page.goto('/?part=muscle-masseter')
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(c.heading)
      await waitForCanvasLayout(page)
      await page.waitForTimeout(300)
      // この試験の前提: 本文に縦のスクロールバーの幅がある（無ければ見出しと本文の幅の差が出ず、試験にならん）
      if (c.textScale) {
        const scrollbar = await page.getByTestId('anatomy-panel-scroll').evaluate((element) => (element as HTMLElement).offsetWidth - element.clientWidth)
        expect(scrollbar, 'スクロールバーが出ていない').toBeGreaterThan(0)
      }
      const places: string[] = []
      for (let i = 0; i < 20; i++) {
        await expect(page.getByTestId('view-status')).toHaveCount(1)
        places.push(await statusPlace(page))
        await page.waitForTimeout(50)
      }
      expect(new Set(places).size, `状態の1行が往復した: ${places.join(' ')}`).toBe(1)
    })
  })
}
