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
    `WorkItemType ne 'Epic'`,
    `State ne 'Removed'`,
  ]

  if (areaPath) {
    const escaped = areaPath.replace(/'/g, "''")
    filters.push(`(AreaPath eq '${escaped}' or startswith(AreaPath,'${escaped}\\'))`)
  }

  if (teamMembers.length > 0) {
    const list = teamMembers.map((m) => `'${m.replace(/'/g, "''")}'`).join(',')
    filters.push(`AssignedTo/UserEmail in (${list})`)
  }

  // Build query string manually — URLSearchParams encodes spaces as '+' and parens as '%28'
  // which breaks OData filter/expand syntax. Azure DevOps accepts literal OData characters.
  const qs = [
    `$select=WorkItemId,DateValue,CompletedWork,State,Title,WorkItemType,AreaPath,IterationPath`,
    `$expand=AssignedTo($select=UserName,UserEmail)`,
    `$filter=${filters.join(' and ')}`,
    `$orderby=WorkItemId asc,DateValue asc`,
  ].join('&')

  return `/azdo/${org}/${project}/_odata/v4.0-preview/WorkItemSnapshot?${qs}`
}

function authHeader(pat: string): string {
  return `Basic ${btoa(`:${pat}`)}`
}

export async function fetchAllPages(
  initialUrl: string,
  pat: string,
): Promise<WorkItemSnapshotRow[]> {
  const rows: WorkItemSnapshotRow[] = []
  let next: string | undefined = initialUrl

  while (next) {
    const proxied = next.replace('https://analytics.dev.azure.com', '/azdo')
    const res = await fetch(proxied, {
      headers: { Authorization: authHeader(pat) },
    })

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

  return fetchAllPages(url, settings.pat)
}
