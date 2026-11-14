import type { Layer, View as AnatomyView } from '../core/types'

export type CatalogFilter = Layer | 'all'

/** Module-owned so the list state survives a catalog stack remount. */
export const catalogUiState: {
  query: string
  filter: CatalogFilter
  area: string
  view: AnatomyView | 'all'
  /** 「まだ」（覚えていない部位だけ）の絞り込み（#257） */
  notLearned: boolean
  scrollOffset: number
} = {
  query: '',
  filter: 'all',
  area: 'all',
  view: 'all',
  notLearned: false,
  scrollOffset: 0,
}
