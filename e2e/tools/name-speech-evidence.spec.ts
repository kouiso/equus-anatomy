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

/** 変更後の静止画に、発音ボタンの場所を赤枠と説明で示す（図鑑詳細と部位シート）。 */
async function markSpeechButtons(page: Page, label: string) {
  await page.evaluate((text) => {
    // 行は横いっぱいに伸びるので、囲むのはボタンだけ（全ボタンを包む矩形）
    const buttons = [...document.querySelectorAll('[data-testid^="speak-"]')].map((b) => b.getBoundingClientRect())
    if (buttons.length === 0) throw new Error('発音ボタンが見つからない')
    const left = Math.min(...buttons.map((b) => b.left))
    const top = Math.min(...buttons.map((b) => b.top))
    const right = Math.max(...buttons.map((b) => b.right))
    const bottom = Math.max(...buttons.map((b) => b.bottom))
    const r = { left, top, right, width: right - left, height: bottom - top }
    const frame = document.createElement('div')
    frame.setAttribute(
      'style',
      `position:fixed;left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;` +
        'border:3px solid #ff3b30;border-radius:10px;z-index:99999;pointer-events:none',
    )
    const tag = document.createElement('div')
    tag.textContent = text
    tag.setAttribute(
      'style',
      `position:fixed;left:${r.right + 16}px;top:${r.top - 4}px;z-index:99999;padding:6px 10px;border-radius:6px;` +
        'background:#ff3b30;color:#fff;font:14px/1.4 sans-serif;pointer-events:none',
    )
    document.body.append(frame, tag)
  }, label)
}

test('発音ボタンの注釈付き静止画（変更後・1280x800）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/catalog/muscle-masseter')
  await expect(page.getByTestId('speak-ja')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await markSpeechButtons(page, '追加: 名称の発音ボタン（和名・英名）')
  await page.screenshot({ path: `${OUT_DIR}/annotated-after-catalog-masseter-1280x800.png` })

  await page.goto('/?part=muscle-masseter')
  await page.getByRole('button', { name: '詳しく読む' }).click()
  await expect(page.getByTestId('part-sheet').getByTestId('speak-ja')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await markSpeechButtons(page, '追加: 部位シートにも同じ発音ボタン')
  await page.screenshot({ path: `${OUT_DIR}/annotated-after-partsheet-masseter-1280x800.png` })
})
