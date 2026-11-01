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
  fail: [] as (() => void)[],
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
  getAvailableVoicesAsync: () =>
    new Promise<[]>((resolve, reject) => {
      speech.ready.push(() => resolve([]))
      speech.fail.push(() => reject(new Error('音声一覧が取れない')))
    }),
}))

const { speakOnce, stopSpeaking, voiceLanguages } = await import('./speech')

const settle = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}
const readyAll = async () => {
  speech.fail.length = 0
  for (const r of speech.ready.splice(0)) r()
  await settle()
}
const failAll = async () => {
  speech.ready.length = 0
  for (const f of speech.fail.splice(0)) f()
  await settle()
}

beforeEach(() => {
  speech.spoken.length = 0
  speech.stops = 0
  speech.ready.length = 0
  speech.fail.length = 0
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

  it('音声一覧が取れん端末でも（準備の合図が失敗しても）、最新の要求は読む', async () => {
    speakOnce('こうきん', 'ja-JP')
    await failAll()
    expect(speech.spoken).toEqual(['こうきん'])
  })

  it('音声一覧が取れん端末でも、古い要求は読まない', async () => {
    speakOnce('こうきん', 'ja-JP')
    speakOnce('Masseter', 'en-US')
    await failAll()
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

describe('音声一覧の問い合わせ', () => {
  it('同時に複数の画面が聞いても、問い合わせは1回にまとめて同じ答えを返す', async () => {
    const a = voiceLanguages()
    const b = voiceLanguages()
    expect(speech.ready).toHaveLength(1)
    await readyAll()
    expect(await a).toEqual([])
    expect(await b).toEqual([])
  })

  it('取れなかった時は共有をやめ、次は問い合わせ直す', async () => {
    const first = voiceLanguages()
    await failAll()
    expect(await first).toEqual([])
    void voiceLanguages()
    expect(speech.ready).toHaveLength(1)
  })
})
