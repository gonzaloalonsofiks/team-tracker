import type { AppSettings, ODataResponse, WorkItemSnapshotRow } from '../types'

export function buildODataUrl(
  org: string,
  project: string,
  fetchStart: string,
  dateEnd: string,
  areaPath: string,
  teamMembers: string[],
): string {
  const filters: string[] = [
    `DateValue ge ${fetchStart}T00:00:00Z`,
    `DateValue le ${dateEnd}T00:00:00Z`,
    `WorkItemType in ('Task','Bug')`,
    `State ne 'Removed'`,
  ]

  if (areaPath) {
    const escaped = areaPath.replace(/'/g, "''")
    filters.push(`(Area/AreaPath eq '${escaped}' or startswith(Area/AreaPath,'${escaped}\\'))`)
  }

  if (teamMembers.length > 0) {
    const list = teamMembers.map((m) => `'${m.replace(/'/g, "''")}'`).join(',')
    filters.push(`AssignedTo/UserEmail in (${list})`)
  }

  // WorkItemSnapshot requires $apply (aggregation) — raw row queries are rejected with VS403510.
  // groupby on all identifying columns + aggregate(max) satisfies the requirement while
  // preserving per-item per-day data so we can compute daily deltas on the client.
  const groupbyProps = [
    'WorkItemId',
    'DateValue',
    'State',
    'Title',
    'WorkItemType',
    'AssignedTo/UserName',
    'AssignedTo/UserEmail',
  ].join(',')

  const apply =
    `filter(${filters.join(' and ')})` +
    `/groupby((${groupbyProps}),aggregate(CompletedWork with max as CompletedWork))`

  const qs = [`$apply=${apply}`, `$orderby=WorkItemId asc,DateValue asc`].join('&')

  return `/azdo/${org}/${project}/_odata/v4.0-preview/WorkItemSnapshot?${qs}`
}

export async function fetchAllPages(initialUrl: string): Promise<WorkItemSnapshotRow[]> {
  const rows: WorkItemSnapshotRow[] = []
  let next: string | undefined = initialUrl

  while (next) {
    const proxied = next.replace('https://analytics.dev.azure.com', '/azdo')
    const res = await fetch(proxied)

    if (res.status === 401) {
      throw new Error('PAT expired or unauthorized. Please update your settings.')
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`OData ${res.status}: ${body || res.statusText}`)
    }

    const data: ODataResponse<WorkItemSnapshotRow> = await res.json()
    rows.push(...data.value)
    next = data['@odata.nextLink']
  }

  return rows
}

export async function fetchWorkItemSnapshots(
  settings: AppSettings,
  fetchStart: string,
  dateEnd: string,
): Promise<WorkItemSnapshotRow[]> {
  const members = settings.teamMembers
    ? settings.teamMembers
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    : []

  const url = buildODataUrl(
    settings.org,
    settings.project,
    fetchStart,
    dateEnd,
    settings.areaPath,
    members,
  )

  return fetchAllPages(url)
}
