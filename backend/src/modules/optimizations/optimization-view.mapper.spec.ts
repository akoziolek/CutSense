import { describe, expect, it } from 'vitest';
import { OptimizationViewMapper } from './optimization-view.mapper.js';

describe('OptimizationViewMapper', () => {
  it('normalizes tuple boundaries from cached runs to open object-point rings', () => {
    expect(
      OptimizationViewMapper.toOptimizerPoints([
        [0, 0],
        [100, 0],
        [100, 200],
        [0, 200],
        [0, 0],
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ]);
    expect(
      OptimizationViewMapper.toOptimizerPoints([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
        { x: 0, y: 0 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
    ]);
  });
});
