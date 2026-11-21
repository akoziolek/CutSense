import type { LocationQuery } from 'vue-router'
import { PATTERN_SIZE } from '@/types/pattern'
import {
  baseFromQuery,
  baseToApiParams,
  baseToQuery,
  countActive,
  emptyBaseFilters,
} from './listFilters'
import type { PatternFilters } from '@/types/pattern'

export const emptyFilters = (): PatternFilters => ({
  ...emptyBaseFilters(),
  sizes: [],
  communityOnly: false,
})

const asSizes = (v: unknown): PATTERN_SIZE[] => {
  if (typeof v !== 'string') return []
  const wanted = new Set(v.split(','))
  return Object.values(PATTERN_SIZE).filter((s) => wanted.has(s))
}

export const filtersFromQuery = (query: LocationQuery): PatternFilters => ({
  ...baseFromQuery(query),
  sizes: asSizes(query.sizes),
  communityOnly: query.community === '1' || query.community === 'true',
})

export const filtersToQuery = (f: PatternFilters): Record<string, string | undefined> => ({
  ...baseToQuery(f),
  sizes: f.sizes.length ? f.sizes.join(',') : undefined,
  community: f.communityOnly ? '1' : undefined,
})

export const filtersToApiParams = (f: PatternFilters): Record<string, string> => {
  const params = baseToApiParams(f)
  if (f.sizes.length) params.sizes = f.sizes.join(',')
  if (!f.communityOnly) params.community = 'false'
  return params
}

export const countActiveFilters = (f: PatternFilters) => countActive(filtersToQuery(f))
