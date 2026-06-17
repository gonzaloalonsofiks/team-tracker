import { format, parseISO } from 'date-fns'
import { Bug, CheckSquare, Circle, Layers, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import type { DailyWorkItem, DeveloperRow, MatrixCell } from '../types'

interface WorkItemsPopoverProps {
  open: boolean
  anchorEl: HTMLElement | null
  dev: DeveloperRow | null
  date: string | null
  cell: MatrixCell | null
  onClose: () => void
}

function WorkItemIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case 'bug':
      return <Bug size={13} className="text-red-500 shrink-0" />
    case 'task':
      return <CheckSquare size={13} className="text-blue-500 shrink-0" />
    case 'user story':
      return <Layers size={13} className="text-purple-500 shrink-0" />
    case 'feature':
      return <Layers size={13} className="text-orange-500 shrink-0" />
    default:
      return <Circle size={13} className="text-gray-400 shrink-0" />
  }
}

function formatHours(h: number): string {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

export function WorkItemsPopover({
  open,
  anchorEl,
  dev,
  date,
  cell,
  onClose,
}: WorkItemsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open, onClose])

  if (!open || !anchorEl || !dev || !date || !cell) return null

  const rect = anchorEl.getBoundingClientRect()
  const top = rect.bottom + window.scrollY + 6
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 320 - 16)

  const isMissing = cell.cellType === 'missing-work'
  const items: DailyWorkItem[] = cell.items

  const content = (
    <div
      ref={popoverRef}
      style={{ position: 'absolute', top, left, width: 304, zIndex: 100 }}
      className="rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      <div className="flex items-start justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{dev.displayName}</p>
          <p className="text-xs text-gray-500">
            {format(parseISO(date), 'EEEE, MMM d')}
          </p>
        </div>
        <button onClick={onClose} className="mt-0.5 text-gray-400 hover:text-gray-600">
          <X size={15} />
        </button>
      </div>

      <div className="px-4 py-3">
        {isMissing && (
          <p className="mb-2 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">
            No work logged on this day
          </p>
        )}

        {items.length === 0 ? (
          <p className="text-xs text-gray-400">No work items found for this day.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.workItemId} className="flex items-start gap-2">
                <WorkItemIcon type={item.workItemType} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-gray-800" title={item.title}>
                    <span className="font-medium text-gray-500">#{item.workItemId}</span>{' '}
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.state} · {formatHours(item.deltaHours)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isMissing && items.length > 0 && (
          <p className="mt-3 border-t pt-2 text-right text-xs font-medium text-gray-600">
            Total: {formatHours(cell.totalHours)}
          </p>
        )}
      </div>
    </div>
  )

  return ReactDOM.createPortal(content, document.body)
}
