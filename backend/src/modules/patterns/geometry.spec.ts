import { describe, expect, it } from 'vitest';
import { rotateAndAnchor } from './geometry.js';

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