import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { format, getDay, parseISO } from 'date-fns'
import { Pencil } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import type { DeveloperRow, MatrixCell, TrackerMatrix } from '../types'
import { WorkItemsPopover } from './WorkItemsPopover'

const columnHelper = createColumnHelper<DeveloperRow>()

function formatHours(h: number): string {
  if (h === 0) return ''
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`
}

function hasWorkClasses(hours: number): string {
  if (hours <= 3) return 'bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer'
  if (hours < 6) return 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 cursor-pointer'
  return 'bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer'
}

function cellClasses(cell: MatrixCell | undefined): string {
  if (!cell) return 'bg-gray-50'
  switch (cell.cellType) {
    case 'weekend':
      return 'bg-gray-100 text-gray-300'
    case 'has-work':
      return hasWorkClasses(cell.totalHours)
    case 'missing-work':
      return 'bg-red-100 text-red-700 font-semibold hover:bg-red-200 cursor-pointer'
    case 'no-items':
      return 'bg-gray-50 text-gray-400'
  }
}

function cellContent(cell: MatrixCell | undefined): string {
  if (!cell || cell.cellType === 'weekend') return ''
  if (cell.cellType === 'no-items') return '—'
  if (cell.cellType === 'missing-work') return '0h'
  return formatHours(cell.totalHours)
}

interface CellClickState {
  anchorEl: HTMLElement
  dev: DeveloperRow
  date: string
  cell: MatrixCell
}

interface Dedication {
  get: (email: string) => number | undefined
  set: (email: string, hours: number) => void
  remove: (email: string) => void
}

export function TrackerTable({
  matrix,
  showWeekends,
  onDevClick,
  dedication,
}: {
  matrix: TrackerMatrix
  showWeekends: boolean
  onDevClick?: (uniqueName: string) => void
  dedication: Dedication
}) {
  const [popover, setPopover] = useState<CellClickState | null>(null)
  const [editingDev, setEditingDev] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const visibleDates = useMemo(
    () =>
      showWeekends
        ? matrix.dates
        : matrix.dates.filter((d) => {
            const dow = getDay(parseISO(d))
            return dow !== 0 && dow !== 6
          }),
    [matrix.dates, showWeekends],
  )

  const handleCellClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, dev: DeveloperRow, date: string) => {
      const cell = dev.cells[date]
      if (!cell || cell.cellType === 'weekend' || cell.cellType === 'no-items') return
      setPopover({ anchorEl: e.currentTarget, dev, date, cell })
    },
    [],
  )

  function commitEdit(email: string) {
    const hours = parseFloat(editValue)
    if (!isNaN(hours) && hours > 0) {
      dedication.set(email, hours)
    } else if (editValue === '' || editValue === '0') {
      dedication.remove(email)
    }
    setEditingDev(null)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('displayName', {
        id: 'developer',
        header: 'Developer',
        cell: (info) => {
          const name = info.getValue()
          const uniqueName = info.row.original.uniqueName
          const initials = name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase()
          return (
            <button
              onClick={() => onDevClick?.(uniqueName)}
              className="flex items-center gap-2 text-left hover:opacity-80"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {initials}
              </span>
              <span className="font-medium text-gray-800 underline-offset-2 hover:underline">{name}</span>
            </button>
          )
        },
      }),
      ...visibleDates.map((date) =>
        columnHelper.accessor((row) => row.cells[date], {
          id: date,
          header: () => {
            const d = parseISO(date)
            const dow = getDay(d)
            const isWeekend = dow === 0 || dow === 6
            return (
              <div
                className={`text-center ${isWeekend ? 'italic text-gray-400' : 'text-gray-600'}`}
              >
                <div className="text-xs font-medium">{format(d, 'EEE')}</div>
                <div className="text-xs">{format(d, 'MMM d')}</div>
              </div>
            )
          },
          cell: (info) => {
            const cell = info.getValue()
            const dev = info.row.original
            return (
              <div
                className={`flex h-full min-h-[44px] items-center justify-center text-sm ${cellClasses(cell)}`}
                onClick={(e) => handleCellClick(e, dev, date)}
                title={
                  cell?.cellType === 'missing-work'
                    ? `${dev.displayName} has assigned items but logged no work`
                    : undefined
                }
              >
                {cellContent(cell)}
              </div>
            )
          },
        }),
      ),
      columnHelper.display({
        id: 'total',
        header: () => (
          <div className="text-center text-xs font-medium text-gray-600">
            <div>Total</div>
            <div className="font-normal text-gray-400">/ Cap</div>
          </div>
        ),
        cell: (info) => {
          const dev = info.row.original
          const total = matrix.dates.reduce((sum, d) => sum + (dev.cells[d]?.totalHours ?? 0), 0)
          const cap = dedication.get(dev.uniqueName)
          const isEditing = editingDev === dev.uniqueName

          if (isEditing) {
            return (
              <div className="flex items-center justify-center px-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(dev.uniqueName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(dev.uniqueName)
                    if (e.key === 'Escape') setEditingDev(null)
                  }}
                  className="w-16 rounded border border-blue-400 px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )
          }

          const pct = cap ? total / cap : null
          const capColor =
            pct === null
              ? ''
              : pct > 1
                ? 'text-red-600'
                : pct >= 0.8
                  ? 'text-yellow-600'
                  : 'text-green-700'

          return (
            <div className="group flex flex-col items-center justify-center gap-0.5 px-2 py-1">
              <span className="text-sm font-medium text-gray-800">
                {total > 0 ? formatHours(total) : '—'}
              </span>
              <button
                onClick={() => {
                  setEditValue(cap !== undefined ? String(cap) : '')
                  setEditingDev(dev.uniqueName)
                }}
                className={`flex items-center gap-0.5 text-xs ${cap !== undefined ? capColor : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
                title="Set dedication hours"
              >
                {cap !== undefined ? (
                  <span>/ {formatHours(cap)}</span>
                ) : (
                  <Pencil size={10} />
                )}
              </button>
            </div>
          )
        },
      }),
    ],
    [visibleDates, handleCellClick, dedication, editingDev, editValue, matrix.dates],
  )

  const table = useReactTable({
    data: matrix.developers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-200 bg-gray-50">
                {hg.headers.map((header, i) => (
                  <th
                    key={header.id}
                    className={`border-r border-gray-200 px-3 py-2 text-left last:border-r-0 ${
                      i === 0
                        ? 'sticky left-0 z-20 min-w-[180px] bg-gray-50'
                        : header.column.id === 'total'
                          ? 'sticky right-0 z-20 min-w-[80px] bg-gray-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]'
                          : 'min-w-[72px] bg-gray-50'
                    }`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                {row.getVisibleCells().map((cell, i) => (
                  <td
                    key={cell.id}
                    className={`border-r border-gray-100 p-0 last:border-r-0 ${
                      i === 0
                        ? 'sticky left-0 z-10 bg-white px-3 py-2.5'
                        : cell.column.id === 'total'
                          ? 'sticky right-0 z-10 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]'
                          : ''
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {matrix.developers.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            No developers found for the selected range and filters.
          </div>
        )}
      </div>

      <WorkItemsPopover
        open={popover !== null}
        anchorEl={popover?.anchorEl ?? null}
        dev={popover?.dev ?? null}
        date={popover?.date ?? null}
        cell={popover?.cell ?? null}
        onClose={() => setPopover(null)}
      />
    </>
  )
}
