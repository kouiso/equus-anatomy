import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { pickCatalogFilter } from './catalog-filter'
import { installTwoTimesTextScale } from './text-scale'

/**
 * 図鑑「すべて解除」の見た目証跡（#256 / #257）を撮る道具。検証の本体は e2e/catalog-reset-inline.spec.ts。
 * 変更前 HEAD（EQUUS_EVIDENCE_TAG=before）と修正 HEAD（after）で、同じ条件で撮る。
 *
 *   EQUUS_EVIDENCE_TAG=after pnpm exec playwright test e2e/tools/catalog-reset-evidence.spec.ts
 */
const OUT = 'doc/evidence/catalog-reset-inline'
const TAG = process.env.EQUUS_EVIDENCE_TAG ?? 'after'

for (const vp of [
  { width: 390, height: 844, scale: false, name: '390x844' },
  { width: 320, height: 568, scale: true, name: '320x568-text200' },
]) {
  test(`reset 証跡 ${vp.name}`, async ({ browser }) => {
    mkdirSync(OUT, { recursive: true })
    const context = await browser.newContext({ locale: 'ja-JP', deviceScaleFactor: 2, viewport: { width: vp.width, height: vp.height } })
    const page = await context.newPage()
    if (vp.scale) await installTwoTimesTextScale(page)
    await page.goto('/catalog')
    await expect(page.getByTestId('catalog-row-skin-head')).toBeVisible()
    await pickCatalogFilter(page, 'layer', '骨格')
    await expect(page.getByTestId('catalog-filter-reset')).toBeVisible()
    await page.waitForTimeout(300)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    console.log(`${TAG} ${vp.name} horizontal overflow px: ${overflow}`)
    await page.screenshot({ path: `${OUT}/${TAG}-${vp.name}.png` })
    await context.close()
  })
}
