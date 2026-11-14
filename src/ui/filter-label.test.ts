import { describe, expect, it } from 'vitest'
import { translator } from '../core/i18n'
import { filterButtonLabel } from './filter-label'

describe('filterButtonLabel', () => {
  it('和文は「、」で繋ぐ', () => {
    expect(filterButtonLabel(translator('ja'), '層で絞り込む', 'すべて')).toBe('層で絞り込む、すべて')
  })
  it('英文は「, 」で繋ぎ、和文の「、」を出さない', () => {
    const label = filterButtonLabel(translator('en'), 'Filter by layer', 'All')
    expect(label).toBe('Filter by layer, All')
    expect(label).not.toContain('、')
  })
})
