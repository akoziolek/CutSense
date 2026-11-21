import type { GeometryBoundsMm, GeometryOriginMm, Point2D, PointMm } from '@/types/geometry'

export function getGeometryBoundsMm(shapes: [number, number][][]): GeometryBoundsMm {
  const points = shapes.flat()
  if (points.length === 0) {
    return { originMm: { minX: 0, minY: 0 }, widthMm: 0, heightMm: 0 }
  }

  const minX = Math.min(...points.map(([x]) => x))
  const minY = Math.min(...points.map(([, y]) => y))
  const maxX = Math.max(...points.map(([x]) => x))
  const maxY = Math.max(...points.map(([, y]) => y))

  return {
    originMm: { minX, minY },
    widthMm: Math.max(maxX - minX, 1),
    heightMm: Math.max(maxY - minY, 1),
  }
}

export function getFabricOriginMm(fabricShape: [number, number][]): GeometryOriginMm {
  return getGeometryBoundsMm([fabricShape]).originMm
}

export function toPercentPoint(
  [xMm, yMm]: [number, number],
  origin: GeometryOriginMm,
  widthMm: number,
  heightMm: number,
): Point2D {
  return {
    pctX: widthMm > 0 ? ((xMm - origin.minX) / widthMm) * 100 : 0,
    pctY: heightMm > 0 ? 100 - ((yMm - origin.minY) / heightMm) * 100 : 0,
  }
}

export function toFabricPercent(
  pointMm: [number, number],
  origin: GeometryOriginMm,
  widthMm: number,
  heightMm: number,
): Point2D {
  return toPercentPoint(pointMm, origin, widthMm, heightMm)
}

export function toImagePercent(
  pointMm: PointMm,
  imageWidthMm: number,
  imageHeightMm: number,
): Point2D {
  return toPercentPoint([pointMm.x, pointMm.y], { minX: 0, minY: 0 }, imageWidthMm, imageHeightMm)
}

export function toImagePixels(
  { pctX, pctY }: Point2D,
  imageWidthPx: number,
  imageHeightPx: number,
): { x: number; y: number } {
  return {
    x: (pctX / 100) * imageWidthPx,
    y: (pctY / 100) * imageHeightPx,
  }
}

export function toImageMm(
  { pctX, pctY }: Point2D,
  imageWidthPx: number,
  imageHeightPx: number,
  pxPerMm = 1,
): PointMm {
  return {
    x: (pctX * imageWidthPx) / 100 / pxPerMm,
    y: ((100 - pctY) * imageHeightPx) / 100 / pxPerMm,
  }
}

export function toPostgisBoundary(
  points: Point2D[],
  config: { pxPerMm: number; imageWidth: number; imageHeight: number },
): PointMm[] {
  return points.map((point) =>
    toImageMm(point, config.imageWidth, config.imageHeight, config.pxPerMm),
  )
}

export function toImagePercentBoundary(
  points: PointMm[],
  imageWidthMm: number,
  imageHeightMm: number,
): Point2D[] {
  if (
    !Number.isFinite(imageWidthMm) ||
    !Number.isFinite(imageHeightMm) ||
    imageWidthMm <= 0 ||
    imageHeightMm <= 0
  ) {
    return []
  }

  return points.map((point) => toImagePercent(point, imageWidthMm, imageHeightMm))
}

export function toFabricPercentBoundary(
  points: [number, number][],
  origin: GeometryOriginMm,
  widthMm: number,
  heightMm: number,
): Point2D[] {
  if (widthMm <= 0 || heightMm <= 0) return []
  return points.map((point) => toFabricPercent(point, origin, widthMm, heightMm))
}
