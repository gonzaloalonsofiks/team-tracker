import { endOfWeek, format, parseISO, startOfWeek, subDays } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useIterations } from '../hooks/useIterations'
import type { AppSettings, DateRange } from '../types'

interface DateRangePickerProps {
  value: DateRange
  settings: AppSettings | null
  onChange: (range: DateRange) => void
}

function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function DateRangePicker({ value, settings, onChange }: DateRangePickerProps) {
  const [sprintOpen, setSprintOpen] = useState(false)
  const sprintRef = useRef<HTMLDivElement>(null)
  const { data: iterations } = useIterations(settings)

  useEffect(() => {
    if (!sprintOpen) return
    function handler(e: MouseEvent) {
      if (sprintRef.current && !sprintRef.current.contains(e.target as Node)) setSprintOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sprintOpen])

  function setStart(start: string) {
    if (start > value.end) onChange({ start, end: start })
    else onChange({ ...value, start })
  }

  function setEnd(end: string) {
    if (end < value.start) onChange({ start: end, end })
    else onChange({ ...value, end })
  }

  function setToday() {
    const t = today()
    onChange({ start: t, end: t })
  }

  function setYesterday() {
    const y = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    onChange({ start: y, end: y })
  }

  function thisWeek() {
    const now = new Date()
    onChange({
      start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    })
  }

  function selectSprint(start: string, end: string) {
    const cap = today()
    onChange({ start: start.slice(0, 10), end: end.slice(0, 10) > cap ? cap : end.slice(0, 10) })
    setSprintOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={value.start}
        max={value.end}
        onChange={(e) => setStart(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-400">to</span>
      <input
        type="date"
        value={value.end}
        min={value.start}
        onChange={(e) => setEnd(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <div className="flex items-center gap-1">
        <button
          onClick={setToday}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Today
        </button>
        <button
          onClick={setYesterday}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Yesterday
        </button>
        <button
          onClick={thisWeek}
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          This week
        </button>

        {iterations && iterations.length > 0 && (
          <div ref={sprintRef} className="relative">
            <button
              onClick={() => setSprintOpen((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Sprint
              <ChevronDown size={12} className={`transition-transform ${sprintOpen ? 'rotate-180' : ''}`} />
            </button>

            {sprintOpen && (
              <div className="absolute left-0 z-50 mt-1 min-w-[260px] rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2">
                  <span className="text-xs font-medium text-gray-500">Select sprint</span>
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {iterations.map((it) => {
                    const start = parseISO(it.StartDate)
                    const end = parseISO(it.EndDate)
                    const now = new Date()
                    const isCurrent = start <= now && now <= end
                    return (
                      <li key={it.IterationPath}>
                        <button
                          onClick={() => selectSprint(it.StartDate, it.EndDate)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                            isCurrent ? 'font-semibold text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <span>{it.IterationName}</span>
                          <span className="ml-4 shrink-0 text-xs text-gray-400">
                            {format(start, 'MMM d')} – {format(end, 'MMM d')}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
