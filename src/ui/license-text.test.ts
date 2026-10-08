import { describe, expect, it } from 'vitest'
import { reflowLicenseText } from './license-text'
import { FONT_LICENSES, MIT_LICENSE_TEXT } from './licenses'

const words = (text: string) => text.split(/\s+/).filter((word) => word !== '')

describe('ライセンス本文の表示用整形', () => {
  it('段落内の改行を詰め、段落の区切りは残す', () => {
    expect(reflowLicenseText('a b\nc d\n\ne f\ng')).toBe('a b c d\n\ne f g')
  })

  it('罫線を含む段落は改行を保つ', () => {
    const text = '---\nSIL OPEN FONT LICENSE\n---'
    expect(reflowLicenseText(text)).toBe(text)
  })

  it('本文の語は一つも足し引きしない', () => {
    for (const text of [MIT_LICENSE_TEXT, ...FONT_LICENSES.map((font) => font.text)]) {
      expect(words(reflowLicenseText(text))).toEqual(words(text))
    }
  })
})
