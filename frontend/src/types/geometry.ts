// percent of the image height/width
export interface Point2D {
  pctX: number
  pctY: number
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
