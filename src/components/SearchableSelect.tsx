import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { inputClass } from '../styles/form'

export type SearchableOption = { id: string; label: string }

export default function SearchableSelect({
  options, value, onChange, placeholder = 'Search…',
}: {
  options: SearchableOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handlePick(o: SearchableOption) {
    onChange(o.id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-ink pointer-events-none" />
        <input
          ref={inputRef}
          value={open ? query : selected?.label || ''}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setOpen(true); setQuery('') }}
          placeholder={selected ? selected.label : placeholder}
          className={`${inputClass} pl-10 pr-9`}
        />
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-ink pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white rounded-lg border border-navy-100 shadow-lg py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-2.5 text-sm text-slate-ink">No matches.</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => handlePick(o)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-navy-50 ${o.id === value ? 'bg-gold-50 text-navy-950 font-medium' : 'text-navy-900'}`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
