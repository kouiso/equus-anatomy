import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('2本指のピンチと1本指のパンが図を動かし、点のサイズを保つ', async ({ page, context }) => {
  await page.goto('/')
  const svg = page.getByTestId('anatomy-svg')
  const dot = page.getByTestId('marker-dot-trunk')
  await expect(dot).toBeVisible()
  const bounds = (await svg.boundingBox())!
  const beforeDot = (await dot.boundingBox())!
  const viewBox = async () => (await svg.getAttribute('viewBox'))!.split(/\s+/).map(Number)
  const before = await viewBox()
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  const cdp = await context.newCDPSession(page)
  const fingers = (radius: number) => [{ id: 1, x: x - radius, y }, { id: 2, x: x + radius, y }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(30) })
  for (let radius = 35; radius <= 100; radius += 5) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(radius) })
    await page.evaluate(() => new Promise(requestAnimationFrame))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await viewBox())[2]!).toBeLessThan(before[2]! * 0.8)
  const zoomed = await viewBox()
  const afterDot = (await dot.boundingBox())!
  expect(afterDot.width).toBeCloseTo(beforeDot.width, 0)
  expect(afterDot.height).toBeCloseTo(beforeDot.height, 0)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] })
  for (let dx = 5; dx <= 35; dx += 5) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + dx, y }] })
    await page.evaluate(() => new Promise(requestAnimationFrame))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await viewBox())[0]!).toBeLessThan(zoomed[0]! - 5)
  expect((await viewBox())[2]).toBeCloseTo(zoomed[2]!, 1)
  await expect(page.getByTestId('marker-dot-trunk')).toBeVisible()
  await cdp.detach()
})
