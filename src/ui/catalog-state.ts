import type { Layer, View as AnatomyView } from '../core/types'

export type CatalogFilter = Layer | 'all'

/** Module-owned so the list state survives a catalog stack remount. */
export const catalogUiState: {
  query: string
  filter: CatalogFilter
  area: string
  view: AnatomyView | 'all'
  scrollOffset: number
} = {
  query: '',
  filter: 'all',
  area: 'all',
  view: 'all',
  scrollOffset: 0,
}
