export const PATTERN_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export type PatternSize = (typeof PATTERN_SIZES)[number]

export interface PatternListItem {
  id: number
  name: string
  size: PatternSize
  isFavourite: boolean
  createdAt: string
}

export interface PatternListResponse {
  items: PatternListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type PatternSort = 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'