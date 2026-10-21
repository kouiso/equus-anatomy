import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'
import { installTwoTimesTextScale } from './text-scale'

/**
 * PR #205 の見た目証跡を撮る道具。検証の本体は e2e/*.spec.ts。
 * before は変更前 HEAD、after は修正 HEAD の同じ条件で撮る。
 *
 *   EQUUS_EVIDENCE_DIR=doc/evidence/205 pnpm shots -g 'pr205'
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'doc/evidence/205'

test('pr205 web 証跡', async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(OUT, { recursive: true })

  for (const vp of [
    { width: 320, height: 568, tag: '320x568-1x' },
    { width: 320, height: 568, tag: '320x568-2x' },
    { width: 390, height: 844, tag: '390x844-2x' },
  ]) {
    if (vp.tag.endsWith('-2x')) await installTwoTimesTextScale(page)
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/?part=muscle-brachiocephalicus')
    await waitForCanvasLayout(page)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/web-${vp.tag}-selected.png` })

    const flow = page.getByTestId('anatomy-flow')
    if (await flow.count()) {
      await flow.evaluate((element) => element.scrollTo(0, element.scrollHeight))
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${OUT}/web-${vp.tag}-scrolled.png` })
    }
  }
})
