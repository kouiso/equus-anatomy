import { expect, test } from '@playwright/test'

/**
 * 書き出し後の dist に public/ の静的ファイルと OGP が載っとるかの回帰。
 *
 * 実際に踏んだ不具合:
 * - 公開 URL の /privacy-policy.html が 404 と報告された（#45）。ストア提出とアプリ内リンクの前提。
 * - Web 版の HTML に OGP が無く、URL を貼っても素っ気なかった（#57）。
 *
 * serve も Cloudflare Pages も .html 付きは拡張子無しへリダイレクトするので、
 * 両方の形をリダイレクト込みで 200 まで追う。
 */

test.describe('静的配信', () => {
  for (const path of ['/privacy-policy', '/privacy-policy.html']) {
    test(`${path} がプライバシーポリシーを 200 で返す`, async ({ request }) => {
      const res = await request.get(path)
      expect(res.status()).toBe(200)
      expect(await res.text()).toContain('プライバシーポリシー')
    })
  }

  test('og:image の実体が 200 で返る', async ({ request }) => {
    const res = await request.get('/og-image.jpg')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/jpeg')
  })

  test('トップの HTML に title / description / OGP / Twitter カードがある', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
    const html = await res.text()
    for (const needle of [
      '<title>EQUUS 馬体解剖</title>',
      'name="description"',
      'property="og:title"',
      'property="og:description"',
      'property="og:type" content="website"',
      'property="og:image" content="https://equus-anatomy-84f.pages.dev/og-image.jpg"',
      'name="twitter:card" content="summary_large_image"',
      'name="theme-color"',
    ]) {
      expect(html).toContain(needle)
    }
  })
})
