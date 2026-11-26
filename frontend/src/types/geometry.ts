// percent of the image height/width
export interface Point2D {
  pctX: number
  pctY: number
}

export interface PointMm {
  x: number
  y: number
}

export interface GeometryOriginMm {
  minX: number
  minY: number
}

export interface GeometryBoundsMm {
  originMm: GeometryOriginMm
  widthMm: number
  heightMm: number
}

export interface PolygonEdge {
  index: number
  p1: Point2D
  p2: Point2D
  distanceCm: string
}

export interface PieceImageSource {
  url: string
  imageWidthMm: number
  imageHeightMm: number
}

export type PlacementInvalidReason = 'out_of_bounds' | 'overlap'

export interface PlacementValidationResult {
  valid: boolean
  reason?: PlacementInvalidReason
  collidingIndices?: number[]
}

export interface PieceBatchValidationResult {
  valid: boolean
  reason?: PlacementInvalidReason
}
