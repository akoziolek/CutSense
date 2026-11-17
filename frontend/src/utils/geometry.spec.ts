import { describe, expect, it } from 'vitest'
import { getGeometryBoundsMm, toFabricPercent } from './geometry'

describe('geometry bounds', () => {
  it('uses the combined fabric and placement bounds as the canvas origin', () => {
    const fabricBoundary: [number, number][] = [
      [0, 100],
      [1000, 100],
      [1000, 600],
      [0, 600],
    ]
    const piece: [number, number][] = [
      [-200, 200],
      [100, 200],
      [100, 400],
      [-200, 400],
    ]
    const bounds = getGeometryBoundsMm([fabricBoundary, piece])

    expect(bounds).toEqual({
      originMm: { minX: -200, minY: 100 },
      widthMm: 1200,
      heightMm: 500,
    })
    const point = toFabricPercent(
      fabricBoundary[0]!,
      bounds.originMm,
      bounds.widthMm,
      bounds.heightMm,
    )
    expect(point.pctX).toBeCloseTo(16.667)
    expect(point.pctY).toBe(100)
  })
})
