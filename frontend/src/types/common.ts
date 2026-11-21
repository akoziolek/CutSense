export interface NamedItem {
  id: number
  name: string
}

export type NameTag = NamedItem

export interface FilterOption extends NamedItem {
  count?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BaseFilters {
  createdFrom: string // YYYY-MM-DD or ''
  createdTo: string
  favouriteOnly: boolean
  tagIds: number[]
}

export interface SortOption<S extends string> {
  value: S
  label: string
}
