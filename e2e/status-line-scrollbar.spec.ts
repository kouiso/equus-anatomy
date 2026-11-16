import { test as base, expect, type LaunchOptions, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * 状態の1行（向き・層・深さ）と操作の段が、置き場を往復し続けないこと（PR #324 の指摘）。
 * #324 は状態の1行の幅を測って見出しと本文の間で置き直していて、本文が縦のスクロールバーのぶん狭いと往復した。
 * 今は状態の1行を常に本文（要約の下）に置き、操作の段の折り返しもレイアウトに任せて、幅を測って置き直すことをしない（#255）。
 * Playwright の Chromium は既定でスクロールバーを隠す（--hide-scrollbars）ので、この試験だけはその引数を外して、
 * 利用者の Web と同じくスクロールバーを出す。launchOptions はワーカー単位の設定なので、この試験はファイルを分けている。
 */
const test = base.extend<object, { launchOptions: LaunchOptions }>({
  launchOptions: [async ({ launchOptions }, use) => {
    await use({ ...launchOptions, ignoreDefaultArgs: ['--hide-scrollbars'] })
  }, { scope: 'worker' }],
})

/** 状態の1行の置き場（本文か見出しか）と、説明欄の部品・図の枠の矩形を1行の文字にする。 */
async function snapshot(page: Page) {
  return page.evaluate((ids) => {
    const scroll = document.querySelector('[data-testid="anatomy-panel-scroll"]')
    const status = document.querySelector('[data-testid="view-status"]')
    const place = status !== null && scroll?.contains(status) ? 'body' : 'heading'
    const rects = ids.map((id) => {
      const b = document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect()
      return b ? `${id}:${b.x.toFixed(1)},${b.y.toFixed(1)},${b.width.toFixed(1)},${b.height.toFixed(1)}` : `${id}:none`
    })
    return { place, rects: rects.join(' ') }
  }, ['anatomy-svg', 'anatomy-panel', 'view-status', 'step-back', 'opposite-side', 'close-sheet'])
}

for (const c of [
  { name: '390×844・英語・文字200%', width: 390, height: 844, locale: 'en-US', textScale: true, heading: 'Masseter' },
  { name: '250×844・英語・等倍', width: 250, height: 844, locale: 'en-US', textScale: false, heading: 'Masseter' },
  { name: '390×844・日本語・等倍', width: 390, height: 844, locale: 'ja-JP', textScale: false, heading: '咬筋' },
  { name: '320×844・日本語・文字200%', width: 320, height: 844, locale: 'ja-JP', textScale: true, heading: '咬筋' },
]) {
  test.describe(c.name, () => {
    test.use({ locale: c.locale })
    test('スクロールバーが出る Chromium でも、状態の1行と操作の段は1か所に落ち着く', async ({ page }) => {
      await page.setViewportSize({ width: c.width, height: c.height })
      if (c.textScale) await installTwoTimesTextScale(page)
      await page.goto('/?part=muscle-masseter')
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(c.heading)
      await waitForCanvasLayout(page)
      await page.waitForTimeout(300)
      // この試験の前提: 本文があふれて縦にスクロールできる（無ければレイアウトの危ない状態を試せない）。
      // Chromium 153 は macOS ではスクロールバーを重ねて出すので幅は測れない。あふれているかで確かめる
      if (c.textScale) {
        const overflow = await page.getByTestId('anatomy-panel-scroll').evaluate((element) => element.scrollHeight - element.clientHeight)
        expect(overflow, '本文があふれてスクロールしていない').toBeGreaterThan(0)
      }
      const places: string[] = []
      const rects: string[] = []
      for (let i = 0; i < 20; i++) {
        await expect(page.getByTestId('view-status')).toHaveCount(1)
        const frame = await snapshot(page)
        places.push(frame.place)
        rects.push(frame.rects)
        await page.waitForTimeout(50)
      }
      // 状態の1行は常に本文（要約の下）。見出しへは動かさない
      expect(places.every((place) => place === 'body'), `状態の1行が本文に無い: ${places.join(' ')}`).toBe(true)
      expect(new Set(rects).size, `説明欄か図の枠が動いた:\n${[...new Set(rects)].join('\n')}`).toBe(1)
    })
  })
}
