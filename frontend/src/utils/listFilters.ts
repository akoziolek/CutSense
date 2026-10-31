import type { LocationQuery } from 'vue-router'

export interface BaseFilters {
  createdFrom: string // YYYY-MM-DD or ''
  createdTo: string
  favouriteOnly: boolean
  tagIds: number[]
}

export const emptyBaseFilters = (): BaseFilters => ({
  createdFrom: '', createdTo: '', favouriteOnly: false, tagIds: [],
})

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const asDate = (v: unknown) =>
  typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime()) ? v : ''
const asTagIds = (v: unknown): number[] =>
  typeof v !== 'string'
    ? []
    : [...new Set(v.split(',').map(Number))].filter((n) => Number.isInteger(n) && n > 0)

export const baseFromQuery = (query: LocationQuery): BaseFilters => ({
  createdFrom: asDate(query.from),
  createdTo: asDate(query.to),
  favouriteOnly: query.fav === '1',
  tagIds: asTagIds(query.tags),
})

export const baseToQuery = (f: BaseFilters): Record<string, string | undefined> => ({
  from: f.createdFrom || undefined,
  to: f.createdTo || undefined,
  fav: f.favouriteOnly ? '1' : undefined,
  tags: f.tagIds.length ? f.tagIds.join(',') : undefined,
})

export const baseToApiParams = (f: BaseFilters): Record<string, string> => {
  const params: Record<string, string> = {}
  if (f.createdFrom) params.createdFrom = new Date(`${f.createdFrom}T00:00:00`).toISOString()
  if (f.createdTo) params.createdTo = new Date(`${f.createdTo}T23:59:59.999`).toISOString()
  if (f.favouriteOnly) params.favourite = 'true'
  if (f.tagIds.length) params.tagIds = f.tagIds.join(',')
  return params
}

export const countActive = (query: Record<string, string | undefined>) =>
  Object.values(query).filter((v) => v !== undefined).length