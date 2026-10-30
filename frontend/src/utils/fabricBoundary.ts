import type { FabricConfig, Point2D } from '@/stores/addingFabricStore'
import type { FabricBoundaryPoint } from '@/types/fabric'
import type { Point2D as ImagePoint } from '@/types/geometry'

export interface PostgisPoint {
  x: number
  y: number
}

export function toPostgisBoundary(
  points: Point2D[],
  config: Pick<FabricConfig, 'pxPerCm' | 'imageWidth' | 'imageHeight'>,
): PostgisPoint[] {
  return points.map(({ pctX, pctY }) => ({
    x: (pctX * config.imageWidth) / 100 / config.pxPerCm,
    y: ((100 - pctY) * config.imageHeight) / 100 / config.pxPerCm,
  }))
}

export function toImagePercentBoundary(
  points: FabricBoundaryPoint[],
  imageWidthCm: number,
  imageHeightCm: number,
): ImagePoint[] {
  if (
    !Number.isFinite(imageWidthCm) ||
    !Number.isFinite(imageHeightCm) ||
    imageWidthCm <= 0 ||
    imageHeightCm <= 0
  ) {
    return []
  }

  return points.map(({ x, y }) => ({
    pctX: (x / imageWidthCm) * 100,
    pctY: 100 - (y / imageHeightCm) * 100,
  }))
}
