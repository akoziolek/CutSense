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

// Piece of a pattern as returned by GET /patterns/:id
export interface PatternPieceDefaults {
  id: number
  patternImageId: number
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

export interface PreparedOptimizerInput {
  patternId: number
  algorithmId: number
  algorithmName: string
  fabric: {
    fabricId?: number
    widthMm: number
    lengthMm: number
    boundary: OptimizerPoint[]
  }
  seamAllowanceMm: number
  cuttingAllowanceMm: number
  pieces: {
    patternPieceId: number
    boundary: OptimizerPoint[]
    normalCount: number
    mirroredCount: number
    direction: number
    twoWay: boolean
  }[]
}
