import { expect, test, type Locator, type Page } from '@playwright/test'
import { STRUCTURE_BY_ID } from '../src/core/data'
import { waitForCanvasLayout } from './canvas-layout'
import { installTwoTimesTextScale } from './tools/text-scale'

/**
 * 部位を選んだ時の説明欄を、デザイン review-2026-11-anatomy の列3（390px・部位を選んでいる時）に合わせる（#255）。
 *  - 並び: 名前 → 解除の案内 → 要約 → 状態の1行（向き · 層 · 深さ）→ 操作の1段
 *  - 操作は1段（1つ戻る・反対側・選択を解除）。入りきらん幅・文字の大きさ・言語では省略せず次の段へ折り返す
 *  - 状態の1行は 390×844 と 390×600 でスクロールせずに見える
 * スクロールバーを出した Chromium での往復の試験は status-line-scrollbar.spec.ts にある。
 */
const PART = 'muscle-masseter'
const SUMMARY_JA = STRUCTURE_BY_ID.get(PART)!.summary
const STATUS_JA = '左側望 · 筋肉 · 表層筋'
const ACTION_IDS = ['step-back', 'opposite-side', 'close-sheet'] as const
/** 説明欄の左右の余白（デザインの .pn2 の padding） */
const SIDE_PAD = 16

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

async function openPart(page: Page, viewport: { width: number; height: number }, part = PART) {
  await page.setViewportSize(viewport)
  await page.goto(`/?part=${part}`)
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
  await waitForCanvasLayout(page)
}

/** ボタンの文字が省略されず、単語の途中で折れてもいない（折り返すのは段で、文字ではない）。 */
async function expectLabelWhole(button: Locator, id: string) {
  const label = await button.locator('[dir="auto"]').evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const glyph = range.getBoundingClientRect()
    const box = element.getBoundingClientRect()
    return {
      clipped: element.scrollWidth > element.clientWidth || glyph.x < box.x - 0.5 || glyph.right > box.right + 0.5 || glyph.bottom > box.bottom + 0.5,
      height: box.height,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
    }
  })
  expect(label.clipped, `${id} の文字が省略されている`).toBe(false)
  expect(label.height, `${id} の文字がボタンの中で折り返している`).toBeLessThan(label.lineHeight * 1.5)
}

/** 操作の3つが1段に並び、どれも 44px 以上で、文字のある2つは同じ幅（デザインの flex:1 どうし）。 */
async function expectOneRow(page: Page, width: number) {
  const [back, side, clear] = await Promise.all(ACTION_IDS.map((id) => boxOf(page.getByTestId(id))))
  for (const [i, box] of [back!, side!, clear!].entries()) {
    expect(box.height, `${ACTION_IDS[i]} が 44px 未満`).toBeGreaterThanOrEqual(44)
    expect(box.y, `${ACTION_IDS[i]} が別の段にある`).toBeCloseTo(back!.y, 0)
    expect(box.height, `${ACTION_IDS[i]} の高さが揃っていない`).toBeCloseTo(back!.height, 0)
  }
  expect(back!.x).toBeCloseTo(SIDE_PAD, 0)
  expect(side!.x - (back!.x + back!.width), '1つ戻る と 反対側 の間隔').toBeCloseTo(6, 0)
  expect(side!.width).toBeCloseTo(48, 0)
  expect(clear!.x - (side!.x + side!.width), '反対側 と 選択を解除 の間隔').toBeCloseTo(6, 0)
  expect(clear!.x + clear!.width).toBeCloseTo(width - SIDE_PAD, 0)
  expect(Math.abs(back!.width - clear!.width), '1つ戻る と 選択を解除 の幅が揃っていない').toBeLessThanOrEqual(1.5)
  for (const id of ['step-back', 'close-sheet']) await expectLabelWhole(page.getByTestId(id), id)
}

/** 状態の1行が本文（スクロールする中身）にあり、スクロールせずに全部見える。 */
async function expectStatusVisibleWithoutScroll(page: Page) {
  const scroll = page.getByTestId('anatomy-panel-scroll')
  const status = scroll.getByTestId('view-status')
  await expect(status).toHaveText(STATUS_JA)
  expect(await scroll.evaluate((element) => element.scrollTop)).toBe(0)
  const s = await boxOf(status)
  const body = await boxOf(scroll)
  const back = await boxOf(page.getByTestId('step-back'))
  expect(s.y, '状態の1行が本文の上へはみ出す').toBeGreaterThanOrEqual(body.y)
  expect(s.y + s.height, '状態の1行が本文の下で切れる').toBeLessThanOrEqual(body.y + body.height + 0.5)
  expect(s.y + s.height, '状態の1行が操作の段に隠れる').toBeLessThanOrEqual(back.y + 0.5)
}

test.describe('390px・日本語（デザインの列3）', () => {
  test('390×844: 名前・案内・要約・状態の1行・操作の1段が、この順に並ぶ', async ({ page }) => {
    const viewport = { width: 390, height: 844 }
    await openPart(page, viewport)
    const panel = page.getByTestId('anatomy-panel')
    const hint = page.getByTestId('deselect-hint')
    await expect(hint).toHaveText('図の空白をタップしても選択を解除できます')
    const boxes = [
      await boxOf(page.getByRole('heading', { level: 2 })),
      await boxOf(hint),
      await boxOf(panel.getByText(SUMMARY_JA, { exact: true })),
      await boxOf(panel.getByTestId('view-status')),
      await boxOf(page.getByTestId('step-back')),
    ]
    const names = ['名前', '解除の案内', '要約', '状態の1行', '操作の段']
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.y, `${names[i]} が ${names[i - 1]} より上にある`).toBeGreaterThanOrEqual(boxes[i - 1]!.y + boxes[i - 1]!.height - 0.5)
    }
    // デザインの余白: 名前は説明欄の上から 12px、操作の段は下から 12px
    const p = await boxOf(panel)
    expect(boxes[0]!.y - p.y).toBeCloseTo(12, 0)
    expect(p.y + p.height - (boxes[4]!.y + boxes[4]!.height)).toBeCloseTo(12, 0)
    await expectOneRow(page, viewport.width)
    await expectStatusVisibleWithoutScroll(page)
  })

  test('390×600: 操作は1段で、状態の1行はスクロールせずに見える', async ({ page }) => {
    const viewport = { width: 390, height: 600 }
    await openPart(page, viewport)
    await expectOneRow(page, viewport.width)
    await expectStatusVisibleWithoutScroll(page)
  })

  test('反対側の無い部位は、1つ戻る と 選択を解除 の2つが同じ幅で1段に並ぶ', async ({ page }) => {
    await openPart(page, { width: 390, height: 844 }, 'organ-spleen')
    await expect(page.getByTestId('opposite-side')).toHaveCount(0)
    const back = await boxOf(page.getByTestId('step-back'))
    const clear = await boxOf(page.getByTestId('close-sheet'))
    expect(clear.y).toBeCloseTo(back.y, 0)
    expect(back.x).toBeCloseTo(SIDE_PAD, 0)
    expect(clear.x - (back.x + back.width)).toBeCloseTo(6, 0)
    expect(clear.x + clear.width).toBeCloseTo(390 - SIDE_PAD, 0)
    expect(Math.abs(back.width - clear.width)).toBeLessThanOrEqual(1.5)
    for (const box of [back, clear]) expect(box.height).toBeGreaterThanOrEqual(44)
  })

  for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 600 }]) {
    test(`${viewport.width}×${viewport.height}: 部位を選んでも図の枠は動かない`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await expect(page.getByTestId('part-selector')).toBeVisible()
      await waitForCanvasLayout(page)
      const before = await boxOf(page.getByTestId('anatomy-svg'))
      await openPart(page, viewport)
      const after = await boxOf(page.getByTestId('anatomy-svg'))
      expect(after.y).toBeCloseTo(before.y, 0)
      expect(after.height).toBeCloseTo(before.height, 0)
    })
  }
})

/** 20 回（50ms おき）測って、説明欄の部品と図の枠が1か所に落ち着いていること。 */
async function expectSettled(page: Page) {
  const frames: string[] = []
  for (let i = 0; i < 20; i++) {
    frames.push(await page.evaluate((ids) => ids.map((id) => {
      const b = document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect()
      return b ? `${id}:${b.x.toFixed(1)},${b.y.toFixed(1)},${b.width.toFixed(1)},${b.height.toFixed(1)}` : `${id}:none`
    }).join(' '), ['anatomy-svg', 'anatomy-panel', 'view-status', 'step-back', 'opposite-side', 'close-sheet']))
    await page.waitForTimeout(50)
  }
  expect(new Set(frames).size, `置き場が動いた:\n${[...new Set(frames)].join('\n')}`).toBe(1)
}

for (const c of [
  { name: '320×844・日本語・文字200%', width: 320, height: 844, locale: 'ja-JP', textScale: true },
  { name: '390×844・日本語・文字200%', width: 390, height: 844, locale: 'ja-JP', textScale: true },
  { name: '320×844・英語・等倍', width: 320, height: 844, locale: 'en-US', textScale: false },
  { name: '390×844・英語・等倍', width: 390, height: 844, locale: 'en-US', textScale: false },
  { name: '390×844・英語・文字200%', width: 390, height: 844, locale: 'en-US', textScale: true },
]) {
  test.describe(c.name, () => {
    test.use({ locale: c.locale })
    test('操作は省略せずに折り返し、状態の1行は説明欄の中のスクロールで読める', async ({ page }) => {
      if (c.textScale) await installTwoTimesTextScale(page)
      await openPart(page, c)
      if (c.textScale) await expect(page.getByTestId('view-status')).toHaveAttribute('data-e2e-text-scale', '2')
      await page.waitForTimeout(300)
      const panel = await boxOf(page.getByTestId('anatomy-panel'))
      const boxes: Box[] = []
      for (const id of ACTION_IDS) {
        const button = page.getByTestId(id)
        const box = await boxOf(button)
        expect(box.height, `${id} が 44px 未満`).toBeGreaterThanOrEqual(44)
        expect(box.x, `${id} が左へはみ出す`).toBeGreaterThanOrEqual(SIDE_PAD - 0.5)
        expect(box.x + box.width, `${id} が右へはみ出す`).toBeLessThanOrEqual(c.width - SIDE_PAD + 0.5)
        expect(box.y, `${id} が説明欄の上へはみ出す`).toBeGreaterThanOrEqual(panel.y)
        expect(box.y + box.height, `${id} が説明欄の下で切れる`).toBeLessThanOrEqual(panel.y + panel.height + 0.5)
        if (id !== 'opposite-side') await expectLabelWhole(button, id)
        for (const other of boxes) {
          const apart = box.x + box.width <= other.x + 0.5 || other.x + other.width <= box.x + 0.5 || box.y + box.height <= other.y + 0.5 || other.y + other.height <= box.y + 0.5
          expect(apart, `${id} が他の操作と重なる`).toBe(true)
        }
        boxes.push(box)
      }
      // 状態の1行は本文の中。入りきらん分は説明欄の中で縦にスクロールして読み、図の高さは変えない（デザインの列4の注記）
      const scroll = page.getByTestId('anatomy-panel-scroll')
      const status = scroll.getByTestId('view-status')
      const svgBefore = await boxOf(page.getByTestId('anatomy-svg'))
      const body = await boxOf(scroll)
      // 折り返して本文の窓より高くなる時（英語・文字200%）は1行ずつ読む。頭の行と末尾の行のどちらへも送れることを見る
      const lineHeight = await status.evaluate((element) => Number.parseFloat(getComputedStyle(element).lineHeight))
      await status.evaluate((element) => element.scrollIntoView({ block: 'start' }))
      const top = await boxOf(status)
      expect(top.y, '状態の1行の頭が本文の上で切れる').toBeGreaterThanOrEqual(body.y - 0.5)
      expect(top.y + lineHeight, '状態の1行の頭の行が本文の下で切れる').toBeLessThanOrEqual(body.y + body.height + 0.5)
      await status.evaluate((element) => element.scrollIntoView({ block: 'end' }))
      const s = await boxOf(status)
      expect(s.y + s.height, '状態の1行の末尾が本文の下で切れる').toBeLessThanOrEqual(body.y + body.height + 0.5)
      expect(s.y + s.height - lineHeight, '状態の1行の末尾の行が本文の上で切れる').toBeGreaterThanOrEqual(body.y - 0.5)
      expect(s.x + s.width, '状態の1行が右へはみ出す').toBeLessThanOrEqual(c.width)
      expect(await status.evaluate((element) => element.scrollWidth > element.clientWidth), '状態の1行が省略されている').toBe(false)
      expect(await boxOf(page.getByTestId('anatomy-svg'))).toEqual(svgBefore)
    })

    test('説明欄と図の枠が 20 回測っても動かない', async ({ page }) => {
      if (c.textScale) await installTwoTimesTextScale(page)
      await openPart(page, c)
      await page.waitForTimeout(300)
      await expectSettled(page)
    })
  })
}

test('390×844・日本語: 説明欄と図の枠が 20 回測っても動かない', async ({ page }) => {
  await openPart(page, { width: 390, height: 844 })
  await page.waitForTimeout(300)
  await expectSettled(page)
})

test.describe('部位を選んでいない時と横長は今まで通り', () => {
  test('390×844・何も選んでいない: 状態の1行は説明欄の本文に出る（Maestro が字で読む）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByTestId('anatomy-panel-scroll').getByTestId('view-status')).toHaveText(STATUS_JA)
    await expect(page.getByTestId('anatomy-panel').getByRole('button')).toHaveCount(0)
  })

  test('1440×900: 状態の1行は右の欄の要約の下、操作は2段のまま（#178）', async ({ page }) => {
    await openPart(page, { width: 1440, height: 900 })
    const panel = page.getByTestId('anatomy-panel')
    const summary = await boxOf(panel.getByText(SUMMARY_JA, { exact: true }))
    const status = await boxOf(panel.getByTestId('view-status'))
    expect(status.y).toBeGreaterThanOrEqual(summary.y + summary.height)
    const back = await boxOf(page.getByTestId('step-back'))
    const side = await boxOf(page.getByTestId('opposite-side'))
    const clear = await boxOf(page.getByTestId('close-sheet'))
    expect(side.y).toBeCloseTo(back.y, 0)
    expect(clear.y, '横長の 選択を解除 は2段目').toBeGreaterThanOrEqual(back.y + back.height)
    expect(status.y + status.height).toBeLessThanOrEqual(back.y)
  })
})
