import { expect, test, type Locator, type Page } from '@playwright/test'
import { GEOMETRY } from '../src/core/data'
import { centroid } from '../src/core/geometry'
import { imageToScreen, screenToImage } from '../src/core/screen-to-image'
import type { Point, Size, ViewBox } from '../src/core/types'

type Projection = {
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  readonly viewBox: ViewBox
  readonly projected: readonly Point[]
  readonly inverted: readonly Point[]
}

const svgOf = (page: Page) => page.getByTestId('anatomy-svg')

async function changeAnatomyCondition(page: Page, name: string) {
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  await page.getByRole('radio', { name, exact: true }).click()
  await page.getByRole('button', { name: 'この条件で表示' }).click()
}

/** 実際の SVG CTM とその逆行列をブラウザ内で取得する。 */
async function browserProjection(svg: Locator, points: readonly Point[]): Promise<Projection> {
  return svg.evaluate((node, controlPoints) => {
    const element = node as SVGSVGElement
    const ctm = element.getScreenCTM()
    if (ctm === null) throw new Error('anatomy-svg の getScreenCTM が取得できない')
    const inverse = ctm.inverse()
    const box = element.getBoundingClientRect()
    const values = element.viewBox.baseVal
    const projected = controlPoints.map(([x, y]) => {
      const result = new DOMPoint(x, y).matrixTransform(ctm)
      return [result.x, result.y] as const
    })
    const inverted = projected.map(([x, y]) => {
      const result = new DOMPoint(x, y).matrixTransform(inverse)
      return [result.x, result.y] as const
    })
    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      viewBox: { x: values.x, y: values.y, w: values.width, h: values.height },
      projected,
      inverted,
    }
  }, points)
}

function expectRuntimeMatchesBrowser(snapshot: Projection, controls: readonly Point[]) {
  const container: Size = { w: snapshot.box.width, h: snapshot.box.height }
  controls.forEach((control, index) => {
    const expected = imageToScreen(control, snapshot.viewBox, container)
    const actual = snapshot.projected[index]!
    expect(actual[0] - snapshot.box.x, `control ${index} forward x`).toBeCloseTo(expected[0], 4)
    expect(actual[1] - snapshot.box.y, `control ${index} forward y`).toBeCloseTo(expected[1], 4)

    const runtimeInverse = screenToImage(
      [actual[0] - snapshot.box.x, actual[1] - snapshot.box.y],
      snapshot.viewBox,
      container,
    )
    expect(runtimeInverse[0], `control ${index} runtime inverse x`).toBeCloseTo(control[0], 4)
    expect(runtimeInverse[1], `control ${index} runtime inverse y`).toBeCloseTo(control[1], 4)
    expect(snapshot.inverted[index]![0], `control ${index} SVG inverse x`).toBeCloseTo(control[0], 4)
    expect(snapshot.inverted[index]![1], `control ${index} SVG inverse y`).toBeCloseTo(control[1], 4)
  })
}

const leftControls: readonly Point[] = [
  (() => { const area = GEOMETRY.left.areas.find((candidate) => candidate.id === 'head')!; return area.labelAt ?? centroid(area.points) })(),
  (() => { const area = GEOMETRY.left.areas.find((candidate) => candidate.id === 'trunk')!; return area.labelAt ?? centroid(area.points) })(),
  centroid(GEOMETRY.left.parts.find((part) => part.id === 'muscle-latissimus')!.points),
]

for (const deviceScaleFactor of [1, 2]) {
test.describe(`SVG と runtime の座標投影契約 DPR ${deviceScaleFactor}`, () => {
  test.use({ deviceScaleFactor })
  for (const viewport of [
    { name: '縦長', width: 390, height: 600 },
    { name: '横長', width: 1280, height: 800 },
  ]) {
    test(`${viewport.name}のレターボックスで実SVG CTMと一致する`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      const svg = svgOf(page)
      await expect(svg).toBeVisible()
      const snapshot = await browserProjection(svg, leftControls)
      expectRuntimeMatchesBrowser(snapshot, leftControls)

      // 2種類の画面で、少なくとも一方の軸に実際の余白があることも確認する。
      const scale = Math.min(snapshot.box.width / snapshot.viewBox.w, snapshot.box.height / snapshot.viewBox.h)
      const ox = (snapshot.box.width - snapshot.viewBox.w * scale) / 2
      const oy = (snapshot.box.height - snapshot.viewBox.h * scale) / 2
      expect(Math.max(ox, oy), `${viewport.name}でletterbox余白がない`).toBeGreaterThan(0.5)
    })
  }

  test('ズームとパン後も実SVG CTMと一致する', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const svg = svgOf(page)
    await expect(svg).toBeVisible()
    const before = await browserProjection(svg, leftControls)

    await page.getByTestId('zoom-in').click()
    await page.getByTestId('zoom-in').click()
    const bounds = (await svg.boundingBox())!
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height / 2 + 35, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => (await browserProjection(svg, leftControls)).viewBox.x).not.toBe(before.viewBox.x)

    const after = await browserProjection(svg, leftControls)
    expect(after.viewBox.w).toBeLessThan(before.viewBox.w)
    expect(after.viewBox.x).not.toBe(before.viewBox.x)
    expect(after.viewBox.y).not.toBe(before.viewBox.y)
    expectRuntimeMatchesBrowser(after, leftControls)
  })

  test('右側望は反転済み実データの点を同じ投影で描く', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await changeAnatomyCondition(page, '右側望')
    const svg = svgOf(page)
    const area = GEOMETRY.right.areas.find((candidate) => candidate.id === 'trunk')!
    const rightTrunk = area.labelAt ?? centroid(area.points)
    const snapshot = await browserProjection(svg, [rightTrunk])
    expectRuntimeMatchesBrowser(snapshot, [rightTrunk])

    const dot = await page.getByTestId('marker-dot-trunk').boundingBox()
    if (dot === null) throw new Error('右側望の体幹マーカーが表示されていない')
    expect(dot.x + dot.width / 2, '反転済み点の画面 x').toBeCloseTo(snapshot.projected[0]![0], 1)
    expect(dot.y + dot.height / 2, '反転済み点の画面 y').toBeCloseTo(snapshot.projected[0]![1], 1)
    expect(rightTrunk[0]).toBeCloseTo(GEOMETRY.right.size.w - leftControls[1]![0], 8)
  })
})
}
