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

  test('和名・英名・保存・覚えたにするの4つが1行で、小図と「解剖図で位置を見る」の下にある (#258)', async ({ page }) => {
    // 発音ボタンは音声合成がある端末だけ出る。この試験は4つが揃う前提なので、音声合成を用意する
    await page.addInitScript(() => {
      const synth = window.speechSynthesis
      synth.getVoices = () => [] as unknown as SpeechSynthesisVoice[]
      synth.speak = () => {}
      synth.cancel = () => {}
    })
    await page.goto(`/catalog/${DRAFT}`)
    const ids = ['speak-ja', 'speak-en', 'save-toggle', 'mastery-toggle']
    const boxes = []
    for (const id of ids) {
      const button = page.getByTestId(id)
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect(box, `${id} の位置が取れない`).not.toBeNull()
      boxes.push(box!)
    }
    const centres = boxes.map((b) => b.y + b.height / 2)
    expect(Math.max(...centres) - Math.min(...centres), `4つの縦中心がそろっていない: ${centres.join(', ')}`).toBeLessThanOrEqual(4)
    // 左から 和名 → 英名 → 保存 → 覚えたにする
    for (let i = 1; i < boxes.length; i += 1) expect(boxes[i]!.x).toBeGreaterThan(boxes[i - 1]!.x)

    const map = (await page.getByTestId('location-map').boundingBox())!
    const link = (await page.getByTestId('open-on-map').boundingBox())!
    const rowTop = Math.min(...boxes.map((b) => b.y))
    expect(rowTop).toBeGreaterThanOrEqual(map.y + map.height)
    expect(rowTop).toBeGreaterThanOrEqual(link.y + link.height)
    // 発音ピルは高さ 32 + hitSlop 上下 6 で実効 44。保存・覚えたは本体が 44 以上（#310 の追加確認）
    for (const b of boxes.slice(0, 2)) expect(b.height).toBeGreaterThanOrEqual(32)
    for (const b of boxes.slice(2)) expect(b.height).toBeGreaterThanOrEqual(44)
  })

  test('英語でも4つは切れずに折り返し、横にはみ出さない (#258)', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.addInitScript(() => {
      const synth = window.speechSynthesis
      synth.getVoices = () => [] as unknown as SpeechSynthesisVoice[]
      synth.speak = () => {}
      synth.cancel = () => {}
    })
    await page.goto(`/catalog/${DRAFT}`)
    const container = page.getByTestId('detail-actions')
    await expect(container).toBeVisible()
    const cBox = (await container.boundingBox())!
    for (const id of ['speak-ja', 'speak-en', 'save-toggle', 'mastery-toggle']) {
      const button = page.getByTestId(id)
      await expect(button, id).toBeVisible()
      const box = (await button.boundingBox())!
      expect(box.x, `${id} の左端が切れている`).toBeGreaterThanOrEqual(cBox.x - 0.5)
      expect(box.x + box.width, `${id} の右端が枠からはみ出している`).toBeLessThanOrEqual(cBox.x + cBox.width + 0.5)
    }
    const size = await container.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
    expect(size.sw).toBeLessThanOrEqual(size.cw)
    await noOverflow(page, 390)
    await context.close()
  })

  test('「解剖図で位置を見る」には › が付く (#258)', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    await expect(page.getByTestId('open-on-map').getByTestId('open-on-map-chevron')).toBeVisible()
  })

  test('小図を押すと解剖図へ移り、その部位が選ばれている', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    await page.getByTestId('location-map').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('咬筋')
  })

  test('小図は動かない（ホイールもドラッグも図を変えない）', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    const svg = page.getByTestId('location-map-svg')
    const snapshot = () =>
      svg.evaluate((el) => ({
        viewBox: el.getAttribute('viewBox'),
        transforms: [...el.querySelectorAll('[transform]')].map((n) => n.getAttribute('transform')),
        part: el.querySelector('[data-testid="location-map-part"]')?.getAttribute('d') ?? null,
      }))
    const before = await snapshot()
    const box = (await svg.boundingBox())!
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.wheel(0, -400)
    // ドラッグ。押して・動かして・離す。離した所が図の上でも、リンクの遷移は起きない距離で動かす
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 40, cy + 20, { steps: 8 })
    await page.mouse.move(cx - 30, cy - 10, { steps: 8 })
    await page.mouse.up()
    expect(await snapshot()).toEqual(before)
  })

  test('小図のリンクの読み上げ名に向き・層・下書きの注記が入り、文字リンクとは別名', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    await expect(page.getByTestId('location-map')).toHaveAttribute('aria-label', '解剖図で位置を見る（左側望 · 筋肉 · 下書きの位置）')
    await expect(page.getByTestId('open-on-map')).toHaveAttribute('aria-label', '解剖図で位置を見る')
    // 図そのものは飾りとして読み上げから外す
    await expect(page.getByTestId('location-map-svg')).toHaveAttribute('aria-hidden', 'true')
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
    expect(main.width).toBeGreaterThanOrEqual(640)
    expect(main.width).toBeLessThanOrEqual(720)
  })

  test('本文と小図の間は 28px（design の .loc の gap）', async ({ page }) => {
    await page.goto(`/catalog/${DRAFT}`)
    const main = (await page.getByTestId('detail-main').boundingBox())!
    const mapBox = (await page.getByTestId('location-map').boundingBox())!
    expect(Math.round(mapBox.x - (main.x + main.width))).toBe(28)
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
