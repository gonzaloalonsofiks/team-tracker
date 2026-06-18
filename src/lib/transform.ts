import { eachDayOfInterval, format, getDay, parseISO, subDays } from 'date-fns'
import type {
  DailyWorkItem,
  DeveloperRow,
  MatrixCell,
  TrackerMatrix,
  WorkItemSnapshotRow,
} from '../types'

export function getFetchStart(displayStart: string): string {
  return format(subDays(parseISO(displayStart), 3), 'yyyy-MM-dd')
}

export function generateDisplayDates(start: string, end: string): string[] {
  return eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  }).map((d) => format(d, 'yyyy-MM-dd'))
}

export function computeDailyDeltas(
  rows: WorkItemSnapshotRow[],
  displayStart: string,
  displayEnd: string,
): DailyWorkItem[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.WorkItemId !== b.WorkItemId) return a.WorkItemId - b.WorkItemId
    return a.DateValue.localeCompare(b.DateValue)
  })

  const prevMap = new Map<number, number>()
  const result: DailyWorkItem[] = []

  for (const row of sorted) {
    const date = row.DateValue.slice(0, 10)
    const cumulative = row.CompletedWork ?? 0
    const prev = prevMap.get(row.WorkItemId) ?? 0
    const delta = Math.max(0, cumulative - prev)
    prevMap.set(row.WorkItemId, cumulative)

    if (date >= displayStart && date <= displayEnd && delta > 0 && row.AssignedTo?.UserEmail) {
      result.push({
        workItemId: row.WorkItemId,
        date,
        deltaHours: delta,
        title: row.Title,
        state: row.State,
        workItemType: row.WorkItemType,
      })
    }
  }

  return result
}

export function buildMatrix(
  deltas: DailyWorkItem[],
  allRows: WorkItemSnapshotRow[],
  displayDates: string[],
): TrackerMatrix {
  const displayStart = displayDates[0]
  const displayEnd = displayDates[displayDates.length - 1]

  // Collect developers from allRows within the display range
  const devMap = new Map<string, { displayName: string; cells: Record<string, MatrixCell> }>()

  for (const row of allRows) {
    const date = row.DateValue.slice(0, 10)
    if (!row.AssignedTo?.UserEmail || date < displayStart || date > displayEnd) continue
    const key = row.AssignedTo.UserEmail
    if (!devMap.has(key)) {
      devMap.set(key, { displayName: row.AssignedTo.UserName ?? key, cells: {} })
    }
  }

  // Map of dev -> set of dates where they have assigned items
  const devHasItemsOnDate = new Map<string, Set<string>>()
  for (const row of allRows) {
    const date = row.DateValue.slice(0, 10)
    if (!row.AssignedTo?.UserEmail || date < displayStart || date > displayEnd) continue
    const key = row.AssignedTo.UserEmail
    if (!devHasItemsOnDate.has(key)) devHasItemsOnDate.set(key, new Set())
    devHasItemsOnDate.get(key)!.add(date)
  }

  // Accumulate deltas into developer cells
  const deltaCellMap = new Map<string, Map<string, { totalHours: number; items: DailyWorkItem[] }>>()

  for (const delta of deltas) {
    // Find the developer for this delta by matching workItemId from allRows
    const matchingRow = allRows.find(
      (r) => r.WorkItemId === delta.workItemId && r.DateValue.slice(0, 10) === delta.date,
    )
    if (!matchingRow?.AssignedTo) continue

    const devKey = matchingRow.AssignedTo.UserEmail
    if (!deltaCellMap.has(devKey)) deltaCellMap.set(devKey, new Map())
    const dateMap = deltaCellMap.get(devKey)!
    if (!dateMap.has(delta.date)) dateMap.set(delta.date, { totalHours: 0, items: [] })
    const cell = dateMap.get(delta.date)!
    cell.totalHours += delta.deltaHours
    cell.items.push(delta)
  }

  // Build developer rows
  const developers: DeveloperRow[] = []

  for (const [uniqueName, dev] of devMap) {
    const cells: Record<string, MatrixCell> = {}
    const devDates = devHasItemsOnDate.get(uniqueName) ?? new Set()
    const devDeltaCells = deltaCellMap.get(uniqueName) ?? new Map()

    for (const date of displayDates) {
      const isWeekend = [0, 6].includes(getDay(parseISO(date)))
      const deltaCell = devDeltaCells.get(date)
      const totalHours = deltaCell?.totalHours ?? 0
      const items = deltaCell?.items ?? []

      let cellType: MatrixCell['cellType']
      if (isWeekend) {
        cellType = 'weekend'
      } else if (totalHours > 0) {
        cellType = 'has-work'
      } else if (devDates.has(date)) {
        cellType = 'missing-work'
      } else {
        cellType = 'no-items'
      }

      cells[date] = { totalHours, items, cellType }
    }

    developers.push({ displayName: dev.displayName, uniqueName, cells })
  }

  developers.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))

  return { developers, dates: displayDates }
}
