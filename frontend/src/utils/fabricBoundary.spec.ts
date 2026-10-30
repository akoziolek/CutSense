import { describe, expect, it } from 'vitest'
import {
  toImagePercentBoundary,
  toPostgisBoundary,
} from './fabricBoundary'

describe('toPostgisBoundary', () => {
  it('converts image percentages to calibrated coordinates in the upper-right quadrant', () => {
    expect(
      toPostgisBoundary(
        [
          { pctX: 25, pctY: 25 },
          { pctX: 75, pctY: 25 },
          { pctX: 75, pctY: 75 },
          { pctX: 25, pctY: 75 },
        ],
        { imageWidth: 1000, imageHeight: 500, pxPerMm: 0.2 },
      ),
    ).toEqual([
      { x: 1250, y: 1875 },
      { x: 3750, y: 1875 },
      { x: 3750, y: 625 },
      { x: 1250, y: 625 },
    ])
  })

  it('maps calibrated coordinates back to the original image proportions', () => {
    expect(
      toImagePercentBoundary(
        [
          { x: 250, y: 375 },
          { x: 750, y: 375 },
          { x: 750, y: 125 },
          { x: 250, y: 125 },
        ],
        1000,
        500,
      ),
    ).toEqual([
      { pctX: 25, pctY: 25 },
      { pctX: 75, pctY: 25 },
      { pctX: 75, pctY: 75 },
      { pctX: 25, pctY: 75 },
    ])
  })

  it('does not independently stretch the two axes', () => {
    const boundary = [
      { x: 100, y: 400 },
      { x: 500, y: 400 },
      { x: 500, y: 200 },
      { x: 100, y: 200 },
    ]

    expect(toImagePercentBoundary(boundary, 1000, 800)).toEqual([
      { pctX: 10, pctY: 50 },
      { pctX: 50, pctY: 50 },
      { pctX: 50, pctY: 75 },
      { pctX: 10, pctY: 75 },
    ])
  })

  it('returns no overlay coordinates when the stored image dimensions are invalid', () => {
    expect(toImagePercentBoundary([{ x: 1, y: 1 }], 0, 10)).toEqual([])
  })
})
