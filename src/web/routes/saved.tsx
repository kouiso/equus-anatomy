import { Link } from '@tanstack/react-router'
import { STRUCTURE_BY_ID } from '../../core/data'
import { useSaved } from '../store'

export function SavedScreen() {
  const { saved } = useSaved()
  const rows = saved.map((id) => STRUCTURE_BY_ID.get(id)).filter((s) => s !== undefined)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-5 pb-2 text-sm text-muted">
        <span className="font-display text-lg not-italic text-fg">{rows.length}</span> 件
      </p>
      {rows.length === 0 ? (
        <div className="flex flex-col gap-3 px-5">
          <p className="text-sm text-muted">保存した部位はまだありません。</p>
          <p className="text-xs text-faint">解剖図や図鑑からブックマークすると、ここに集まります。</p>
          <Link to="/" className="w-fit rounded-full bg-raised px-4 py-2 text-sm">
            解剖図を開く
          </Link>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {rows.map((s) => (
            <li key={s.id}>
              <Link to="/catalog/$id" params={{ id: s.id }} className="flex flex-col border-b border-line py-3">
                <span className="text-sm">{s.nameJa}</span>
                <span className="font-display text-xs italic text-muted">{s.nameLa}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
