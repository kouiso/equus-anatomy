import { test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { installTwoTimesTextScale } from './text-scale'

/**
 * #258 の前後比較の画像を撮る道具（検証やのうて証跡採取）。
 * 実行: PHASE=before|after pnpm exec playwright test -c playwright.shots.config.ts e2e/tools/button-row-evidence.spec.ts
 */
const OUT_DIR = 'doc/evidence/258-button-row'
const phase = process.env.PHASE === 'after' ? 'after' : 'before'

const cases = [
  { name: '390x844', width: 390, height: 844, scale: false },
  { name: '1440x900', width: 1440, height: 900, scale: false },
  { name: '320x568-text200', width: 320, height: 568, scale: true },
]

for (const c of cases) {
  test(`${phase} ${c.name}`, async ({ browser }) => {
    await mkdir(OUT_DIR, { recursive: true })
    const context = await browser.newContext({
      viewport: { width: c.width, height: c.height },
      deviceScaleFactor: 2,
      locale: 'ja-JP',
    })
    const page = await context.newPage()
    await page.addInitScript(() => {
      const synth = window.speechSynthesis
      synth.getVoices = () => [] as unknown as SpeechSynthesisVoice[]
      synth.speak = () => {}
      synth.cancel = () => {}
    })
    if (c.scale) await installTwoTimesTextScale(page)
    await page.goto('/catalog/muscle-masseter')
    await page.getByTestId('save-toggle').waitFor()
    // 小さい画面は本文の中だけが動くので、保存ボタンの所まで送ってから撮る（前後で同じ操作）
    if (c.height < 700) await page.getByTestId('save-toggle').scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT_DIR}/${phase}-${c.name}.png`, fullPage: c.height >= 700 })
    await context.close()
  })
}
