import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { DRIZZLE } from '../../db/drizzle.provider.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { PatternsService } from './patterns.service.js';
import { PatternSize, PatternVisibility } from './dto/pattern.enum.js';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';

const patternRow = (overrides: Record<string, unknown> = {}) => ({
  id: 17,
  name: 'Flowy shirt',
  description: 'Relaxed-fit summer shirt',
  size: 'S',
  visibility: 'PRIVATE',
  starCount: 5,
  starAverage: '4.50',
  userId: 3,
  createdAt: new Date('2025-01-15T10:30:00.000Z'),
  tags: [],
  user: { id: 3, nickname: 'ala_k', name: 'Ala' },
  pieces: [],
  favoritedBy: [],
  ...overrides,
});

describe('PatternsService', () => {
  let service: PatternsService;
  let findFirst: ReturnType<typeof vi.fn>;
  let findManyTags: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;
  let updateSet: ReturnType<typeof vi.fn>;
  let updateReturning: ReturnType<typeof vi.fn>;
  let deleteWhere: ReturnType<typeof vi.fn>;
  let insertValues: ReturnType<typeof vi.fn>;
  let insert: ReturnType<typeof vi.fn>;
  let deleteFn: ReturnType<typeof vi.fn>;
  let txSelectWhere: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findFirst = vi.fn();
    findManyTags = vi.fn();
    updateReturning = vi.fn().mockResolvedValue([{ id: 17 }]);
    updateSet = vi.fn(() => ({
      where: () => ({ returning: updateReturning }),
    }));
    deleteWhere = vi.fn().mockResolvedValue(undefined);
    insertValues = vi.fn((values: unknown) =>
      Object.assign(Promise.resolve(), {
        returning: () => Promise.resolve([{ id: 42 }]),
        values,
      }),
    );
    txSelectWhere = vi.fn().mockResolvedValue([{ id: 17 }]);
    transaction = vi.fn((callback: (tx: object) => unknown) =>
      callback({
        update: () => ({ set: updateSet }),
        select: () => ({ from: () => ({ where: txSelectWhere }) }),
        delete: () => ({ where: deleteWhere }),
        insert: () => ({ values: insertValues }),
      }),
    );
    insert = vi.fn();
    deleteFn = vi.fn();

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
        {
          provide: ShapesEngineClient,
          useValue: { analyzeBoundary: vi.fn() },
        },
      ],
    }).compile();

    service = module.get(PatternsService);
  });

  describe('getPatternById', () => {
    it('returns pattern details, tags, pieces and favourite state', async () => {
      findFirst.mockResolvedValue(
        patternRow({
          tags: [{ tag: { id: 2, name: 'summer' } }],
          pieces: [
            {
              id: 1,
              geojson: '{"type":"Polygon","coordinates":[[[0,0],[10,0],[10,5],[0,0]]]}',
            },
          ],
        }),
      );

      await expect(service.getPatternById(17, 3)).resolves.toMatchObject({
        id: 17,
        createdAt: '2025-01-15T10:30:00.000Z',
        tags: [{ id: 2, name: 'summer' }],
        pieces: [{ id: 1, points: [[0, 0], [10, 0], [10, 5], [0, 0]] }],
        isFavourite: false,
        author: { nickname: 'ala_k' },
      });
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          with: expect.objectContaining({
            favoritedBy: expect.objectContaining({ columns: { userId: true } }),
          }),
        }),
      );
    });

    it('marks a pattern as favourited by the current user', async () => {
      findFirst.mockResolvedValue(patternRow({ favoritedBy: [{ userId: 3 }] }));

      await expect(service.getPatternById(17, 3)).resolves.toMatchObject({
        isFavourite: true,
      });
    });

    it.each([
      ['a missing pattern', undefined],
      ['another user’s private pattern', patternRow({ userId: 5 })],
    ])('hides %s', async (_description, row) => {
      findFirst.mockResolvedValue(row);
      await expect(service.getPatternById(17, 3)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it('allows guests to view a public pattern', async () => {
      findFirst.mockResolvedValue(patternRow({ visibility: 'PUBLIC' }));
      await expect(service.getPatternById(17, null)).resolves.toMatchObject({
        id: 17,
        isFavourite: false,
      });
    });
  });

  describe('createPattern', () => {
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

    it('saves pattern metadata, tags and pieces transactionally', async () => {
      const inserted: unknown[] = [];
      insertValues.mockImplementation((values: unknown) => {
        inserted.push(values);
        return Object.assign(Promise.resolve(), {
          returning: () => Promise.resolve([{ id: 42 }]),
        });
      });
      txSelectWhere.mockResolvedValue([{ id: 7, name: 'summer' }]);

      await expect(service.createPattern(dto, 3)).resolves.toEqual({ id: 42 });
      expect(inserted).toHaveLength(3);
      expect(inserted[0]).toMatchObject({
        name: 'Shirt',
        userId: 3,
        visibility: 'PUBLIC',
      });
      expect(inserted[1]).toEqual([{ patternId: 42, tagId: 7 }]);
      expect(inserted[2]).toMatchObject([
        { patternId: 42, normalCount: 2, mirroredCount: 1 },
      ]);
    });

    it('rejects unknown tags without saving the pattern', async () => {
      txSelectWhere.mockResolvedValue([]);

      await expect(service.createPattern(dto, 3)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(insertValues).not.toHaveBeenCalled();
    });
  });

  describe('updatePattern', () => {
    it('updates fields and replaces deduplicated tags', async () => {
      findManyTags.mockResolvedValue([{ id: 2 }, { id: 5 }]);
      findFirst.mockResolvedValue(patternRow({ visibility: 'PUBLIC' }));

      await expect(
        service.updatePattern(
          17,
          {
            name: 'Updated shirt',
            size: PatternSize.M,
            visibility: PatternVisibility.PUBLIC,
            tagIds: [2, 5, 2],
          },
          3,
        ),
      ).resolves.toMatchObject({ id: 17 });
      expect(updateSet).toHaveBeenCalledWith({
        name: 'Updated shirt',
        size: 'M',
        visibility: 'PUBLIC',
      });
      expect(deleteWhere).toHaveBeenCalledOnce();
      expect(insertValues).toHaveBeenCalledWith([
        { patternId: 17, tagId: 2 },
        { patternId: 17, tagId: 5 },
      ]);
    });

    it('rejects empty updates', async () => {
      await expect(service.updatePattern(17, {}, 3)).rejects.toBeInstanceOf(
        RequestValidationException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('rejects references to nonexistent tags', async () => {
      findManyTags.mockResolvedValue([]);
      await expect(
        service.updatePattern(17, { tagIds: [99] }, 3),
      ).rejects.toBeInstanceOf(RequestValidationException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('does not update a pattern not owned by the current user', async () => {
      updateReturning.mockResolvedValue([]);
      await expect(
        service.updatePattern(17, { name: 'Changed' }, 99),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe('setFavourite', () => {
    it('adds a favourite idempotently', async () => {
      findFirst.mockResolvedValue({ id: 17, userId: 9, visibility: 'PUBLIC' });
      const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      const values = vi.fn(() => ({ onConflictDoNothing }));
      insert.mockReturnValue({ values });

      await expect(service.setFavourite(17, true, 3)).resolves.toEqual({
        id: 17,
        isFavourite: true,
      });
      expect(values).toHaveBeenCalledWith({ patternId: 17, userId: 3 });
      expect(onConflictDoNothing).toHaveBeenCalledOnce();
    });

    it('removes a favourite', async () => {
      findFirst.mockResolvedValue({ id: 17, userId: 9, visibility: 'PUBLIC' });
      deleteFn.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

      await expect(service.setFavourite(17, false, 3)).resolves.toEqual({
        id: 17,
        isFavourite: false,
      });
      expect(deleteFn).toHaveBeenCalledOnce();
    });

    it('hides missing and other users’ private patterns', async () => {
      findFirst.mockResolvedValue({ id: 17, userId: 9, visibility: 'PRIVATE' });

      await expect(service.setFavourite(17, true, 3)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      expect(insert).not.toHaveBeenCalled();
    });
  });
});
