import { expect, test } from '@playwright/test'

const SAVED_KEY = 'equus.saved.v1'

/**
 * issue #68 — 保存タブ行内「図で見る」→ 解剖 → 戻る が保存でなく図鑑一覧に着陸する。
 * Web ではハードウェア BACK ≒ ブラウザの戻る。タブ履歴が入口を覚えていれば、
 * 戻るは入口のタブへ戻るはず（図鑑経由と対称）。
 */
test.describe('タブ間遷移と戻るの対称性', () => {
  test('保存タブの「図で見る」から戻ると保存タブへ戻る', async ({ page }) => {
    await page.addInitScript(
      ({ key, id }) => window.localStorage.setItem(key, JSON.stringify([id])),
      { key: SAVED_KEY, id: 'organ-liver' },
    )
    // 先に図鑑を開いていた履歴（検索語つき）が残っていても、入口は保存タブ
    await page.goto('/')
    await page.getByTestId('tab-catalog').click()
    await page.getByTestId('catalog-search').fill('筋')
    await page.getByTestId('tab-saved').click()
    await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()

    await page.getByTestId('saved-map-organ-liver').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('肝臓')

    await page.goBack()
    await expect(page).toHaveURL(/\/saved$/)
    await expect(page.getByTestId('tab-saved')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()
  })

  test('図鑑詳細の「解剖図で位置を見る」から戻ると図鑑詳細へ戻る', async ({ page }) => {
    // 対称側。タブを一度切り替えてから詳細 → 図 の順に進んでも、戻るは詳細へ
    // 一覧は仮想化されとるので検索で絞ってから行を押す
    await page.goto('/')
    await page.getByTestId('tab-catalog').click()
    await page.getByTestId('catalog-search').fill('肝')
    await page.getByTestId('catalog-row-organ-liver').click()
    await expect(page.getByTestId('detail-name-ja')).toHaveText('肝臓')

    await page.getByTestId('open-on-map').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('肝臓')

    await page.goBack()
    await expect(page).toHaveURL(/\/catalog\/organ-liver/)
    await expect(page.getByTestId('detail-name-ja')).toHaveText('肝臓')
  })

  test('図鑑一覧の「図」から戻ると図鑑一覧へ戻る', async ({ page }) => {
    await page.goto('/catalog')
    await page.getByTestId('catalog-search').fill('肝')
    await page.getByTestId('map-organ-liver').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('肝臓')

    await page.goBack()
    await expect(page).toHaveURL(/\/catalog$/)
    await expect(page.getByTestId('catalog-search')).toHaveValue('肝')
  })
})
