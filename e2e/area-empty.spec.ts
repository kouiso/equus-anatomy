import { expect, test, type Page } from '@playwright/test'
import { waitForCanvasLayout } from './canvas-layout'
import { GEOMETRY } from '../src/core/data'
import { pointInPolygon } from '../src/core/hit-test'
import type { Point } from '../src/core/types'

/**
 * 今の向き・層に部位が無い場所は、点も場所一覧も押せない状態で出す（深層筋（図なし）チップと同じ規則）。
 * 後面・内臓は後肢も尾も部位が0件で、体幹（下書き。腎臓と、#215 で足した膀胱）だけが押せる。
 * 点の無い所のタップは、部位の無い場所を飛ばして次に小さい部位の有る場所へ落とす（判定 C）。
 */
const chip = (page: Page, id: string) => page.getByTestId(`chip-${id}`)
const viewBoxOf = (page: Page) => page.getByTestId('anatomy-svg').getAttribute('viewBox')

async function clickCenter(page: Page, testId: string) {
  await waitForCanvasLayout(page)
  const box = await page.getByTestId(testId).first().boundingBox()
  if (!box) throw new Error(`${testId} の矩形が取れん`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** 画像座標の点を、実 SVG の CTM で画面座標に直して叩く */
async function tapImagePoint(page: Page, [x, y]: Point) {
  await waitForCanvasLayout(page)
  const pt = await page.getByTestId('anatomy-svg').evaluate((node, [ix, iy]) => {
    const ctm = (node as SVGSVGElement).getScreenCTM()
    if (ctm === null) throw new Error('anatomy-svg の getScreenCTM が取得できない')
    const p = new DOMPoint(ix, iy).matrixTransform(ctm)
    return { x: p.x, y: p.y }
  }, [x, y] as const)
  await page.mouse.click(pt.x, pt.y)
  await page.waitForTimeout(700)
}

const shownPartIds = (page: Page) =>
  page
    .locator('path[data-testid^="part-"]')
    .evaluateAll((nodes) => nodes.map((n) => (n.getAttribute('data-testid') ?? '').replace(/^part-/, '')).sort())

/** 画像座標で、その点が入る後面の場所 */
const rearAreasAt = (pt: Point) =>
  GEOMETRY.rear.areas
    .filter((a) => pointInPolygon(pt, a.points))
    .map((a) => a.id)
    .sort()

// 体幹の帯の中で、点（後肢・体幹・尾）から離れた所。後肢と体幹の両方に入り、尾には入らん
const IN_TRUNK_BAND: Point = [400, 420]
// 膀胱の上の方の点（全体表示で膀胱を叩く）。体幹の枠（#215 で膀胱の底まで広げた）に入る
const ON_BLADDER: Point = [290, 580]
// 後肢だけに入る所（体幹の帯より下）
const HIND_ONLY: Point = [400, 700]
// 膀胱の柱の外にある左の太腿（体幹の帯より下）
const THIGH_BESIDE_BLADDER: Point = [150, 620]

async function openRearOrgans(page: Page) {
  await page.goto('/')
  await chip(page, 'rear').click()
  await chip(page, 'organs').click()
  await expect(chip(page, 'organs')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('marker-dot-tail').waitFor()
}

test.describe('部位が無い場所は押せない（390px）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('後面・内臓: 後肢も尾も理由つきで薄く出て、叩いても寄らない', async ({ page }) => {
    await openRearOrgans(page)
    for (const [id, name] of [['tail', '尾'], ['hind', '後肢']] as const) {
      await expect(page.getByTestId(`marker-label-${id}`)).toContainText(`${name}（部位なし）`)
      await expect(page.getByTestId(`marker-label-${id}`)).toHaveAttribute('opacity', '0.4')
    }
    await waitForCanvasLayout(page)
    const before = await viewBoxOf(page)
    for (const id of ['tail', 'hind']) {
      await clickCenter(page, `marker-dot-${id}`)
      await page.waitForTimeout(700)
      expect(await viewBoxOf(page), `${id} を叩いたのに図が動いた`).toBe(before)
      await expect(page.getByTestId('step-back')).toHaveCount(0)
    }
    await expect(page.getByTestId('marker-dot-tail')).toBeVisible()
  })

  test('部位が有る場所は今までどおり押せる（後面・筋肉の後肢）', async ({ page }) => {
    await page.goto('/')
    await chip(page, 'rear').click()
    await page.getByTestId('marker-dot-hind').waitFor()
    await expect(page.getByTestId('marker-label-hind')).not.toContainText('部位なし')
    await expect(page.getByTestId('marker-label-hind')).toHaveAttribute('opacity', '1')
    // 同じ後面でも筋肉の層で尾は空
    await expect(page.getByTestId('marker-label-tail')).toContainText('尾（部位なし）')
    const before = await viewBoxOf(page)
    await clickCenter(page, 'marker-dot-hind')
    await page.waitForTimeout(700)
    expect(await viewBoxOf(page)).not.toBe(before)
  })

  test('場所・部位一覧: 部位が無い場所は押せず、有る場所は押せる', async ({ page }) => {
    await openRearOrgans(page)
    await page.getByTestId('part-selector').click()
    await expect(page).toHaveURL(/kind=parts/)
    await expect(page.getByTestId('area-tail')).toBeDisabled()
    await expect(page.getByTestId('area-tail')).toContainText('尾（部位なし）')
    await expect(page.getByTestId('area-hind')).toBeDisabled()
    await page.getByTestId('overlay-close').click()
    await chip(page, 'muscle').click()
    await page.getByTestId('part-selector').click()
    await expect(page.getByTestId('area-hind')).toBeEnabled()
    await expect(page.getByTestId('area-hind')).toHaveText('後肢')
    await expect(page.getByTestId('area-tail')).toBeDisabled()
  })

  test('後面・内臓: 体幹の点から腎臓まで辿れ、帯の中を叩いても体幹が選ばれる', async ({ page }) => {
    await openRearOrgans(page)
    await expect(page.getByTestId('marker-label-trunk')).not.toContainText('部位なし')
    await clickCenter(page, 'marker-dot-trunk')
    await page.waitForTimeout(700)
    await expect(page.getByTestId('step-back')).toBeVisible()
    expect(await shownPartIds(page)).toEqual(['organ-bladder', 'organ-kidney'])
    await clickCenter(page, 'marker-dot-organ-kidney')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('腎臓')

    expect(rearAreasAt(IN_TRUNK_BAND), '前提: 帯の点は後肢と体幹に入る').toEqual(['hind', 'trunk'])
    await openRearOrgans(page)
    await tapImagePoint(page, IN_TRUNK_BAND)
    await expect(page.getByTestId('step-back')).toBeVisible()
    expect(await shownPartIds(page)).toEqual(['organ-bladder', 'organ-kidney'])
  })

  test('後面・内臓: 全体表示で膀胱そのものを叩くと、体幹が選ばれて膀胱の点まで辿れる', async ({ page }) => {
    const bladder = GEOMETRY.rear.parts.find((p) => p.id === 'organ-bladder')
    if (!bladder) throw new Error('後面の organ-bladder が無い')
    // 前提: 膀胱の上の方の点は膀胱の中で、体幹の枠に入る（後肢にも入るが、部位の有る一番小さい場所は体幹）。
    // 膀胱の下半分には、薄い後肢の札（後肢（部位なし））が重なって出るので、札に掛からん上の方を叩く
    expect(pointInPolygon(ON_BLADDER, bladder.points), '前提: 点は膀胱の中').toBe(true)
    expect(rearAreasAt(ON_BLADDER), '前提: 点は体幹に入る').toContain('trunk')
    await openRearOrgans(page)
    await tapImagePoint(page, ON_BLADDER)
    await expect(page.getByTestId('step-back')).toBeVisible()
    expect(await shownPartIds(page)).toEqual(['organ-bladder', 'organ-kidney'])
    await clickCenter(page, 'marker-dot-organ-bladder')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('膀胱')
  })

  test('後面・内臓: 部位の無い後肢だけの所を叩いても、何も選ばれない', async ({ page }) => {
    // 体幹の枠は膀胱の幅だけ下へ伸ばしてある。柱の外の太腿（体幹の帯より下）は、今までどおり後肢だけ
    for (const pt of [HIND_ONLY, THIGH_BESIDE_BLADDER]) {
      expect(rearAreasAt(pt), `前提: 後肢だけに入る点 ${pt}`).toEqual(['hind'])
      await openRearOrgans(page)
      await waitForCanvasLayout(page)
      const before = await viewBoxOf(page)
      await tapImagePoint(page, pt)
      expect(await viewBoxOf(page), `部位の無い後肢で図が動いた ${pt}`).toBe(before)
      await expect(page.getByTestId('step-back')).toHaveCount(0)
    }
  })

  test('後面・筋肉: 部位の無い体幹の帯を叩くと、体幹を飛ばして後肢が選ばれる', async ({ page }) => {
    expect(rearAreasAt(IN_TRUNK_BAND), '前提: 帯の点は後肢と体幹に入る').toEqual(['hind', 'trunk'])
    await page.goto('/')
    await chip(page, 'rear').click()
    await page.getByTestId('marker-dot-hind').waitFor()
    await expect(page.getByTestId('marker-label-trunk')).toContainText('体幹（部位なし）')
    await tapImagePoint(page, IN_TRUNK_BAND)
    await expect(page.getByTestId('step-back')).toBeVisible()
    expect(await shownPartIds(page)).toEqual(['muscle-biceps-femoris', 'muscle-gastrocnemius', 'muscle-gluteus'])
  })

  test('後面・筋肉: 薄い体幹の点そのものを叩いても、後肢へは落ちず何も起きない', async ({ page }) => {
    await page.goto('/')
    await chip(page, 'rear').click()
    await page.getByTestId('marker-dot-trunk').waitFor()
    await clickCenter(page, 'marker-dot-trunk')
    await page.waitForTimeout(700)
    await expect(page.getByTestId('step-back')).toHaveCount(0)
  })
})
