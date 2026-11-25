import { describe, expect, it } from 'vitest';
import type { OptimizerInputDto } from '../optimizations/dto/optimizer-input.dto.js';
import { fromEngineResult, toEngineInput } from './optimizer-engine.mapper.js';

const makeInput = (fabric: OptimizerInputDto['fabric']): OptimizerInputDto => ({
  patternId: 1,
  algorithmId: 1,
  algorithmName: 'Bottom-Left Decreasing',
  fabric,
  seamAllowanceMm: 0,
  cuttingAllowanceMm: 0,
  pieces: [
    {
      patternPieceId: 17,
      boundary: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
        { x: 0, y: 20 },
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
  it('passes library fabric boundaries and grainline in the engine API format', () => {
    const result = toEngineInput(
      makeInput({
        fabricId: 7,
        widthMm: 100,
        lengthMm: 200,
        grainline: 180,
        boundary: [
          { x: 10, y: 20 },
          { x: 110, y: 20 },
          { x: 110, y: 220 },
          { x: 10, y: 220 },
        ],
      }),
      1,
    );

    expect(result.fabric).toEqual({
      boundary: [
        { x: 10, y: 20 },
        { x: 110, y: 20 },
        { x: 110, y: 220 },
        { x: 10, y: 220 },
      ],
      grainline: 180,
    });
    expect(result.pieces).toEqual([
      {
        id: 1,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 20 },
          { x: 0, y: 20 },
        ],
        grainline: 0,
        seamAllowance: 0,
        cuttingAllowance: 0,
        constraints: [
          {
            rotationAngle: 0,
            isMirrored: false,
            requiredQuantity: 1,
            twoWay: false,
          },
        ],
      },
    ]);
  });

  it('passes custom rectangular dimensions and grainline in the engine API format', () => {
    const result = toEngineInput(
      makeInput({
        widthMm: 100,
        lengthMm: 200,
        grainline: 45,
        boundary: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 200 },
          { x: 0, y: 200 },
        ],
      }),
      1,
    );

    expect(result.fabric).toEqual({
      boundary: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 200 },
        { x: 0, y: 200 },
      ],
      grainline: 45,
    });
  });

  it('maps stable engine piece IDs back to source pattern piece IDs', () => {
    const input = makeInput({
      fabricId: 7,
      widthMm: 100,
      lengthMm: 200,
      grainline: 0,
      boundary: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 200 },
        { x: 0, y: 200 },
      ],
    });
    input.pieces.push({ ...input.pieces[0]!, direction: 90 });
    expect(toEngineInput(input, 2).pieces.map(({ id }) => id)).toEqual([1, 2]);

    const result = fromEngineResult(
      {
        wasSuccessful: true,
        minLength: 20,
        executionTime: 1,
        stats: {
          usableScrapCount: 0,
          usableScrapsArea: 0,
          usableScrapsPercentage: 0,
          remainingFabricLength: 0,
          remainingFabricArea: 0,
          remainingFabricPercentage: 0,
          wasteArea: 0,
          wastePercentage: 0,
        },
        positions: [
          {
            id: 1,
            x: 0,
            y: 0,
            rotationAngle: 0,
            isMirrored: false,
            isFlipped180: false,
          },
          {
            id: 2,
            x: 10,
            y: 20,
            rotationAngle: 90,
            isMirrored: false,
            isFlipped180: false,
          },
        ],
      },
      input.pieces,
    );

    expect(result.positions.map(({ id }) => id)).toEqual([17, 17]);
  });
});
