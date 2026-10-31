import { Test, type TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../db/drizzle.provider.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { PatternsService } from './patterns.service.js';
import { PatternSize, PatternVisibility } from './dto/pattern.enum.js';

describe('PatternsService', () => {
  let service: PatternsService;
  let findFirst: ReturnType<typeof vi.fn>;
  let findManyTags: ReturnType<typeof vi.fn>;
  let updateReturning: ReturnType<typeof vi.fn>;
  let updateSet: ReturnType<typeof vi.fn>;
  let selectWhere: ReturnType<typeof vi.fn>;
  let deleteWhere: ReturnType<typeof vi.fn>;
  let insertValues: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;
  let insert: ReturnType<typeof vi.fn>;
  let deleteFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findFirst = vi.fn();
    findManyTags = vi.fn();
    insert = vi.fn();
    deleteFn = vi.fn();
    updateReturning = vi.fn();
    updateSet = vi.fn(() => ({
      where: () => ({ returning: updateReturning }),
    }));
    selectWhere = vi.fn().mockResolvedValue([{ id: 17 }]);
    deleteWhere = vi.fn().mockResolvedValue(undefined);
    insertValues = vi.fn().mockResolvedValue(undefined);
    transaction = vi.fn(
      async (
        callback: (tx: {
          update: ReturnType<typeof vi.fn>;
          select: ReturnType<typeof vi.fn>;
          delete: ReturnType<typeof vi.fn>;
          insert: ReturnType<typeof vi.fn>;
        }) => unknown,
      ) =>
        callback({
          update: vi.fn(() => ({ set: updateSet })),
          select: vi.fn(() => ({
            from: vi.fn(() => ({ where: selectWhere })),
          })),
          delete: vi.fn(() => ({ where: deleteWhere })),
          insert: vi.fn(() => ({ values: insertValues })),
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatternsService,
        {
          provide: DRIZZLE,
          useValue: {
            query: {
              patterns: { findFirst },
              tagsForPatterns: { findMany: findManyTags },
            },
            transaction,
            insert,
            delete: deleteFn,
          },
        },
      ],
    }).compile();

    service = module.get(PatternsService);
  });

  it('updates pattern fields and replaces deduplicated tags', async () => {
    findManyTags.mockResolvedValue([{ id: 2 }, { id: 5 }]);
    updateReturning.mockResolvedValue([{ id: 17 }]);
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Updated shirt',
      description: 'Updated description',
      size: 'M',
      visibility: 'PUBLIC',
      starCount: 5,
      starAverage: '4.50',
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      tags: [],
      user: { id: 3, nickname: 'ala_k', name: 'Ala' },
      pieces: [],
    });

    await expect(
      service.updatePattern(17, {
        name: 'Updated shirt',
        description: 'Updated description',
        size: PatternSize.M,
        visibility: PatternVisibility.PUBLIC,
        tagIds: [2, 5, 2],
      }, 3),
    ).resolves.toMatchObject({
      id: 17,
      name: 'Updated shirt',
      visibility: 'PUBLIC',
    });

    expect(findManyTags).toHaveBeenCalledWith(
      expect.objectContaining({ columns: { id: true } }),
    );
    expect(updateSet).toHaveBeenCalledWith({
      name: 'Updated shirt',
      description: 'Updated description',
      size: 'M',
      visibility: 'PUBLIC',
    });
    expect(deleteWhere).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith([
      { patternId: 17, tagId: 2 },
      { patternId: 17, tagId: 5 },
    ]);
  });

  it('rejects an empty update', async () => {
    await expect(service.updatePattern(17, {}, 3)).rejects.toBeInstanceOf(
      RequestValidationException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects references to nonexistent pattern tags', async () => {
    findManyTags.mockResolvedValue([]);

    await expect(
      service.updatePattern(17, { tagIds: [99] }, 3),
    ).rejects.toBeInstanceOf(RequestValidationException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not update a pattern that is not owned by the current user', async () => {
    updateReturning.mockResolvedValue([]);

    await expect(
      service.updatePattern(17, { name: 'Changed' }, 99),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
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
      tags: [
        { tag: { id: 2, name: 'summer' } },
        { tag: { id: 5, name: 'tops' } },
      ],
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
      tags: [
        { id: 2, name: 'summer' },
        { id: 5, name: 'tops' },
      ],
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
  
  describe('setFavourite', () => {
    it('adds a favourite idempotently', async () => {
      findFirst.mockResolvedValue({ id: 5, userId: 9, visibility: 'PUBLIC' });
      const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      const values = vi.fn(() => ({ onConflictDoNothing }));
      insert.mockReturnValue({ values });

      await expect(service.setFavourite(5, true, 3)).resolves.toEqual({ id: 5, isFavourite: true });
      expect(values).toHaveBeenCalledWith({ patternId: 5, userId: 3 });
      expect(onConflictDoNothing).toHaveBeenCalled();
    });

    it('removes a favourite', async () => {
      findFirst.mockResolvedValue({ id: 5, userId: 9, visibility: 'PUBLIC' });
      const where = vi.fn().mockResolvedValue(undefined);
      deleteFn.mockReturnValue({ where });

      await expect(service.setFavourite(5, false, 3)).resolves.toEqual({ id: 5, isFavourite: false });
      expect(where).toHaveBeenCalled();
      expect(insert).not.toHaveBeenCalled();
    });

    it('lets the owner favourite their own private pattern', async () => {
      findFirst.mockResolvedValue({ id: 5, userId: 3, visibility: 'PRIVATE' });
      insert.mockReturnValue({ values: () => ({ onConflictDoNothing: vi.fn() }) });

      await expect(service.setFavourite(5, true, 3)).resolves.toEqual({ id: 5, isFavourite: true });
    });

    it.each([
      ['a missing pattern', undefined],
      ['a private pattern of someone else', { id: 5, userId: 9, visibility: 'PRIVATE' }],
    ])('reports %s as not found and changes nothing', async (_name, row) => {
      findFirst.mockResolvedValue(row);

      await expect(service.setFavourite(5, true, 3)).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(insert).not.toHaveBeenCalled();
      expect(deleteFn).not.toHaveBeenCalled();
    });
  });
});
