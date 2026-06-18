import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { format, getDay, parseISO } from 'date-fns'
import { useCallback, useMemo, useRef, useState } from 'react'
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

export function TrackerTable({
  matrix,
  showWeekends,
  onDevClick,
}: {
  matrix: TrackerMatrix
  showWeekends: boolean
  onDevClick?: (uniqueName: string) => void
}) {
  const [popover, setPopover] = useState<CellClickState | null>(null)

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
    ],
    [visibleDates, handleCellClick],
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
                        : ''
                    }`}
                  >
                    {i === 0
                      ? flexRender(cell.column.columnDef.cell, cell.getContext())
                      : flexRender(cell.column.columnDef.cell, cell.getContext())}
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
