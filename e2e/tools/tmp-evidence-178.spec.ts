import { test } from '@playwright/test'
import { installTwoTimesTextScale } from './text-scale'

const targets = [
  { name: 'before', url: 'http://127.0.0.1:4191' },
  { name: 'after', url: 'http://127.0.0.1:4192' },
]
const sizes = [
  { width: 375, height: 667 },
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 320, height: 844 },
]
const states = [
  { name: 'home', path: '/' },
  { name: 'selected', path: '/?part=muscle-brachiocephalicus' },
]
for (const t of targets)
  for (const size of sizes)
    for (const large of [false, true])
      for (const state of states)
        test(`${t.name} ${size.width}x${size.height} ${large ? '2x' : '1x'} ${state.name}`, async ({ page }) => {
          await page.setViewportSize(size)
          if (large) await installTwoTimesTextScale(page)
          await page.goto(t.url + state.path)
          await page.getByTestId('part-selector').waitFor()
          await page.waitForTimeout(1500)
          await page.screenshot({ path: `evidence-out/${t.name}-${size.width}x${size.height}-${large ? '2x' : '1x'}-${state.name}.png` })
        })
