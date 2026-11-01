import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * ui/speech.ts の「最新の要求だけ読む」決まり（#230）。
 * expo-speech と Platform を差し替え、Android の「TTS の準備前に speak すると内部に溜まり、stop で消えん」
 * 状況を、準備の Promise を手で解決することで再現する。
 */
const platform = vi.hoisted(() => ({ OS: 'android' as string }))
const speech = vi.hoisted(() => ({
  spoken: [] as string[],
  stops: 0,
  ready: [] as (() => void)[],
}))

vi.mock('react-native', () => ({ Platform: platform }))
vi.mock('expo-speech', () => ({
  speak: (text: string) => {
    speech.spoken.push(text)
  },
  stop: () => {
    speech.stops += 1
    return Promise.resolve()
  },
  // 準備が済むまで返らん音声一覧。テスト側で ready() を呼んで準備完了にする
  getAvailableVoicesAsync: () => new Promise<[]>((resolve) => speech.ready.push(() => resolve([]))),
}))

const { speakOnce, stopSpeaking } = await import('./speech')

const settle = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}
const readyAll = async () => {
  for (const r of speech.ready.splice(0)) r()
  await settle()
}

beforeEach(() => {
  speech.spoken.length = 0
  speech.stops = 0
  speech.ready.length = 0
})

describe('Android: TTS の準備を待ち、最新の要求だけ読む', () => {
  beforeEach(() => {
    platform.OS = 'android'
  })

  it('準備が済むまで読まず、済んだら読む', async () => {
    speakOnce('こうきん', 'ja-JP')
    await settle()
    expect(speech.spoken).toEqual([])
    await readyAll()
    expect(speech.spoken).toEqual(['こうきん'])
  })

  it('準備中に別のボタンが押されたら、古い要求は読まず新しい方だけ読む', async () => {
    speakOnce('こうきん', 'ja-JP')
    speakOnce('Masseter', 'en-US')
    await readyAll()
    expect(speech.spoken).toEqual(['Masseter'])
  })

  it('準備中に画面を離れて止めたら、何も読まない', async () => {
    speakOnce('こうきん', 'ja-JP')
    stopSpeaking()
    await readyAll()
    expect(speech.spoken).toEqual([])
  })
})

describe('Android 以外は待たずにすぐ読む', () => {
  it('iOS は押した時点で読む', async () => {
    platform.OS = 'ios'
    speakOnce('こうきん', 'ja-JP')
    expect(speech.spoken).toEqual(['こうきん'])
    expect(speech.ready).toEqual([])
  })
})
