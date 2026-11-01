import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternController } from './pattern.controller.js';
import type { PatternsService } from './patterns.service.js';

describe('PatternController', () => {
  let service: {
    getPatternById: ReturnType<typeof vi.fn>;
    updatePattern: ReturnType<typeof vi.fn>;
    setFavourite: ReturnType<typeof vi.fn>;
    deletePattern: ReturnType<typeof vi.fn>;
    deletePatterns: ReturnType<typeof vi.fn>;
  };
  let controller: PatternController;

  beforeEach(() => {
    service = { getPatternById: vi.fn(), updatePattern: vi.fn(), setFavourite: vi.fn(), deletePattern: vi.fn(), deletePatterns: vi.fn() };
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

  it('passes the pattern id, update fields and current user id to the service', async () => {
    const dto = { id: 5, name: 'Updated pattern' };
    const editDto = { name: 'Updated pattern' };
    service.updatePattern.mockResolvedValue(dto);

    await expect(
      controller.editPattern(5, editDto, { id: 3 }),
    ).resolves.toBe(dto);
    expect(service.updatePattern).toHaveBeenCalledWith(5, editDto, 3);
  });

  it('passes id, flag and current user to the service', async () => {
    service.setFavourite.mockResolvedValue({ id: 5, isFavourite: true });

    await expect(controller.setFavourite(5, { isFavourite: true }, { id: 3 })).resolves.toEqual({
      id: 5,
      isFavourite: true,
    });
    expect(service.setFavourite).toHaveBeenCalledWith(5, true, 3);
  });

  it('passes id and current user to deletePattern', async () => {
    service.deletePattern.mockResolvedValue(undefined);

    await controller.deletePattern(5, { id: 3 });

    expect(service.deletePattern).toHaveBeenCalledWith(5, 3);
  });

  it('passes ids and current user to deletePatterns', async () => {
    service.deletePatterns.mockResolvedValue({ deletedIds: [1] });

    await expect(controller.deletePatterns({ ids: [1, 2] }, { id: 3 })).resolves.toEqual({ deletedIds: [1] });
    expect(service.deletePatterns).toHaveBeenCalledWith([1, 2], 3);
  });
});
