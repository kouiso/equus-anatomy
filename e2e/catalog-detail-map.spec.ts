import { expect, test, type Page } from '@playwright/test'
import { GEOMETRY, STRUCTURE_BY_ID } from '../src/core/data'
import { canOpenOnMap } from '../src/core/map-entry'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * 図鑑の詳細の「位置の小図」(#258 / #272 / #273)。
 * 出す・出さないの境目は canOpenOnMap と同じ。押した先は「解剖図で位置を見る」と同じ。
 * 咬筋は座標が下書き（破線）、頭の皮膚は測った値、棘上筋は位置未登録。
 */
const DRAFT = 'muscle-masseter'
const MEASURED = 'skin-head'
const UNREGISTERED = 'muscle-supraspinatus'

test.describe('前提: 試験に使う部位の性質', () => {
  test('下書き・測定済み・位置未登録の3種が揃っている', () => {
    const sourceOf = (id: string) => GEOMETRY.left.parts.find((p) => p.id === id)?.source
    expect(sourceOf(DRAFT)).toBe('draft')
    expect(sourceOf(MEASURED)).toBe('measured')
    expect(canOpenOnMap(STRUCTURE_BY_ID.get(UNREGISTERED)!)).toBe(false)
  })
})

async function noOverflow(page: Page, width: number) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const box = await page.getByTestId('location-map').boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5)
}

test.describe('390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('名前の下に小図が出て、下に向きと層の文字がある', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    const map = page.getByTestId('location-map')
    await expect(map).toBeVisible()
    await expect(page.getByTestId('location-map-svg')).toBeVisible()
    const name = await page.getByTestId('detail-name-ja').boundingBox()
    const mapBox = await map.boundingBox()
    const link = await page.getByTestId('open-on-map').boundingBox()
    expect(mapBox!.y).toBeGreaterThanOrEqual(name!.y + name!.height)
    expect(mapBox!.width).toBeGreaterThan(300)
    expect(link!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height)
    await expect(page.getByTestId('location-map-caption')).toHaveText('左側望 · 筋肉 · 破線は下書きの位置')
    await expect(page.getByTestId('map-pending')).toHaveCount(0)
    await noOverflow(page, 390)
  })

  test('小図を押すと解剖図へ移り、その部位が選ばれている', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    await page.getByTestId('location-map').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('咬筋')
  })

  test('小図は動かない（ドラッグしても図は変わらず、移動もしない）', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    const svg = page.getByTestId('location-map-svg')
    const before = await svg.getAttribute('viewBox')
    const box = (await svg.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -400)
    await expect(svg).toHaveAttribute('viewBox', before!)
  })

  test('下書きの座標は破線、測った座標は実線で描く', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    await expect(page.getByTestId('location-map-part')).toHaveAttribute('stroke-dasharray', /\d/)
    await page.goto(`/catalog/${MEASURED}`)
    await expect(page.getByTestId('location-map-part')).toBeVisible()
    await expect(page.getByTestId('location-map-part')).not.toHaveAttribute('stroke-dasharray', /\d/)
    // 測った座標には破線の注記を付けない
    await expect(page.getByTestId('location-map-caption')).toHaveText('左側望 · 皮膚')
  })

  test('位置未登録の部位は小図も入口も出さず、準備中の文が出る', async ({ page }) => {
    await page.goto(`/catalog/${UNREGISTERED}`)
    await expect(page.getByTestId('detail-name-ja')).toBeVisible()
    await expect(page.getByTestId('location-map')).toHaveCount(0)
    await expect(page.getByTestId('open-on-map')).toHaveCount(0)
    await expect(page.getByTestId('map-pending')).toHaveText('解剖図への掲載は位置データ準備中です。')
  })
})

test.describe('1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('小図は本文の右にあり、本文の幅は 640〜720px', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    const map = page.getByTestId('location-map')
    await expect(map).toBeVisible()
    const main = (await page.getByTestId('detail-main').boundingBox())!
    const mapBox = (await map.boundingBox())!
    expect(main.width).toBeGreaterThanOrEqual(640)
    expect(main.width).toBeLessThanOrEqual(720)
    expect(mapBox.x).toBeGreaterThanOrEqual(main.x + main.width)
    // 名前の高さから始まる（本文の下まで押し下げられていない）
    const name = (await page.getByTestId('detail-name-ja').boundingBox())!
    expect(mapBox.y).toBeLessThan(name.y + name.height + 200)
    await expect(page.getByTestId('location-map-caption')).toHaveText('左側望 · 筋肉 · 破線は下書きの位置')
    await noOverflow(page, 1440)
  })

  test('本文の右に置いても、小図は押して解剖図へ移れる', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    await page.getByTestId('location-map').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('咬筋')
  })

  test('位置未登録の部位でも本文の幅は同じで、小図の場所は空く', async ({ page }) => {
    await page.goto(`/catalog/${UNREGISTERED}`)
    await expect(page.getByTestId('location-map')).toHaveCount(0)
    await expect(page.getByTestId('map-pending')).toBeVisible()
    const main = (await page.getByTestId('detail-main').boundingBox())!
    expect(main.width).toBeLessThanOrEqual(720)
  })
})

test.describe('320px・文字2倍', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('小図・文字・入口のどれも 320px からはみ出さない', async ({ page }) => {
    await installTwoTimesTextScale(page)
    await page.goto(`/catalog/${DRAFT}`)
    await expect(page.getByTestId('location-map')).toBeVisible()
    await expect(page.getByTestId('location-map-caption')).toBeVisible()
    await noOverflow(page, 320)
    for (const id of ['location-map-caption', 'open-on-map']) {
      const box = (await page.getByTestId(id).boundingBox())!
      expect(box.x, id).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, id).toBeLessThanOrEqual(320.5)
    }
    const caption = page.getByTestId('location-map-caption')
    const size = await caption.evaluate((el) => ({ w: el.clientWidth, sw: el.scrollWidth }))
    expect(size.sw).toBeLessThanOrEqual(size.w + 1)
  })
})
