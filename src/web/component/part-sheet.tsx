import { Link } from '@tanstack/react-router'
import type { Structure } from '../../core/types'
import { useSaved } from '../store'

export function PartSheet(props: { structure: Structure; onClose: () => void }) {
  const s = props.structure
  const { has, toggle } = useSaved()
  return (
    <article className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium leading-snug">{s.nameJa}</h2>
          <p className="font-display text-sm italic leading-tight text-muted">{s.nameLa}</p>
          <p className="text-xs tracking-wide text-faint">
            {s.nameEn} · {s.region}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-pressed={has(s.id)}
            onClick={() => toggle(s.id)}
            className={`h-9 rounded-full px-3 text-xs tracking-wide ${has(s.id) ? 'bg-bone text-accent-fg' : 'bg-raised text-muted'}`}
          >
            {has(s.id) ? '保存済み' : '保存'}
          </button>
          <button
            type="button"
            aria-label="閉じる"
            onClick={props.onClose}
            className="h-9 rounded-full bg-raised px-3 text-xs text-muted"
          >
            閉じる
          </button>
        </div>
      </header>
      <p className="text-sm leading-relaxed">{s.summary}</p>
      <p className="text-sm leading-relaxed text-muted">{s.body}</p>
      <p className="text-sm leading-relaxed text-muted">
        <span className="text-faint">はたらき — </span>
        {s.function}
      </p>
      {s.note ? <p className="rounded-lg bg-raised px-3 py-2 text-xs leading-relaxed text-muted">{s.note}</p> : null}
      <Link to="/catalog/$id" params={{ id: s.id }} className="w-fit text-xs tracking-wide text-bone underline">
        図鑑で見る
      </Link>
    </article>
  )
}
