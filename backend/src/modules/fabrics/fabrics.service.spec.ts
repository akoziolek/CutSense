import { Test, type TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../db/drizzle.provider.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { FabricService } from './fabrics.service.js';

describe('FabricService', () => {
  let service: FabricService;
  let findFirst: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findFirst = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FabricService,
        {
          provide: DRIZZLE,
          useValue: { query: { fabrics: { findFirst } } },
        },
      ],
    }).compile();

    service = module.get(FabricService);
  });

  it('returns a fabric with ISO date and tag names', async () => {
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureUrl: 'https://example.com/fabric.jpg',
      isFavourite: true,
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      tags: [{ tag: { name: 'cotton' } }, { tag: { name: 'canvas' } }],
    });

    await expect(service.getFabricById(17, 3)).resolves.toEqual({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureUrl: 'https://example.com/fabric.jpg',
      isFavourite: true,
      userId: 3,
      createdAt: '2025-01-15T10:30:00.000Z',
      tags: ['cotton', 'canvas'],
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        with: { tags: { with: { tag: true } } },
      }),
    );
  });

  it('maps nullable optional fields to undefined', async () => {
    findFirst.mockResolvedValue({
      id: 18,
      name: 'Linen',
      description: null,
      pictureUrl: null,
      isFavourite: false,
      userId: 3,
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      tags: [],
    });

    await expect(service.getFabricById(18, 3)).resolves.toMatchObject({
      description: undefined,
      pictureUrl: undefined,
      tags: [],
    });
  });

  it('throws a not-found exception when no owned fabric matches', async () => {
    findFirst.mockResolvedValue(undefined);

    await expect(service.getFabricById(99, 3)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});
