import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 600 }, hasTouch: true })

async function tapCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('タップ対象の矩形が取れません')
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
}

async function choiceIds(page: Page) {
  return page.locator('[data-testid^="choice-"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-testid')).filter((id): id is string => id !== null).sort(),
  )
}

async function recordedAnswers(page: Page, id: string) {
  return page.evaluate((partId) => {
    const raw = localStorage.getItem('equus.mastery.v1')
    if (raw === null) return 0
    const record = (JSON.parse(raw) as Record<string, { correct: number; wrong: number }>)[partId]
    return record === undefined ? 0 : record.correct + record.wrong
  }, id)
}

test('解説から戻っても同じ問題・選択肢・結果・得点・図の位置を保ち、二重採点しない', async ({ page, context }) => {
  await page.goto('/quiz')
  await page.getByTestId('quiz-start').click()

  const svg = page.getByTestId('anatomy-svg')
  const svgBox = await svg.boundingBox()
  if (svgBox === null) throw new Error('クイズ図の矩形が取れません')
  const viewBox = () => svg.getAttribute('viewBox')
  const beforePan = await viewBox()
  const x = svgBox.x + svgBox.width / 2
  const y = svgBox.y + svgBox.height / 2
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] })
  for (let dx = 8; dx <= 48; dx += 8) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x - dx, y }] })
    await page.evaluate(() => new Promise(requestAnimationFrame))
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(viewBox).not.toBe(beforePan)
  const pannedViewBox = await viewBox()

  await tapCenter(page, page.getByTestId('marker-dot-muscle-gluteus'))
  const originalChoices = await choiceIds(page)
  expect(originalChoices).toHaveLength(4)

  const correctChoice = page.getByTestId('choice-muscle-gluteus')
  // React が再描画する前に同じイベントを重ね、同期ガードが無い実装なら二重記録になる条件を作る。
  await correctChoice.evaluate((element) => {
    const target = element as HTMLElement
    target.click()
    target.click()
    target.click()
  })
  await expect(page.getByTestId('quiz-result')).toContainText('正解')
  await expect(page.getByTestId('quiz-score')).toHaveText('1 問中 1 正解')
  await expect.poll(() => recordedAnswers(page, 'muscle-gluteus')).toBe(1)
  const originalResult = await page.getByTestId('quiz-result').innerText()

  await page.getByTestId('quiz-explain').click()
  await expect(page.getByTestId('detail-name-ja')).toHaveText('中臀筋')
  await page.getByTestId('catalog-back').click()

  await expect(page).toHaveURL(/\/quiz$/)
  await expect(page.getByTestId('quiz-prompt')).toHaveText('回答結果')
  await expect(page.getByTestId('quiz-result')).toHaveText(originalResult)
  await expect(page.getByTestId('quiz-score')).toHaveText('1 問中 1 正解')
  expect(await choiceIds(page)).toEqual(originalChoices)
  await expect(page.getByTestId('choice-muscle-gluteus')).toContainText('あなたの回答・正解')
  await expect(page.getByTestId('anatomy-svg')).toHaveAttribute('viewBox', pannedViewBox ?? '')

  // 復帰後の無効化済み選択肢へスクリプトから連打しても、記録は増えない。
  await page.getByTestId('choice-muscle-gluteus').evaluate((element) => {
    const target = element as HTMLElement
    target.click()
    target.click()
  })
  await expect.poll(() => recordedAnswers(page, 'muscle-gluteus')).toBe(1)
  await expect(page.getByTestId('quiz-score')).toHaveText('1 問中 1 正解')
  await cdp.detach()
})
