import { Link, useParams } from '@tanstack/react-router'
import { STRUCTURE_BY_ID } from '../../core/data'
import { useSaved } from '../store'

const VIEW_LABEL: Record<string, string> = { left: '左側望', right: '右側望', front: '正面', rear: '後面' }

export function CatalogDetailScreen() {
  const { id } = useParams({ from: '/catalog/$id' })
  const s = STRUCTURE_BY_ID.get(id)
  const { has, toggle } = useSaved()

  if (!s) {
    return (
      <div className="flex flex-1 flex-col gap-3 px-5 py-6">
        <p className="text-sm text-muted">その部位は見つかりませんでした。</p>
        <Link to="/catalog" className="w-fit rounded-full bg-raised px-4 py-2 text-sm">
          図鑑へ戻る
        </Link>
      </div>
    )
  }

  return (
    <article className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-8 pt-2">
      <Link to="/catalog" className="w-fit text-xs tracking-wide text-muted">
        ← 図鑑
      </Link>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl leading-tight">{s.nameJa}</h2>
          <p className="font-display text-base italic text-muted">{s.nameLa}</p>
          <p className="text-xs tracking-wide text-faint">
            {s.nameEn} · {s.region}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={has(s.id)}
          onClick={() => toggle(s.id)}
          className={`h-9 shrink-0 rounded-full px-3.5 text-xs tracking-wide ${has(s.id) ? 'bg-bone text-accent-fg' : 'bg-raised text-muted'}`}
        >
          {has(s.id) ? '保存済み' : '保存'}
        </button>
      </header>
      <p className="text-sm leading-relaxed">{s.summary}</p>
      <p className="text-sm leading-relaxed text-muted">{s.body}</p>
      <p className="text-sm leading-relaxed text-muted">
        <span className="text-faint">はたらき — </span>
        {s.function}
      </p>
      {s.note ? <p className="rounded-lg bg-raised px-3 py-2 text-xs leading-relaxed text-muted">{s.note}</p> : null}
      <p className="text-xs text-faint">
        掲載される向き: {s.views.map((v) => VIEW_LABEL[v] ?? v).join(' / ')}
      </p>
    </article>
  )
}
