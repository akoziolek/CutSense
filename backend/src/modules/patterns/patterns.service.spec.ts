import { Test, type TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../db/drizzle.provider.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';
import { PatternsService } from './patterns.service.js';

describe('PatternsService', () => {
  let service: PatternsService;
  let findFirst: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findFirst = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatternsService,
        {
          provide: DRIZZLE,
          useValue: { query: { patterns: { findFirst } } },
        },
      ],
    }).compile();

    service = module.get(PatternsService);
  });

  it('returns a pattern with ISO date, tag names, author and pieces', async () => {
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Flowy shirt',
      description: 'Relaxed-fit summer shirt',
      size: 'S',
      visibility: 'PRIVATE',
      starCount: 5,
      starAverage: '4.50',
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      tags: [{ tag: { name: 'summer' } }, { tag: { name: 'tops' } }],
      user: { id: 3, nickname: 'ala_k', name: 'Ala' },
      pieces: [
        {
          id: 1,
          geojson:
            '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,5],[0,0]]]}',
        },
        {
          id: 2,
          geojson:
            '{"type":"Polygon","coordinates":[[[0,0],[4,0],[4,4],[0,0]]]}',
        },
      ],
    });

    await expect(service.getPatternById(17, 3)).resolves.toEqual({
      id: 17,
      name: 'Flowy shirt',
      description: 'Relaxed-fit summer shirt',
      size: 'S',
      visibility: 'PRIVATE',
      starCount: 5,
      starAverage: '4.50',
      userId: 3,
      createdAt: '2025-01-15T10:30:00.000Z',
      tags: ['summer', 'tops'],
      author: { id: 3, nickname: 'ala_k' },
      pieces: [
        {
          id: 1,
          points: [
            [0, 0],
            [10, 0],
            [10, 5],
            [0, 0],
          ],
        },
        {
          id: 2,
          points: [
            [0, 0],
            [4, 0],
            [4, 4],
            [0, 0],
          ],
        },
      ],
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        with: expect.objectContaining({ tags: { with: { tag: true } } }),
      }),
    );
  });

  it('maps nullable optional fields to undefined and falls back to the real name', async () => {
    findFirst.mockResolvedValue({
      id: 18,
      name: 'Basic trousers',
      description: null,
      size: 'M',
      visibility: 'PUBLIC',
      starCount: 0,
      starAverage: '0',
      userId: 3,
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      tags: [],
      user: { id: 3, nickname: null, name: 'Ala' },
      pieces: [],
    });

    await expect(service.getPatternById(18, 3)).resolves.toMatchObject({
      description: undefined,
      tags: [],
      pieces: [],
      author: { id: 3, nickname: 'Ala' },
    });
  });

  it('throws a not-found exception when no owned pattern matches', async () => {
    findFirst.mockResolvedValue(undefined);

    await expect(service.getPatternById(99, 3)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it('throws access denied for a private pattern of another user', async () => {
    findFirst.mockResolvedValue({
      id: 20,
      name: 'Secret coat',
      description: null,
      size: 'L',
      visibility: 'PRIVATE',
      starCount: 0,
      starAverage: '0',
      userId: 5,
      createdAt: new Date('2025-03-01T00:00:00.000Z'),
      tags: [],
      user: { id: 5, nickname: 'other', name: 'Other' },
      pieces: [],
    });

    await expect(service.getPatternById(20, 3)).rejects.toBeInstanceOf(
      AccessDeniedException,
    );
  });
});
