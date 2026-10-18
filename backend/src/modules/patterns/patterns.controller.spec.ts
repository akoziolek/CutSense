import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternController } from './pattern.controller.js';
import type { PatternsService } from './patterns.service.js';

describe('PatternController', () => {
  let service: { getPatternById: ReturnType<typeof vi.fn> };
  let controller: PatternController;

  beforeEach(() => {
    service = { getPatternById: vi.fn() };
    controller = new PatternController(service as unknown as PatternsService);
  });

  it('passes the pattern id and current user id to the service', async () => {
    const dto = { id: 5, name: 'Flowy shirt' };
    service.getPatternById.mockResolvedValue(dto);

    await expect(controller.getPatternById(5, { id: 3 })).resolves.toBe(dto);
    expect(service.getPatternById).toHaveBeenCalledWith(5, 3);
  });

  it('propagates errors from the service', async () => {
    const error = new Error('boom');
    service.getPatternById.mockRejectedValue(error);

    await expect(controller.getPatternById(5, { id: 3 })).rejects.toBe(error);
  });
});