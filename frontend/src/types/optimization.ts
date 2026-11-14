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
  points: [number, number][]
  normalCount: number
  mirroredCount: number
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
  usableScrapCount: number
  usableScrapsArea: number // m²
  usableScrapsPercentage: number
  remainingFabricLength: number // mm
  remainingFabricArea: number // m²
  remainingFabricPercentage: number
  wasteArea: number // m²
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
    widthMm: number
    lengthMm: number
    boundary: OptimizerPoint[]
  }
  seamAllowanceMm: number
  cuttingAllowanceMm: number
  wasSuccessful: boolean
  minLengthMm: number
  stats: OptimizationStats
  placements: OptimizationPlacement[]
}

export interface OptimizationListItem {
  id: number
  name: string
  createdAt: string
  patternId: number
  patternName: string
  minLengthMm: number
  imageUrl?: string
}

export interface OptimizationListResponse {
  items: OptimizationListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type OptimizationSort = 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'

export interface OptimizationStats {
  usableScrapsArea: number
  usableScrapsPercentage: number
  remainingFabricArea: number
  remainingFabricPercentage: number
  wasteArea: number
  wastePercentage: number
}