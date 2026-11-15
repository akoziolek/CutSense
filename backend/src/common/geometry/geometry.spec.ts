import { describe, expect, it } from 'vitest';
import { placePiece, rotateAndAnchor } from './shapes-geometry.js';

const rect = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 5 },
  { x: 0, y: 5 },
];

describe('rotateAndAnchor', () => {
  it('keeps the piece for 0 degrees', () => {
    expect(rotateAndAnchor(rect, 0)).toEqual(rect);
  });

  it('turns the piece clockwise by 90 degrees and anchors it at (0, 0)', () => {
    expect(rotateAndAnchor(rect, 90)).toEqual([
      { x: 0, y: 10 },
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 10 },
    ]);
  });

  it('turns the piece by 180 degrees', () => {
    expect(rotateAndAnchor(rect, 180)).toEqual([
      { x: 10, y: 5 },
      { x: 0, y: 5 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
  });

  it('moves a piece that is not at the origin to (0, 0)', () => {
    const shifted = rect.map((p) => ({ x: p.x + 100, y: p.y + 50 }));
    expect(rotateAndAnchor(shifted, 0)).toEqual(rect);
  });
});

describe('placePiece', () => {
  it('applies grainline and placement rotation without re-anchoring', () => {
    expect(
      placePiece(
        [
          { x: 10, y: 20 },
          { x: 14, y: 20 },
          { x: 14, y: 22 },
          { x: 10, y: 22 },
        ],
        {
          rotationAngle: 0,
          grainline: 90,
          isMirrored: false,
          isFlipped180: false,
          x: 100,
          y: 200,
        },
      ),
    ).toEqual([
      { x: 120, y: 190 },
      { x: 120, y: 186 },
      { x: 122, y: 186 },
      { x: 122, y: 190 },
    ]);
  });

  it('mirrors across the X axis before applying rotation', () => {
    expect(
      placePiece(rect, {
        rotationAngle: 0,
        grainline: 0,
        isMirrored: true,
        isFlipped180: false,
        x: 10,
        y: 20,
      }),
    ).toEqual([
      { x: 10, y: 20 },
      { x: 20, y: 20 },
      { x: 20, y: 15 },
      { x: 10, y: 15 },
    ]);
  });
});
