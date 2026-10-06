import { expect, test } from '@playwright/test'
import jpeg from 'jpeg-js'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

/**
 * #65 回帰。実機では「上限ズーム → 右へドラッグ×4、下へドラッグ×3」で
 * viewBox がプレートの黒背景だけの区画に乗り、馬体もマーカーも消えて
 * 真っ黒になった（矩形クランプだけでは凹みの中まで到達できた）。
 *
 * 画面の中心は必ず馬体の上に留まる決まりなので、端までパンし続けても
 * 中心付近には絵が残る。スクショの中心ブロックで黒画素率を見る。
 */
test('上限ズームで端までパンしても画面が真っ黒にならん', async ({ page, context }) => {
  await page.goto('/')
  const svg = page.getByTestId('anatomy-svg')
  const dot = page.getByTestId('marker-dot-trunk')
  await expect(dot).toBeVisible()
  await dot.click()
  await page.waitForTimeout(400)

  // 「+」で上限（8x）まで寄る
  const zoomIn = page.getByTestId('zoom-in')
  for (let i = 0; i < 12; i++) await zoomIn.click()
  const viewBox = async () => (await svg.getAttribute('viewBox'))!.split(/\s+/).map(Number)
  await expect.poll(async () => (await viewBox())[2]!).toBeLessThanOrEqual(200 + 1e-6)

  // 指を右へ動かすと viewBox は左へ、上へ動かすと下へ進む（絵が指についていく）。
  // 繰り返すと viewBox は首の下・脚の間の大きな黒い凹み——部位 union の
  // bbox の内側にあるので矩形クランプでは届く——を目指す。
  const bounds = (await svg.boundingBox())!
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const cdp = await context.newCDPSession(page)
  const drag = async (dx: number, dy: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: cx, y: cy }] })
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ id: 1, x: cx + (dx * i) / steps, y: cy + (dy * i) / steps }],
      })
      await page.evaluate(() => new Promise(requestAnimationFrame))
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(60)
  }
  for (let i = 0; i < 8; i++) await drag(320, 0)
  for (let i = 0; i < 8; i++) await drag(0, -320)
  await cdp.detach()

  const shot = await svg.screenshot({ type: 'jpeg', quality: 100 })
  const { data, width, height } = jpeg.decode(shot, { useTArray: true, formatAsRGBA: true })
  // 画面中心の 50% の領域で「黒背景より明るい」画素の割合を数える
  const x0 = Math.floor(width * 0.25)
  const x1 = Math.floor(width * 0.75)
  const y0 = Math.floor(height * 0.25)
  const y1 = Math.floor(height * 0.75)
  let lit = 0
  let total = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4
      if (Math.max(data[i]!, data[i + 1]!, data[i + 2]!) > 45) lit++
      total++
    }
  }
  const vb = await viewBox()
  expect(lit / total, `lit ratio ${(lit / total).toFixed(3)} at viewBox ${vb}`).toBeGreaterThan(0.15)
})
