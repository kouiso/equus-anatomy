import { mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import { waitForCanvasLayout } from '../canvas-layout'
import { installTwoTimesTextScale } from './text-scale'

/**
 * #255 ラベルをチップ行の左に置いた証跡を撮る道具。検証の本体は e2e/anatomy-condition-chips.spec.ts。
 * 変更前 HEAD と修正 HEAD で同じ条件（ja-JP・dsf 2）で撮り、TAG で名前を分ける。
 *
 *   EQUUS_EVIDENCE_TAG=before pnpm shots -g 'anatomy-inline-labels'
 */
const OUT = process.env.EQUUS_EVIDENCE_DIR ?? 'doc/evidence/255-inline-labels'
const TAG = process.env.EQUUS_EVIDENCE_TAG ?? 'after'

test.use({ locale: 'ja-JP', deviceScaleFactor: 2 })

test('anatomy-inline-labels 390 何も選んでいない', async ({ page }) => {
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await waitForCanvasLayout(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${TAG}-390x844-none.png` })
})

test('anatomy-inline-labels 390 部位を選択', async ({ page }) => {
  mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?part=muscle-brachiocephalicus')
  await waitForCanvasLayout(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${TAG}-390x844-selected.png` })
})

test('anatomy-inline-labels 320 文字200%', async ({ page }) => {
  mkdirSync(OUT, { recursive: true })
  await installTwoTimesTextScale(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await waitForCanvasLayout(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${TAG}-320x568-text200.png` })
})
