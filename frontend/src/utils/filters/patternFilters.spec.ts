import { describe, expect, it } from 'vitest'
import {
  emptyFilters,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery,
} from './patternFilters'

describe('pattern filters', () => {
  it('defaults to the current user’s patterns without community results', () => {
    const filters = filtersFromQuery({})

    expect(filters.communityOnly).toBe(false)
    expect(filtersToApiParams(filters).community).toBe('false')
  })

  it('preserves an explicit choice to include community patterns', () => {
    const filters = { ...emptyFilters(), communityOnly: true }

    expect(filtersToQuery(filters)).toEqual({ community: '1' })
    expect(filtersFromQuery({ community: '1' }).communityOnly).toBe(true)
    expect(filtersToApiParams(filters).community).toBeUndefined()
  })
})
