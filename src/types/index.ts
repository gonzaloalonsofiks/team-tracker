export interface WorkItemSnapshotRow {
  WorkItemId: number
  DateValue: string
  CompletedWork: number | null
  State: string
  Title: string
  WorkItemType: string
  AssignedTo: {
    UserName: string
    UserEmail: string
  } | null
}

export interface ODataResponse<T> {
  '@odata.context': string
  value: T[]
  '@odata.nextLink'?: string
}

export interface DailyWorkItem {
  workItemId: number
  date: string
  deltaHours: number
  title: string
  state: string
  workItemType: string
}

export type CellType = 'weekend' | 'has-work' | 'no-items' | 'missing-work'

export interface MatrixCell {
  totalHours: number
  items: DailyWorkItem[]
  cellType: CellType
}

export interface DeveloperRow {
  displayName: string
  uniqueName: string
  cells: Record<string, MatrixCell>
}

export interface TrackerMatrix {
  developers: DeveloperRow[]
  dates: string[]
}

export interface AppSettings {
  org: string
  project: string
  pat: string
  areaPath: string
  teamMembers: string
}

export interface DateRange {
  start: string
  end: string
}

export interface Iteration {
  IterationName: string
  IterationPath: string
  StartDate: string
  EndDate: string
}
