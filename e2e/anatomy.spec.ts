import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const DRAFT_KEY = 'equus.calibrate.draft.v1'
const fixture = readFileSync(new URL('./fixtures/draft.json', import.meta.url), 'utf8')
const IMAGE = { w: 1600, h: 1200 }

/** フィクスチャ座標を下書きとして流し込む。人が /calibrate で置いた状態と同じ。 */
async function seed(page: Page) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [DRAFT_KEY, fixture],
  )
}

/** SVG 内の要素の画面上の矩形 */
async function rectOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  return box
}

test.describe('マーカーのズレ', () => {
  const viewports = [
    { name: 'phone', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ]

  test('端末幅が変わってもマーカーの画像内相対位置は一定', async ({ page }) => {
    await seed(page)
    await page.setViewportSize(viewports[0]!)
    await page.goto('/')
    await page.locator('[data-part="muscle-gluteus"]').waitFor()

    const relatives: Record<string, { rx: number; ry: number }> = {}
    for (const vp of viewports) {
      // リロードせずリサイズだけ。実際に端末を回した時と同じ経路を通す。
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.waitForFunction(
        (w) => Math.abs(document.documentElement.clientWidth - (w as number)) < 2,
        vp.width,
      )
      const img = await rectOf(page, '[data-testid="anatomy-image"]')
      const marker = await rectOf(page, '[data-part="muscle-gluteus"]')
      relatives[vp.name] = {
        rx: (marker.x + marker.width / 2 - img.x) / img.width,
        ry: (marker.y + marker.height / 2 - img.y) / img.height,
      }
    }

    // フィクスチャの中心 (1120,400) の相対位置に一致し、かつ端末間でブレんこと
    const base = relatives.phone!
    expect(base.rx).toBeCloseTo(1120 / IMAGE.w, 2)
    expect(base.ry).toBeCloseTo(400 / IMAGE.h, 2)
    for (const vp of viewports) {
      const r = relatives[vp.name]!
      expect(Math.abs(r.rx - base.rx), `${vp.name} の x ズレ`).toBeLessThan(0.002)
      expect(Math.abs(r.ry - base.ry), `${vp.name} の y ズレ`).toBeLessThan(0.002)
    }
  })
})

test.describe('タップ', () => {
  test('各部位の中心をタップすると、その部位の解説が出る', async ({ page }) => {
    await seed(page)
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    const shapes = (JSON.parse(fixture) as { left: { id: string }[] }).left
    expect(shapes.length).toBeGreaterThanOrEqual(10)

    const names: Record<string, string> = {
      'muscle-masseter': '咬筋',
      'muscle-gluteus': '中臀筋',
      'muscle-triceps': '上腕三頭筋',
      'muscle-gastrocnemius': '腓腹筋',
      'muscle-oblique': '外腹斜筋',
    }
    for (const [id, ja] of Object.entries(names)) {
      const box = await rectOf(page, `[data-part="${id}"]`)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(ja)
      await page.getByRole('button', { name: '閉じる' }).click()
    }
  })

  test('馬体の外をタップしても誤爆せん', async ({ page }) => {
    await seed(page)
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    const img = await rectOf(page, '[data-testid="anatomy-image"]')
    await page.mouse.click(img.x + 6, img.y + 6)
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  })
})

test.describe('ズーム', () => {
  test('拡大してもマーカーとラベルの見た目サイズは変わらん', async ({ page }) => {
    await seed(page)
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    // ラベルは選んどる部位だけ出る仕様。先に選んでから測る。
    const marker = await rectOf(page, '[data-part="muscle-gluteus"]')
    await page.mouse.click(marker.x + marker.width / 2, marker.y + marker.height / 2)
    const label = page.locator('svg text').filter({ hasText: '中臀筋' }).first()
    await label.waitFor()
    const dot = page.locator('svg circle[r="5"]').first()

    const before = { label: (await label.boundingBox())!, dot: (await dot.boundingBox())! }
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '拡大' }).click()
    await page.waitForTimeout(200)
    const after = { label: (await label.boundingBox())!, dot: (await dot.boundingBox())! }

    expect(Math.abs(after.label.height - before.label.height), 'ラベル高さ').toBeLessThanOrEqual(1)
    expect(Math.abs(after.label.width - before.label.width), 'ラベル幅').toBeLessThanOrEqual(1)
    expect(Math.abs(after.dot.width - before.dot.width), '点の直径').toBeLessThanOrEqual(1)
  })

  test('拡大するとマーカーは離れる（絵と一緒に拡大されとる証拠）', async ({ page }) => {
    await seed(page)
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    const gap = async () => {
      const a = await rectOf(page, '[data-part="muscle-masseter"]')
      const b = await rectOf(page, '[data-part="muscle-gluteus"]')
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const before = await gap()
    await page.getByRole('button', { name: '拡大' }).click()
    expect(await gap()).toBeGreaterThan(before * 1.2)
  })
})

test.describe('画面まわり', () => {
  test('図鑑に52件出て、詳細へ行ける', async ({ page }) => {
    await page.goto('/catalog')
    await expect(page.getByText('52 部位')).toBeVisible()
    await page.getByRole('link', { name: /咬筋/ }).first().click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('咬筋')
  })

  test('保存が空のとき、行き止まりにならん', async ({ page }) => {
    await page.goto('/saved')
    await expect(page.getByText('保存した部位はまだありません。')).toBeVisible()
    await page.getByRole('link', { name: '解剖図を開く' }).click()
    await expect(page.locator('[data-testid="anatomy-svg"]')).toBeVisible()
  })

  test('座標が無い層では「未配置」を隠さず出す', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: '骨格' }).click()
    await expect(page.getByTestId('placement-status')).toContainText('未配置')
  })
})
