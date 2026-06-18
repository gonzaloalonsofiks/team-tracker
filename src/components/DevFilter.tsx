import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import type { DeveloperRow } from '../types'

interface Props {
  developers: DeveloperRow[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function DevFilter({ developers, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const allSelected = selected.length === 0 || selected.length === developers.length

  function label() {
    if (allSelected) return 'All developers'
    if (selected.length === 1) {
      return developers.find((d) => d.uniqueName === selected[0])?.displayName ?? '1 developer'
    }
    return `${selected.length} developers`
  }

  function toggle(uniqueName: string) {
    if (selected.includes(uniqueName)) {
      const next = selected.filter((u) => u !== uniqueName)
      onChange(next.length === developers.length ? [] : next)
    } else {
      const next = [...selected, uniqueName]
      onChange(next.length === developers.length ? [] : next)
    }
  }

  function selectOnly(uniqueName: string) {
    onChange([uniqueName])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
          allSelected
            ? 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
      >
        <Users size={14} />
        {label()}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Developers</span>
            {!allSelected && (
              <button
                onClick={() => onChange([])}
                className="text-xs text-blue-600 hover:underline"
              >
                Show all
              </button>
            )}
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {developers.map((dev) => {
              const checked = allSelected || selected.includes(dev.uniqueName)
              return (
                <li
                  key={dev.uniqueName}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(dev.uniqueName)}
                    className="h-3.5 w-3.5 rounded accent-blue-600"
                    id={`dev-${dev.uniqueName}`}
                  />
                  <label
                    htmlFor={`dev-${dev.uniqueName}`}
                    className="flex-1 cursor-pointer text-sm text-gray-700"
                  >
                    {dev.displayName}
                  </label>
                  <button
                    onClick={() => selectOnly(dev.uniqueName)}
                    className="text-xs text-gray-400 hover:text-blue-600"
                    title="Show only this developer"
                  >
                    only
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
