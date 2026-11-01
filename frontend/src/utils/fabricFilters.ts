import type { LocationQuery } from 'vue-router'
import { baseFromQuery, baseToApiParams, baseToQuery, emptyBaseFilters, countActive, type BaseFilters } from './listFilters'


export interface FabricFilters extends BaseFilters { areaMin: string; areaMax: string }

const asArea = (v: unknown) => {
  if (typeof v !== 'string' || v.trim() === '') return ''
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? String(n) : ''
}
const normalizeArea = (v: unknown): string | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  return String(v).trim() || undefined
}

const toCm2 = (v: string): string => {
  const n = Number(v)
  return Number.isFinite(n) ? String(Math.round(n * 10000)) : ''
}

export const emptyFilters = (): FabricFilters => ({ ...emptyBaseFilters(), areaMin: '', areaMax: '' })
export const filtersFromQuery = (query: LocationQuery): FabricFilters => ({
  ...baseFromQuery(query), areaMin: asArea(query.areaMin), areaMax: asArea(query.areaMax),
})
export const filtersToQuery = (f: FabricFilters) => ({
  ...baseToQuery(f), areaMin: normalizeArea(f.areaMin), areaMax: normalizeArea(f.areaMax),
})
export const filtersToApiParams = (f: FabricFilters) => {
  const params = baseToApiParams(f)
  if (f.areaMin) params.areaMin = toCm2(f.areaMin)
  if (f.areaMax) params.areaMax = toCm2(f.areaMax)
  return params
}
export const areaRangeError = (f: FabricFilters) =>
  f.areaMin !== '' && f.areaMax !== '' && Number(f.areaMin) > Number(f.areaMax)
    ? 'The minimum area must not be greater than the maximum.'
    : ''
export const countActiveFilters = (f: FabricFilters) => countActive(filtersToQuery(f))
