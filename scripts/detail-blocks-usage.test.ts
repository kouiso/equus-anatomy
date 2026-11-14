import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 解説の段（本文・はたらき・注記）を描く画面は、必ず detailBlocks を通す（#230 案B）。
 * brief（名称+1行）の部位はまだデータに無く、画面で直接は試せん。
 * 画面が text.body / text.function を自分で描き始めると、brief で空の「はたらき」行が出る恐れがあるので、
 * 描き方をここで固定する。brief の部位が入ったら、画面での e2e に置き換える。
 */
const SCREENS = ['src/app/(tabs)/catalog/[id].tsx', 'src/ui/part-sheet.tsx']

describe('解説の段を描く画面は detailBlocks を通す', () => {
  for (const file of SCREENS) {
    it(file, () => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      expect(source).toMatch(/detailBlocks\(text\)\.map\(/)
      // 本文・はたらき・注記を detailBlocks の外で直接描いていない
      expect(source).not.toMatch(/text\.(body|function|note)\b/)
    })
  }
})
