import { useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DateRangePicker } from './components/DateRangePicker'
import { DevDetail } from './components/DevDetail'
import { DevFilter } from './components/DevFilter'
import { TrackerTable } from './components/TrackerTable'
import { useDedication } from './hooks/useDedication'
import { useWorkData } from './hooks/useWorkData'
import { generateDisplayDates } from './lib/transform'
import type { AppSettings, DateRange } from './types'

const settings: AppSettings = {
  org: import.meta.env.VITE_ADO_ORG ?? '',
  project: import.meta.env.VITE_ADO_PROJECT ?? '',
  areaPath: import.meta.env.VITE_ADO_AREA_PATH ?? '',
  teamMembers: import.meta.env.VITE_ADO_TEAM_MEMBERS ?? '',
}

const isConfigured = Boolean(settings.org && settings.project)

function getDefaultDateRange(): DateRange {
  const today = new Date()
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(today, 'yyyy-MM-dd'),
  }
}

export default function App() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)
  const [showWeekends, setShowWeekends] = useState(true)
  const [selectedDevs, setSelectedDevs] = useState<string[]>([])
  const [detailDev, setDetailDev] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const dedication = useDedication(dateRange)

  const { data, isLoading, isError, error, dataUpdatedAt } = useWorkData(
    isConfigured ? settings : null,
    dateRange,
  )

  const filteredData = useMemo(() => {
    if (!data || selectedDevs.length === 0) return data
    return { ...data, developers: data.developers.filter((d) => selectedDevs.includes(d.uniqueName)) }
  }, [data, selectedDevs])

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey: ['work-data'] })
  }

  const lastFetched = dataUpdatedAt
    ? `Updated ${format(new Date(dataUpdatedAt), 'HH:mm:ss')}`
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mr-2 text-base font-semibold text-gray-900">Team Tracker</h1>

          <DateRangePicker value={dateRange} settings={isConfigured ? settings : null} onChange={setDateRange} />

          <div className="ml-auto flex items-center gap-2">
            {lastFetched && (
              <span className="text-xs text-gray-400">{lastFetched}</span>
            )}
            {data && data.developers.length > 0 && (
              <DevFilter
                developers={data.developers}
                selected={selectedDevs}
                onChange={setSelectedDevs}
              />
            )}
            <button
              onClick={() => setShowWeekends((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                showWeekends
                  ? 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {showWeekends ? 'Hide weekends' : 'Show weekends'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {!isConfigured ? (
          <MisconfiguredState />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <ErrorBanner message={error?.message ?? 'Unknown error'} />
        ) : filteredData ? (
          <>
            {detailDev ? (
              (() => {
                const dev = filteredData.developers.find((d) => d.uniqueName === detailDev)
                const displayDates = generateDisplayDates(dateRange.start, dateRange.end)
                return dev ? (
                  <DevDetail
                    dev={dev}
                    displayDates={displayDates}
                    settings={settings}
                    onBack={() => setDetailDev(null)}
                  />
                ) : null
              })()
            ) : (
              <>
                <Legend />
                <TrackerTable
                  matrix={filteredData}
                  showWeekends={showWeekends}
                  onDevClick={setDetailDev}
                  dedication={dedication}
                />
              </>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}

function MisconfiguredState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="mb-1 text-lg font-semibold text-gray-800">Missing configuration</h2>
      <p className="mb-2 text-sm text-gray-500">
        Set <code className="rounded bg-gray-100 px-1">VITE_ADO_ORG</code> and{' '}
        <code className="rounded bg-gray-100 px-1">VITE_ADO_PROJECT</code> environment variables and redeploy.
      </p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  const isAuth = message.includes('401') || message.toLowerCase().includes('unauthorized')
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
      <p className="font-medium text-red-800">Failed to load data</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {isAuth && (
        <p className="mt-2 text-sm text-red-500">
          Verify the <code className="rounded bg-red-100 px-1">ADO_PAT</code> secret has the{' '}
          <strong>Analytics (Read)</strong> scope and has not expired.
        </p>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
      <LegendItem color="bg-green-100 text-green-800" label="Work logged" />
      <LegendItem color="bg-red-100 text-red-700" label="No work logged (has items assigned)" />
      <LegendItem color="bg-gray-50 text-gray-400" label="No items assigned" />
      <LegendItem color="bg-gray-100 text-gray-300" label="Weekend" />
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block rounded px-2 py-0.5 text-xs ${color}`}>–</span>
      <span>{label}</span>
    </div>
  )
}
