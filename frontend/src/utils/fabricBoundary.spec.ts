import { describe, expect, it } from 'vitest'
import { toPostgisBoundary } from './fabricBoundary'

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
})
