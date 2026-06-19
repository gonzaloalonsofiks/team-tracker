import { useQuery } from '@tanstack/react-query'
import type { AppSettings, Iteration, ODataResponse } from '../types'

async function fetchIterations(settings: AppSettings): Promise<Iteration[]> {
  const filters = [`StartDate ne null`, `EndDate ne null`]

  if (settings.areaPath) {
    const escaped = settings.areaPath.replace(/'/g, "''")
    filters.push(`startswith(IterationPath,'${escaped}')`)
  }

  const qs = [
    `$select=IterationName,IterationPath,StartDate,EndDate`,
    `$filter=${filters.join(' and ')}`,
    `$orderby=StartDate desc`,
    `$top=30`,
  ].join('&')

  const url = `/azdo/${settings.org}/${encodeURIComponent(settings.project)}/_odata/v4.0-preview/Iterations?${qs}`

  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Iterations ${res.status}: ${body || res.statusText}`)
  }

  const data: ODataResponse<Iteration> = await res.json()
  return data.value
}

export function useIterations(settings: AppSettings | null) {
  return useQuery<Iteration[], Error>({
    queryKey: ['iterations', settings?.org, settings?.project],
    queryFn: () => fetchIterations(settings!),
    enabled: Boolean(settings?.org && settings?.project),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
