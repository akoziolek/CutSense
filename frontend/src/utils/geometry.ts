import type { Point2D } from '@/types/geometry'

export interface GeometryOriginMm {
  minX: number
  minY: number
}

export interface GeometryBoundsMm {
  originMm: GeometryOriginMm
  widthMm: number
  heightMm: number
}

export const toSvgPoints = (points: Point2D[]): string =>
  points.map((p) => `${p.pctX},${p.pctY}`).join(' ')

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

export function toFabricPercent(
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

export function clampPanOffset(
  raw: { x: number; y: number },
  max: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Number(Math.min(Math.max(raw.x, -max.x), max.x).toFixed(1)),
    y: Number(Math.min(Math.max(raw.y, -max.y), max.y).toFixed(1)),
  }
}

export function offsetPolygonMm(mmPts: [number, number][], offsetMm: number): [number, number][] {
  const n = mmPts.length
  if (n < 3 || offsetMm <= 0) return mmPts

  let area = 0
  for (let i = 0; i < n; i++) {
    const [x1, y1] = mmPts[i]!
    const [x2, y2] = mmPts[(i + 1) % n]!
    area += (x2 - x1) * (y2 + y1)
  }
  const sign = area > 0 ? 1 : -1

  const normals = mmPts.map(([x1, y1], i) => {
    const [x2, y2] = mmPts[(i + 1) % n]!
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    return { nx: (-dy / len) * sign, ny: (dx / len) * sign }
  })

  return mmPts.map(([px, py], i) => {
    const prev = normals[(i - 1 + n) % n]!
    const curr = normals[i]!
    const bx = prev.nx + curr.nx
    const by = prev.ny + curr.ny
    const bLen = Math.hypot(bx, by)
    const ux = bLen > 1e-6 ? bx / bLen : curr.nx
    const uy = bLen > 1e-6 ? by / bLen : curr.ny
    const miterDist = offsetMm / Math.max(0.4, ux * curr.nx + uy * curr.ny)
    return [px + ux * miterDist, py + uy * miterDist]
  })
}

export function buildRulerTicks(params: {
  viewportSizePx: number
  pxPerMm: number
  originPx: number
  minorStepMm: number
  majorStepMm: number
  invert?: boolean
}) {
  const { viewportSizePx, pxPerMm, originPx, minorStepMm, majorStepMm, invert = false } = params
  const dir = invert ? -1 : 1
  const startPx = invert ? originPx - viewportSizePx : -originPx
  const endPx = invert ? originPx : viewportSizePx - originPx

  const minMm = Math.floor(startPx / (pxPerMm * minorStepMm)) * minorStepMm - majorStepMm
  const maxMm = Math.ceil(endPx / (pxPerMm * minorStepMm)) * minorStepMm + majorStepMm

  const ticks: Array<{ px: number; label: string; isMajor: boolean }> = []
  for (let mm = minMm; mm <= maxMm; mm += minorStepMm) {
    const px = originPx + dir * mm * pxPerMm
    if (px >= -30 && px <= viewportSizePx + 30) {
      ticks.push({ px, label: `${mm}`, isMajor: mm % majorStepMm === 0 })
    }
  }
  return ticks
}
