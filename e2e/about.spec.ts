import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * About 画面（#40）と監修状態の表示（#56）。
 * 監修記録はまだ空なので、全画面が「未監修」と読めることを固定する。
 */
const appVersion = (JSON.parse(readFileSync('app.json', 'utf8')) as { expo: { version: string } }).expo.version

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

test.describe('About', () => {
  test('ヘッダの i ボタンから開き、版・著作権・監修状態・ライセンスが読める', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/')
    await expect(page.getByTestId('demo-note')).toHaveText('学習デモ — 解剖学的正確性は未監修')
    await page.getByRole('button', { name: 'このアプリについて' }).click()

    const about = page.getByTestId('about-screen')
    await expect(about.getByRole('heading', { name: 'このアプリについて' })).toBeVisible()
    await expect(page.getByTestId('about-app-name')).toHaveText('EQUUS 馬体解剖')
    await expect(page.getByTestId('about-version')).toHaveText(`バージョン ${appVersion}`)
    await expect(page.getByTestId('about-build')).toContainText('ビルド番号')
    await expect(page.getByTestId('about-copyright')).toContainText('All Rights Reserved')

    await expect(page.getByTestId('about-supervision-status')).toHaveText('未監修')
    await expect(page.getByTestId('about-supervision')).toContainText('学習デモ — 解剖学的正確性は未監修')

    // OFL 本文は畳んである。開けば本文が読める
    const ofl = page.getByTestId('license-OFL-zen-kaku-gothic-new.txt')
    await expect(ofl).toHaveCount(0)
    await page.getByTestId('license-OFL-zen-kaku-gothic-new.txt-toggle').click()
    await expect(ofl).toContainText('SIL OPEN FONT LICENSE Version 1.1')
    await expect(ofl).toContainText('Zen Kaku Gothic Project Authors')

    await expect(page.getByTestId('about-oss-list')).toContainText('react-native')
    await page.getByTestId('license-mit-toggle').click()
    await expect(page.getByTestId('license-mit')).toContainText('Permission is hereby granted')

    await about.getByRole('button', { name: '閉じる', exact: true }).click()
    await expect(page.getByTestId('about-screen')).toHaveCount(0)
    await expect(page.getByTestId('app-header')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('プライバシーポリシーのリンクが同梱ページを開く', async ({ page, context }) => {
    await page.goto('/about')
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByTestId('about-privacy').click()])
    await popup.waitForLoadState()
    // serve も Cloudflare Pages も .html を外した URL へ寄せる
    expect(new URL(popup.url()).pathname).toMatch(/^\/privacy-policy(\.html)?$/)
    await expect(popup.getByRole('heading', { level: 1 })).toHaveText('プライバシーポリシー — EQUUS 馬体解剖')
  })

  test('表示条件モーダル末尾の版表示から About へ進める', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '表示条件', exact: true }).click()
    await page.getByTestId('overlay-about').click()
    await expect(page.getByTestId('about-version')).toHaveText(`バージョン ${appVersion}`)
  })

  test('直接 URL で開いてもハイドレーションエラーが出ない', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/about')
    await expect(page.getByTestId('about-supervision-status')).toHaveText('未監修')
    expect(errors).toEqual([])
  })
})

test.describe('部位ごとの監修状態', () => {
  test('図鑑の詳細に「未監修」と出る', async ({ page }) => {
    await page.goto('/catalog/muscle-gluteus')
    await expect(page.getByTestId('supervision-status')).toHaveText(/^未監修/)
  })

  test('解剖図から開く部位の解説にも「未監修」と出る', async ({ page }) => {
    await page.goto('/?part=muscle-brachiocephalicus')
    await page.getByRole('button', { name: '詳しく読む' }).click()
    await expect(page.getByTestId('part-sheet').getByTestId('supervision-status')).toHaveText(/^未監修/)
  })
})
