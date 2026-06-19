import { useQuery } from '@tanstack/react-query'
import { fetchWorkItemSnapshots } from '../lib/odata'
import {
  buildMatrix,
  computeDailyDeltas,
  generateDisplayDates,
  getFetchStart,
} from '../lib/transform'
import type { AppSettings, DateRange, TrackerMatrix } from '../types'

export function useWorkData(settings: AppSettings | null, dateRange: DateRange) {
  return useQuery<TrackerMatrix, Error>({
    queryKey: [
      'work-data',
      settings?.org,
      settings?.project,
      settings?.areaPath,
      settings?.teamMembers,
      dateRange.start,
      dateRange.end,
    ],
    queryFn: async () => {
      if (!settings) throw new Error('No settings configured')

      const fetchStart = getFetchStart(dateRange.start)
      const rows = await fetchWorkItemSnapshots(settings, fetchStart, dateRange.end)
      const displayDates = generateDisplayDates(dateRange.start, dateRange.end)
      const deltas = computeDailyDeltas(rows, dateRange.start, dateRange.end)
      return buildMatrix(deltas, rows, displayDates)
    },
    enabled: Boolean(settings?.org && settings?.project),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
