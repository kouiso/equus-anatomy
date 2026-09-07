import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { STRUCTURES } from '../../core/data'
import { ChipRow } from '../component/chips'
import type { Layer } from '../../core/types'

type Filter = Layer | 'all'
const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const satisfies readonly { id: Filter; label: string }[]

const LAYER_LABEL: Record<Layer, string> = { skin: '皮膚', muscle: '筋肉', skeleton: '骨格', organs: '内臓' }

export function CatalogScreen() {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return STRUCTURES.filter((s) => filter === 'all' || s.layer === filter).filter(
      (s) =>
        needle === '' ||
        [s.nameJa, s.nameLa, s.nameEn, s.region, s.summary].some((v) => v.toLowerCase().includes(needle)),
    )
  }, [filter, q])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pb-1">
        <p className="text-sm text-muted">
          <span className="font-display text-lg not-italic text-fg">{rows.length}</span> 部位
        </p>
      </div>
      <div className="px-4 pb-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="部位を検索"
          aria-label="部位を検索"
          className="h-10 w-full rounded-full bg-raised px-4 text-sm text-fg placeholder:text-faint"
        />
      </div>
      <ChipRow ariaLabel="層で絞り込む" items={FILTERS} value={filter} onChange={setFilter} />
      <ul className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {rows.map((s) => (
          <li key={s.id}>
            <Link
              to="/catalog/$id"
              params={{ id: s.id }}
              className="flex items-center gap-3 border-b border-line py-3"
            >
              <span className="w-10 shrink-0 text-xs text-faint">{LAYER_LABEL[s.layer]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{s.nameJa}</span>
                <span className="block truncate font-display text-xs italic text-muted">{s.nameLa}</span>
              </span>
              <span className="shrink-0 text-xs text-faint">{s.region}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 ? <li className="py-6 text-sm text-muted">見つかりませんでした。</li> : null}
      </ul>
    </div>
  )
}
