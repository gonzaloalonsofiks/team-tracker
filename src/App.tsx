import { useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { RefreshCw, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DateRangePicker } from './components/DateRangePicker'
import { DevFilter } from './components/DevFilter'
import { SettingsModal } from './components/SettingsModal'
import { TrackerTable } from './components/TrackerTable'
import { useWorkData } from './hooks/useWorkData'
import type { AppSettings, DateRange } from './types'

const SETTINGS_KEY = 'team-tracker-settings'

function loadSettings(): AppSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as AppSettings) : null
  } catch {
    return null
  }
}

function getDefaultDateRange(): DateRange {
  const today = new Date()
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(today, 'yyyy-MM-dd'),
  }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(loadSettings)
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)
  const [showSettings, setShowSettings] = useState(!loadSettings())
  const [showWeekends, setShowWeekends] = useState(true)
  const [selectedDevs, setSelectedDevs] = useState<string[]>([])
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error, dataUpdatedAt } = useWorkData(settings, dateRange)

  const filteredData = useMemo(() => {
    if (!data || selectedDevs.length === 0) return data
    return { ...data, developers: data.developers.filter((d) => selectedDevs.includes(d.uniqueName)) }
  }, [data, selectedDevs])

  function handleSave(next: AppSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    setSettings(next)
    setShowSettings(false)
  }

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

          <DateRangePicker value={dateRange} onChange={setDateRange} />

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
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
            >
              <Settings size={14} />
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {!settings ? (
          <EmptyState onOpenSettings={() => setShowSettings(true)} />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <ErrorBanner message={error?.message ?? 'Unknown error'} />
        ) : filteredData ? (
          <>
            <Legend />
            <TrackerTable matrix={filteredData} showWeekends={showWeekends} />
          </>
        ) : null}
      </main>

      <SettingsModal
        open={showSettings}
        initialValues={settings}
        onClose={() => setShowSettings(false)}
        onSave={handleSave}
      />
    </div>
  )
}

function EmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl">📊</div>
      <h2 className="mb-1 text-lg font-semibold text-gray-800">No connection configured</h2>
      <p className="mb-6 text-sm text-gray-500">
        Connect your Azure DevOps organization to start tracking team capacity.
      </p>
      <button
        onClick={onOpenSettings}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Configure connection
      </button>
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
  const isPat = message.toLowerCase().includes('pat') || message.includes('401')
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
      <p className="font-medium text-red-800">Failed to load data</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {isPat && (
        <p className="mt-2 text-sm text-red-500">
          Open Settings and verify your PAT has the <strong>Analytics (Read)</strong> scope and
          has not expired.
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
