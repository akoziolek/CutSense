import { describe, expect, it } from 'vitest';
import { PatternsMapper } from './patterns.mapper.js';

describe('PatternsMapper.mapPiecesForEngine', () => {
  it('maps GeoJSON rings to open object-point boundaries', () => {
    expect(
      PatternsMapper.piecePointsFromGeoJson(
        '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,5],[0,0]]]}',
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
    ]);
  });

  it('closes open object-point boundaries when converting them to WKT', () => {
    expect(
      PatternsMapper.pieceBoundaryToWkt([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
      ]),
    ).toBe('POLYGON((0 0, 10 0, 10 5, 0 0))');
  });

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
