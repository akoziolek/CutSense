import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';
import { AuthenticationRequiredException } from '../../common/exceptions/authentication-required.exception.js';
import { PatternsService } from './patterns.service.js';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';

const privatePattern = {
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
};

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
        { id: 1, geojson: '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,5],[0,0]]]}' },
        { id: 2, geojson: '{"type":"Polygon","coordinates":[[[0,0],[4,0],[4,4],[0,0]]]}' },
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
        { id: 1, points: [[0, 0], [10, 0], [10, 5], [0, 0]] },
        { id: 2, points: [[0, 0], [4, 0], [4, 4], [0, 0]] },
      ],
    });
  });

  it('throws a not-found exception when the pattern does not exist', async () => {
    findFirst.mockResolvedValue(undefined);

    await expect(service.getPatternById(99, 3)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it('throws access denied for a private pattern of another user', async () => {
    findFirst.mockResolvedValue(privatePattern);

    await expect(service.getPatternById(20, 3)).rejects.toBeInstanceOf(
      AccessDeniedException,
    );
  });

  it('asks a guest to sign in for a private pattern', async () => {
    findFirst.mockResolvedValue(privatePattern);

    await expect(service.getPatternById(20, null)).rejects.toBeInstanceOf(
      AuthenticationRequiredException,
    );
  });

  it('lets a guest see a public pattern', async () => {
    findFirst.mockResolvedValue({ ...privatePattern, id: 18, visibility: 'PUBLIC' });

    await expect(service.getPatternById(18, null)).resolves.toMatchObject({ id: 18 });
  });
});

describe('PatternsService.createPattern', () => {
  const dto = {
    name: 'Shirt',
    size: 'M',
    visibility: 'PUBLIC',
    tags: ['Summer'],
    pieces: [
      {
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }],
        grainline: 90,
        normal: 2,
        mirrored: 1,
      },
    ],
  } as CreatePatternDto;

  const makeService = (tagRows: { id: number; name: string }[]) => {
    const inserted: unknown[] = [];
    const tx = {
      select: () => ({ from: () => ({ where: () => Promise.resolve(tagRows) }) }),
      insert: () => ({
        values: (values: unknown) => {
          inserted.push(values);
          return Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([{ id: 42 }]),
          });
        },
      }),
    };
    const db = {
      transaction: (cb: (t: typeof tx) => unknown) => cb(tx),
    } as unknown as DrizzleDB;
    return { service: new PatternsService(db), inserted };
  };

  it('saves the pattern, its tags and its pieces and returns the id', async () => {
    const { service, inserted } = makeService([{ id: 7, name: 'summer' }]);

    await expect(service.createPattern(dto, 3)).resolves.toEqual({ id: 42 });

    expect(inserted).toHaveLength(3);
    expect(inserted[0]).toMatchObject({ name: 'Shirt', userId: 3, visibility: 'PUBLIC' });
    expect(inserted[1]).toEqual([{ patternId: 42, tagId: 7 }]);
    expect(inserted[2]).toMatchObject([{ patternId: 42, normalCount: 2, mirroredCount: 1 }]);
  });

  it('rejects unknown tags and saves nothing', async () => {
    const { service, inserted } = makeService([]);

    await expect(service.createPattern(dto, 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(inserted).toHaveLength(0);
  });
});