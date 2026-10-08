import { expect, test, type Page } from '@playwright/test'

/**
 * iPad 横向き（Issue #44）。supportsTablet: true なので iPad は4方向に回る。
 * 横では幅 >= breakpointLg かつ横長になり、解剖画面は「図 | 右パネル 320px」の wide 経路に入る。
 * 縦（768×1024）は usability.spec.ts が見とるので、ここは横だけを触って操作する。
 */
const LANDSCAPES = [
  { name: 'iPad 横 1024×768', width: 1024, height: 768 },
  { name: 'iPad Air 横 1180×820', width: 1180, height: 820 },
  { name: 'iPad Pro 12.9 横 1366×1024', width: 1366, height: 1024 },
] as const

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

async function expectInsideViewport(page: Page, testId: string, width: number, height: number) {
  const box = await page.getByTestId(testId).boundingBox()
  expect(box, `${testId} が描かれていない`).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5)
  expect(box!.y + box!.height).toBeLessThanOrEqual(height + 0.5)
}

for (const vp of LANDSCAPES) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true })

    test('図の表示→部位一覧→詳細→戻るが横向きで完結し、図の位置を保つ', async ({ page }) => {
      await page.goto('/')
      const svg = page.getByTestId('anatomy-svg')
      await expect(svg).toBeVisible()
      await expectNoHorizontalOverflow(page)

      // wide 経路: パネルは図の右に 320px で並び、下に積まれない
      const svgBox = (await svg.boundingBox())!
      const panelBox = (await page.getByTestId('anatomy-panel').boundingBox())!
      expect(panelBox.width).toBeCloseTo(320, 0)
      expect(panelBox.x).toBeGreaterThanOrEqual(svgBox.x + svgBox.width - 1)
      expect(svgBox.height).toBeGreaterThan(vp.height * 0.6)
      await expectInsideViewport(page, 'anatomy-panel', vp.width, vp.height)
      await expectInsideViewport(page, 'bottom-nav', vp.width, vp.height)

      const vb = await svg.getAttribute('viewBox')
      await page.getByRole('button', { name: '場所・部位一覧', exact: true }).tap()
      await page.getByRole('button', { name: '腕頭筋', exact: true }).tap()
      await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
      await expect(page.getByTestId('marker-dot-muscle-brachiocephalicus')).toBeVisible()
      await expect(svg).toHaveAttribute('viewBox', vb!)

      const read = page.getByRole('button', { name: '詳しく読む' })
      const readBox = (await read.boundingBox())!
      expect(readBox.height).toBeGreaterThanOrEqual(44)
      expect(readBox.y + readBox.height).toBeLessThanOrEqual(vp.height - 60)
      await read.tap()
      await expect(page.getByTestId('part-sheet')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await page.getByRole('button', { name: '閉じる', exact: true }).tap()

      await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
      await expect(svg).toHaveAttribute('viewBox', vb!)
      expect(await svg.boundingBox()).toEqual(svgBox)
    })

    test('表示条件の切替とズームボタンが横向きで効く', async ({ page }) => {
      await page.goto('/')
      const svg = page.getByTestId('anatomy-svg')
      await expect(svg).toBeVisible()
      await page.getByRole('button', { name: '表示条件', exact: true }).tap()
      await page.getByRole('radio', { name: '右側望', exact: true }).tap()
      await page.getByRole('radio', { name: '内臓', exact: true }).tap()
      const apply = page.getByRole('button', { name: 'この条件で表示', exact: true })
      const applyBox = (await apply.boundingBox())!
      expect(applyBox.y + applyBox.height).toBeLessThanOrEqual(vp.height)
      await apply.tap()
      await expect(page.getByText('右側望 · 内臓', { exact: true })).toBeVisible()
      await expect(page.getByTestId('anatomy-image')).toBeVisible()

      // ズームの操作ボタンは右パネルに隠れない位置（図の右上）にある
      const panelBox = (await page.getByTestId('anatomy-panel').boundingBox())!
      for (const id of ['zoom-in', 'zoom-out', 'zoom-reset']) {
        const box = (await page.getByTestId(id).boundingBox())!
        expect(box.x + box.width, `${id} が右パネルに重なる`).toBeLessThanOrEqual(panelBox.x)
      }
      const fitted = await svg.getAttribute('viewBox')
      await page.getByTestId('zoom-in').tap()
      await expect(svg).not.toHaveAttribute('viewBox', fitted!)
      await page.getByTestId('zoom-reset').tap()
      await expect(svg).toHaveAttribute('viewBox', fitted!)
    })

    test('図鑑で保存した部位が保存タブに出て、解除を取り消せる', async ({ page }) => {
      await page.goto('/')
      await page.getByTestId('tab-catalog').tap()
      await page.getByTestId('catalog-search').fill('liver')
      await page.getByTestId('catalog-row-organ-liver').tap()
      await expect(page.getByTestId('detail-name-ja')).toHaveText('肝臓')
      await expectNoHorizontalOverflow(page)
      await page.getByTestId('save-toggle').tap()
      await expect(page.getByTestId('save-toggle')).toContainText('保存済み')

      await page.getByTestId('tab-saved').tap()
      await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()
      await expectInsideViewport(page, 'saved-remove-organ-liver', vp.width, vp.height)
      await page.getByTestId('saved-remove-organ-liver').tap()
      await expect(page.getByTestId('saved-row-organ-liver')).toHaveCount(0)
      await expectInsideViewport(page, 'saved-undo', vp.width, vp.height)
      await page.getByTestId('saved-undo-organ-liver').tap()
      await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()
    })
  })
}
