import { expect, test, type Locator, type Page } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'
import { waitForCanvasLayout } from './canvas-layout'

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('操作の矩形を取得できない')
  return box
}

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(locale, () => {
    test.use({ locale })
    for (const width of [320, 390]) {
      for (const largeText of [false, true]) {
        test(`part selector ${width} text ${largeText ? '2x' : '1x'}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 844 })
          if (largeText) await installTwoTimesTextScale(page)
          await page.goto('/')
          await expect(page.getByTestId('demo-note')).toBeVisible()
          expect(await page.getByTestId('demo-note').evaluate(element => element.scrollHeight <= element.clientHeight), '監修前の注記が途中で切れている').toBe(true)
          const selector = page.getByTestId('part-selector')
          await expect(selector).toBeVisible({ timeout: 3000 })
          const button = await boxOf(selector)
          const canvas = await boxOf(page.getByTestId('anatomy-svg'))
          const zoom = await boxOf(page.getByTestId('zoom-in'))
          expect(button.x - canvas.x).toBeCloseTo(12, 0)
          expect(button.y - canvas.y).toBeCloseTo(12, 0)
          expect(button.height).toBeGreaterThanOrEqual(48)
          expect(button.width).toBeGreaterThanOrEqual(48)
          expect(button.x + button.width).toBeLessThanOrEqual(zoom.x - 12)
          for (const id of ['zoom-in', 'zoom-out', 'zoom-reset']) {
            const rect = await boxOf(page.getByTestId(id))
            expect(rect.height).toBeGreaterThanOrEqual(48)
            expect(rect.width).toBeGreaterThanOrEqual(48)
          }
          await page.getByTestId('zoom-in').click()
          const back = page.getByTestId('step-back')
          await expect(back).toBeVisible()
          const backBox = await boxOf(back)
          expect(backBox.y).toBeGreaterThanOrEqual(button.y + button.height + 12)
          expect(backBox.height).toBeGreaterThanOrEqual(48)
          await back.click()
          await expect(back).toHaveCount(0)
          if (process.env.EQUUS_EVIDENCE_DIR) {
            await page.screenshot({ path: `${process.env.EQUUS_EVIDENCE_DIR}/${locale}-${width}-${largeText ? '2x' : '1x'}.png` })
          }
          // 表示条件は図の左下に重なり、パネルの真上で、上段の操作と重ならない(Issue #178)
          const conditions = page.getByTestId('conditions')
          await expect(conditions).toBeVisible()
          const cond = await boxOf(conditions)
          expect(cond.x - canvas.x).toBeCloseTo(12, 0)
          expect(canvas.y + canvas.height - (cond.y + cond.height)).toBeCloseTo(12, 0)
          expect(cond.height).toBeGreaterThanOrEqual(48)
          expect(cond.width).toBeGreaterThanOrEqual(48)
          expect(cond.x + cond.width).toBeLessThanOrEqual(canvas.x + canvas.width - 12)
          expect(cond.y).toBeGreaterThanOrEqual(button.y + button.height + 12)
          await expect(page.getByTestId('anatomy-panel').getByRole('button')).toHaveCount(0)
          await selector.click()
          await expect(page).toHaveURL(/kind=parts/)
          await expect(page.getByRole('heading', { name: locale === 'ja-JP' ? '場所・部位一覧' : 'Areas & parts', exact: true })).toBeVisible()
          await page.getByTestId('overlay-close').click()
          await expect(selector).toBeVisible()
          await page.getByRole('button', { name: locale === 'ja-JP' ? '表示条件' : 'View options', exact: true }).click()
          await expect(page).toHaveURL(/kind=conditions/)
        })
      }
    }

    // 部位を選ぶと詳しく読むが表示条件の上に積まれ、どちらも戻る操作と重ならない(Issue #178)
    for (const width of [320, 375, 390]) {
      test(`overlay actions stack above the panel ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 })
        await installTwoTimesTextScale(page)
        await page.goto('/?part=muscle-brachiocephalicus')
        await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
        const canvas = await boxOf(page.getByTestId('anatomy-svg'))
        const read = await boxOf(page.getByTestId('read-more'))
        const conditions = await boxOf(page.getByTestId('conditions'))
        const back = await boxOf(page.getByTestId('step-back'))
        const zoom = await boxOf(page.getByTestId('zoom-in'))
        for (const box of [read, conditions]) {
          expect(box.height).toBeGreaterThanOrEqual(48)
          expect(box.x - canvas.x).toBeCloseTo(12, 0)
          expect(box.x + box.width).toBeLessThanOrEqual(canvas.x + canvas.width - 12)
        }
        expect(read.y + read.height + 12).toBeLessThanOrEqual(conditions.y + 0.5)
        expect(canvas.y + canvas.height - (conditions.y + conditions.height)).toBeCloseTo(12, 0)
        expect(read.y + read.height, 'パネルの戻る操作と重なる').toBeLessThanOrEqual(back.y)
        expect(read.x + read.width <= zoom.x || read.y >= zoom.y + zoom.height).toBe(true)
        for (const id of ['read-more', 'conditions']) {
          const clipped = await page.getByTestId(id).evaluate((el) => {
            const text = el.querySelector('div') ?? el
            return text.scrollWidth > text.clientWidth
          })
          expect(clipped, `${id} の文字が省略されている`).toBe(false)
        }
        await page.getByTestId('read-more').click()
        await expect(page.getByTestId('part-sheet')).toBeVisible()
      })
    }

    // 横向きの低い画面でも、意図的にパネルへスクロールして戻る操作を押せること。
    test('step back remains usable in short landscape flow', async ({ page }) => {
      await page.setViewportSize({ width: 568, height: 320 })
      await page.goto('/')
      await expect(page.getByTestId('part-selector')).toBeVisible({ timeout: 3000 })
      await page.getByTestId('zoom-in').click()
      const back = page.getByTestId('step-back')
      await expect(back).toBeVisible()
      await showPanel(page)
      const panel = await boxOf(page.getByTestId('anatomy-panel'))
      const backBox = await boxOf(back)
      expect(backBox.y).toBeGreaterThanOrEqual(panel.y)
      expect(backBox.y + backBox.height).toBeLessThanOrEqual(320)
      expect(backBox.height).toBeGreaterThanOrEqual(48)
      await clickActualCenter(page,back)
      await expect(back).toHaveCount(0)
    })

    // 図が低すぎて左下に収まらん時は、表示条件と詳しく読むが下のパネルに残り押せる(Issue #178 の退避経路)
    test('actions fall back to the panel in a short wide canvas', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 320 })
      await page.goto('/?part=muscle-brachiocephalicus')
      await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
      await waitForCanvasLayout(page)
      expect((await boxOf(page.getByTestId('anatomy-svg'))).height).toBeLessThan(192)
      await expect(page.getByTestId('canvas-actions')).toHaveCount(0)
      const panelButtons = page.getByTestId('anatomy-panel').getByRole('button')
      await expect(panelButtons.filter({ hasText: locale === 'ja-JP' ? '表示条件' : 'View options' })).toHaveCount(1)
      await expect(panelButtons.filter({ hasText: locale === 'ja-JP' ? '詳しく読む' : 'Read more' })).toHaveCount(1)
      for (const button of await panelButtons.all()) {
        expect((await boxOf(button)).height).toBeGreaterThanOrEqual(44)
      }
    })
  })
}

async function wheelOuter(page: Page, delta: number) {
  const flow = page.getByTestId('anatomy-flow')
  if (!await flow.count()) return
  const box = await boxOf(flow)
  await page.mouse.move(box.x + 2, box.y + 2)
  await page.mouse.wheel(0, delta)
  if (delta < 0) await expect.poll(() => flow.evaluate(element => element.scrollTop)).toBe(0)
  else await expect.poll(() => flow.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
}

async function showCanvasActions(page: Page) {
  await wheelOuter(page, -1000)
  await wheelOuter(page, 120)
}

async function showPanel(page: Page) {
  await wheelOuter(page, -1000)
  await wheelOuter(page, 1000)
}

async function clickActualCenter(page: Page, button: Locator) {
  await expect.poll(() => button.evaluate(element => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return hit !== null && element.contains(hit)
  }), { message: '現在の押下点で操作できない' }).toBe(true)
  const box = await boxOf(button)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(`masseter content ${locale}`, () => {
    test.use({ locale })
    for (const viewport of [{width:320,height:844},{width:390,height:844},{width:320,height:568}]) {
      for (const scale of [1,2]) {
        if (viewport.height === 568 && scale === 1) continue
        test(`${viewport.width}x${viewport.height} ${scale}x keeps diagram and content usable`, async ({page}) => {
          await page.setViewportSize(viewport)
          if (scale === 2) await installTwoTimesTextScale(page)
          await page.goto('/')
          await waitForCanvasLayout(page)
          const selector = page.getByTestId('part-selector')
          const name = locale === 'ja-JP' ? '咬筋' : 'Masseter'
          await selector.click()
          await page.getByRole('button',{name,exact:true}).click()
          await waitForCanvasLayout(page)
          const marker = page.getByTestId('marker-selected-muscle-masseter')
          const label = page.getByTestId('marker-label-muscle-masseter')
          await expect(label.locator('text')).toBeVisible()
          await expect(label.locator('text')).toHaveText(name)
          const back = page.getByTestId('step-back')
          const clear = page.getByTestId('close-sheet')
          const read = page.getByRole('button',{name:locale === 'ja-JP'?'詳しく読む':'Read more',exact:true})
          const conditions = page.getByRole('button',{name:locale === 'ja-JP'?'表示条件':'View options',exact:true})
          // SVGの線や透明なフォント余白ではなく、実際の選択円とラベル面を比較する。
          for (const target of [marker,label.locator('rect')]) {
            const shape = await boxOf(target)
            expect(shape.y).toBeGreaterThanOrEqual(0)
            expect(shape.y + shape.height).toBeLessThanOrEqual(viewport.height)
            for (const control of [selector,back,read,conditions,...['zoom-in','zoom-out','zoom-reset'].map(id=>page.getByTestId(id))]) {
              const box = await boxOf(control)
              expect(shape.x < box.x + box.width && box.x < shape.x + shape.width &&
                shape.y < box.y + box.height && box.y < shape.y + shape.height, '固定操作が選択した咬筋を覆っている').toBe(false)
            }
          }
          const evidence = process.env.EQUUS_EVIDENCE_DIR
          const key = `${locale}-${viewport.width}x${viewport.height}-${scale}x`
          if (evidence) await page.screenshot({path:`${evidence}/${key}-diagram.png`})
          await showPanel(page)
          await expect(async () => {
            const panel = await boxOf(page.getByTestId('anatomy-panel'))
            const scroll = await boxOf(page.getByTestId('anatomy-panel-scroll'))
            const glyph = await page.getByRole('heading',{level:2}).evaluate(element=>{
              const range=document.createRange();range.selectNodeContents(element)
              const box=range.getBoundingClientRect()
              return {top:box.y,bottom:box.bottom,left:box.x,right:box.right}
            })
            expect(glyph.top).toBeGreaterThanOrEqual(Math.max(0,panel.y))
            expect(glyph.bottom,'見出しの全字が読めない').toBeLessThanOrEqual(scroll.y)
            expect(glyph.left).toBeGreaterThanOrEqual(0)
            expect(glyph.right).toBeLessThanOrEqual(viewport.width)
            const line=await page.getByTestId('deselect-hint').evaluate(element=>({top:element.getBoundingClientRect().y,height:Number.parseFloat(getComputedStyle(element).lineHeight)}))
            expect(line.top).toBeGreaterThanOrEqual(scroll.y)
            expect(line.top+line.height,'本文を1行も完全に読めない').toBeLessThanOrEqual(Math.min(viewport.height,scroll.y+scroll.height))
            for (const button of [back,clear]) {
              const box=await boxOf(button)
              expect(box.height).toBeGreaterThanOrEqual(44)
              expect(await button.locator('[dir="auto"]').evaluate(element => {
                const range=document.createRange();range.selectNodeContents(element)
                const glyph=range.getBoundingClientRect(), box=element.getBoundingClientRect()
                return element.scrollWidth > element.clientWidth || glyph.x < box.x-0.5 || glyph.right > box.right+0.5 || glyph.bottom > box.bottom+0.5
              }), '戻る・選択解除の文言が省略されている').toBe(false)
              expect(box.y).toBeGreaterThanOrEqual(panel.y)
              expect(box.y+box.height).toBeLessThanOrEqual(Math.min(viewport.height,panel.y+panel.height)+0.5)
            }
          }).toPass({timeout:3000})
          if (evidence) await page.screenshot({path:`${evidence}/${key}-readable-panel.png`})
          const body=page.getByTestId('anatomy-panel-scroll')
          const needsScroll=await body.evaluate(element=>element.scrollHeight>element.clientHeight)
          if (needsScroll) {
            const before=await body.evaluate(element=>element.scrollTop)
            await body.hover();await page.mouse.wheel(0,200)
            await expect.poll(()=>body.evaluate(element=>element.scrollTop)).toBeGreaterThan(before)
            if (evidence) await page.screenshot({path:`${evidence}/${key}-body-scrolled.png`})
          }
          await showCanvasActions(page)
          for (const button of [read,conditions]) {
            const box=await boxOf(button)
            const canvas=await boxOf(page.getByTestId('anatomy-svg'))
            expect(box.x-canvas.x).toBeCloseTo(12,0)
            expect(box.height).toBeGreaterThanOrEqual(48)
            expect(box.y).toBeGreaterThanOrEqual(0)
            expect(box.y+box.height).toBeLessThanOrEqual(viewport.height)
          }
          await clickActualCenter(page,read)
          await expect(page.getByTestId('part-sheet')).toContainText(name)
          await page.getByTestId('overlay-close').click()
          await expect(page.getByTestId('overlay-close')).toHaveCount(0)
          await showCanvasActions(page)
          await clickActualCenter(page,conditions)
          await expect(page).toHaveURL(/kind=conditions/)
          await page.getByTestId('overlay-close').click()
          await expect(page.getByTestId('overlay-close')).toHaveCount(0)
          await showPanel(page)
          await clickActualCenter(page,clear)
          await expect(marker).toHaveCount(0)
          await wheelOuter(page,-1000)
          await selector.click()
          await page.getByRole('button',{name,exact:true}).click()
          await waitForCanvasLayout(page)
          await showPanel(page)
          await clickActualCenter(page,back)
          await expect(marker).toHaveCount(0)
          await clickActualCenter(page,back)
          await expect(back).toHaveCount(0)
          await wheelOuter(page,-1000)
          await expect(page.getByTestId('marker-dot-head')).toBeVisible()
        })
      }
    }
  })
}
