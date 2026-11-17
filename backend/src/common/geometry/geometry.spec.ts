import { describe, expect, it } from 'vitest';
import { placePiece } from './shapes-geometry.js';

const rect = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 5 },
  { x: 0, y: 5 },
];

const placement = {
  rotationAngle: 0,
  grainline: 0,
  fabricGrainline: 0,
  isMirrored: false,
  isFlipped180: false,
  x: 10,
  y: 20,
};

describe('placePiece', () => {
  it('applies the native optimizer rotation and placement coordinates', () => {
    expect(
      placePiece(rect, {
        ...placement,
        rotationAngle: 90,
      }),
    ).toEqual([
      { x: 10, y: 20 },
      { x: 10, y: 10 },
      { x: 15, y: 10 },
      { x: 15, y: 20 },
    ]);
  });

  it('mirrors the rotated piece across the native X axis', () => {
    expect(
      placePiece(rect, {
        ...placement,
        rotationAngle: 90,
        isMirrored: true,
      }),
    ).toEqual([
      { x: 5, y: 20 },
      { x: 5, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 20 },
    ]);
  });

  it('anchors 180-degree flips to the variant bounds', () => {
    expect(
      placePiece(
        [
          { x: 2, y: 3 },
          { x: 12, y: 3 },
          { x: 12, y: 8 },
          { x: 2, y: 8 },
        ],
        {
          ...placement,
          x: 100,
          y: 200,
          isFlipped180: true,
        },
      ),
    ).toEqual([
      { x: 112, y: 208 },
      { x: 102, y: 208 },
      { x: 102, y: 203 },
      { x: 112, y: 203 },
    ]);
  });

  it('maps placements back through the fabric grainline', () => {
    expect(
      placePiece(
        [
          { x: 100, y: 100 },
          { x: 100, y: 200 },
          { x: 400, y: 200 },
          { x: 400, y: 100 },
        ],
        {
          ...placement,
          fabricGrainline: 180,
          x: 800,
          y: 600,
        },
      ),
    ).toEqual([
      { x: 700, y: 500 },
      { x: 700, y: 400 },
      { x: 400, y: 400 },
      { x: 400, y: 500 },
    ]);
  });
});
