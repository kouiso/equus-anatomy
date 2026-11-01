import { expect, test, type Page } from '@playwright/test'
import { mkdir, rename } from 'node:fs/promises'

/**
 * #230 の発音ボタンの注釈付き動画を撮る道具（検証やのうて証跡採取）。
 * 音は動画に残らんので、speechSynthesis を差し替えて「何をどの言語で読んだか」と
 * 「止めたか」を画面上の注釈に出し、その様子を録画する。
 * 実行: pnpm exec playwright test -c playwright.shots.config.ts e2e/tools/name-speech-evidence.spec.ts
 */
const OUT_DIR = 'doc/evidence/230'

async function installAnnotatedSpeech(page: Page) {
  await page.addInitScript(() => {
    const log: string[] = []
    const show = () => {
      let box = document.getElementById('evidence-note')
      if (!box) {
        box = document.createElement('div')
        box.id = 'evidence-note'
        box.setAttribute(
          'style',
          'position:fixed;left:12px;bottom:12px;z-index:99999;max-width:560px;padding:10px 14px;border-radius:8px;' +
            'background:rgba(0,0,0,0.82);color:#fff;font:15px/1.5 sans-serif;white-space:pre-line;pointer-events:none',
        )
        document.body.appendChild(box)
      }
      box.textContent = log.slice(-6).join('\n')
    }
    const note = (text: string) => {
      log.push(text)
      if (document.body) show()
      else document.addEventListener('DOMContentLoaded', show, { once: true })
    }
    Object.defineProperty(window, '__note', { value: note })
    const synth = window.speechSynthesis
    synth.getVoices = () => [] as unknown as SpeechSynthesisVoice[]
    synth.speak = (u: SpeechSynthesisUtterance) => note(`読み上げ: 「${u.text}」 言語 ${u.lang}`)
    synth.cancel = () => note('読み上げを止めた（speechSynthesis.cancel）')
  })
}

const note = (page: Page, text: string) => page.evaluate((t) => (window as unknown as { __note: (s: string) => void }).__note(t), text)

test('発音ボタンの注釈付き動画（図鑑詳細・咬筋・1280x800）', async ({ browser }) => {
  await mkdir(OUT_DIR, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ja-JP',
    recordVideo: { dir: `${OUT_DIR}/.tmp-video`, size: { width: 1280, height: 800 } },
  })
  const page = await context.newPage()
  await installAnnotatedSpeech(page)

  await page.goto('/catalog/muscle-masseter')
  await expect(page.getByTestId('speak-ja')).toBeVisible()
  await note(page, '① 図鑑詳細（咬筋）。名称の下に「和名」「英名」の発音ボタン。la 音声が無いのでラテン語名のボタンは出ない')
  await page.waitForTimeout(2000)

  await note(page, '② 「和名」を押す → 漢字ではなく読み仮名を ja-JP で読む')
  await page.waitForTimeout(800)
  await page.getByTestId('speak-ja').click()
  await page.waitForTimeout(2000)

  await note(page, '③ 「英名」を押す → 前の読み上げを止めてから en-US で読む')
  await page.waitForTimeout(800)
  await page.getByTestId('speak-en').click()
  await page.waitForTimeout(2000)

  await note(page, '④ 別のタブ（保存）へ移る → 画面を離れたので読み上げを止める')
  await page.waitForTimeout(800)
  await page.getByTestId('tab-saved').click()
  await page.waitForTimeout(2500)

  const video = page.video()
  await context.close()
  const path = await video?.path()
  if (path) await rename(path, `${OUT_DIR}/name-speech-annotated-1280x800.webm`)
})
