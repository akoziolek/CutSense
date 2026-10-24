// percent of the image height/width
export interface Point2D {
  pctX: number
  pctY: number
}

export interface PolygonEdge {
  index: number
  p1: Point2D
  p2: Point2D
  distanceCm: string
}
