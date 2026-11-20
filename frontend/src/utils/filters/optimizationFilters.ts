import type { LocationQuery } from 'vue-router'
import {
  baseFromQuery,
  baseToApiParams,
  baseToQuery,
  countActive,
  emptyBaseFilters,
} from './listFilters'
import type { OptimizationFilters } from '@/types/optimization'

const asIds = (v: unknown): number[] =>
  typeof v !== 'string'
    ? []
    : [...new Set(v.split(',').map(Number))].filter((n) => Number.isInteger(n) && n > 0)

const join = (ids: number[]) => (ids.length ? ids.join(',') : undefined)

export const emptyFilters = (): OptimizationFilters => ({
  ...emptyBaseFilters(),
  patternIds: [],
  fabricIds: [],
  algorithmIds: [],
})

export const filtersFromQuery = (query: LocationQuery): OptimizationFilters => ({
  ...baseFromQuery(query),
  patternIds: asIds(query.patterns),
  fabricIds: asIds(query.fabrics),
  algorithmIds: asIds(query.algorithms),
})

export const filtersToQuery = (f: OptimizationFilters): Record<string, string | undefined> => ({
  ...baseToQuery(f),
  patterns: join(f.patternIds),
  fabrics: join(f.fabricIds),
  algorithms: join(f.algorithmIds),
})

export const filtersToApiParams = (f: OptimizationFilters): Record<string, string> => {
  const params = baseToApiParams(f)
  if (f.patternIds.length) params.patternIds = f.patternIds.join(',')
  if (f.fabricIds.length) params.fabricIds = f.fabricIds.join(',')
  if (f.algorithmIds.length) params.algorithmIds = f.algorithmIds.join(',')
  return params
}

export const countActiveFilters = (f: OptimizationFilters) => countActive(filtersToQuery(f))
