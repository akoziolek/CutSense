import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../db/drizzle.provider.js';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { StorageService } from '../storage/storage.service.js';
import { FabricService } from './fabrics.service.js';
import { FabricSortOption } from './dto/list-fabrics-query.dto.js';
import { PgDialect } from 'drizzle-orm/pg-core';

describe('FabricService', () => {
  let service: FabricService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let findFirst: ReturnType<typeof vi.fn>;
  let findManyTags: ReturnType<typeof vi.fn>;
  let generatePresignedUrl: ReturnType<typeof vi.fn>;
  let uploadFile: ReturnType<typeof vi.fn>;
  let deleteFile: ReturnType<typeof vi.fn>;
  let insert: ReturnType<typeof vi.fn>;
  let insertValues: ReturnType<typeof vi.fn>;
  let insertReturning: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let updateSet: ReturnType<typeof vi.fn>;
  let updateWhere: ReturnType<typeof vi.fn>;
  let updateReturning: ReturnType<typeof vi.fn>;
  let deleteQuery: ReturnType<typeof vi.fn>;
  let deleteWhere: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;
  let selectFrom: ReturnType<typeof vi.fn>;
  let selectWhere: ReturnType<typeof vi.fn>;
  let findManyFabrics: ReturnType<typeof vi.fn>;
  let deleteReturning: ReturnType<typeof vi.fn>;

// in useValue:


  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    findFirst = vi.fn();
    findManyTags = vi.fn();
    insertReturning = vi.fn();
    insertValues = vi.fn(() => ({ returning: insertReturning }));
    insert = vi.fn(() => ({ values: insertValues }));
    updateReturning = vi.fn();
    updateWhere = vi.fn(() => ({ returning: updateReturning }));
    updateSet = vi.fn(() => ({ where: updateWhere }));
    update = vi.fn(() => ({ set: updateSet }));
    deleteWhere = vi.fn().mockResolvedValue(undefined);
    deleteQuery = vi.fn(() => ({ where: deleteWhere }));
    selectWhere = vi.fn().mockResolvedValue([{ id: 17 }]);
    selectFrom = vi.fn(() => ({ where: selectWhere }));
    select = vi.fn(() => ({ from: selectFrom }));
    generatePresignedUrl = vi
      .fn()
      .mockResolvedValue('https://example.com/signed.jpg');
    uploadFile = vi.fn().mockResolvedValue('users/3/fabrics/uploaded.jpg');
    deleteFile = vi.fn();
    findManyFabrics = vi.fn();
    selectWhere = vi.fn();
    updateReturning = vi.fn();
    updateSet = vi.fn(() => ({ where: () => ({ returning: updateReturning }) }));
    deleteReturning = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FabricService,
        {
          provide: DRIZZLE,
          useValue: {
            query: {
              fabrics: { findFirst, findMany: findManyFabrics },
              tagsForFabrics: { findMany: findManyTags },
            },
            select: vi.fn(() => ({ from: () => ({ where: selectWhere }) })),
            update: vi.fn(() => ({ set: updateSet })),
            insert,
            transaction: async (
              callback: (tx: {
                insert: typeof insert;
                update: typeof update;
                delete: typeof deleteQuery;
                select: typeof select;
              }) => unknown,
            ) => callback({ insert, update, delete: deleteQuery, select }),
            delete: vi.fn(() => ({ where: () => ({ returning: deleteReturning }) })),
          },
        },
        {
          provide: StorageService,
          useValue: { generatePresignedUrl, uploadFile, deleteFile },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue: string) => defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get(FabricService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards image bytes and returns the fabric boundary as one shape', async () => {
    const result = {
      shapes: [
        [
          { pctX: 20, pctY: 20 },
          { pctX: 80, pctY: 20 },
          { pctX: 80, pctY: 80 },
        ],
      ],
      imageWidth: 800,
      imageHeight: 600,
    };
    fetchMock.mockResolvedValue(Response.json(result));

    await expect(
      service.analyzeFabricBoundary({
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File),
    ).resolves.toEqual({
      shapes: result.shapes,
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/analyze-fabric-boundary',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        signal: expect.any(AbortSignal),
        body: expect.any(Blob),
      }),
    );
  });

  it('rejects an invalid boundary returned by the shape engine', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        shapes: [
          [
            { pctX: 20, pctY: 20 },
            { pctX: 120, pctY: 20 },
            { pctX: 80, pctY: 80 },
          ],
        ],
        imageWidth: 800,
        imageHeight: 600,
      }),
    );

    await expect(
      service.analyzeFabricBoundary({
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ExternalServiceException);
  });

  it('rejects detected shapes with fewer than three points', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        shapes: [[{ pctX: 20, pctY: 20 }, { pctX: 80, pctY: 20 }]],
        imageWidth: 800,
        imageHeight: 600,
      }),
    );

    await expect(
      service.analyzeFabricBoundary({
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ExternalServiceException);
  });

  it('rejects multiple boundaries from the fabric analyzer', async () => {
    const shape = [
      { pctX: 20, pctY: 20 },
      { pctX: 80, pctY: 20 },
      { pctX: 80, pctY: 80 },
    ];
    fetchMock.mockResolvedValue(
      Response.json({
        shapes: [shape, shape],
        imageWidth: 800,
        imageHeight: 600,
      }),
    );

    await expect(
      service.analyzeFabricBoundary({
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ExternalServiceException);
  });

  it('maps a shape-engine request rejection to a validation exception', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: 'Unsupported image format.' }, { status: 400 }),
    );

    await expect(
      service.analyzeFabricBoundary({
        buffer: Buffer.from('image-data'),
        mimetype: 'image/png',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(RequestValidationException);
  });

  it('returns the available fabric tags in alphabetical order', async () => {
    findManyTags.mockResolvedValue([
      { id: 2, name: 'cotton' },
      { id: 5, name: 'linen' },
    ]);

    await expect(service.getFabricTags()).resolves.toEqual([
      { id: 2, name: 'cotton' },
      { id: 5, name: 'linen' },
    ]);
    expect(findManyTags).toHaveBeenCalledWith({
      columns: { id: true, name: true },
      orderBy: expect.any(Function),
    });
  });

  it('uploads the picture, then creates a fabric from its boundary and computes area in PostGIS', async () => {
    insertReturning.mockResolvedValue([
      {
        id: 19,
        name: 'Cotton canvas',
        description: undefined,
        pictureS3Key: 'users/3/fabrics/uploaded.jpg',
        isFavourite: false,
        areaMm2: 125_000,
        imageWidthMm: 500,
        imageHeightMm: 250,
        userId: 3,
        createdAt: new Date('2025-01-15T10:30:00.000Z'),
      },
    ]);

    await expect(
      service.createFabric(
        {
          name: 'Cotton canvas',
          imageWidthMm: 500,
          imageHeightMm: 250,
          boundary: [
            { x: -250, y: -125 },
            { x: 250, y: -125 },
            { x: 250, y: 125 },
            { x: -250, y: 125 },
          ],
        },
        {
          originalname: 'fabric.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('image'),
          fieldname: 'picture',
          encoding: '7bit',
          size: 5,
          destination: '',
          filename: 'fabric.jpg',
          path: '',
//          stream: undefined as never,
        },
        3,
      ),
    ).resolves.toEqual({
      id: 19,
      name: 'Cotton canvas',
      description: undefined,
      pictureS3Key: 'users/3/fabrics/uploaded.jpg',
      pictureUrl: 'https://example.com/signed.jpg',
      isFavourite: false,
      areaMm2: 125_000,
      userId: 3,
      createdAt: '2025-01-15T10:30:00.000Z',
      imageWidthMm: 500,
      imageHeightMm: 250,
      shapes: [
        [
          { x: -250, y: -125 },
          { x: 250, y: -125 },
          { x: 250, y: 125 },
          { x: -250, y: 125 },
        ],
      ],
      tags: [],
    });

    expect(insert).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledOnce();
    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: 'fabric.jpg' }),
      'users/3/fabrics',
    );
    const insertedFabric = insertValues.mock.calls[0]?.[0];
    expect(insertedFabric).toMatchObject({
      name: 'Cotton canvas',
      pictureS3Key: 'users/3/fabrics/uploaded.jpg',
      userId: 3,
      imageWidthMm: 500,
      imageHeightMm: 250,
    });
    expect(insertedFabric.boundary).toBeDefined();
    expect(insertedFabric.areaMm2).toBeDefined();
    expect(generatePresignedUrl).toHaveBeenCalledWith(
      'users/3/fabrics/uploaded.jpg',
    );
  });

  it('deletes the uploaded picture if creating the database record fails', async () => {
    const databaseError = new Error('database unavailable');
    insertReturning.mockRejectedValue(databaseError);

    await expect(
      service.createFabric(
        {
          name: 'Cotton canvas',
          imageWidthMm: 500,
          imageHeightMm: 250,
          boundary: [
            { x: -2500, y: 1250 },
            { x: 2500, y: 1250 },
            { x: 2500, y: 6250 },
          ],
        },
        {
          originalname: 'fabric.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('image'),
          fieldname: 'picture',
          encoding: '7bit',
          size: 5,
          destination: '',
          filename: 'fabric.jpg',
          path: '',
 //         stream: undefined as never,
        },
        3,
      ),
    ).rejects.toBe(databaseError);

    expect(deleteFile).toHaveBeenCalledWith('users/3/fabrics/uploaded.jpg');
  });

  it('returns a fabric with ISO date and tag IDs and names', async () => {
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureS3Key: 'users/3/fabrics/fabric.jpg',
      isFavourite: true,
      areaMm2: 4_320_000,
      imageWidthMm: 500,
      imageHeightMm: 250,
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      boundaryGeoJson:
        '{"type":"Polygon","coordinates":[[[-2500,1250],[2500,1250],[2500,6250],[-2500,6250],[-2500,1250]]]}',
      tags: [
        { tag: { id: 2, name: 'cotton' } },
        { tag: { id: 5, name: 'canvas' } },
      ],
    });

    await expect(service.getFabricById(17, 3)).resolves.toEqual({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureS3Key: 'users/3/fabrics/fabric.jpg',
      pictureUrl: 'https://example.com/signed.jpg',
      isFavourite: true,
      areaMm2: 4_320_000,
      imageWidthMm: 500,
      imageHeightMm: 250,
      userId: 3,
      createdAt: '2025-01-15T10:30:00.000Z',
      shapes: [
        [
          { x: -2500, y: 1250 },
          { x: 2500, y: 1250 },
          { x: 2500, y: 6250 },
          { x: -2500, y: 6250 },
        ],
      ],
      tags: [
        { id: 2, name: 'cotton' },
        { id: 5, name: 'canvas' },
      ],
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        columns: { boundary: false },
        extras: { boundaryGeoJson: expect.anything() },
        with: { tags: { with: { tag: true } } },
      }),
    );
    expect(generatePresignedUrl).toHaveBeenCalledWith(
      'users/3/fabrics/fabric.jpg',
    );
  });

  it('maps nullable optional fields to undefined', async () => {
    findFirst.mockResolvedValue({
      id: 18,
      name: 'Linen',
      description: null,
      pictureS3Key: null,
      isFavourite: false,
      areaMm2: 2_100_000,
      userId: 3,
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      boundaryGeoJson:
        '{"type":"Polygon","coordinates":[[[-2500,1250],[2500,1250],[2500,6250],[-2500,6250],[-2500,1250]]]}',
      tags: [],
    });

    await expect(service.getFabricById(18, 3)).resolves.toMatchObject({
      description: undefined,
      pictureS3Key: undefined,
      tags: [],
    });
  });

  it('returns a paginated page of the user fabrics with presigned URLs', async () => {
  findManyFabrics.mockResolvedValue([
    { id: 2, name: 'Silk', pictureS3Key: 'users/3/fabrics/a.jpg', isFavourite: true, areaMm2: 900_000, createdAt: new Date('2026-03-01T00:00:00.000Z') },
    { id: 1, name: 'Linen', pictureS3Key: null, isFavourite: false, areaMm2: 1_500_000, createdAt: new Date('2026-03-21T00:00:00.000Z') },
  ]);
  selectWhere.mockResolvedValue([{ total: 25 }]);

  await expect(
    service.getFabrics({ page: 2, limit: 12, sort: FabricSortOption.NAME_ASC }, 3),
  ).resolves.toEqual({
    items: [
      { id: 2, name: 'Silk', pictureUrl: 'https://example.com/signed.jpg', isFavourite: true, areaMm2: 900_000, createdAt: '2026-03-01T00:00:00.000Z' },
      { id: 1, name: 'Linen', pictureUrl: undefined, isFavourite: false, areaMm2: 1_500_000, createdAt: '2026-03-21T00:00:00.000Z' },
    ],
    total: 25,
    page: 2,
    limit: 12,
    totalPages: 3,
  });

  expect(findManyFabrics).toHaveBeenCalledWith(
    expect.objectContaining({ limit: 12, offset: 12 }),
  );
  expect(generatePresignedUrl).toHaveBeenCalledTimes(1);
  });

  it('throws a not-found exception when no owned fabric matches', async () => {
    findFirst.mockResolvedValue(undefined);

    await expect(service.getFabricById(99, 3)).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });

  it('updates supplied fields, replaces tags, and returns the reloaded fabric', async () => {
    updateReturning.mockResolvedValue([
      {
        id: 17,
        name: 'Linen canvas',
        description: 'Heavy linen',
        pictureS3Key: 'users/3/fabrics/fabric.jpg',
        isFavourite: false,
        areaMm2: 4_320_000,
        userId: 3,
        createdAt: new Date('2025-01-15T10:30:00.000Z'),
      },
    ]);
    findManyTags.mockResolvedValue([{ id: 2 }, { id: 5 }]);
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Linen canvas',
      description: 'Heavy linen',
      pictureS3Key: 'users/3/fabrics/fabric.jpg',
      isFavourite: false,
      areaMm2: 4_320_000,
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      boundaryGeoJson:
        '{"type":"Polygon","coordinates":[[[-250,125],[250,125],[250,625],[-250,625],[-250,125]]]}',
      tags: [
        { tag: { id: 2, name: 'cotton' } },
        { tag: { id: 5, name: 'linen' } },
      ],
    });

    await expect(
      service.updateFabric(
        17,
        { name: 'Linen canvas', description: 'Heavy linen', tagIds: [2, 5, 2] },
        3,
      ),
    ).resolves.toMatchObject({
      name: 'Linen canvas',
      description: 'Heavy linen',
      pictureUrl: 'https://example.com/signed.jpg',
      tags: [
        { id: 2, name: 'cotton' },
        { id: 5, name: 'linen' },
      ],
    });

    expect(findManyTags).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith({
      name: 'Linen canvas',
      description: 'Heavy linen',
    });
    expect(deleteQuery).toHaveBeenCalledOnce();
    expect(deleteWhere).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith([
      { fabricId: 17, tagId: 2 },
      { fabricId: 17, tagId: 5 },
    ]);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('does not alter fabric tags when tag IDs are omitted', async () => {
    updateReturning.mockResolvedValue([
      {
        id: 17,
        name: 'New name',
        pictureS3Key: null,
        isFavourite: false,
        areaMm2: 4_320_000,
        userId: 3,
        createdAt: new Date('2025-01-15T10:30:00.000Z'),
      },
    ]);
    findFirst.mockResolvedValue({
      id: 17,
      name: 'New name',
      pictureS3Key: null,
      isFavourite: false,
      areaMm2: 4_320_000,
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      boundaryGeoJson:
        '{"type":"Polygon","coordinates":[[[-250,125],[250,125],[250,625],[-250,625],[-250,125]]]}',
      tags: [{ tag: { id: 2, name: 'cotton' } }],
    });

    await service.updateFabric(17, { name: 'New name' }, 3);

    expect(deleteQuery).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(findManyTags).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('clears tags when an empty tag ID array is supplied', async () => {
    updateReturning.mockResolvedValue([
      {
        id: 17,
        name: 'Cotton',
        pictureS3Key: null,
        isFavourite: false,
        areaMm2: 4_320_000,
        userId: 3,
        createdAt: new Date('2025-01-15T10:30:00.000Z'),
      },
    ]);
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Cotton',
      pictureS3Key: null,
      isFavourite: false,
      areaMm2: 4_320_000,
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      boundaryGeoJson:
        '{"type":"Polygon","coordinates":[[[-250,125],[250,125],[250,625],[-250,625],[-250,125]]]}',
      tags: [],
    });

    await service.updateFabric(17, { tagIds: [] }, 3);

    expect(findManyTags).not.toHaveBeenCalled();
    expect(deleteQuery).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledOnce();
  });

  it('rejects invalid tag IDs before starting a database transaction', async () => {
    findManyTags.mockResolvedValue([]);

    await expect(
      service.updateFabric(17, { tagIds: [8] }, 3),
    ).rejects.toBeInstanceOf(RequestValidationException);

    expect(update).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects an empty update', async () => {
    await expect(service.updateFabric(17, {}, 3)).rejects.toBeInstanceOf(
      RequestValidationException,
    );

    expect(update).not.toHaveBeenCalled();
  });

  it('does not update a fabric that is missing or owned by another user', async () => {
    updateReturning.mockResolvedValue([]);

    await expect(
      service.updateFabric(17, { name: 'Changed' }, 3),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);

    expect(updateWhere).toHaveBeenCalledOnce();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns an empty page with zero total pages when the user has no fabrics', async () => {
  findManyFabrics.mockResolvedValue([]);
  selectWhere.mockResolvedValue([{ total: 0 }]);

  await expect(
    service.getFabrics({ page: 1, limit: 12, sort: FabricSortOption.DATE_DESC }, 3),
  ).resolves.toEqual({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 });

  expect(generatePresignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    [1, 12, 0],
    [3, 12, 24],
    [2, 5, 5],
  ])('computes the offset for page %i with limit %i as %i', async (page, limit, offset) => {
    findManyFabrics.mockResolvedValue([]);
    selectWhere.mockResolvedValue([{ total: 100 }]);

    await service.getFabrics({ page, limit, sort: FabricSortOption.DATE_DESC }, 3);

    expect(findManyFabrics).toHaveBeenCalledWith(expect.objectContaining({ limit, offset }));
  });

  it('rounds the number of pages up', async () => {
    findManyFabrics.mockResolvedValue([]);
    selectWhere.mockResolvedValue([{ total: 13 }]);

    const result = await service.getFabrics(
      { page: 1, limit: 12, sort: FabricSortOption.DATE_DESC },
      3,
    );

    expect(result.totalPages).toBe(2);
  });

  describe('setFavourite', () => {
    it('sets the flag and returns the new state', async () => {
      updateReturning.mockResolvedValue([{ id: 5, isFavourite: true }]);

      await expect(service.setFavourite(5, true, 3)).resolves.toEqual({ id: 5, isFavourite: true });
      expect(updateSet).toHaveBeenCalledWith({ isFavourite: true });
    });

    it('can remove a fabric from favourites', async () => {
      updateReturning.mockResolvedValue([{ id: 5, isFavourite: false }]);

      await expect(service.setFavourite(5, false, 3)).resolves.toEqual({ id: 5, isFavourite: false });
      expect(updateSet).toHaveBeenCalledWith({ isFavourite: false });
    });

    it('throws not-found when the fabric is missing or owned by someone else', async () => {
      updateReturning.mockResolvedValue([]);

      await expect(service.setFavourite(99, true, 3)).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe('getFabrics filters', () => {
    const base = { page: 1, limit: 12, sort: FabricSortOption.DATE_DESC };
    const whereSql = () =>
      new PgDialect().sqlToQuery(findManyFabrics.mock.calls[0][0].where);

    beforeEach(() => {
      findManyFabrics.mockResolvedValue([]);
      selectWhere.mockResolvedValue([{ total: 0 }]);
    });

    it('always restricts to the current user', async () => {
      await service.getFabrics(base, 3);

      expect(whereSql().params).toEqual([3]);
    });

    it('filters by favourite flag', async () => {
      await service.getFabrics({ ...base, favourite: true }, 3);

      const { sql, params } = whereSql();
      expect(sql).toContain('"is_favourite"');
      expect(params).toContain(true);
    });

    it('filters by creation date range', async () => {
      await service.getFabrics(
        { ...base, createdFrom: '2026-03-01T00:00:00.000Z', createdTo: '2026-03-31T23:59:59.999Z' },
        3,
      );

      const { sql, params } = whereSql();
      expect(sql).toContain('"created_at"');
      expect(JSON.stringify(params)).toContain('2026-03-01');
      expect(JSON.stringify(params)).toContain('2026-03-31');
    });

    it('filters by area range', async () => {
      await service.getFabrics({ ...base, areaMin: 0.5, areaMax: 3 }, 3);

      const { sql, params } = whereSql();
      expect(sql).toContain('"area"');
      expect(params).toEqual(expect.arrayContaining([0.5, 3]));
    });

    it('matches fabrics that have at least one of the selected tags', async () => {
    await service.getFabrics({ ...base, tagIds: [1, 2] }, 3);

    const { sql, params } = whereSql();
    expect(sql).toContain('fabric_tags');
    expect(sql).not.toContain('having');
    expect(sql).not.toContain('group by');
    expect(params).toEqual(expect.arrayContaining([1, 2]));
    });

    it('uses the same filter for the page and for the total', async () => {
      await service.getFabrics({ ...base, favourite: true }, 3);

      expect(selectWhere).toHaveBeenCalledWith(findManyFabrics.mock.calls[0][0].where);
    });

    it('searches name and description case-insensitively', async () => {
    await service.getFabrics({ ...base, q: 'Linen' }, 3);

    const { sql, params } = whereSql();
    expect(sql).toContain('ilike');
    expect(sql).toContain('"name"');
    expect(sql).toContain('"description"');
    expect(params).toContain('%Linen%');
    });

    it('escapes LIKE wildcards in the search text', async () => {
      await service.getFabrics({ ...base, q: '50%_\\' }, 3);

      expect(whereSql().params).toContain('%50\\%\\_\\\\%');
    });

    it('adds no search condition without q', async () => {
      await service.getFabrics(base, 3);

      expect(whereSql().sql).not.toContain('ilike');
    });
    });

  describe('deleteFabric', () => {
    it('deletes the fabric and its stored picture', async () => {
      deleteReturning.mockResolvedValue([{ pictureS3Key: 'users/3/fabrics/a.jpg' }]);

      await expect(service.deleteFabric(5, 3)).resolves.toBeUndefined();

      expect(deleteFile).toHaveBeenCalledWith('users/3/fabrics/a.jpg');
    });

    it('throws not-found and touches no storage when the fabric is missing or not owned', async () => {
      deleteReturning.mockResolvedValue([]);

      await expect(service.deleteFabric(99, 3)).rejects.toBeInstanceOf(ResourceNotFoundException);
      expect(deleteFile).not.toHaveBeenCalled();
    });

    it('still succeeds when removing the picture from storage fails', async () => {
      deleteReturning.mockResolvedValue([{ pictureS3Key: 'users/3/fabrics/a.jpg' }]);
      deleteFile.mockRejectedValue(new Error('s3 down'));

      await expect(service.deleteFabric(5, 3)).resolves.toBeUndefined();
    });

    it('skips storage when the fabric has no picture', async () => {
      deleteReturning.mockResolvedValue([{ pictureS3Key: null }]);

      await service.deleteFabric(5, 3);

      expect(deleteFile).not.toHaveBeenCalled();
    });
  });
});
