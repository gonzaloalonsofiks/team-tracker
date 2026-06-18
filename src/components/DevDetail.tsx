import { format, parseISO } from 'date-fns'
import { ArrowLeft, Bug, CheckSquare, Circle, ExternalLink, Layers } from 'lucide-react'
import type { AppSettings, DeveloperRow } from '../types'

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

function hoursColor(h: number): string {
  if (h <= 0) return 'bg-red-100 text-red-700'
  if (h <= 3) return 'bg-red-50 text-red-600'
  if (h < 6) return 'bg-yellow-50 text-yellow-700'
  return 'bg-green-50 text-green-800'
}

function adobUrl(org: string, project: string, id: number): string {
  return `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_workitems/edit/${id}`
}

interface Props {
  dev: DeveloperRow
  displayDates: string[]
  settings: AppSettings
  onBack: () => void
}

export function DevDetail({ dev, displayDates, settings, onBack }: Props) {
  const totalHours = displayDates.reduce((sum, date) => {
    return sum + (dev.cells[date]?.totalHours ?? 0)
  }, 0)

  const activeDates = displayDates.filter((date) => {
    const cell = dev.cells[date]
    return cell && (cell.cellType === 'has-work' || cell.cellType === 'missing-work')
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{dev.displayName}</h2>
          <p className="text-sm text-gray-500">{dev.uniqueName}</p>
        </div>
        <div className={`rounded-lg px-4 py-2 text-right ${hoursColor(totalHours)}`}>
          <p className="text-xs font-medium opacity-70">Total</p>
          <p className="text-lg font-bold">{formatHours(totalHours)}</p>
        </div>
      </div>

      {activeDates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
          No activity in this date range.
        </div>
      ) : (
        <div className="space-y-3">
          {activeDates.map((date) => {
            const cell = dev.cells[date]
            if (!cell) return null
            const isMissing = cell.cellType === 'missing-work'
            const d = parseISO(date)

            return (
              <div key={date} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{format(d, 'EEEE')}</p>
                    <p className="text-xs text-gray-500">{format(d, 'MMM d, yyyy')}</p>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${hoursColor(cell.totalHours)}`}>
                    {isMissing ? '0h' : formatHours(cell.totalHours)}
                  </span>
                </div>

                <div className="px-4 py-3">
                  {isMissing && (
                    <p className="mb-3 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">
                      Has assigned items but no work logged
                    </p>
                  )}

                  {cell.items.length === 0 ? (
                    <p className="text-xs text-gray-400">No work items.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {cell.items.map((item) => (
                        <li key={item.workItemId} className="flex items-start gap-2">
                          <WorkItemIcon type={item.workItemType} />
                          <div className="min-w-0 flex-1">
                            <a
                              href={adobUrl(settings.org, settings.project, item.workItemId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center gap-1 text-xs hover:text-blue-600"
                            >
                              <span className="font-medium text-gray-400">#{item.workItemId}</span>
                              <span className="text-gray-800 group-hover:text-blue-600">{item.title}</span>
                              <ExternalLink size={10} className="shrink-0 text-gray-300 group-hover:text-blue-400" />
                            </a>
                            <p className="text-xs text-gray-400">
                              {item.state} · {formatHours(item.deltaHours)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
