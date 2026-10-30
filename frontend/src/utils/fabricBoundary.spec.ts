import { describe, expect, it } from 'vitest'
import { toImagePercentBoundary, toPostgisBoundary } from './fabricBoundary'

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
        { imageWidth: 1000, imageHeight: 500, pxPerCm: 2 },
      ),
    ).toEqual([
      { x: 125, y: 187.5 },
      { x: 375, y: 187.5 },
      { x: 375, y: 62.5 },
      { x: 125, y: 62.5 },
    ])
  })

  it('maps calibrated coordinates back to the original image proportions', () => {
    expect(
      toImagePercentBoundary(
        [
          { x: 25, y: 37.5 },
          { x: 75, y: 37.5 },
          { x: 75, y: 12.5 },
          { x: 25, y: 12.5 },
        ],
        100,
        50,
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
      { x: 10, y: 40 },
      { x: 50, y: 40 },
      { x: 50, y: 20 },
      { x: 10, y: 20 },
    ]

    expect(toImagePercentBoundary(boundary, 100, 80)).toEqual([
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
