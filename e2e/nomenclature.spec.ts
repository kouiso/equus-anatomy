import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// #220の原典検収で固定した期待値。実装データから期待表示名を導出しない。
const cases = [
  { id: 'bone-carpus', beforeJa: '手根骨', ja: '手根骨', beforeEn: 'Carpus (knee)', en: 'Carpal bones', la: 'Ossa carpi', aliases: ['Carpus (knee)'] },
  { id: 'bone-sesamoid', beforeJa: '種子骨', ja: '近位種子骨', beforeEn: 'Proximal sesamoid bones', en: 'Proximal sesamoid bones', la: 'Ossa sesamoidea proximalia', aliases: ['種子骨', 'しゅしこつ'] },
  { id: 'bone-tarsus', beforeJa: '跗骨', ja: '足根骨', beforeEn: 'Tarsus (hock)', en: 'Tarsal bones', la: 'Ossa tarsi', aliases: ['跗骨', 'ふこつ', 'fukotsu', 'Tarsus (hock)'] },
  { id: 'bone-metatarsus', beforeJa: '中趾骨', ja: '中足骨', beforeEn: 'Metatarsus', en: 'Metatarsal bones', la: 'Ossa metatarsalia', aliases: ['中趾骨', 'ちゅうしこつ', 'chuushikotsu', 'Metatarsus'] },
  { id: 'muscle-sternocephalicus', beforeJa: '胸骨下顎筋', ja: '胸骨下顎筋', beforeEn: 'Sternocephalicus', en: 'Sternocephalicus', la: 'M. sternocephalicus', aliases: ['胸骨下顎筋', 'きょうこつかがくきん'], newQueries: ['胸骨頭筋', 'きょうこつとうきん', 'Sternomandibularis'] },
  { id: 'muscle-brachiocephalicus', beforeJa: '腕頭筋', ja: '上腕頭筋', beforeEn: 'Brachiocephalicus', en: 'Brachiocephalicus', la: 'M. brachiocephalicus', aliases: ['腕頭筋', 'わんとうきん', 'wantoukin'] },
  { id: 'organ-colon', beforeJa: '大結腸', ja: '大結腸', beforeEn: 'Large colon', en: 'Large colon', la: 'Colon ascendens', aliases: ['大結腸', 'Large colon'] },
  { id: 'organ-bladder', beforeJa: '膀胱', ja: '膀胱', beforeEn: 'Bladder', en: 'Bladder', la: 'Vesica urinaria', aliases: ['膀胱', 'Bladder'] },
]

const before = process.env.EQUUS_NAMES_STAGE === 'before'
const output = process.env.EQUUS_NAMES_EVIDENCE_DIR

for (const locale of ['ja-JP', 'en-US']) {
  test.describe(`${locale} 名称整合${before ? '・変更前記録' : ''}`, () => {
    test.use({ locale, viewport: { width: 900, height: 1000 } })
    for (const entry of cases) test(`${entry.id}: 図鑑→検索→同じIDの部位選択`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      const ja = before ? entry.beforeJa : entry.ja
      const en = before ? entry.beforeEn : entry.en
      const expectedName = locale === 'ja-JP' ? ja : en
      const queries = [...new Set([ja, en, entry.la, ...entry.aliases, ...(!before ? entry.newQueries ?? [] : [])])]
      await page.goto('/catalog')
      for (const query of queries) {
        await page.getByTestId('catalog-search').fill(query)
        await expect(page.getByTestId(`catalog-row-${entry.id}`), query).toBeVisible()
      }
      await page.getByTestId(`catalog-row-${entry.id}`).click()
      await expect(page).toHaveURL(new RegExp(`/catalog/${entry.id}(?:\\?|$)`))
      await expect(page.getByTestId('detail-name-ja')).toHaveText(expectedName)
      await expect(page.getByTestId('detail-name-la')).toHaveText(entry.la)
      if (output) {
        mkdirSync(output, { recursive: true })
        await page.screenshot({ path: `${output}/${locale}-${entry.id}-detail.png` })
      }
      const mapped = await page.getByTestId('open-on-map').count() > 0
      if (mapped) {
        await page.getByTestId('open-on-map').click()
        // mainはpartクエリを選択状態へ取り込んだ後にURLから消す。
        // URLの残存ではなく実マーカーのIDと選択見出しを確かめる。
        await expect(page.getByTestId(`marker-selected-${entry.id}`)).toBeVisible()
        await expect(page.getByRole('heading', { name: expectedName, exact: true })).toBeVisible()
        if (output) await page.screenshot({ path: `${output}/${locale}-${entry.id}-selection.png` })
      }
      expect(errors).toEqual([])
      if (output) writeFileSync(`${output}/${locale}-${entry.id}.json`, JSON.stringify({ stage: before ? 'before' : 'after', locale, id: entry.id, displayedName: expectedName, latinName: entry.la, queries, mapped, pageErrors: errors }, null, 2) + '\n')
    })
  })
}
