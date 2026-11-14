import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// 正式同義語の検査ではなく、名称変更前の検索導線を保持する検査。
const stage = process.env.EQUUS_CANNON_STAGE ?? 'fixed'
const output = process.env.EQUUS_CANNON_EVIDENCE_DIR
for (const locale of ['ja-JP', 'en-US']) test.describe(`${locale} 旧要約の入力互換`, () => {
  test.use({ locale, viewport: { width: 900, height: 1000 } })
  for (const [tag, query] of [['cannon', '管骨'], ['hind-cannon', '後肢の管骨']] as const) test(`${query}→bone-metatarsus`, async ({ page }) => {
    const id = 'bone-metatarsus'
    const name = locale === 'ja-JP' ? (stage === 'legacy' ? '中趾骨' : '中足骨') : (stage === 'legacy' ? 'Metatarsus' : 'Metatarsal bones')
    await page.goto('/catalog')
    await page.getByTestId('catalog-search').fill(query)
    // 入力後の反映を待ち、失敗時にも空の検索結果を証跡に残す。
    await expect(page.getByTestId('catalog-search')).toHaveValue(query)
    await expect(page.getByTestId('catalog-count')).not.toHaveText(locale === 'ja-JP' ? '87 部位' : '87 parts')
    const row = page.getByTestId(`catalog-row-${id}`)
    if (output) {
      mkdirSync(output, { recursive: true })
      await page.screenshot({ path: `${output}/${locale}-${tag}-search.png` })
      const resultIds = await page.locator('[data-testid^="catalog-row-"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid')!.replace('catalog-row-', '')))
      writeFileSync(`${output}/${locale}-${tag}.json`, JSON.stringify({ stage, locale, query, targetId: id, resultIds, targetPresent: resultIds.includes(id) }, null, 2) + '\n')
    }
    await expect(row).toBeVisible()
    await row.click()
    await expect(page).toHaveURL(new RegExp(`/catalog/${id}(?:\\?|$)`))
    await expect(page.getByTestId('detail-name-ja')).toHaveText(name)
    await expect(page.getByTestId('supervision-status')).toBeVisible()
    await page.getByTestId('open-on-map').click()
    await expect(page.getByTestId(`marker-selected-${id}`)).toBeVisible()
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    if (output) await page.screenshot({ path: `${output}/${locale}-${tag}-selection.png` })
  })
})
