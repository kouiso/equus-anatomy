import { expect, test, type Page } from '@playwright/test'

/**
 * 名称の発音ボタン（#230 案C）。
 * ブラウザの speechSynthesis を差し替え、実際に何をどの言語で読ませたかを記録して確かめる。
 * 音声一覧は引数で与える（la 音声の有無でラテン語ボタンの出し分けを見る）。
 */
async function stubSpeech(page: Page, voiceLangs: readonly string[]) {
  await page.addInitScript((langs: readonly string[]) => {
    const spoken: { text: string; lang: string }[] = []
    // 止める・読むの順番を1本の記録に残す（「止めてから読む」を順序で確かめるため）
    const calls: string[] = []
    let cancels = 0
    const voices = langs.map((lang) => ({ lang, name: lang, voiceURI: lang, localService: true, default: false }))
    Object.defineProperty(window, '__speech', { value: { spoken, calls, cancels: () => cancels } })
    const synth = window.speechSynthesis
    synth.getVoices = () => voices as unknown as SpeechSynthesisVoice[]
    synth.speak = (u: SpeechSynthesisUtterance) => {
      spoken.push({ text: u.text, lang: u.lang })
      calls.push(`speak:${u.lang}`)
    }
    synth.cancel = () => {
      cancels += 1
      calls.push('cancel')
    }
  }, voiceLangs)
}

type SpeechLog = { spoken: { text: string; lang: string }[]; calls: string[]; cancels: () => number }

const spokenOf = (page: Page) =>
  page.evaluate(() => (window as unknown as { __speech: SpeechLog }).__speech.spoken)

test('和名は読み仮名を ja-JP、英名は en-US で読み、la 音声が無ければラテン語ボタンは出ない', async ({ page }) => {
  await stubSpeech(page, ['ja-JP', 'en-US'])
  await page.goto('/catalog/muscle-masseter')

  await page.getByTestId('speak-ja').click()
  await expect.poll(() => spokenOf(page)).toEqual([{ text: 'こうきん', lang: 'ja-JP' }])

  await page.getByTestId('speak-en').click()
  await expect.poll(() => spokenOf(page)).toEqual([
    { text: 'こうきん', lang: 'ja-JP' },
    { text: 'Masseter', lang: 'en-US' },
  ])
  // 押すたびに前の読み上げを止めてから読む（順番で確かめる）
  expect(await page.evaluate(() => (window as unknown as { __speech: SpeechLog }).__speech.calls)).toEqual([
    'cancel',
    'speak:ja-JP',
    'cancel',
    'speak:en-US',
  ])

  await expect(page.getByTestId('speak-la')).toHaveCount(0)
})

test('la 音声がある環境だけラテン語ボタンが出て、ラテン語名を略号を戻して la で読む', async ({ page }) => {
  await stubSpeech(page, ['ja-JP', 'en-US', 'la'])
  await page.goto('/catalog/muscle-masseter')

  const la = page.getByTestId('speak-la')
  await expect(la).toBeVisible()
  await la.click()
  await expect.poll(() => spokenOf(page)).toEqual([{ text: 'Musculus masseter', lang: 'la' }])
})

test('読み上げ中に別タブへ移ると読み上げを止める', async ({ page }) => {
  await stubSpeech(page, ['ja-JP', 'en-US'])
  await page.goto('/catalog/muscle-masseter')
  await page.getByTestId('speak-ja').click()
  await expect.poll(() => spokenOf(page)).toHaveLength(1)
  const cancelsBefore = await page.evaluate(() => (window as unknown as { __speech: SpeechLog }).__speech.cancels())

  await page.getByTestId('tab-saved').click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __speech: SpeechLog }).__speech.cancels()))
    .toBeGreaterThan(cancelsBefore)
})

test('読み上げの仕組みが無いブラウザでは発音ボタンを出さず、例外も出さない', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true })
  })
  await page.goto('/catalog/muscle-masseter')
  await expect(page.getByTestId('detail-views')).toBeVisible()
  await expect(page.getByTestId('name-speech')).toHaveCount(0)
  await expect(page.getByTestId('speak-ja')).toHaveCount(0)
  // 画面を離れる時の停止処理でも例外を出さない
  await page.getByTestId('tab-saved').click()
  await expect(page.getByTestId('tab-saved')).toHaveAttribute('aria-current', 'page')
  expect(errors).toEqual([])
})

test('部位シート（解剖図から開く詳細）にも発音ボタンがあり、和名を読み仮名で読む', async ({ page }) => {
  await stubSpeech(page, ['ja-JP', 'en-US'])
  await page.goto('/?part=muscle-masseter')
  await page.getByRole('button', { name: '詳しく読む' }).click()
  const sheet = page.getByTestId('part-sheet')
  await expect(sheet).toBeVisible()
  // full の部位は本文と「はたらき」の段を出す
  await expect(sheet.getByTestId('detail-body')).toBeVisible()
  await expect(sheet.getByTestId('detail-function')).toBeVisible()
  await sheet.getByTestId('speak-ja').click()
  await expect.poll(() => spokenOf(page)).toEqual([{ text: 'こうきん', lang: 'ja-JP' }])
})
