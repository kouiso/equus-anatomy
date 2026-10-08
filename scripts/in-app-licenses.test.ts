import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEPENDENCY_NOTICES, FONT_LICENSES, MIT_LICENSE_TEXT } from '../src/ui/licenses'

// アプリ内のライセンス表記（src/ui/licenses.ts）は正本の写し。ずれたら表記違反になるので突き合わせる。
describe('アプリ内ライセンス表記が正本と一致する', () => {
  it('同梱フォントの OFL 本文は assets/licenses/ と同じ', () => {
    const files = readdirSync('assets/licenses').filter((name) => name.startsWith('OFL-'))
    expect(FONT_LICENSES.map((font) => font.file).sort()).toEqual(files.sort())
    for (const font of FONT_LICENSES) {
      const original = readFileSync(join('assets/licenses', font.file), 'utf8')
      expect(font.text.trimEnd(), font.file).toBe(original.trimEnd())
      expect(original, font.file).toContain(font.copyright)
    }
  })

  it('同梱する依存（dependencies）は漏れなく載っている', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string> }
    expect(DEPENDENCY_NOTICES.map((dep) => dep.name).sort()).toEqual(Object.keys(pkg.dependencies).sort())
  })

  it('依存のライセンス種別と著作権表示は node_modules の実物どおり', () => {
    for (const dep of DEPENDENCY_NOTICES) {
      const dir = join('node_modules', dep.name)
      const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { license?: string }
      expect(meta.license, dep.name).toBe(dep.license)
      expect(dep.license, `${dep.name}: MIT 以外は許諾文を別に載せる`).toMatch(/^MIT\b/)
      const licenseFile = readdirSync(dir).find((name) => /^licen[cs]e/i.test(name))
      // expo-router は LICENSE を同梱していない（package.json の license だけ）
      if (licenseFile !== undefined && existsSync(join(dir, licenseFile))) {
        const text = readFileSync(join(dir, licenseFile), 'utf8')
        expect(text, dep.name).toContain(dep.copyright)
        expect(text.replace(/\s+/g, ' '), dep.name).toContain(MIT_LICENSE_TEXT.replace(/\s+/g, ' '))
      }
    }
  })
})
