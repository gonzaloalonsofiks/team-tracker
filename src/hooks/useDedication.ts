import { useCallback, useState } from 'react'
import type { DateRange } from '../types'

const STORAGE_KEY = 'team-tracker-dedication'

type DedicationMap = Record<string, number>

function load(): Record<string, DedicationMap> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, DedicationMap>) : {}
  } catch {
    return {}
  }
}

export function useDedication(dateRange: DateRange) {
  const [store, setStore] = useState<Record<string, DedicationMap>>(load)
  const rangeKey = `${dateRange.start}::${dateRange.end}`

  const get = useCallback(
    (email: string): number | undefined => store[rangeKey]?.[email],
    [store, rangeKey],
  )

  const set = useCallback(
    (email: string, hours: number) => {
      setStore((prev) => {
        const next = {
          ...prev,
          [rangeKey]: { ...prev[rangeKey], [email]: hours },
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [rangeKey],
  )

  const remove = useCallback(
    (email: string) => {
      setStore((prev) => {
        const rangeMap = { ...prev[rangeKey] }
        delete rangeMap[email]
        const next = { ...prev, [rangeKey]: rangeMap }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [rangeKey],
  )

  return { get, set, remove }
}
