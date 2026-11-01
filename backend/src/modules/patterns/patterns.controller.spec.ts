import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternController } from './pattern.controller.js';
import type { PatternsService } from './patterns.service.js';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';

describe('PatternController', () => {
  let service: {
    getPatternById: ReturnType<typeof vi.fn>;
    createPattern: ReturnType<typeof vi.fn>;
    updatePattern: ReturnType<typeof vi.fn>;
    setFavourite: ReturnType<typeof vi.fn>;
  };
  let controller: PatternController;

  beforeEach(() => {
    service = {
      getPatternById: vi.fn(),
      createPattern: vi.fn(),
      updatePattern: vi.fn(),
      setFavourite: vi.fn(),
    };
    controller = new PatternController(service as unknown as PatternsService);
  });

  it('passes the pattern id and the current user id to the service', async () => {
    const result = { id: 5 };
    service.getPatternById.mockResolvedValue(result);

    await expect(controller.getPatternById(5, { id: 3 })).resolves.toBe(result);
    expect(service.getPatternById).toHaveBeenCalledWith(5, 3);
  });

  it('passes null for a guest', async () => {
    service.getPatternById.mockResolvedValue({ id: 5 });

    await controller.getPatternById(5, undefined);
    expect(service.getPatternById).toHaveBeenCalledWith(5, null);
  });

  it('creates a pattern for the current user', async () => {
    const dto = { name: 'Shirt' } as CreatePatternDto;
    service.createPattern.mockResolvedValue({ id: 9 });

    await expect(controller.createPattern(dto, { id: 3 })).resolves.toEqual({ id: 9 });
    expect(service.createPattern).toHaveBeenCalledWith(dto, 3);
  });

  it('propagates service errors', async () => {
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
});
