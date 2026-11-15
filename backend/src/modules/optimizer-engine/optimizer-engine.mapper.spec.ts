import { describe, expect, it } from 'vitest';
import type { OptimizerInputDto } from '../optimizations/dto/optimizer-input.dto.js';
import { toEngineInput } from './optimizer-engine.mapper.js';

const makeInput = (fabric: OptimizerInputDto['fabric']): OptimizerInputDto => ({
  patternId: 1,
  algorithmId: 1,
  algorithmName: 'Bottom-Left Decreasing',
  fabric,
  seamAllowanceMm: 0,
  cuttingAllowanceMm: 0,
  pieces: [
    {
      patternPieceId: 1,
      boundary: [
        [0, 0],
        [10, 0],
        [10, 20],
        [0, 20],
      ],
      normalCount: 1,
      mirroredCount: 0,
      grainline: 0,
      direction: 0,
      twoWay: false,
    },
  ],
});

describe('toEngineInput', () => {
  it('converts library fabric boundaries to the engine length-width coordinate frame', () => {
    const result = toEngineInput(
      makeInput({
        fabricId: 7,
        widthMm: 100,
        lengthMm: 200,
        boundary: [
          [0, 0],
          [100, 0],
          [100, 200],
          [0, 200],
        ],
      }),
      1,
    );

    expect(result.fabric).toEqual({
      boundary: [
        { x: 200, y: 0 },
        { x: 200, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 0 },
      ],
    });
  });

  it('keeps custom rectangular dimensions in the engine API format', () => {
    const result = toEngineInput(
      makeInput({
        widthMm: 100,
        lengthMm: 200,
        boundary: [
          [0, 0],
          [100, 0],
          [100, 200],
          [0, 200],
        ],
      }),
      1,
    );

    expect(result.fabric).toEqual({ width: 100, length: 200 });
  });
});
