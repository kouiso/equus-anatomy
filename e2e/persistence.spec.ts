import { expect, test, type Page } from '@playwright/test'

const SAVED_KEY = 'equus.saved.v1'

async function installSavedReadFault(page: Page, existingId: string): Promise<void> {
  await page.addInitScript(
    ({ key, oldId }) => {
      const state = window as typeof window & { __equusReadFault: boolean }
      const originalGet = Storage.prototype.getItem
      const originalSet = Storage.prototype.setItem
      originalSet.call(window.localStorage, key, JSON.stringify([oldId]))
      state.__equusReadFault = true
      Storage.prototype.getItem = function (itemKey) {
        if (this === window.localStorage && itemKey === key && state.__equusReadFault) {
          throw new DOMException('blocked', 'SecurityError')
        }
        return originalGet.call(this, itemKey)
      }
    },
    { key: SAVED_KEY, oldId: existingId },
  )
}

async function installSavedWriteFault(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    const state = window as typeof window & { __equusWriteFault: boolean }
    const originalSet = Storage.prototype.setItem
    state.__equusWriteFault = true
    Storage.prototype.setItem = function (itemKey, value) {
      if (this === window.localStorage && itemKey === key && state.__equusWriteFault) {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      return originalSet.call(this, itemKey, value)
    }
  }, SAVED_KEY)
}

test.describe('保存障害と復帰', () => {
  test('読めない間の操作を保留し、回復後に旧データと新しい保存を両方残す', async ({ page }) => {
    await installSavedReadFault(page, 'muscle-masseter')
    await page.goto('/catalog/organ-liver')
    await expect(page.getByTestId('persistence-banner')).toContainText('保存した部位を読み込めません')

    await page.getByTestId('save-toggle').click()
    await expect(page.getByTestId('save-toggle')).toContainText('保存待ち')
    await page.evaluate(() => {
      ;(window as typeof window & { __equusReadFault: boolean }).__equusReadFault = false
    })
    await page.getByTestId('persistence-retry').click()
    await expect(page.getByTestId('persistence-banner')).toHaveCount(0)
    await expect(page.getByTestId('save-toggle')).toContainText('保存済み')

    const saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]') as string[], SAVED_KEY)
    expect(saved).toEqual(['muscle-masseter', 'organ-liver'])
  })

  test('壊れたJSONでも落ちず、バナーで保留を知らせる', async ({ page }) => {
    // 実機で起きうる経路: 端末のストレージは読めるが中身が壊れとる（部分書き込み・破損）。
    // アクセス例外とは別の経路なので別テストにする。
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, '{broken json!!')
      window.localStorage.setItem('equus.mastery.v1', 'not json [')
    }, SAVED_KEY)
    await page.goto('/saved')
    await expect(page.getByTestId('persistence-banner')).toContainText('読み取れません')
    await expect(page.getByTestId('persistence-banner')).toContainText('保留')
    // アプリ本体は動き続ける。一覧は「確認中」のまま（壊れたデータを空として誤表示せん設計）
    await expect(page.getByTestId('app-header')).toBeVisible()
    await expect(page.getByTestId('saved-loading')).toBeVisible()
  })

  test('容量不足を表示し、手動再試行した保存が再読み込み後も残る', async ({ page }) => {
    await installSavedWriteFault(page)
    await page.goto('/catalog/organ-liver')
    await page.getByTestId('save-toggle').click()
    await expect(page.getByTestId('save-toggle')).toContainText('保存待ち')
    await expect(page.getByTestId('persistence-banner')).toContainText('保存した部位を端末に保存できませんでした')
    await expect(page.getByTestId('persistence-banner')).toContainText('アプリを閉じると')

    await page.evaluate(() => {
      ;(window as typeof window & { __equusWriteFault: boolean }).__equusWriteFault = false
    })
    await page.getByTestId('persistence-retry').click()
    await expect(page.getByTestId('persistence-banner')).toHaveCount(0)
    await expect(page.getByTestId('save-toggle')).toContainText('保存済み')
    await page.reload()
    await expect(page.getByTestId('save-toggle')).toContainText('保存済み')
  })
})

test.describe('保存一覧と図鑑の復帰', () => {
  test('検索文字と複数の絞り込みを明示操作で解除できる', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto('/catalog')
    await page.getByTestId('catalog-search').fill('肝臓')
    const clear = page.getByTestId('catalog-search-clear')
    await expect(clear).toBeVisible()
    expect((await clear.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    await clear.click()
    await expect(page.getByTestId('catalog-search')).toHaveValue('')

    await page.getByRole('radio', { name: '筋肉', exact: true }).click()
    await page.getByRole('radio', { name: '後面', exact: true }).click()
    const reset = page.getByTestId('catalog-filter-reset')
    await expect(reset).toBeVisible()
    expect((await reset.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    await reset.click()
    await expect(page.getByTestId('catalog-filter-reset')).toHaveCount(0)
    await expect(page.locator('[role="radio"][aria-checked="true"]')).toHaveCount(3)
    await expect(page.getByTestId('catalog-count')).toHaveText('52 部位')
  })

  test('保存解除を同じ部位について取り消せる', async ({ page }) => {
    await page.addInitScript(
      ({ key, id }) => window.localStorage.setItem(key, JSON.stringify([id])),
      { key: SAVED_KEY, id: 'organ-liver' },
    )
    await page.goto('/saved')
    await page.getByTestId('saved-remove-organ-liver').click()
    await expect(page.getByTestId('saved-row-organ-liver')).toHaveCount(0)
    await expect(page.getByTestId('saved-undo')).toContainText('肝臓 の保存を解除しました')
    await page.getByTestId('saved-undo-organ-liver').click()
    await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()
    await expect(page.getByTestId('saved-undo')).toHaveCount(0)
  })

  test('保存一覧から図と解説へ進め、解説から同じ保存一覧へ戻る', async ({ page }) => {
    await page.addInitScript(
      ({ key, id }) => window.localStorage.setItem(key, JSON.stringify([id])),
      { key: SAVED_KEY, id: 'organ-liver' },
    )
    await page.goto('/saved')
    await page.getByTestId('saved-row-organ-liver').click()
    await expect(page.getByTestId('detail-name-ja')).toHaveText('肝臓')
    await page.getByTestId('catalog-back').click()
    await expect(page).toHaveURL(/\/saved$/)
    await expect(page.getByTestId('saved-row-organ-liver')).toBeVisible()

    await page.getByTestId('saved-map-organ-liver').click()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('肝臓')
  })

  test('検索・絞り込み・スクロール位置を詳細から戻っても保ち、一覧を重ねない', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 600 })
    await page.goto('/catalog')
    await page.getByTestId('catalog-search').fill('筋')
    await page.getByRole('radio', { name: '筋肉', exact: true }).click()
    const row = page.getByTestId('catalog-row-muscle-gastrocnemius')
    await row.scrollIntoViewIfNeeded()
    const before = await page.getByTestId('catalog-list').evaluate((element) => element.scrollTop)
    expect(before).toBeGreaterThan(0)
    await row.click()
    await expect(page.getByTestId('detail-name-ja')).toHaveText('腓腹筋')

    await page.getByTestId('catalog-back').click()
    await expect(page.getByTestId('catalog-list')).toHaveCount(1)
    await expect(page.getByTestId('catalog-search')).toHaveValue('筋')
    await expect(page.getByRole('radio', { name: '筋肉', exact: true })).toBeChecked()
    const after = await page.getByTestId('catalog-list').evaluate((element) => element.scrollTop)
    expect(after).toBeGreaterThanOrEqual(before - 2)
  })
})
