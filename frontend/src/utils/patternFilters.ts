import type { LocationQuery } from 'vue-router'
import { PATTERN_SIZES, type PatternSize } from '@/types/pattern'
import {
  baseFromQuery,
  baseToApiParams,
  baseToQuery,
  countActive,
  emptyBaseFilters,
  type BaseFilters,
} from './listFilters'

export interface PatternFilters extends BaseFilters {
  sizes: PatternSize[]
  communityOnly: boolean
}

export const emptyFilters = (): PatternFilters => ({ ...emptyBaseFilters(), sizes: [], communityOnly: true, })

const asSizes = (v: unknown): PatternSize[] => {
  if (typeof v !== 'string') return []
  const wanted = new Set(v.split(','))
  return PATTERN_SIZES.filter((s) => wanted.has(s))
}

export const filtersFromQuery = (query: LocationQuery): PatternFilters => ({
  ...baseFromQuery(query),
  sizes: asSizes(query.sizes),
  communityOnly: query.community !== '0',
})

export const filtersToQuery = (f: PatternFilters): Record<string, string | undefined> => ({
  ...baseToQuery(f),
  sizes: f.sizes.length ? f.sizes.join(',') : undefined,
  community: f.communityOnly ? undefined : '0',
})

export const filtersToApiParams = (f: PatternFilters): Record<string, string> => {
  const params = baseToApiParams(f)
  if (f.sizes.length) params.sizes = f.sizes.join(',')
  if (!f.communityOnly) params.community = 'false'
  return params
}

export const countActiveFilters = (f: PatternFilters) => countActive(filtersToQuery(f))