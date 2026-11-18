import type { FilterOption } from '@/utils/listFilters'

export type FabricSource = 'custom' | 'library'

export interface SelectedItem {
  id: number
  name: string
}

export interface OptimizationAlgorithm {
  id: number
  name: string
  description?: string
}

export interface OptimizationDefaults {
  seamAllowanceMm: number
  cuttingAllowanceMm: number
}

export interface PatternPieceDefaults {
  id: number
  patternImageId: number
  points: [number, number][]
  normalCount: number
  mirroredCount: number
}

export interface PatternImageDetails {
  id: number
  url: string
  imageWidthMm: number
  imageHeightMm: number
  orderIndex: number
}

export interface PatternDetails {
  id: number
  name: string
  size: string
  pieces: PatternPieceDefaults[]
  images: PatternImageDetails[]
}

export interface OptimizationPieceConfig {
  key: string
  patternPieceId: number
  normalCount: number
  mirroredCount: number
  direction: number
  twoWay: boolean
}

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

export type OptimizerPoint = [number, number]

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
  polygon: [number, number][]
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

export interface OptimizationListItem {
  id: number
  name: string
  createdAt: string
  patternId: number
  patternName: string
  fabricName?: string
  algorithmName: string
  minLengthMm: number
}

export interface OptimizationListResponse {
  items: OptimizationListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type OptimizationSortField = 'name' | 'date' | 'pattern' | 'fabric' | 'algorithm'
export type OptimizationSort = `${OptimizationSortField}_${'asc' | 'desc'}`

export interface OptimizationFilterOptions {
  patterns: FilterOption[]
  fabrics: FilterOption[]
  algorithms: FilterOption[]
}