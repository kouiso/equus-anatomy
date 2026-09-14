import { expect, test } from '@playwright/test'
import { installTwoTimesTextScale } from './tools/text-scale'

for (const width of [320, 390, 768]) {
  for (const scale of [1, 2]) {
    for (const correct of [true, false]) {
      test(`${width}px・文字${scale}倍・${correct ? '正答' : '誤答'}：回答一覧と結果を読み、解説から戻って続けられる`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 320 ? 568 : width === 768 ? 1024 : 600 })
        if (scale === 2) await installTwoTimesTextScale(page)
        await page.goto('/quiz')
        await page.getByTestId('quiz-start').click()
        const dot = await page.getByTestId('marker-dot-muscle-gluteus').boundingBox()
        expect(dot).not.toBeNull()
        await page.mouse.click(dot!.x + dot!.width / 2, dot!.y + dot!.height / 2)
        const choices = page.locator('[data-testid^="choice-"]')
        const originalIds = await choices.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')))
        expect(originalIds).toHaveLength(4)
        const choice = correct
          ? page.getByTestId('choice-muscle-gluteus')
          : page.locator('[data-testid^="choice-"]:not([data-testid="choice-muscle-gluteus"])').first()
        const selectedId = await choice.getAttribute('data-testid')
        const selectedName = await choice.innerText()
        await choice.click()

        const expectedResult = correct
          ? `正解 · あなたの回答：${selectedName}`
          : `不正解 · 正解：中臀筋 · あなたの回答：${selectedName}`
        await expect(page.getByTestId('quiz-result')).toHaveText(expectedResult)
        await expect(page.getByTestId('quiz-result')).toBeInViewport()
        await page.screenshot({ path: `/tmp/equus-result-${width}-${scale}-${correct ? 'correct' : 'wrong'}.png` })
        const list = page.getByTestId('answered-choices')
        await expect(list.getByRole('button')).toHaveCount(0)
        expect(await choices.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')))).toEqual(originalIds)
        for (const id of originalIds) {
          const selected = id === selectedId
          const right = id === 'choice-muscle-gluteus'
          const status = selected ? (right ? 'あなたの回答・正解' : 'あなたの回答') : (right ? '正解' : '未選択')
          await expect(page.getByTestId(id!)).toContainText(status)
          await expect(page.getByTestId(id!)).not.toHaveAttribute('role', 'button')
          // Exercise actual scroll reachability; offscreen DOM text alone is not proof.
          await page.getByTestId(id!).getByText(status, { exact: true }).click()
        }
        if (scale === 2) {
          const text = list.getByText('回答済みの選択肢', { exact: true })
          await expect(text).toHaveAttribute('data-e2e-text-scale', '2')
          expect(await text.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(28)
        }
        await page.screenshot({ path: `/tmp/equus-answer-${width}-${scale}-${correct ? 'correct' : 'wrong'}.png` })

        if (!correct) {
          await page.getByTestId('choice-muscle-gluteus').getByText('正解', { exact: true }).click()
          await page.screenshot({ path: `/tmp/equus-right-row-${width}-${scale}.png` })
        }
        const before = await choices.allTextContents()
        const tally = `1 問中 ${correct ? 1 : 0} 正解`
        await page.getByTestId('quiz-explain').scrollIntoViewIfNeeded()
        await expect(page.getByTestId('quiz-explain')).toBeInViewport({ ratio: 1 })
        await page.screenshot({ path: `/tmp/equus-explain-${width}-${scale}-${correct ? 'correct' : 'wrong'}.png` })
        await page.getByTestId('quiz-explain').click()
        await expect(page.getByTestId('detail-name-ja')).toHaveText('中臀筋')
        await page.getByTestId('catalog-back').click()
        await expect(page.getByTestId('quiz-result')).toHaveText(expectedResult)
        await expect(page.getByTestId('quiz-score')).toHaveText(tally)
        expect(await choices.allTextContents()).toEqual(before)
        expect(await choices.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')))).toEqual(originalIds)
        // A read-only result row has no handler; even synthetic repeated clicks cannot resubmit it.
        await page.getByTestId(selectedId!).evaluate((node) => { (node as HTMLElement).click(); (node as HTMLElement).click() })
        await expect(page.getByTestId('quiz-score')).toHaveText(tally)
        await page.getByTestId('quiz-next').click()
        await expect(list).toHaveCount(0)
        await expect(page.getByTestId('quiz-result')).toHaveCount(0)
        await page.getByTestId('quiz-stop').click()
        await expect(page.getByTestId('quiz-summary')).toHaveText(tally)
      })
    }
  }
}
