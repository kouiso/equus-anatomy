import { expect, test } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'

for (const width of [320, 390, 1280]) {
  test(`${width}px: 重複点の候補を選び直し、反対側へ同じ部位を保って往復できる`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/?part=bone-cannon')
    await waitForCanvasLayout(page)
    const svg = page.getByTestId('anatomy-svg')
    const before = await svg.getAttribute('viewBox')
    const tap = await svg.evaluate((el) => {
      const matrix = (el as SVGSVGElement).getScreenCTM()!
      const p = new DOMPoint(632, 998).matrixTransform(matrix)
      return { x: p.x, y: p.y }
    })
    await page.mouse.click(tap.x, tap.y)
    const candidates = page.getByTestId('part-candidates')
    await expect(candidates).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('近位種子骨')
    await expect(candidates.getByRole('radio', { name: '近位種子骨', exact: true })).toBeChecked()
    await candidates.getByTestId('chip-bone-cannon').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('中手骨')
    await expect(svg).toHaveAttribute('viewBox', before!)
    await expect(candidates.getByTestId('chip-bone-cannon')).toBeChecked()
    await page.getByTestId('opposite-side').click()
    await expect(page.getByTestId('opposite-side')).toHaveAttribute('aria-label', '左側望で見る')
    await expect(page.getByTestId('marker-selected-bone-cannon')).toBeVisible()
    await expect(candidates).toHaveCount(0)
    await page.getByTestId('opposite-side').click()
    await expect(svg).toHaveAttribute('viewBox', before!)
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('中手骨')
  })
}

test('片側臓器・未配置・正面には反対側ボタンを出さない', async ({ page }) => {
  for (const id of ['organ-spleen', 'organ-bladder', 'muscle-iliopsoas']) {
    await page.goto(`/?part=${id}`)
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
    await expect(page.getByTestId('opposite-side')).toHaveCount(0)
  }
  await page.goto('/?part=muscle-masseter')
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  await page.getByRole('radio', { name: '正面', exact: true }).click()
  await page.getByRole('button', { name: 'この条件で表示' }).click()
  await expect(page.getByTestId('opposite-side')).toHaveCount(0)
})
