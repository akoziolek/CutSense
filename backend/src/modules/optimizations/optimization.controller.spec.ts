import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OptimizationController } from './optimization.controller.js';
import type { OptimizationsService } from './optimizations.service.js';
import type { CreateOptimizationDto } from './dto/create-optimization.dto.js';

describe('OptimizationController', () => {
  let service: {
    getAlgorithms: ReturnType<typeof vi.fn>;
    getDefaults: ReturnType<typeof vi.fn>;
    prepareOptimization: ReturnType<typeof vi.fn>;
  };
  let controller: OptimizationController;

  beforeEach(() => {
    service = {
      getAlgorithms: vi.fn(),
      getDefaults: vi.fn(),
      prepareOptimization: vi.fn(),
    };
    controller = new OptimizationController(service as unknown as OptimizationsService);
  });

  it('returns the available algorithms', async () => {
    const algorithms = [{ id: 1, name: 'Bottom-Left Decreasing' }];
    service.getAlgorithms.mockResolvedValue(algorithms);

    await expect(controller.getAlgorithms()).resolves.toBe(algorithms);
  });

  it('returns the default parameters', () => {
    const defaults = { seamAllowanceMm: 5, cuttingAllowanceMm: 20 };
    service.getDefaults.mockReturnValue(defaults);

    expect(controller.getDefaults()).toBe(defaults);
  });

  it('prepares an optimization for a logged-in user', async () => {
    const body = { patternId: 17 } as CreateOptimizationDto;
    const input = { patternId: 17, pieces: [] };
    service.prepareOptimization.mockResolvedValue(input);

    await expect(controller.prepareOptimization(body, { id: 3 })).resolves.toBe(input);
    expect(service.prepareOptimization).toHaveBeenCalledWith(body, 3);
  });

  it('prepares an optimization for a guest', async () => {
    const body = { patternId: 17 } as CreateOptimizationDto;
    const input = { patternId: 17, pieces: [] };
    service.prepareOptimization.mockResolvedValue(input);

    await expect(controller.prepareOptimization(body)).resolves.toBe(input);
    expect(service.prepareOptimization).toHaveBeenCalledWith(body, undefined);
  });

  it('propagates service errors', async () => {
    const error = new Error('boom');
    service.prepareOptimization.mockRejectedValue(error);

    await expect(
      controller.prepareOptimization({} as CreateOptimizationDto),
    ).rejects.toBe(error);
  });
});
