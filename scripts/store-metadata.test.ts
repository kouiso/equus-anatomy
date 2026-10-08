import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// fastlane/metadata の文言がストアの文字数上限を超えてへんかの静的チェック。
// 上限超過は deliver / supply の送信時まで気付けんので、ここで先に落とす。
// 上限は App Store Connect / Play Console の入力欄の制限（文字数 = コードポイント数）。
// keywords だけはマルチバイトでバイト数扱いになる報告があるので UTF-8 バイト数で縛る（厳しい側）。
const ROOT = 'fastlane/metadata'

const APPLE_LOCALES = ['ja', 'en-US'] as const
const APPLE_LIMITS = {
  'name.txt': 30,
  'subtitle.txt': 30,
  'keywords.txt': 100,
  'promotional_text.txt': 170,
  'description.txt': 4000,
  'release_notes.txt': 4000,
} as const

const PLAY_LOCALES = ['ja-JP', 'en-US'] as const
const PLAY_LIMITS = {
  'title.txt': 30,
  'short_description.txt': 80,
  'full_description.txt': 4000,
  'changelogs/default.txt': 500,
} as const

function read(path: string): string {
  return readFileSync(path, 'utf8').replace(/\n+$/, '')
}

function length(text: string): number {
  return [...text].length
}

describe('App Store metadata (deliver)', () => {
  for (const locale of APPLE_LOCALES) {
    for (const [file, max] of Object.entries(APPLE_LIMITS)) {
      it(`${locale}/${file} is present and within ${max} chars`, () => {
        const text = read(join(ROOT, locale, file))
        expect(text.trim().length).toBeGreaterThan(0)
        expect(length(text)).toBeLessThanOrEqual(max)
      })
    }

    it(`${locale}/keywords.txt fits in 100 UTF-8 bytes`, () => {
      const text = read(join(ROOT, locale, 'keywords.txt'))
      expect(Buffer.byteLength(text, 'utf8')).toBeLessThanOrEqual(100)
    })

    it(`${locale}/keywords.txt has no blank or space-padded entries`, () => {
      const keywords = read(join(ROOT, locale, 'keywords.txt')).split(',')
      for (const keyword of keywords) {
        expect(keyword).not.toBe('')
        expect(keyword).toBe(keyword.trim())
      }
    })

    for (const file of ['privacy_url.txt', 'support_url.txt']) {
      it(`${locale}/${file} is an https URL`, () => {
        expect(read(join(ROOT, locale, file))).toMatch(/^https:\/\/\S+$/)
      })
    }
  }
})

describe('Google Play metadata (supply)', () => {
  for (const locale of PLAY_LOCALES) {
    for (const [file, max] of Object.entries(PLAY_LIMITS)) {
      it(`android/${locale}/${file} is present and within ${max} chars`, () => {
        const path = join(ROOT, 'android', locale, file)
        expect(existsSync(path)).toBe(true)
        const text = read(path)
        expect(text.trim().length).toBeGreaterThan(0)
        expect(length(text)).toBeLessThanOrEqual(max)
      })
    }
  }
})
