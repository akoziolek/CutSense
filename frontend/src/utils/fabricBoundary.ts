import type { FabricConfig, Point2D } from '@/stores/addingFabricStore'

export interface PostgisPoint {
  x: number
  y: number
}

// from percentX/Y to Postgis coordinate on I quadrant
export function toPostgisBoundary(
  points: Point2D[],
  config: Pick<FabricConfig, 'pxPerCm' | 'imageWidth' | 'imageHeight'>,
): PostgisPoint[] {
  return points.map(({ pctX, pctY }) => ({
    x: (pctX * config.imageWidth) / 100 / config.pxPerCm,
    y: ((100 - pctY) * config.imageHeight) / 100 / config.pxPerCm,
  }))
}
