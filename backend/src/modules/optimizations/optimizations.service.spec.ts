import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../../db/drizzle.provider.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import type { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import {
  DEFAULT_CUTTING_ALLOWANCE_MM,
  DEFAULT_SEAM_ALLOWANCE_MM,
} from './optimizations.constants.js';
import { OptimizationsService } from './optimizations.service.js';

const polygonGeoJson = JSON.stringify({
  coordinates: [[[0, 0], [100, 0], [100, 200], [0, 200], [0, 0]]],
});

const patternRow = (overrides: Record<string, unknown> = {}) => ({
  id: 17,
  userId: 3,
  visibility: 'PUBLIC',
  images: [
    {
      pieces: [
        { id: 101, geojson: polygonGeoJson },
        { id: 102, geojson: polygonGeoJson },
      ],
    },
  ],
  ...overrides,
});

const dto = (overrides: Partial<CreateOptimizationDto> = {}): CreateOptimizationDto => ({
  patternId: 17,
  algorithmId: 1,
  fabricWidthMm: 1450,
  fabricLengthMm: 2900,
  seamAllowanceMm: 5,
  cuttingAllowanceMm: 20,
  pieces: [
    { patternPieceId: 101, normalCount: 2, mirroredCount: 1, direction: 90, twoWay: true },
  ],
  ...overrides,
});

describe('OptimizationsService', () => {
  let service: OptimizationsService;
  let findAlgorithms: ReturnType<typeof vi.fn>;
  let findAlgorithm: ReturnType<typeof vi.fn>;
  let findPattern: ReturnType<typeof vi.fn>;
  let findFabric: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findAlgorithms = vi.fn();
    findAlgorithm = vi.fn().mockResolvedValue({
      id: 1,
      name: 'Bottom-Left Decreasing',
    });
    findPattern = vi.fn().mockResolvedValue(patternRow());
    findFabric = vi.fn();

    const db = {
      query: {
        algorithmTypes: { findMany: findAlgorithms, findFirst: findAlgorithm },
        patterns: { findFirst: findPattern },
        fabrics: { findFirst: findFabric },
      },
    };
    service = new OptimizationsService(db as unknown as DrizzleDB);
  });

  it('returns the default allowances in millimeters', () => {
    expect(service.getDefaults()).toEqual({
      seamAllowanceMm: DEFAULT_SEAM_ALLOWANCE_MM,
      cuttingAllowanceMm: DEFAULT_CUTTING_ALLOWANCE_MM,
    });
  });

  it('returns available algorithms and normalizes missing descriptions', async () => {
    findAlgorithms.mockResolvedValue([
      { id: 1, name: 'Bottom-Left Decreasing', description: null },
    ]);

    await expect(service.getAlgorithms()).resolves.toEqual([
      { id: 1, name: 'Bottom-Left Decreasing', description: undefined },
    ]);
  });

  it('prepares custom-fabric configuration for an anonymous user without saving it', async () => {
    await expect(service.prepareOptimization(dto())).resolves.toEqual({
      patternId: 17,
      algorithmId: 1,
      algorithmName: 'Bottom-Left Decreasing',
      fabric: {
        fabricId: undefined,
        widthMm: 1450,
        lengthMm: 2900,
        boundary: [[0, 0], [1450, 0], [1450, 2900], [0, 2900]],
      },
      seamAllowanceMm: 5,
      cuttingAllowanceMm: 20,
      pieces: [
        {
          patternPieceId: 101,
          boundary: [[0, 0], [100, 0], [100, 200], [0, 200]],
          normalCount: 2,
          mirroredCount: 1,
          direction: 90,
          twoWay: true,
        },
      ],
    });
    expect(findFabric).not.toHaveBeenCalled();
  });

  it('prepares a library fabric for its logged-in owner', async () => {
    findFabric.mockResolvedValue({
      id: 9,
      imageWidthMm: 500,
      imageHeightMm: 250,
      boundaryGeoJson: polygonGeoJson,
    });

    const result = await service.prepareOptimization(
      dto({
        fabricWidthMm: undefined,
        fabricLengthMm: undefined,
        fabricId: 9,
      }),
      3,
    );

    expect(result.fabric).toEqual({
      fabricId: 9,
      widthMm: 500,
      lengthMm: 250,
      boundary: [[0, 0], [100, 0], [100, 200], [0, 200]],
    });
  });

  it('rejects anonymous use of a library fabric', async () => {
    await expect(
      service.prepareOptimization(
        dto({
          fabricId: 9,
          fabricWidthMm: undefined,
          fabricLengthMm: undefined,
        }),
      ),
    ).rejects.toBeInstanceOf(RequestValidationException);
    expect(findAlgorithm).not.toHaveBeenCalled();
  });

  it('allows a logged-in user to optimize a public pattern owned by someone else', async () => {
    findPattern.mockResolvedValue(patternRow({ userId: 5, visibility: 'PUBLIC' }));

    await expect(service.prepareOptimization(dto(), 3)).resolves.toMatchObject({
      patternId: 17,
    });
  });

  it('hides a private pattern from an anonymous user', async () => {
    findPattern.mockResolvedValue(patternRow({ visibility: 'PRIVATE' }));

    await expect(service.prepareOptimization(dto())).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('rejects an unavailable algorithm', async () => {
    findAlgorithm.mockResolvedValue(undefined);

    await expect(service.prepareOptimization(dto(), 3)).rejects.toBeInstanceOf(
      RequestValidationException,
    );
    expect(findPattern).not.toHaveBeenCalled();
  });

  it('rejects piece IDs that do not belong to the selected pattern', async () => {
    await expect(
      service.prepareOptimization(
        dto({
          pieces: [
            { patternPieceId: 999, normalCount: 1, mirroredCount: 0, direction: 0, twoWay: false },
          ],
        }),
        3,
      ),
    ).rejects.toBeInstanceOf(RequestValidationException);
  });

  it('rejects configurations without any copies', async () => {
    await expect(
      service.prepareOptimization(
        dto({
          pieces: [
            { patternPieceId: 101, normalCount: 0, mirroredCount: 0, direction: 0, twoWay: false },
          ],
        }),
        3,
      ),
    ).rejects.toBeInstanceOf(RequestValidationException);
    expect(findPattern).not.toHaveBeenCalled();
  });

  it.each([
    ['both a library fabric and custom dimensions', {
      fabricId: 9,
      fabricWidthMm: 1450,
      fabricLengthMm: 2900,
    }],
    ['neither a library fabric nor custom dimensions', {
      fabricId: undefined,
      fabricWidthMm: undefined,
      fabricLengthMm: undefined,
    }],
    ['only a custom width', {
      fabricId: undefined,
      fabricWidthMm: 1450,
      fabricLengthMm: undefined,
    }],
    ['only a custom length', {
      fabricId: undefined,
      fabricWidthMm: undefined,
      fabricLengthMm: 2900,
    }],
  ])('rejects %s', async (_description, overrides) => {
    await expect(service.prepareOptimization(dto(overrides), 3)).rejects.toBeInstanceOf(
      RequestValidationException,
    );
    expect(findPattern).not.toHaveBeenCalled();
  });

  it('reports a library fabric that is missing or not owned by the user', async () => {
    findFabric.mockResolvedValue(undefined);

    await expect(
      service.prepareOptimization(
        dto({
          fabricId: 9,
          fabricWidthMm: undefined,
          fabricLengthMm: undefined,
        }),
        3,
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
