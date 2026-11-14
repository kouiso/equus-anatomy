import { expect, test, type Locator, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * Issue #255（#260・#261）— 解剖画面から離れずに層・向き・深さを切り替えるチップ。
 * 390px では何も選んでいない時の説明欄、1440px では右の欄の上に常に出す。
 * 図の枠（anatomy-svg）は、選択・解除・層や深さの切替で動かない（doc/handoff.md 守るべきこと 9）。
 */
type Box = { x: number; y: number; width: number; height: number }

const chip = (page: Page, id: string) => page.getByTestId(`chip-${id}`)
const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

const svgBox = (page: Page) => boxOf(page.getByTestId('anatomy-svg'))

async function expectSameBox(page: Page, before: Box, what: string, sizeOnly = false) {
  // 寸法の追従は1描画遅れる。落ち着いてから比べる
  await waitForCanvasLayout(page)
  const after = await svgBox(page)
  // 短い画面では図と欄が外側のスクロールに並ぶので、スクロールで動くのは位置。枠の大きさだけ比べる
  if (sizeOnly) expect({ width: after.width, height: after.height }, `${what}で図の大きさが変わった`).toEqual({ width: before.width, height: before.height })
  else expect(after, `${what}で図の枠が動いた`).toEqual(before)
}

async function clickCenter(page: Page, selector: string) {
  await waitForCanvasLayout(page)
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function pickArea(page: Page) {
  await page.locator(markerDot('fore')).waitFor()
  await clickCenter(page, markerDot('fore'))
  // 場所→部位切替直後のタップは pick-guard で捨てられる(#67)
  await page.waitForTimeout(700)
}

async function pickAreaThenPart(page: Page) {
  await pickArea(page)
  await page.locator(markerDot('muscle-triceps')).waitFor()
  await clickCenter(page, markerDot('muscle-triceps'))
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('上腕三頭筋')
}

const viewBoxOf = (page: Page) => page.getByTestId('anatomy-svg').getAttribute('viewBox')

test.describe('解剖画面の条件チップ（390px）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('何も選んでいない時、層・向きのチップが説明欄に出て、深さは筋肉の時だけ出る', async ({ page }) => {
    await page.goto('/')
    const panel = page.getByTestId('anatomy-panel')
    for (const id of ['skin', 'muscle', 'skeleton', 'organs', 'left', 'right', 'front', 'rear', 'superficial', 'deep']) {
      await expect(panel.getByTestId(`chip-${id}`), id).toBeVisible()
    }
    await expect(chip(page, 'muscle')).toHaveAttribute('aria-checked', 'true')
    await expect(chip(page, 'left')).toHaveAttribute('aria-checked', 'true')
    await expect(chip(page, 'superficial')).toHaveAttribute('aria-checked', 'true')

    await chip(page, 'skeleton').click()
    await expect(chip(page, 'superficial')).toHaveCount(0)
    await expect(chip(page, 'deep')).toHaveCount(0)
  })

  test('骨格を押すとその場で図が骨格の図に替わる', async ({ page }) => {
    await page.goto('/')
    await waitForCanvasLayout(page)
    const before = await page.getByTestId('anatomy-image').getAttribute('href')
    await chip(page, 'skeleton').click()
    await expect(chip(page, 'skeleton')).toHaveAttribute('aria-checked', 'true')
    await expect(chip(page, 'muscle')).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    await expect.poll(() => page.getByTestId('anatomy-image').getAttribute('href')).not.toBe(before)
    // 表示条件の別画面へ行っていない
    await expect(page).not.toHaveURL(/overlay/)
  })

  test('向きを押すと図が替わる', async ({ page }) => {
    await page.goto('/')
    await chip(page, 'front').click()
    await expect(chip(page, 'front')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
  })

  test('絵の無い深層筋のチップは押せず、押せる組み合わせだけ図に着地する', async ({ page }) => {
    await page.goto('/')
    await expect(chip(page, 'deep')).toBeDisabled()
    await expect(chip(page, 'deep')).not.toHaveAttribute('aria-checked', 'true')
    await chip(page, 'deep').click({ force: true })
    await expect(chip(page, 'superficial')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('anatomy-no-image')).toHaveCount(0)
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
  })

  test('層を替えても、選んでいる場所と寄りは残る', async ({ page }) => {
    await page.goto('/')
    await pickArea(page)
    await expect(page.getByTestId('step-back')).toBeVisible()
    const zoomBefore = await viewBoxOf(page)
    await chip(page, 'skeleton').click()
    await expect(chip(page, 'skeleton')).toHaveAttribute('aria-checked', 'true')
    expect(await viewBoxOf(page)).toBe(zoomBefore)
    await expect(page.getByTestId('step-back')).toBeVisible()
    await expect(page.getByTestId('anatomy-image')).toBeVisible()
    // 向きを替えると場所と寄りが外れる（今の動きのまま）
    await chip(page, 'front').click()
    await expect(page.getByTestId('step-back')).toHaveCount(0)
  })

  test('部位の選択・解除・層の切替で図の枠が動かない', async ({ page }) => {
    await page.goto('/')
    await waitForCanvasLayout(page)
    const initial = await svgBox(page)

    await chip(page, 'skeleton').click()
    await expectSameBox(page, initial, '層の切替')
    await chip(page, 'muscle').click()
    await expectSameBox(page, initial, '層を戻す')

    await pickArea(page)
    await expectSameBox(page, initial, '場所の選択')

    await page.locator(markerDot('muscle-triceps')).waitFor()
    await clickCenter(page, markerDot('muscle-triceps'))
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('上腕三頭筋')
    await expectSameBox(page, initial, '部位の選択')

    await page.getByRole('button', { name: '選択を解除', exact: true }).click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
    await expectSameBox(page, initial, '部位の解除')

    await chip(page, 'skeleton').click()
    await expectSameBox(page, initial, '場所を選んだままの層の切替')
  })

  test('部位を選んでいる間は説明欄にチップを出さず、名前と操作が先に見える', async ({ page }) => {
    await page.goto('/')
    await pickAreaThenPart(page)
    await expect(chip(page, 'skeleton')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '選択を解除', exact: true })).toBeVisible()
  })

  test('表示条件の別画面と入口のボタンは残っている', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('conditions')).toBeVisible()
  })
})

test.describe('解剖画面の条件チップ（1440px）', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('右の欄の上に層・向き・深さのチップが常に出る', async ({ page }) => {
    await page.goto('/')
    await waitForCanvasLayout(page)
    const panel = await boxOf(page.getByTestId('anatomy-panel'))
    // 図の右隣に 320px の欄がある
    expect(panel.width).toBeCloseTo(320, 0)
    const figure = await svgBox(page)
    expect(figure.x + figure.width).toBeLessThanOrEqual(panel.x + 1)
    const layerChip = await boxOf(chip(page, 'skin'))
    expect(layerChip.x).toBeGreaterThanOrEqual(panel.x)
    expect(layerChip.x + layerChip.width).toBeLessThanOrEqual(panel.x + panel.width + 1)
    // 欄の上に置く。先頭の層が欄の上端から近い
    expect(layerChip.y - panel.y).toBeLessThan(80)
    for (const id of ['muscle', 'skeleton', 'organs', 'left', 'right', 'front', 'rear', 'superficial', 'deep']) {
      await expect(chip(page, id), id).toBeVisible()
    }
    const initial = await svgBox(page)

    await chip(page, 'skeleton').click()
    await expect(chip(page, 'skeleton')).toHaveAttribute('aria-checked', 'true')
    await expectSameBox(page, initial, '層の切替')
    await chip(page, 'muscle').click()
    await expectSameBox(page, initial, '層を戻す')
  })

  test('部位を選んでいる間も、チップは右の欄の一番上に出続け、名前と要約はその下に出て、枠は動かない', async ({ page }) => {
    await page.goto('/')
    await waitForCanvasLayout(page)
    const initial = await svgBox(page)
    const chipsTop = async () => {
      const chips = await boxOf(page.getByTestId('condition-chips'))
      const panel = await boxOf(page.getByTestId('anatomy-panel'))
      expect(chips.y - panel.y, 'チップが欄の上端から離れた').toBeLessThan(40)
      return chips.y + chips.height
    }
    // 選択なし: ヒントの文もチップの下
    const bottomEmpty = await chipsTop()
    const hint = await boxOf(page.getByText('大まかな場所を選んでください'))
    expect(hint.y, '選択なしでヒントがチップより上にある').toBeGreaterThanOrEqual(bottomEmpty)

    await pickAreaThenPart(page)
    // 選択あり: 部位の名前（見出し）と要約はチップの下
    const bottomSelected = await chipsTop()
    const name = await boxOf(page.getByRole('heading', { level: 2 }))
    expect(name.y, '部位の名前がチップより上にある').toBeGreaterThanOrEqual(bottomSelected)
    for (const id of ['skin', 'left', 'superficial']) await expect(chip(page, id), id).toBeVisible()
    await expectSameBox(page, initial, '部位の選択')
  })

  test('選択中に層のチップを押すと図が替わり、選んでいた部位は外れる（場所と寄りは残る）', async ({ page }) => {
    await page.goto('/')
    await pickAreaThenPart(page)
    const zoomBefore = await viewBoxOf(page)
    const initial = await svgBox(page)
    await chip(page, 'skeleton').click()
    await expect(chip(page, 'skeleton')).toHaveAttribute('aria-checked', 'true')
    // changeConditions は選択中の部位を外す。#255 が約束するのは場所と寄りが残る事だけ
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
    expect(await viewBoxOf(page)).toBe(zoomBefore)
    await expect(page.getByTestId('step-back')).toBeVisible()
    await expectSameBox(page, initial, '選択中の層の切替')
  })

  test('深層筋のチップは「図なし」と字面で分かる', async ({ page }) => {
    await page.goto('/')
    await expect(chip(page, 'deep')).toBeDisabled()
    await expect(chip(page, 'deep')).toContainText('深層筋（図なし）')
  })
})

test.describe('解剖画面の条件チップ（320px・文字200%）', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('チップが折り返して幅に収まり、欄の中でスクロールして届き、主要なボタンは隠れない', async ({ page }) => {
    await installTwoTimesTextScale(page)
    await page.goto('/')
    await waitForCanvasLayout(page)
    const initial = await svgBox(page)
    const scroll = page.getByTestId('anatomy-panel-scroll')

    // 欄の中身が欄より長く、欄の中でスクロールする（ページ全体は伸ばさん）
    const overflow = await scroll.evaluate((el) => ({ scroll: el.scrollHeight, client: el.clientHeight }))
    expect(overflow.scroll).toBeGreaterThan(overflow.client)
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(pageOverflow).toBeLessThanOrEqual(0)

    for (const id of ['skin', 'muscle', 'skeleton', 'organs', 'left', 'right', 'front', 'rear', 'superficial', 'deep']) {
      const target = chip(page, id)
      await target.scrollIntoViewIfNeeded()
      const panelBox = await boxOf(page.getByTestId('anatomy-panel'))
      const box = await boxOf(target)
      expect(box.x, `${id} の左`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `${id} の右が 320px を越えた`).toBeLessThanOrEqual(320)
      // 欄の見える範囲に入っている（欄の外へ切れていない）
      expect(box.y, `${id} の上`).toBeGreaterThanOrEqual(panelBox.y - 1)
      expect(box.y + box.height, `${id} の下`).toBeLessThanOrEqual(panelBox.y + panelBox.height + 1)
    }

    // 主要なボタン（部位一覧・拡大・表示条件）が画面内に残る
    for (const id of ['part-selector', 'zoom-in', 'conditions']) {
      const box = await boxOf(page.getByTestId(id))
      expect(box.y, id).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height, id).toBeLessThanOrEqual(568)
      expect(box.x + box.width, id).toBeLessThanOrEqual(320)
    }

    await chip(page, 'skeleton').click()
    await expect(chip(page, 'skeleton')).toHaveAttribute('aria-checked', 'true')
    await expectSameBox(page, initial, '層の切替', true)
  })
})
