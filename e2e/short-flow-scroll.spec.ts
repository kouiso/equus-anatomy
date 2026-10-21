import { expect, test } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'
import { installTwoTimesTextScale } from './tools/text-scale'

test.use({ viewport: { width: 320, height: 568 }, hasTouch: true })

/**
 * 短い画面では図とパネルが外側の anatomy-flow を縦にスクロールする。
 * 図が画面の大半を占めるので、図の上から指で動かせなければ実質スクロール不能になる。
 * 未ズームの1本指ドラッグは図の移動が無いので縦方向はブラウザのスクロールへ渡す。
 * 逆にズーム中は図の移動に指が要るので、縦ドラッグは図が受け取る。
 */
test('短い画面では図の上の縦ドラッグで全体がスクロールする', async ({ page, context }) => {
  await installTwoTimesTextScale(page)
  await page.goto('/')
  const flow = page.getByTestId('anatomy-flow')
  await expect(flow).toBeVisible()
  await waitForCanvasLayout(page)

  const svg = page.getByTestId('anatomy-svg')
  const bounds = (await svg.boundingBox())!
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const cdp = await context.newCDPSession(page)
  const drag = async (dy: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: cx, y: cy }] })
    const steps = 8
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ id: 1, x: cx, y: cy + (dy * i) / steps }],
      })
      await page.evaluate(() => new Promise(requestAnimationFrame))
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(60)
  }

  // 指を上へ動かすと中身は下へ。パネルの操作が見える位置まで進む
  await drag(-240)
  await expect.poll(() => flow.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  // 戻せることも確かめる
  await drag(240)
  await expect.poll(() => flow.evaluate((element) => element.scrollTop)).toBe(0)
  await cdp.detach()
})
