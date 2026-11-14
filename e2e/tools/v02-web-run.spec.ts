import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { STRUCTURES } from '../../src/core/data'
import { waitForCanvasLayout } from '../canvas-layout'
import { installTwoTimesTextScale } from './text-scale'

/**
 * V02: doc/test-spec-2026-11.md の観点表を、書き出した dist に対して headless で1行ずつ回す。
 * 1行に1枚、doc/evidence/v02/<番号>.png に撮る。既定の pnpm e2e からは外してある（e2e/tools/）。
 * 実行: pnpm shots e2e/tools/v02-web-run.spec.ts
 */

const OUT = 'doc/evidence/v02'
const TOTAL = STRUCTURES.length

async function shot(page: Page, id: string) {
  await mkdir(OUT, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${OUT}/${id}.png` })
}

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function openArea(page: Page, label: string) {
  await page.getByTestId('part-selector').click()
  await page.getByRole('button', { name: label, exact: true }).click()
  await expect(page.getByTestId('step-back')).toBeVisible()
  await page.waitForTimeout(700)
}

async function changeCondition(page: Page, names: string[]) {
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  for (const name of names) await page.getByRole('radio', { name, exact: true }).click()
  await page.getByRole('button', { name: 'この条件で表示' }).click()
  await expect(page.getByRole('button', { name: '表示条件', exact: true })).toBeVisible()
}

async function pickFilter(page: Page, kind: 'layer' | 'area' | 'view', name: string) {
  await page.getByTestId(`catalog-filter-${kind}`).click()
  await page.getByTestId('catalog-filter-sheet').getByRole('radio', { name, exact: true }).click()
  await expect(page.getByTestId('catalog-filter-sheet')).toHaveCount(0)
}

async function markLearned(page: Page, id: string) {
  await page.goto(`/catalog/${id}`)
  await page.getByRole('button', { name: '覚えたにする' }).click()
  await expect(page.getByRole('button', { name: '覚えた' })).toBeVisible()
}

test.use({ locale: 'ja-JP', viewport: { width: 390, height: 844 } })

test('S01 解剖画面を開く', async ({ page }) => {
  await page.goto('/')
  await waitForCanvasLayout(page)
  await expect(page.getByTestId('anatomy-image')).toBeVisible()
  await expect(page.locator('[data-testid="marker-dot-fore"]')).toBeVisible()
  await shot(page, 'S01')
})

test('S02 場所（前肢）を選ぶ', async ({ page }) => {
  await page.goto('/')
  await waitForCanvasLayout(page)
  await openArea(page, '前肢')
  await expect(page.locator('path[data-testid="part-muscle-triceps"]')).toHaveCount(1)
  await expect(page.locator('path[data-testid="part-muscle-oblique"]')).toHaveCount(0)
  await shot(page, 'S02')
})

test('S03 右側望・内臓で体幹を選ぶと、寄る枠の上端が 134.4', async ({ page }) => {
  await page.goto('/')
  await waitForCanvasLayout(page)
  await changeCondition(page, ['右側望', '内臓'])
  await openArea(page, '体幹')
  const viewBox = await page.getByTestId('anatomy-svg').getAttribute('viewBox')
  expect(Number(viewBox?.split(/\s+/)[1])).toBeCloseTo(134.4, 1)
  await shot(page, 'S03')
})

test('S04 部位を選んで「詳しく読む」', async ({ page }) => {
  await page.goto('/?part=muscle-triceps')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('上腕三頭筋')
  await page.getByRole('button', { name: '詳しく読む', exact: true }).click()
  await expect(page.getByTestId('part-sheet')).toContainText('上腕三頭筋')
  await shot(page, 'S04')
})

test('S05 「1つ戻る」で部位 → 場所 → 全体の順に戻る', async ({ page }) => {
  await page.goto('/?part=muscle-triceps')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('上腕三頭筋')
  await page.getByTestId('step-back').click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  await expect(page.getByTestId('step-back')).toBeVisible()
  await page.getByTestId('step-back').click()
  await expect(page.getByTestId('step-back')).toHaveCount(0)
  await shot(page, 'S05')
})

test('S06 表示条件で層を骨格にする・深層の絵が無い組み合わせは押せない', async ({ page }) => {
  await page.goto('/')
  await waitForCanvasLayout(page)
  await page.getByRole('button', { name: '表示条件', exact: true }).click()
  await expect(page.getByRole('radio', { name: '深層筋', exact: true })).toBeDisabled()
  await page.getByRole('radio', { name: '骨格', exact: true }).click()
  await shot(page, 'S06')
  await page.getByRole('button', { name: 'この条件で表示' }).click()
  await expect(page.getByTestId('anatomy-image')).toBeVisible()
})

test('S07 図鑑を開く（87 部位・覚えた 0）', async ({ page }) => {
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-count')).toHaveText(`${TOTAL} 部位`)
  await expect(page.getByTestId('mastery-count')).toContainText(`覚えた 0 / ${TOTAL}`)
  await shot(page, 'S07')
})

test('S08 図鑑の検索（漢字・かな・ローマ字）', async ({ page }) => {
  await page.goto('/catalog')
  const search = page.getByTestId('catalog-search')
  await search.fill('咬筋')
  await expect(page.getByTestId('catalog-row-muscle-masseter')).toBeVisible()
  await search.fill('かんぞう')
  await expect(page.getByTestId('catalog-row-organ-liver')).toBeVisible()
  await search.fill('kubi')
  await expect(page.getByTestId('catalog-row-skin-neck')).toBeVisible()
  await shot(page, 'S08')
})

test('S09 絞り込みのボタン', async ({ page }) => {
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-filter-reset')).toHaveCount(0)
  await pickFilter(page, 'layer', '骨格')
  await expect(page.getByTestId('catalog-filter-layer')).toContainText('骨格')
  await expect(page.getByTestId('catalog-filter-reset')).toBeVisible()
  await shot(page, 'S09')
})

test('S10 「まだ」で覚えた部位が外れる', async ({ page }) => {
  await markLearned(page, 'skin-head')
  await page.goto('/catalog')
  await page.getByTestId('catalog-filter-not-learned').click()
  await expect(page.getByTestId('catalog-count')).toHaveText(`${TOTAL - 1} 部位`)
  await expect(page.getByTestId('catalog-row-skin-head')).toHaveCount(0)
  await shot(page, 'S10')
})

test('S11 「覚えた」の札と読み上げ名', async ({ page }) => {
  await markLearned(page, 'skin-head')
  await page.goto('/catalog')
  await expect(page.getByTestId('learned-badge-skin-head')).toHaveText('覚えた')
  await expect(page.getByTestId('catalog-row-skin-head')).toHaveAttribute('aria-label', /覚えた$/)
  await shot(page, 'S11')
})

test('S12 1440px で図鑑を直接開くと行が横並び', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/catalog')
  await expect.poll(() => page.getByTestId('catalog-row-skin-head').evaluate((e) => getComputedStyle(e).flexDirection)).toBe('row')
  await shot(page, 'S12')
})

test('S13 390px で行が7行以上見え、2段', async ({ page }) => {
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-meta-skin-head')).toContainText('Caput')
  const visible = await page.getByTestId('catalog-list').evaluate((list) => {
    const view = list.getBoundingClientRect()
    const nav = document.querySelector('[data-testid="tab-catalog"]')?.getBoundingClientRect()
    const bottom = Math.min(view.bottom, nav ? nav.top : Infinity)
    return [...list.querySelectorAll('[data-testid^="catalog-row-"]')].filter((r) => {
      const b = r.getBoundingClientRect()
      return b.top >= view.top && b.bottom <= bottom && b.height > 0
    }).length
  })
  expect(visible).toBeGreaterThanOrEqual(7)
  await shot(page, 'S13')
})

test('S14 詳細の「保存」と「解剖図で位置を見る」', async ({ page }) => {
  await page.goto('/catalog/muscle-masseter')
  await page.getByTestId('save-toggle').click()
  await page.goto('/saved')
  await expect(page.getByTestId('saved-row-muscle-masseter')).toBeVisible()
  await page.goto('/catalog/muscle-masseter')
  await page.getByRole('link', { name: /解剖図で位置を見る/ }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('咬筋')
  await shot(page, 'S14')
})

test('S15 保存の一覧で解除と取り消し', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('equus.saved.v1', JSON.stringify(['muscle-masseter', 'organ-liver'])))
  await page.goto('/saved')
  await page.getByTestId('saved-remove-organ-liver').click()
  await expect(page.getByTestId('saved-row-organ-liver')).toHaveCount(0)
  await shot(page, 'S15')
  await page.getByTestId('saved-undo-organ-liver').click()
  await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()
})

test('S16 言語を英語にする', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('language-toggle').click()
  await expect(page.getByTestId('catalog-count')).toContainText(`${TOTAL} parts`)
  await shot(page, 'S16')
})

test('T01 /overlay?kind=xxx を直接開く', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/overlay?kind=xxx')
  await expect(page.getByTestId('overlay-close')).toBeVisible()
  await expect(page.getByRole('heading').first()).toBeVisible()
  await shot(page, 'T01')
  await page.getByTestId('overlay-close').click()
  expect(errors).toEqual([])
})

test('T02 無い部位の詳細', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/catalog/bogus-999')
  await expect(page.locator('body')).not.toBeEmpty()
  await shot(page, 'T02')
  expect(errors).toEqual([])
})

test('T03 保存データを壊してから開く', async ({ page }) => {
  const errors = watchErrors(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('equus.saved.v1', '{broken json!!')
    window.localStorage.setItem('equus.mastery.v1', 'not json [')
  })
  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
  await shot(page, 'T03')
  expect(errors).toEqual([])
})

test('T04 検索に絵文字・200 文字・空白だけ', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/catalog')
  const search = page.getByTestId('catalog-search')
  await search.fill('🐴🐴🐴')
  await expect(page.getByTestId('catalog-empty')).toBeVisible()
  await search.fill('あ'.repeat(200))
  await expect(page.getByTestId('catalog-empty')).toBeVisible()
  await search.fill('   ')
  await expect(page.getByTestId('catalog-count')).toHaveText(`${TOTAL} 部位`)
  await search.fill('🐴')
  await shot(page, 'T04')
  expect(errors).toEqual([])
})

test('T05 絞り込みのボタンを素早く2回押す', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('catalog-filter-area').dblclick()
  await expect(page.getByTestId('catalog-filter-sheet')).toHaveCount(1)
  await shot(page, 'T05')
  await page.getByTestId('catalog-filter-sheet-close').click()
  await expect(page.getByTestId('catalog-filter-sheet')).toHaveCount(0)
})

test('T06 選択肢の画面で何も選ばずに Escape', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('catalog-filter-view').click()
  const sheet = page.getByTestId('catalog-filter-sheet')
  await expect(async () => {
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0, { timeout: 500 })
  }).toPass({ timeout: 5000 })
  await expect(page.getByTestId('catalog-filter-reset')).toHaveCount(0)
  await shot(page, 'T06')
})

test('T07 320×568・文字200% の図鑑', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await installTwoTimesTextScale(page)
  await page.goto('/catalog')
  for (const id of ['catalog-filter-layer', 'catalog-filter-area', 'catalog-filter-view', 'catalog-filter-not-learned', 'map-skin-head']) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
  }
  await shot(page, 'T07')
})

test('T08 /?part=bogus を開く', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/?part=bogus')
  await waitForCanvasLayout(page)
  await expect(page.getByTestId('anatomy-image')).toBeVisible()
  await shot(page, 'T08')
  expect(errors).toEqual([])
})

test('T09 390px で開いてから 1440px へ広げる', async ({ page }) => {
  await page.goto('/catalog')
  const row = page.getByTestId('catalog-row-skin-head')
  await expect.poll(() => row.evaluate((e) => getComputedStyle(e).flexDirection)).toBe('column')
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect.poll(() => row.evaluate((e) => getComputedStyle(e).flexDirection)).toBe('row')
  await shot(page, 'T09')
})

test('T10 存在しない URL', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('link').first()).toBeVisible()
  await shot(page, 'T10')
})

test('U01 筋肉のうち、まだ覚えていない部位を1つ覚える', async ({ page }) => {
  await page.goto('/catalog')
  await pickFilter(page, 'layer', '筋肉')
  await page.getByTestId('catalog-filter-not-learned').click()
  const before = Number((await page.getByTestId('catalog-count').innerText()).match(/\d+/)?.[0])
  await page.getByTestId('catalog-row-muscle-masseter').click()
  await page.getByRole('button', { name: '覚えたにする' }).click()
  await page.getByTestId('catalog-back').click()
  await expect(page.getByTestId('catalog-count')).toHaveText(`${before - 1} 部位`)
  await expect(page.getByTestId('catalog-row-muscle-masseter')).toHaveCount(0)
  await shot(page, 'U01')
})

test('U02 「kubi」で探して図で見る', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('catalog-search').fill('kubi')
  await page.getByTestId('map-skin-neck').click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('頸')
  await shot(page, 'U02')
})

test('U03 骨格に切り替えて骨を1つ読む', async ({ page }) => {
  await page.goto('/')
  await waitForCanvasLayout(page)
  await changeCondition(page, ['骨格'])
  await page.getByTestId('part-selector').click()
  await page.getByRole('button', { name: '前肢', exact: true }).click()
  await page.getByTestId('part-selector').click()
  await page.getByRole('button', { name: /^上腕骨/ }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('上腕骨')
  await page.getByRole('button', { name: '詳しく読む', exact: true }).click()
  await expect(page.getByTestId('part-sheet')).toContainText('上腕骨')
  await shot(page, 'U03')
})

test('U04 英語で図鑑を眺める', async ({ page }) => {
  await page.goto('/catalog')
  await page.getByTestId('language-toggle').click()
  await expect(page.getByTestId('catalog-row-muscle-masseter')).toContainText('Masseter')
  await shot(page, 'U04')
})

test('U05 2つ保存して、再読み込みの後に保存から開く', async ({ page }) => {
  for (const id of ['muscle-masseter', 'organ-liver']) {
    await page.goto(`/catalog/${id}`)
    await page.getByTestId('save-toggle').click()
  }
  await page.goto('/saved')
  await page.reload()
  await expect(page.getByTestId('saved-row-muscle-masseter')).toBeVisible()
  await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()
  await page.getByTestId('saved-row-organ-liver').click()
  await expect(page.getByTestId('detail-name-ja')).toHaveText('肝臓')
  await shot(page, 'U05')
})
