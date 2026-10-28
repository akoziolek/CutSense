import type { LocationQuery } from 'vue-router'

export interface FabricFilters {
  createdFrom: string
  createdTo: string
  favouriteOnly: boolean
  tagIds: number[]
  areaMin: string // as strings for the inputs
  areaMax: string
}

export const emptyFilters = (): FabricFilters => ({
  createdFrom: '',
  createdTo: '',
  favouriteOnly: false,
  tagIds: [],
  areaMin: '',
  areaMax: '',
})

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const asDate = (v: unknown) =>
  typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
    ? v
    : ''
const asArea = (v: unknown) => {
  if (typeof v !== 'string' || v.trim() === '') return ''
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? String(n) : ''
}
const asTagIds = (v: unknown): number[] =>
  typeof v !== 'string'
    ? []
    : [...new Set(v.split(',').map(Number))].filter((n) => Number.isInteger(n) && n > 0)

export const filtersFromQuery = (query: LocationQuery): FabricFilters => ({
  createdFrom: asDate(query.from),
  createdTo: asDate(query.to),
  favouriteOnly: query.fav === '1',
  tagIds: asTagIds(query.tags),
  areaMin: asArea(query.areaMin),
  areaMax: asArea(query.areaMax),
})

export const filtersToQuery = (f: FabricFilters): Record<string, string | undefined> => ({
  from: f.createdFrom || undefined,
  to: f.createdTo || undefined,
  fav: f.favouriteOnly ? '1' : undefined,
  tags: f.tagIds.length ? f.tagIds.join(',') : undefined,
  areaMin: f.areaMin.trim() || undefined,
  areaMax: f.areaMax.trim() || undefined,
})

export const filtersToApiParams = (f: FabricFilters): Record<string, string> => {
  const params: Record<string, string> = {}
  if (f.createdFrom) params.createdFrom = new Date(`${f.createdFrom}T00:00:00`).toISOString()
  if (f.createdTo) params.createdTo = new Date(`${f.createdTo}T23:59:59.999`).toISOString()
  if (f.favouriteOnly) params.favourite = 'true'
  if (f.tagIds.length) params.tagIds = f.tagIds.join(',')
  if (f.areaMin) params.areaMin = f.areaMin
  if (f.areaMax) params.areaMax = f.areaMax
  return params
}

export const countActiveFilters = (f: FabricFilters) =>
  Object.values(filtersToQuery(f)).filter((v) => v !== undefined).length