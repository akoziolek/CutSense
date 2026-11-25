import { Clipper, FillRule, JoinType, EndType, type Path64, type Point64 } from 'clipper2-ts'
import type {
  GeometryBoundsMm,
  Point2D,
  PolygonEdge,
  PlacementValidationResult,
  PieceBatchValidationResult,
} from '@/types/geometry'
import { getGeometryBoundsMm, toImagePixels } from './coordinates'

const CLIPPER_SCALE = 1000
const PLACEMENT_AREA_TOLERANCE_MM2 = 1.0
const LINEAR_TOLERANCE_MM = 1.5

// needed for clipper lib
const toPath64 = (mmPts: [number, number][]): Path64 =>
  mmPts.map(([x, y]): Point64 => ({
    x: Math.round(x * CLIPPER_SCALE),
    y: Math.round(y * CLIPPER_SCALE),
  }))

const fromPaths64 = (paths: Path64[]): [number, number][][] =>
  paths.map((path) => path.map((pt) => [pt.x / CLIPPER_SCALE, pt.y / CLIPPER_SCALE]))

export const toSvgPoints = (points: Point2D[]): string =>
  points.map((p) => `${p.pctX},${p.pctY}`).join(' ')

export function getCartesianDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

export function getPointDistance(p1: Point2D, p2: Point2D, width = 1, height = 1): number {
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

export function getPolygonAreaMm2(pts: [number, number][]): number {
  if (pts.length < 3) return 0
  let area2 = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!
    const [x2, y2] = pts[(i + 1) % pts.length]!
    area2 += x1 * y2 - x2 * y1
  }
  return Math.abs(area2) / 2
}

export function offsetPolygonMm(
  mmPts: [number, number][],
  offsetMm: number,
  miterLimit = 2,
): [number, number][] {
  if (mmPts.length < 3 || offsetMm <= 0) return mmPts

  const simplified = Clipper.simplifyPath(toPath64(mmPts), 0.1 * CLIPPER_SCALE)
  const inflated = Clipper.inflatePaths(
    [simplified],
    offsetMm * CLIPPER_SCALE,
    JoinType.Miter,
    EndType.Polygon,
    miterLimit,
  )

  const resultPath = inflated[0]
  if (!resultPath || resultPath.length < 3) return mmPts

  return resultPath.map((pt: Point64) => [pt.x / CLIPPER_SCALE, pt.y / CLIPPER_SCALE])
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

const boundsOverlap = (a: GeometryBoundsMm, b: GeometryBoundsMm): boolean =>
  a.originMm.minX <= b.originMm.minX + b.widthMm &&
  a.originMm.minX + a.widthMm >= b.originMm.minX &&
  a.originMm.minY <= b.originMm.minY + b.heightMm &&
  a.originMm.minY + a.heightMm >= b.originMm.minY

const isInsideBounds = (inner: GeometryBoundsMm, outer: GeometryBoundsMm): boolean =>
  inner.originMm.minX >= outer.originMm.minX &&
  inner.originMm.minX + inner.widthMm <= outer.originMm.minX + outer.widthMm &&
  inner.originMm.minY >= outer.originMm.minY &&
  inner.originMm.minY + inner.heightMm <= outer.originMm.minY + outer.heightMm

export function validateAllPiecesPlacement(params: {
  piecesPoints: [number, number][][]
  fabricBoundary: [number, number][]
  totalAllowanceMm: number
}): PieceBatchValidationResult[] {
  const count = params.piecesPoints.length
  if (count === 0) return []

  const allowance = Math.max(0, params.totalAllowanceMm)
  const fabricValidationOffset = Math.max(0, allowance - LINEAR_TOLERANCE_MM)
  const overlapValidationOffset = Math.max(0, allowance - LINEAR_TOLERANCE_MM / 2)

  const hasFabric = params.fabricBoundary.length >= 3
  const fabricPath = hasFabric ? toPath64(params.fabricBoundary) : null
  const fabricBounds = hasFabric ? getGeometryBoundsMm([params.fabricBoundary]) : null

  const prepared = params.piecesPoints.map((pts) => {
    if (pts.length < 3) return null
    const overlapPoly = offsetPolygonMm(pts, overlapValidationOffset)
    const fabricPoly =
      fabricValidationOffset === overlapValidationOffset
        ? overlapPoly
        : offsetPolygonMm(pts, fabricValidationOffset)

    return {
      overlapPath: toPath64(overlapPoly),
      overlapBounds: getGeometryBoundsMm([overlapPoly]),
      fabricPath: toPath64(fabricPoly),
      fabricBounds: getGeometryBoundsMm([fabricPoly]),
    }
  })

  const hasOverlap = new Array<boolean>(count).fill(false)
  const isOutOfBounds = new Array<boolean>(count).fill(false)

  for (let i = 0; i < count; i++) {
    const a = prepared[i]
    if (!a) continue

    for (let j = i + 1; j < count; j++) {
      const b = prepared[j]
      if (!b || !boundsOverlap(a.overlapBounds, b.overlapBounds)) continue

      const overlapPaths = Clipper.intersect([a.overlapPath], [b.overlapPath], FillRule.NonZero)
      const overlapAreaMm2 = fromPaths64(overlapPaths).reduce(
        (sum, poly) => sum + getPolygonAreaMm2(poly),
        0,
      )

      if (overlapAreaMm2 > PLACEMENT_AREA_TOLERANCE_MM2) {
        hasOverlap[i] = true
        hasOverlap[j] = true
      }
    }
  }

  if (fabricPath && fabricBounds) {
    for (let i = 0; i < count; i++) {
      const item = prepared[i]
      if (!item) continue

      if (params.fabricBoundary.length === 4 && isInsideBounds(item.fabricBounds, fabricBounds)) {
        continue
      }

      const outsidePaths = Clipper.difference([item.fabricPath], [fabricPath], FillRule.NonZero)
      const outsideAreaMm2 = fromPaths64(outsidePaths).reduce(
        (sum, poly) => sum + getPolygonAreaMm2(poly),
        0,
      )

      if (outsideAreaMm2 > PLACEMENT_AREA_TOLERANCE_MM2) {
        isOutOfBounds[i] = true
      }
    }
  }

  return prepared.map((_, i) => {
    if (isOutOfBounds[i]) return { valid: false, reason: 'out_of_bounds' }
    if (hasOverlap[i]) return { valid: false, reason: 'overlap' }
    return { valid: true }
  })
}

/**
 * Validates piece placement against neighboring pieces and fabric boundaries.
 *
 * NOTE (Optimizer integer rounding workaround):
 * The C++ nesting engine computes placements on a micrometer grid (SCALE = 1000)
 * but inputs/outputs integer millimeter coordinates, causing up to ~1 mm shift on flush pieces.
 * `LINEAR_TOLERANCE_MM` compensates for this rounding drift to avoid false-positive
 * collisions on valid optimizer results.
 *
 * @todo Reduce `LINEAR_TOLERANCE_MM` to ~0.05 once the optimizer outputs `double` coordinates.
 */
export function validateSinglePieceAtIndex(params: {
  targetIndex: number
  piecesPoints: [number, number][][]
  fabricBoundary: [number, number][]
  totalAllowanceMm: number
}): PieceBatchValidationResult {
  const results = validateAllPiecesPlacement({
    piecesPoints: params.piecesPoints,
    fabricBoundary: params.fabricBoundary,
    totalAllowanceMm: params.totalAllowanceMm,
  })
  return results[params.targetIndex] ?? { valid: true }
}
