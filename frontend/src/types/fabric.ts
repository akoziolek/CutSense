import type { Point2D } from './geometry'
import type { BaseFilters, NameTag, NamedItem, PaginatedResponse } from './common'

export interface FabricFilters extends BaseFilters {
  areaMin: string
  areaMax: string
}

export interface FabricFormPayload {
  name: string
  description?: string
  tags: NameTag[]
}

export interface FabricBoundaryPoint {
  x: number
  y: number
}

export interface FabricResponse {
  id: number
  name: string
  description?: string
  pictureUrl?: string
  isFavourite: boolean
  areaMm2: number
  grainline: number
  shapes: FabricBoundaryPoint[][]
  imageWidthMm?: number
  imageHeightMm?: number
  userId: number
  createdAt: string
  tags: NameTag[]
}

export interface FabricListItem extends NamedItem {
  pictureUrl: string
  isFavourite: boolean
  areaMm2: number
  createdAt: string
}

export type FabricListResponse = PaginatedResponse<FabricListItem>

export type FabricSort =
  'name_asc' | 'name_desc' | 'date_desc' | 'date_asc' | 'area_asc' | 'area_desc'

// store types
export interface FabricConfig {
  shapes: Point2D[][]
  pxPerMm: number
  threadAngle: number
  rotation: number
  imageWidth: number
  imageHeight: number
  isConfigured: boolean
}

export interface FabricDetails {
  name: string
  description: string
  tags: NameTag[]
}
