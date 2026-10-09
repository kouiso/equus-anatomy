import { expect, test, type Page } from '@playwright/test'

/**
 * エラーパス・異常系の回帰。
 *
 * 実際に踏んだ不具合:
 * - /overlay?... を直接開くと静的書き出し済み HTML（クエリ無し）と初回レンダーが
 *   食い違って React #418（hydration mismatch）がコンソールに出ていた。
 * - 存在しない URL がサーバの無地の 404 ページになり、アプリへ戻る導線が無かった。
 */

/** ページロード中の pageerror / console.error を全部拾う */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

test.describe('エラーパス', () => {
  // タイトルは mounted 後にだけ描かれる（overlay.tsx の hydration 対策）。
  // 閉じるボタンはマウント前から出るので待ち合わせには使えん。
  for (const [path, readyText] of [
    ['/overlay?kind=detail&id=muscle-gluteus', '部位の解説'],
    ['/overlay?kind=conditions', '表示条件'],
    ['/overlay?kind=parts', '場所・部位一覧'],
  ] as const) {
    test(`直接URL ${path} がハイドレーションエラー無しで開く`, async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(path)
      await expect(page.getByRole('heading', { name: readyText })).toBeVisible()
      expect(errors, 'console/page エラーが出ている').toEqual([])
    })
  }

  test('overlay 直開きで存在しない部位IDは「見つかりません」を出す', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/overlay?kind=detail&id=bogus-part-999')
    await expect(page.getByText('この部位は見つかりません。')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('存在しないパスはアプリの 404 ページになる', async ({ page }) => {
    const errors = watchErrors(page)
    const res = await page.goto('/catalog/bogus-part-999')
    expect(res?.status()).toBe(404)
    await expect(page.getByText('そのページは見つかりませんでした。')).toBeVisible()
    // 404 からアプリへ戻れる
    await page.getByRole('link', { name: '解剖図へ戻る' }).click()
    await expect(page.getByText('表示条件')).toBeVisible()
    // 文書自身の 404 はブラウザが console に「Failed to load resource」と出す。これは仕様。
    // JS の例外（pageerror）や別の console エラーが混ざってないことだけ見る
    expect(errors.filter((e) => !e.includes('Failed to load resource'))).toEqual([])
  })

  test('overlay を連続で開閉しても壊れない', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/')
    for (let i = 0; i < 3; i++) {
      await page.getByText('表示条件', { exact: true }).click()
      await expect(page.getByRole('radio', { name: '左側望' })).toBeVisible()
      await page.getByRole('button', { name: '閉じる' }).last().click()
    }
    expect(errors).toEqual([])
  })

  test('描画が落ちたらクラッシュ情報を出し、コピーでき、もう一度開くで戻る', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    // CrashProbe（error-boundary.tsx）はこのフラグがある時だけ描画中に投げる
    await page.addInitScript(() => {
      ;(globalThis as { __EQUUS_CRASH_PROBE__?: boolean }).__EQUUS_CRASH_PROBE__ = true
    })
    const requests: string[] = []
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1')) requests.push(r.url())
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '問題が発生しました' })).toBeVisible()
    const details = page.getByTestId('crash-details')
    await expect(details).toContainText('EQUUS 馬体解剖 クラッシュ情報')
    await expect(details).toContainText(/バージョン: \d+\.\d+\.\d+/)
    await expect(details).toContainText(/発生時刻: \d{4}-\d{2}-\d{2}T/)
    await expect(details).toContainText('エラー: Error: クラッシュ画面の確認用に投げた例外')

    await page.getByTestId('crash-copy').click()
    await expect(page.getByText('コピーしました。')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('クラッシュ情報')
    // 収集ゼロ: クラッシュしても外部への通信は起きない
    expect(requests).toEqual([])

    await page.evaluate(() => {
      delete (globalThis as { __EQUUS_CRASH_PROBE__?: boolean }).__EQUUS_CRASH_PROBE__
    })
    await page.getByTestId('error-reload').click()
    await expect(page.getByTestId('app-header')).toBeVisible()
  })

  test('ブラウザの戻るを連打しても壊れない', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/')
    await page.getByText('表示条件', { exact: true }).click()
    await page.getByRole('button', { name: '閉じる' }).last().click()
    await page.goBack()
    await page.goBack()
    await page.goBack()
    await expect(page.locator('body')).toBeVisible()
    expect(errors).toEqual([])
  })
})
