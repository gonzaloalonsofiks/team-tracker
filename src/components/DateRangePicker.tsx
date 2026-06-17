import { endOfWeek, format, startOfWeek } from 'date-fns'
import type { DateRange } from '../types'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  function setStart(start: string) {
    if (start > value.end) onChange({ start, end: start })
    else onChange({ ...value, start })
  }

  function setEnd(end: string) {
    if (end < value.start) onChange({ start: end, end })
    else onChange({ ...value, end })
  }

  function thisWeek() {
    const today = new Date()
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    const sunday = endOfWeek(today, { weekStartsOn: 1 })
    onChange({
      start: format(monday, 'yyyy-MM-dd'),
      end: format(sunday, 'yyyy-MM-dd'),
    })
  }

  return (
    <div className="flex items-center gap-2">
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
      <button
        onClick={thisWeek}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        This week
      </button>
    </div>
  )
}
