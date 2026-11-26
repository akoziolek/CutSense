import type { Point2D, PointMm } from './geometry'
import type { BaseFilters, NameTag, NamedItem, PaginatedResponse } from './common'

export interface PatternFilters extends BaseFilters {
  sizes: PATTERN_SIZE[]
  communityOnly: boolean
}

export interface PatternFormPayload {
  name: string
  size: PATTERN_SIZE | string
  description?: string
  tags: NameTag[]
  visibility: PATTERN_VISIBILITY | string
}

export interface PatternRatingState {
  userRating: number | null
  starCount: number
  starAverage: string
}

export interface PatternImage {
  id: number
  url: string
  imageWidthMm: number
  imageHeightMm: number
  orderIndex: number
}

export interface PatternPieceDefinition {
  id: number
  patternImageId: number
  points: PointMm[]
  normalCount: number
  mirroredCount: number
}

export interface PatternCarouselPiece extends PatternPieceDefinition {
  grainline: number
}

export enum PATTERN_SIZE {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
}

export enum PATTERN_VISIBILITY {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface PatternListItem extends NamedItem {
  size: PATTERN_SIZE
  isFavourite: boolean
  createdAt: string
  isOwner: boolean
  imageUrl?: string
}

export type PatternListResponse = PaginatedResponse<PatternListItem>

export type PatternSort = 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'

// store types
export interface PatternPhotoData {
  shapes: Point2D[][]
  shapeIds: string[]
  hiddenShapes: boolean[]
  pxPerMm: number
  rotation: number
  imageWidth: number
  imageHeight: number
  isAnalyzing?: boolean
  isAnalyzed?: boolean
}

export interface PatternPiece {
  id: string
  photoIndex: number
  shapeId: string
  name: string
  normal: number
  mirrored: number
  grainline: number
}

export interface PatternDetails {
  name: string
  size: PATTERN_SIZE
  description: string
  tags: NameTag[]
  visibility: PATTERN_VISIBILITY
}
