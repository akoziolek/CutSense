import { describe, expect, it } from 'vitest';
import { FabricMapper } from './fabric.mapper.js';

describe('FabricMapper.boundaryFromGeoJson', () => {
  it('converts a closed GeoJSON ring to open object-point coordinates', () => {
    expect(
      FabricMapper.boundaryFromGeoJson(
        '{"type":"Polygon","coordinates":[[[-2500,1250],[2500,1250],[2500,6250],[-2500,6250],[-2500,1250]]]}',
      ),
    ).toEqual([
      { x: -2500, y: 1250 },
      { x: 2500, y: 1250 },
      { x: 2500, y: 6250 },
      { x: -2500, y: 6250 },
    ]);
  });
});
