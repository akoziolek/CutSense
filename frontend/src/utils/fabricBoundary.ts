import type { FabricConfig } from '@/stores/addingFabricStore'
import type { FabricBoundaryPoint } from '@/types/fabric'
import type { Point2D } from '@/types/geometry'

export interface PostgisPoint {
  x: number
  y: number
}

export function toPostgisBoundary(
  points: Point2D[],
  config: Pick<FabricConfig, 'pxPerMm' | 'imageWidth' | 'imageHeight'>,
): PostgisPoint[] {
  return points.map(({ pctX, pctY }) => ({
    x: ((pctX * config.imageWidth) / 100) / config.pxPerMm,
    y: (((100 - pctY) * config.imageHeight) / 100) / config.pxPerMm,
  }))
}

export function toImagePercentBoundary(
  points: FabricBoundaryPoint[],
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

  return points.map(({ x, y }) => ({
    pctX: (x / imageWidthMm) * 100,
    pctY: 100 - (y / imageHeightMm) * 100,
  }))
}
