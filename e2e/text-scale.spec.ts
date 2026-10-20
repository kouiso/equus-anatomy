import { expect, test, type Locator, type Page } from '@playwright/test'
import { STRUCTURES } from '../src/core/data'
import { installTwoTimesTextScale } from './tools/text-scale'
import { waitForCanvasLayout } from './canvas-layout'

// 件数は実データから導く（部位追加で固定値が腐る事故を防ぐ）
const CATALOG_TOTAL = STRUCTURES.length

test.use({ viewport: { width: 320, height: 568 } })

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** 縦に1文字ずつ割れとらんか。行の高さ1.5行ぶん未満なら1行に収まっとる */
async function expectSingleLine(locator: Locator) {
  const { height, lineHeight } = await locator.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }))
  expect(height, `「${await locator.textContent()}」が折り返しとる`).toBeLessThan(lineHeight * 1.5)
}

async function positionActions(page: Page, canvas: boolean) {
  const flow=page.getByTestId('anatomy-flow')
  if (!await flow.count()) return
  const box=await boxOf(flow)
  await page.mouse.move(box.x+2,box.y+2)
  await page.mouse.wheel(0,-1000)
  await expect.poll(()=>flow.evaluate(element=>element.scrollTop)).toBe(0)
  await page.mouse.wheel(0,canvas?120:1000)
  await expect.poll(()=>flow.evaluate(element=>element.scrollTop)).toBeGreaterThan(0)
}

/** 短画面では意図的に図とパネルを順に表示し、各操作の全押下領域と実際の押下先を確かめる。 */
async function expectActionsTappable(page: Page, viewport: { width: number; height: number }) {
  const boxes: Box[]=[]
  let count=0
  for (const canvas of [false,true]) {
    await positionActions(page,canvas)
    const areaLocator=page.getByTestId(canvas?'anatomy-svg':'anatomy-panel')
    const groupLocator=page.getByTestId(canvas?'canvas-actions':'anatomy-panel')
    const area=await boxOf(areaLocator)
    const flow=page.getByTestId('anatomy-flow')
    const offset=await flow.count()?await flow.evaluate(element=>element.scrollTop):0
    const tops: Box[]=[]
    for (const id of ['part-selector','zoom-in','zoom-out','zoom-reset']) {
      const box=await boxOf(page.getByTestId(id));tops.push({...box,y:box.y+offset})
    }
    for (const button of await groupLocator.getByRole('button').all()) {
      const box=await boxOf(button)
      const name=await button.textContent()
      expect(box.height,`${name} の押下領域が小さい`).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x+box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y).toBeGreaterThanOrEqual(Math.max(0,area.y))
      expect(box.y+box.height,`${name} が切れている`).toBeLessThanOrEqual(Math.min(viewport.height,area.y+area.height)+0.5)
      const logical={...box,y:box.y+offset}
      for (const other of [...boxes,...tops]) expect(overlaps(logical,other),`${name} が他の操作と重なる`).toBe(false)
      expect(await button.evaluate(element=>{
        const r=element.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
        return hit!==null&&element.contains(hit)
      }),`${name} の中心を押せない`).toBe(true)
      boxes.push(logical);count++
    }
  }
  await positionActions(page,false)
  return count
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`本文文字2倍の${viewport.width}×${viewport.height}で「1つ戻る」がボタン列に埋もれず押せる`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await installTwoTimesTextScale(page)
    await page.goto('/')
    const dot = page.getByTestId('marker-dot-fore')
    await dot.waitFor()
    await waitForCanvasLayout(page)
    const box = await boxOf(dot)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

    const stepBack = page.getByTestId('step-back')
    await expect(stepBack).toBeVisible()
    await expect(stepBack.getByText('1つ戻る')).toHaveAttribute('data-e2e-text-scale', '2')
    // 表示条件は図の左下(収まらん低い画面ではパネル内)で押せることを確かめる。
    expect(await expectActionsTappable(page, viewport)).toBe(2)
    await expect(page.getByTestId('part-selector')).toBeVisible()
    const r = await boxOf(stepBack)
    expect(r.height, '1つ戻る が低すぎる').toBeGreaterThanOrEqual(48)
    expect(r.x, '1つ戻る が左へはみ出とる').toBeGreaterThanOrEqual(0)
    expect(r.y, '1つ戻る が上へはみ出とる').toBeGreaterThanOrEqual(0)
    expect(r.x + r.width, '1つ戻る が右へはみ出とる').toBeLessThanOrEqual(viewport.width)
    expect(overlaps(r, await boxOf(page.getByTestId('zoom-in'))), '1つ戻る がズームボタンと重なっとる').toBe(false)
    expect(overlaps(r, await boxOf(page.getByTestId('part-selector'))), '部位一覧が戻る操作を隠している').toBe(false)
    // 中心を叩いて他の要素に横取りされんこと（重なって隠れとったら別物に当たる）
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
    await expect(stepBack).toHaveCount(0)
    await expect(page.getByTestId('marker-dot-fore')).toBeVisible()

    await page.goto('/?part=muscle-brachiocephalicus')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
    // 左下2操作とパネルの戻る・選択解除を、それぞれ実際に押せる。
    expect(await expectActionsTappable(page, viewport)).toBe(4)
    await expect(page.getByTestId('step-back')).toBeVisible()
    const scroll=await boxOf(page.getByTestId('anatomy-panel-scroll'))
    const heading=await boxOf(page.getByRole('heading',{level:2}))
    expect(heading.y).toBeGreaterThanOrEqual(0)
    expect(heading.y+heading.height).toBeLessThanOrEqual(scroll.y)
    const line=await page.getByTestId('deselect-hint').evaluate(element=>({top:element.getBoundingClientRect().y,height:Number.parseFloat(getComputedStyle(element).lineHeight)}))
    expect(line.top+line.height,'本文を1行も完全に読めない').toBeLessThanOrEqual(scroll.y+scroll.height)
  })
}

test('本文文字2倍で図鑑の絞り込み見出しと層バッジが縦に割れない', async ({ page }) => {
  await installTwoTimesTextScale(page)
  await page.goto('/catalog')
  for (const title of ['層', '場所', '向き']) {
    const heading = page.getByTestId('catalog-controls').getByText(title, { exact: true })
    await expect(heading).toHaveAttribute('data-e2e-text-scale', '2')
    await expectSingleLine(heading)
  }
  const badge = page.getByTestId('catalog-row-skin-head').getByText('皮膚', { exact: true })
  await expect(badge).toHaveAttribute('data-e2e-text-scale', '2')
  await expectSingleLine(badge)
})

test('本文文字2倍でも表示条件の選択肢が画面内に全部並ぶ', async ({ page }) => {
  await installTwoTimesTextScale(page)
  await page.goto('/')
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  for (const name of ['左側望', '右側望', '正面', '後面', '皮膚', '筋肉', '骨格', '内臓']) {
    const chip = page.getByRole('radio', { name, exact: true })
    await expect(chip).toBeVisible()
    const box = await boxOf(chip)
    expect(box.x, `${name} が左で切れとる`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${name} が右で切れとる`).toBeLessThanOrEqual(320)
  }
})


test('本文文字を2倍にした320×568でも主要操作をスクロールして完了できる', async ({ page }) => {
  await installTwoTimesTextScale(page)

  await page.goto('/catalog')
  const count = page.getByTestId('catalog-count')
  await expect(count).toHaveAttribute('data-e2e-text-scale', '2')
  expect(await count.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28)
  const search = page.getByTestId('catalog-search')
  await search.fill('中殿筋')
  await expect(page.getByTestId('catalog-count')).toContainText('1 部位')
  await page.getByTestId('catalog-search-clear').click()
  await expect(search).toHaveValue('')
  await expect(page.getByTestId('catalog-count')).toContainText(`${CATALOG_TOTAL} 部位`)
  const muscle = page.getByRole('radio', { name: '筋肉', exact: true })
  await muscle.click()
  await expect(muscle).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('catalog-row-muscle-gluteus').click()
  await expect(page.getByTestId('detail-name-ja')).toHaveText('中殿筋')
  await page.getByTestId('catalog-back').click()
  await expect(page.getByTestId('catalog-row-muscle-gluteus')).toBeVisible()
  await expect(page.getByRole('radio', { name: '筋肉', exact: true })).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('catalog-filter-reset').click()
  await expect(page.getByTestId('catalog-count')).toContainText(`${CATALOG_TOTAL} 部位`)

  await page.goto('/?part=muscle-brachiocephalicus')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('腕頭筋')
  await positionActions(page,true)
  await page.getByRole('button', { name: '詳しく読む', exact: true }).click()
  await expect(page.getByTestId('part-sheet')).toContainText('腕頭筋')
  await page.getByRole('button', { name: '閉じる', exact: true }).click()
  await expect(page.getByTestId('anatomy-svg')).toBeVisible()
})

// 英語は「1つ戻る」より文言が長いので、ズーム列との重なりは別枠で見る (#160 レビュー指摘)
test.describe('en-US', () => {
  test.use({ locale: 'en-US' })

  test('本文文字2倍・英語・320×568でも戻るチップがズーム列と重ならず押せる', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await installTwoTimesTextScale(page)
    await page.goto('/')
    const dot = page.getByTestId('marker-dot-fore')
    await dot.waitFor()
    await waitForCanvasLayout(page)
    const d = await boxOf(dot)
    await page.mouse.click(d.x + d.width / 2, d.y + d.height / 2)

    const stepBack = page.getByTestId('step-back')
    await expect(stepBack).toBeVisible()
    await positionActions(page,false)
    const r = await boxOf(stepBack)
    expect(r.height).toBeGreaterThanOrEqual(44)
    expect(r.x).toBeGreaterThanOrEqual(0)
    expect(r.x + r.width, '戻るチップが右へはみ出とる').toBeLessThanOrEqual(320)
    expect(overlaps(r, await boxOf(page.getByTestId('zoom-in'))), '戻るチップがズームボタンと重なっとる').toBe(false)
    // 中心を叩いてズーム列に横取りされんこと
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
    await expect(stepBack).toHaveCount(0)
  })
})
