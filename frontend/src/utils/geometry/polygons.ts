import { Clipper, JoinType, EndType, type Path64, type Point64 } from 'clipper2-ts'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import { toImagePixels } from './coordinates'

export const toSvgPoints = (points: Point2D[]): string =>
  points.map((p) => `${p.pctX},${p.pctY}`).join(' ')

export function getCartesianDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

export function getPointDistance(
  p1: Point2D,
  p2: Point2D,
  width = 1,
  height = 1,
): number {
  const first = toImagePixels(p1, width, height)
  const second = toImagePixels(p2, width, height)
  return getCartesianDistance(first, second)
}

export function getSegmentMidpoint(
  p1: Point2D,
  p2: Point2D,
  width = 1,
  height = 1,
): { x: number; y: number } {
  const first = toImagePixels(p1, width, height)
  const second = toImagePixels(p2, width, height)
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

export function getPolygonEdges(
  points: Point2D[],
  width: number,
  height: number,
  pxPerMm = 1,
): PolygonEdge[] {
  if (points.length < 2 || pxPerMm <= 0) return []

  return points.map((p1, index) => {
    const p2 = points[(index + 1) % points.length]!
    return {
      index,
      p1,
      p2,
      distanceCm: (getPointDistance(p1, p2, width, height) / pxPerMm / 10).toFixed(1),
    }
  })
}

export function offsetPolygonMm(
  mmPts: [number, number][],
  offsetMm: number,
  miterLimit = 2,
): [number, number][] {
  if (mmPts.length < 3 || offsetMm <= 0) return mmPts

  const scale = 1000
  const rawPath: Path64 = mmPts.map(([x, y]): Point64 => ({
    x: Math.round(x * scale),
    y: Math.round(y * scale),
  }))

  const simplified = Clipper.simplifyPath(rawPath, 0.1 * scale)
  const inflated = Clipper.inflatePaths(
    [simplified],
    offsetMm * scale,
    JoinType.Miter,
    EndType.Polygon,
    miterLimit,
  )

  const resultPath = inflated[0]
  if (!resultPath || resultPath.length < 3) return mmPts

  return resultPath.map((pt: Point64) => [pt.x / scale, pt.y / scale])
}

export const getPolygonCentroidPct = (pts: Point2D[]): Point2D => {
  if (pts.length === 0) return { pctX: 0, pctY: 0 }
  if (pts.length < 3) {
    return {
      pctX: pts.reduce((acc, p) => acc + p.pctX, 0) / pts.length,
      pctY: pts.reduce((acc, p) => acc + p.pctY, 0) / pts.length,
    }
  }

  let area2 = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i]!
    const p2 = pts[(i + 1) % pts.length]!
    const cross = p1.pctX * p2.pctY - p2.pctX * p1.pctY
    area2 += cross
    cx += (p1.pctX + p2.pctX) * cross
    cy += (p1.pctY + p2.pctY) * cross
  }

  if (Math.abs(area2) < 1e-6) {
    return {
      pctX: pts.reduce((acc, p) => acc + p.pctX, 0) / pts.length,
      pctY: pts.reduce((acc, p) => acc + p.pctY, 0) / pts.length,
    }
  }

  return {
    pctX: cx / (3 * area2),
    pctY: cy / (3 * area2),
  }
}

export function polygonAreaMm2(points: { x: number; y: number }[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!
    const b = points[(i + 1) % points.length]!
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}