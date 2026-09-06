export type Chip<T extends string> = { id: T; label: string; disabled?: boolean }

export function ChipRow<T extends string>(props: {
  items: readonly Chip<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={props.ariaLabel} className="flex gap-2 overflow-x-auto px-4 pb-1 pt-2">
      {props.items.map((it) => {
        const on = it.id === props.value
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={it.disabled ?? false}
            onClick={() => props.onChange(it.id)}
            className={[
              'h-9 shrink-0 rounded-full px-3.5 text-sm tracking-wide transition-colors',
              on ? 'bg-bone text-accent-fg' : 'bg-raised text-muted',
              it.disabled ? 'cursor-not-allowed opacity-40' : '',
            ].join(' ')}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
