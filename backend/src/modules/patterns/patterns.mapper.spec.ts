import { describe, expect, it } from 'vitest';
import { PatternsMapper } from './patterns.mapper.js';

describe('PatternsMapper.mapPiecesForEngine', () => {
  it('passes copy counts as native variant constraints', () => {
    expect(
      PatternsMapper.mapPiecesForEngine([
        {
          imageIndex: 0,
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
          ],
          grainline: 90,
          normal: 2,
          mirrored: 1,
        },
      ]),
    ).toEqual([
      {
        id: 1,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 50 },
        ],
        grainline: 90,
        constraints: [
          {
            rotationAngle: 0,
            isMirrored: false,
            requiredQuantity: 2,
            twoWay: false,
          },
          {
            rotationAngle: 0,
            isMirrored: true,
            requiredQuantity: 1,
            twoWay: false,
          },
        ],
        seamAllowance: 0,
        cuttingAllowance: 0,
      },
    ]);
  });

  it('does not send pieces that have no required copies', () => {
    expect(
      PatternsMapper.mapPiecesForEngine([
        {
          imageIndex: 0,
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
          ],
          grainline: 90,
          normal: 0,
          mirrored: 0,
        },
      ]),
    ).toEqual([]);
  });
});
