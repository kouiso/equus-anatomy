import { expect, test, type Page } from '@playwright/test'

/**
 * 名称の発音ボタン（#230 案C）。
 * ブラウザの speechSynthesis を差し替え、実際に何をどの言語で読ませたかを記録して確かめる。
 * 音声一覧は引数で与える（la 音声の有無でラテン語ボタンの出し分けを見る）。
 */
async function stubSpeech(page: Page, voiceLangs: readonly string[]) {
  await page.addInitScript((langs: readonly string[]) => {
    const spoken: { text: string; lang: string }[] = []
    let cancels = 0
    const voices = langs.map((lang) => ({ lang, name: lang, voiceURI: lang, localService: true, default: false }))
    Object.defineProperty(window, '__speech', { value: { spoken, cancels: () => cancels } })
    const synth = window.speechSynthesis
    synth.getVoices = () => voices as unknown as SpeechSynthesisVoice[]
    synth.speak = (u: SpeechSynthesisUtterance) => {
      spoken.push({ text: u.text, lang: u.lang })
    }
    synth.cancel = () => {
      cancels += 1
    }
  }, voiceLangs)
}

type SpeechLog = { spoken: { text: string; lang: string }[]; cancels: () => number }

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
  // 押すたびに前の読み上げを止めてから読む
  expect(await page.evaluate(() => (window as unknown as { __speech: SpeechLog }).__speech.cancels())).toBeGreaterThanOrEqual(2)

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
