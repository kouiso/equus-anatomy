import { expect, test, type Locator, type Page } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'
import { waitForCanvasLayout } from './canvas-layout'

/**
 * #323 表示条件を図の左下から上段へ移した。左下だと探しにくく、上にボタンがあるほうが分かりやすいという声。
 * 上段は左から「場所・部位一覧」「表示条件」、右に ＋ / − / リセット。
 * 並ばん幅（320px・文字2倍など）では表示条件を右の列（ズームの下）へ送る。左の2段目だと頭の点を覆うため。
 * どの幅でも文字を省略せず、44px 以上で押せる。
 *
 * 図の点との重なりは2段で見る（決定済み: 見えない当たりの円にかかるのは許し、点の中心は覆わない）。
 * - 点の中心: 上段のボタンがどの点の中心も覆わず、中心を押すとその点に当たる。全部の幅・倍率・言語で見る
 * - 当たりの円（点の周り 44px 四方）: 覆わないことを見る。ただし文字2倍で上段のボタンが折り返して高くなり、
 *   円の端にかかる組み合わせがある。それは RING_EXCEPTIONS に全部書く（2026-11-15 に a109f2c の書き出しで測った値）
 * 300px は対象外。対応する最小幅は 320px（part-selector.spec・text-scale.spec と同じ）。300px・英語・2倍では
 * 表示条件が体幹の点の中心まで覆うが、そこまで狭い画面は対応していない
 */

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('矩形が取れん')
  return box
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/**
 * 文字が横にはみ出したり、省略（…）や行数の打ち切りで切れたりしていない。
 * 縦は字形が行の高さより1〜2pxはみ出る（等倍で1px、2倍で2px）。切れた行があれば1行ぶん以上隠れるので、半行で見る
 */
async function expectNotTruncated(button: Locator) {
  const clipped = await button.locator('[dir="auto"]').evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const glyph = range.getBoundingClientRect()
    const box = element.getBoundingClientRect()
    return (
      element.scrollWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight + Number.parseFloat(getComputedStyle(element).lineHeight) / 2 ||
      glyph.x < box.x - 0.5 ||
      glyph.right > box.right + 0.5 ||
      getComputedStyle(element).textOverflow === 'ellipsis'
    )
  })
  expect(clipped, `${await button.textContent()} の文字が省略されている`).toBe(false)
}

/** 置き場を決めた後に、測り直しで置き場が動き続けていない（#324 の往復の再発防止） */
async function expectSettled(page: Page, button: Locator) {
  const before = await boxOf(button)
  await page.evaluate(() => new Promise<void>((resolve) => {
    let n = 0
    const tick = () => (++n >= 20 ? resolve() : requestAnimationFrame(tick))
    requestAnimationFrame(tick)
  }))
  expect(await boxOf(button), '表示条件の置き場が動き続けている').toEqual(before)
}

/**
 * 当たりの円にかかってよい組み合わせ。キーは「言語 幅 倍率」、値は「ボタン/点」。どれも点の中心は覆わない。
 * 理由は全部同じで、文字2倍の時に上段のボタンが2行へ折り返して 48px より高くなり、すぐ下の点の円の端に届くため。
 * 括弧内は重なった幅。等倍・1440px では1つも無い
 */
const RING_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = {
  // 「場所・部位一覧」が2行になり、頭部の円の上端にかかる（2px）
  'ja-JP 360 2x': ['part-selector/head'],
  // 「場所・部位一覧」が「覧」だけ2行目へ折り返し、頭部の円の上端にかかる（9px）
  'ja-JP 390 2x': ['part-selector/head'],
  // 「Areas & parts」が2行で頭部の円に（8px）、右の列の「View options」も2行で体幹の円に（16px）かかる
  'en-US 320 2x': ['part-selector/head', 'conditions/trunk'],
  // 同じく頭部（2px）と体幹（4px）
  'en-US 360 2x': ['part-selector/head', 'conditions/trunk'],
}

/**
 * 上段の2つが図の点を覆わない。点の中心は必ず押せ（中心で elementFromPoint をとると点に当たる）、
 * 当たりの円は RING_EXCEPTIONS に書いた組み合わせ以外で重ならない
 */
async function expectMarkersClear(page: Page, key: string) {
  const result = await page.evaluate(() => {
    const buttons = ['part-selector', 'conditions'].map((id) => [id, document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect()] as const)
    const markers = Array.from(document.querySelectorAll('g[data-testid^="marker-"]'))
      .filter((g) => !/^marker-(label|selected|dot)-/.test(g.getAttribute('data-testid') ?? ''))
    const centres: string[] = []
    const rings: string[] = []
    for (const g of markers) {
      const id = (g.getAttribute('data-testid') ?? '').slice('marker-'.length)
      const dot = document.querySelector(`[data-testid="marker-dot-${id}"]`)!.getBoundingClientRect()
      const hit = document.elementFromPoint(dot.x + dot.width / 2, dot.y + dot.height / 2)
      if (hit === null || !g.contains(hit)) centres.push(`${id}: 中心で ${hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? '何も無し'} に当たる`)
      const ring = g.getBoundingClientRect()
      for (const [button, b] of buttons) {
        if (b.x < ring.right && ring.x < b.right && b.y < ring.bottom && ring.y < b.bottom) rings.push(`${button}/${id}`)
      }
    }
    return { count: markers.length, centres, rings }
  })
  expect(result.count, '図の点が出ていない').toBeGreaterThan(0)
  expect(result.centres, '上段のボタンが点の中心を覆っている').toEqual([])
  const allowed = RING_EXCEPTIONS[key] ?? []
  expect(result.rings.filter((pair) => !allowed.includes(pair)), '一覧に無い当たりの円の重なり').toEqual([])
  // 一覧に残ったまま重ならなくなった組み合わせも落とす（古い例外を残さない）
  expect(allowed.filter((pair) => !result.rings.includes(pair)), 'RING_EXCEPTIONS に、もう重ならない組み合わせが残っている').toEqual([])
}

/**
 * develop（361970d）で名前の札が出る点。全体図（未選択）では、試験する16通りすべてで6つとも出ていた
 * （2026-11-15、書き出しを並べて測った）
 */
const DEVELOP_LABELS = ['fore', 'head', 'hind', 'neck', 'tail', 'trunk'] as const

/**
 * develop より札が減ってよい組み合わせ（決定済み）。キー・値は RING_EXCEPTIONS と同じ形。
 * 英語・文字2倍の 320〜370px では、右の列へ送った「View options」の避ける矩形（#323）が増え、
 * 「Tail (no parts)」の札を置ける所が無くなって出ない。尾は部位の無い場所で、灰色の点は残り、押しても何も起きない。
 * 試験する幅のうち該当は 320 と 360。380px 以上と日本語、等倍では減らない
 */
const LABEL_DROPS: Readonly<Record<string, readonly string[]>> = {
  'en-US 320 2x': ['tail'],
  'en-US 360 2x': ['tail'],
}


/**
 * 点の名前の札（ラベルの枠）が図の中に収まり、上段のボタンと重ならず、出る札の組が develop と同じ（LABEL_DROPS を除く）。
 * 上段で避ける矩形が増えても（#323）札を図の外へ押し出したり、黙って消したりしていないことを見る。札の中の文字は見ない。文字2倍の試験用の拡大（tools/text-scale）は
 * SVG の文字も2倍にするが、札の幅は 13px の字で決まるので、2倍では develop でも文字が札からはみ出す
 */
async function expectLabelsInside(page: Page, key: string) {
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="anatomy-svg"]')!.getBoundingClientRect()
    const buttons = ['part-selector', 'conditions', 'zoom-in', 'zoom-out', 'zoom-reset'].map((id) => [id, document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect()] as const)
    const bad: string[] = []
    const labels = Array.from(document.querySelectorAll('g[data-testid^="marker-label-"]'))
    for (const g of labels) {
      const id = (g.getAttribute('data-testid') ?? '').slice('marker-label-'.length)
      const r = g.querySelector('rect')!.getBoundingClientRect()
      if (r.x < canvas.x - 0.5 || r.right > canvas.right + 0.5 || r.y < canvas.y - 0.5 || r.bottom > canvas.bottom + 0.5) bad.push(`${id} が図の外`)
      for (const [button, b] of buttons) {
        if (b.x < r.right && r.x < b.right && b.y < r.bottom && r.y < b.bottom) bad.push(`${id} が ${button} と重なる`)
      }
    }
    const drawn = labels.map((g) => (g.getAttribute('data-testid') ?? '').slice('marker-label-'.length)).sort()
    return { drawn, bad }
  })
  // 出る札の組は develop と同じ。LABEL_DROPS に書いた札だけが減ってよく、それ以外が消えたら落とす
  const drops = LABEL_DROPS[key] ?? []
  expect(result.drawn, '名前の札の組が develop と違う').toEqual(DEVELOP_LABELS.filter((id) => !drops.includes(id)))
  expect(result.bad).toEqual([])
}

async function open(page: Page, viewport: { width: number; height: number }, largeText: boolean) {
  await page.setViewportSize(viewport)
  if (largeText) await installTwoTimesTextScale(page)
  await page.goto('/')
  await expect(page.getByTestId('part-selector')).toBeVisible()
  await waitForCanvasLayout(page)
  const conditions = page.getByTestId('conditions')
  await expect(conditions).toBeVisible()
  await expectSettled(page, conditions)
  return {
    canvas: await boxOf(page.getByTestId('anatomy-svg')),
    selector: await boxOf(page.getByTestId('part-selector')),
    conditions: await boxOf(conditions),
    zoomIn: await boxOf(page.getByTestId('zoom-in')),
    zoomOut: await boxOf(page.getByTestId('zoom-out')),
    zoomReset: await boxOf(page.getByTestId('zoom-reset')),
  }
}

/** 1行に「場所・部位一覧」「表示条件」、その右に ＋ / − / リセット */
function expectOneRow(b: Awaited<ReturnType<typeof open>>) {
  expect(b.selector.x - b.canvas.x).toBeCloseTo(12, 0)
  expect(b.selector.y - b.canvas.y).toBeCloseTo(12, 0)
  expect(b.conditions.y, '表示条件が部位一覧と同じ行にない').toBeCloseTo(b.selector.y, 0)
  expect(b.conditions.x, '表示条件が部位一覧の右にない').toBeGreaterThanOrEqual(b.selector.x + b.selector.width)
  expect(b.conditions.x + b.conditions.width, '表示条件がズームに近すぎる').toBeLessThanOrEqual(b.zoomIn.x - 12)
  expect(b.zoomIn.x).toBeLessThan(b.zoomOut.x)
  expect(b.zoomOut.x).toBeLessThan(b.zoomReset.x)
  for (const box of [b.selector, b.conditions]) expect(box.height).toBeCloseTo(48, 0)
}

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(`#323 表示条件は上段 ${locale}`, () => {
    test.use({ locale })
    const conditionsName = locale === 'ja-JP' ? '表示条件' : 'View options'

    test('390×844: 上段に部位一覧・表示条件・ズームの順で並び、左下には何も重ねない', async ({ page }) => {
      const b = await open(page, { width: 390, height: 844 }, false)
      expectOneRow(b)
      await expect(page.getByTestId('canvas-actions')).toHaveCount(0)
      await expect(page.getByTestId('anatomy-panel').getByRole('button')).toHaveCount(0)
      for (const id of ['part-selector', 'conditions']) await expectNotTruncated(page.getByTestId(id))
      await page.getByRole('button', { name: conditionsName, exact: true }).click()
      await expect(page).toHaveURL(/kind=conditions/)
    })

    test('1440×900: 図の列の上段に同じ順で並ぶ', async ({ page }) => {
      const b = await open(page, { width: 1440, height: 900 }, false)
      expectOneRow(b)
      const panel = await boxOf(page.getByTestId('anatomy-panel'))
      expect(b.conditions.x + b.conditions.width, '表示条件が右の欄に入っている').toBeLessThanOrEqual(panel.x)
      expect(b.zoomReset.x + b.zoomReset.width).toBeCloseTo(b.canvas.x + b.canvas.width - 12, 0)
      await expect(page.getByTestId('canvas-actions')).toHaveCount(0)
      for (const id of ['part-selector', 'conditions']) await expectNotTruncated(page.getByTestId(id))
    })

    test('320×844・文字2倍: 2つとも省略せず押せ、表示条件はズームの下の右の列に入る', async ({ page }) => {
      const b = await open(page, { width: 320, height: 844 }, true)
      await expect(page.getByTestId('conditions').getByText(conditionsName)).toHaveAttribute('data-e2e-text-scale', '2')
      // 部位一覧は左上のまま、ズームの12px手前までで折り返す
      expect(b.selector.x - b.canvas.x).toBeCloseTo(12, 0)
      expect(b.selector.y - b.canvas.y).toBeCloseTo(12, 0)
      expect(b.selector.x + b.selector.width).toBeLessThanOrEqual(b.zoomIn.x - 12)
      // 表示条件はズームの下12px、右端をリセットに揃え、部位一覧と12px離す
      expect(b.conditions.y).toBeCloseTo(b.zoomIn.y + b.zoomIn.height + 12, 0)
      expect(b.conditions.x + b.conditions.width).toBeCloseTo(b.zoomReset.x + b.zoomReset.width, 0)
      expect(b.conditions.x).toBeGreaterThanOrEqual(b.selector.x + b.selector.width + 12)
      for (const box of [b.selector, b.conditions]) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(320)
        expect(box.y + box.height).toBeLessThanOrEqual(b.canvas.y + b.canvas.height)
      }
      for (const other of [b.zoomIn, b.zoomOut, b.zoomReset, b.selector]) expect(overlaps(b.conditions, other)).toBe(false)
      for (const other of [b.zoomIn, b.zoomOut, b.zoomReset]) expect(overlaps(b.selector, other)).toBe(false)
      for (const id of ['part-selector', 'conditions']) {
        const button = page.getByTestId(id)
        await expectNotTruncated(button)
        // 中心を押して、他の要素に横取りされんこと
        expect(await button.evaluate((element) => {
          const r = element.getBoundingClientRect()
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return hit !== null && element.contains(hit)
        }), `${id} の中心を押せない`).toBe(true)
      }
      await page.getByTestId('conditions').click()
      await expect(page).toHaveURL(/kind=conditions/)
      await page.getByTestId('overlay-close').click()
      await expect(page.getByTestId('overlay-close')).toHaveCount(0)
      await page.getByTestId('part-selector').click()
      await expect(page).toHaveURL(/kind=parts/)
    })

    // 点との重なりは幅・倍率を総当たりで見る（360px は文字2倍で円にかかり始める幅なので足した）
    for (const width of [320, 360, 390, 1440]) {
      for (const scale of [1, 2] as const) {
        const key = `${locale} ${width} ${scale}x`
        test(`${width}px・文字${scale}倍: 上段のボタンが点の中心を覆わず、点の名前の札は図の中に残る`, async ({ page }) => {
          await open(page, { width, height: width === 1440 ? 900 : 844 }, scale === 2)
          await expectMarkersClear(page, key)
          await expectLabelsInside(page, key)
        })
      }
    }
  })
}
