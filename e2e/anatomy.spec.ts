import { expect, test, type Page } from '@playwright/test'

/**
 * 実データ（src/core/data/regions/left.json）で検証する。
 * 当て物のフィクスチャは捨てた。本物の座標で動かんかったら意味がない。
 */
const IMAGE = { w: 1600, h: 1200 }

async function rectOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  return box
}

/** 大まかな場所のマーカーをタップして、その場所へ寄る。 */
async function pickArea(page: Page, id: string) {
  await page.locator(`[data-marker="${id}"]`).waitFor()
  const box = await rectOf(page, `[data-marker="${id}"] circle`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(700)
}

test.describe('大まかな場所', () => {
  test('6つの場所が馬体の上に出て、選ぶとその場所の部位だけになる', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    for (const n of ['頭部', '頸部', '体幹', '前肢', '後肢', '尾']) {
      await expect(page.locator('svg text').filter({ hasText: n }).first()).toBeVisible()
    }
    await pickArea(page, 'fore')
    await expect(page.getByRole('button', { name: '大まかな場所を選び直す' })).toBeVisible()
    // 前肢に属する筋だけが出とる。体幹の筋は出とらん
    await expect(page.locator('[data-part="muscle-triceps"]')).toHaveCount(1)
    await expect(page.locator('[data-part="muscle-oblique"]')).toHaveCount(0)
  })

  test('場所ごとの部位数が region の対応どおり', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'hind')
    await expect(page.locator('[data-part]')).toHaveCount(3) // 中臀筋・大腿二頭筋・腓腹筋
  })
})

test.describe('マーカーのズレ', () => {
  const viewports = [
    { name: 'phone', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ]

  test('端末幅が変わってもマーカーの画像内相対位置は一定', async ({ page }) => {
    await page.setViewportSize(viewports[0]!)
    await page.goto('/')
    await page.locator('[data-marker="trunk"]').waitFor()

    const relatives: Record<string, { rx: number; ry: number }> = {}
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.waitForFunction((w) => Math.abs(document.documentElement.clientWidth - (w as number)) < 2, vp.width)
      const img = await rectOf(page, '[data-testid="anatomy-image"]')
      const marker = await rectOf(page, '[data-marker="trunk"] circle')
      relatives[vp.name] = {
        rx: (marker.x + marker.width / 2 - img.x) / img.width,
        ry: (marker.y + marker.height / 2 - img.y) / img.height,
      }
    }
    const base = relatives.phone!
    for (const vp of viewports) {
      const r = relatives[vp.name]!
      expect(Math.abs(r.rx - base.rx), `${vp.name} の x ズレ`).toBeLessThan(0.002)
      expect(Math.abs(r.ry - base.ry), `${vp.name} の y ズレ`).toBeLessThan(0.002)
    }
  })

  test('体幹のマーカーは実データの重心 (865,480) に出る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await page.locator('[data-marker="trunk"]').waitFor()
    const img = await rectOf(page, '[data-testid="anatomy-image"]')
    const box = await rectOf(page, '[data-marker="trunk"] circle')
    expect((box.x + box.width / 2 - img.x) / img.width).toBeCloseTo(865 / IMAGE.w, 2)
    expect((box.y + box.height / 2 - img.y) / img.height).toBeCloseTo(480 / IMAGE.h, 2)
  })
})

test.describe('タップ', () => {
  test('筋をタップすると、その筋の解説が出る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'fore')
    for (const [id, ja] of [
      ['muscle-triceps', '上腕三頭筋'],
      ['muscle-pectoral', '胸筋'],
      ['muscle-ecr', '橈側手根伸筋'],
    ] as const) {
      const box = await rectOf(page, `[data-part="${id}"]`)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(ja)
      await page.getByRole('button', { name: '閉じる' }).click()
    }
  })

  test('馬体の外をタップしても誤爆せん', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    const img = await rectOf(page, '[data-testid="anatomy-image"]')
    await page.mouse.click(img.x + 6, img.y + 6)
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  })

  test('下書きの座標は破線で描いて、確定済みと見分けられる', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    await expect(page.locator('[data-part][data-source="draft"]').first()).toBeVisible()
  })
})

test.describe('ズーム', () => {
  test('拡大してもマーカーとラベルの見た目サイズは変わらん', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'hind')
    const box = await rectOf(page, '[data-part="muscle-gluteus"]')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const label = page.locator('svg text').filter({ hasText: '中臀筋' }).first()
    await label.waitFor()
    const dot = page.locator('svg circle[r="5"]').first()
    const before = { label: (await label.boundingBox())!, dot: (await dot.boundingBox())! }
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '拡大' }).click()
    await page.waitForTimeout(250)
    const after = { label: (await label.boundingBox())!, dot: (await dot.boundingBox())! }
    expect(Math.abs(after.label.height - before.label.height), 'ラベル高さ').toBeLessThanOrEqual(1)
    expect(Math.abs(after.label.width - before.label.width), 'ラベル幅').toBeLessThanOrEqual(1)
    expect(Math.abs(after.dot.width - before.dot.width), '点の直径').toBeLessThanOrEqual(1)
  })

  test('拡大するとマーカーは離れる（絵と一緒に拡大されとる証拠）', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    const gap = async () => {
      const a = await rectOf(page, '[data-marker="head"] circle')
      const b = await rectOf(page, '[data-marker="hind"] circle')
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const before = await gap()
    await page.getByRole('button', { name: '拡大' }).click()
    await page.waitForTimeout(250)
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
