import type { BaseFilters, FilterOption, NamedItem, PaginatedResponse } from './common'
import type { PointMm } from './geometry'
import type { PatternImage, PatternPieceDefinition } from './pattern'

export interface OptimizationFilters extends BaseFilters {
  patternIds: number[]
  fabricIds: number[]
  algorithmIds: number[]
}

export type SelectedItem = NamedItem

export interface OptimizationAlgorithm extends NamedItem {
  description?: string
}

export interface OptimizationDefaults {
  seamAllowanceMm: number
  cuttingAllowanceMm: number
}

export type PatternPieceDefaults = PatternPieceDefinition

export interface PatternDetails {
  id: number
  name: string
  size: string
  pieces: PatternPieceDefaults[]
  images: PatternImage[]
}

export interface OptimizationPieceConfig {
  key: string
  patternPieceId: number
  normalCount: number
  mirroredCount: number
  direction: number
  twoWay: boolean
}

export type PoolFabric =
  | { key: string; source: 'custom'; widthCm: string; heightCm: string }
  | { key: string; source: 'library'; fabricId: number; name: string }

export interface WizardPieceConfig extends OptimizationPieceConfig {
  fabricKey: string | null
}

// one request body per fabric
export interface CreateOptimizationPayload {
  patternId: number
  algorithmId: number
  fabricId?: number
  fabricWidthMm?: number
  fabricLengthMm?: number
  seamAllowanceMm: number
  cuttingAllowanceMm: number
  pieces: Omit<OptimizationPieceConfig, 'key'>[]
}

export type OptimizerPoint = PointMm

export interface OptimizationStats {
  usableScrapsArea: number
  usableScrapsPercentage: number
  remainingFabricArea: number
  remainingFabricPercentage: number
  wasteArea: number
  wastePercentage: number
}

export interface OptimizationPlacement {
  patternPieceId: number
  isMirrored: boolean
  rotationAngle: number
  isFlipped180: boolean
  x: number
  y: number
  polygon: PointMm[]
}

export interface PlacedPieceViewItem {
  id: number
  patternPieceId?: number
  pieceNumber?: number
  isMirrored?: boolean
  rotationAngle?: number
  points: [number, number][]
}

export interface OptimizationView {
  runId?: string
  id?: number
  name?: string
  isSaved: boolean
  algorithmName: string
  fabric: {
    fabricId?: number
    name?: string
    createdAt?: string
    widthMm: number
    lengthMm: number
    boundary: OptimizerPoint[]
  }
  pattern?: {
    id: number
    name: string
    size: string
    createdAt: string
  }
  seamAllowanceMm: number
  cuttingAllowanceMm: number
  wasSuccessful: boolean
  minLengthMm: number
  executionTime: number // ms
  stats: OptimizationStats
  placements: OptimizationPlacement[]
}

export interface OptimizationListItem extends NamedItem {
  createdAt: string
  patternId: number
  patternName: string
  fabricName?: string
  fabricCount: number
  memberIds: number[]
  algorithmName: string
  minLengthMm: number
}

export type OptimizationListResponse = PaginatedResponse<OptimizationListItem>

export type OptimizationSortField = 'name' | 'date' | 'pattern' | 'fabric' | 'algorithm'
export type OptimizationSort = `${OptimizationSortField}_${'asc' | 'desc'}`

export interface OptimizationFilterOptions {
  patterns: FilterOption[]
  fabrics: FilterOption[]
  algorithms: FilterOption[]
}