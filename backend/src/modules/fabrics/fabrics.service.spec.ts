import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../db/drizzle.provider.js';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { StorageService } from '../storage/storage.service.js';
import { FabricService } from './fabrics.service.js';

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

  beforeEach(async () => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    findFirst = vi.fn();
    findManyTags = vi.fn();
    insertReturning = vi.fn();
    insertValues = vi.fn(() => ({ returning: insertReturning }));
    insert = vi.fn(() => ({ values: insertValues }));
    generatePresignedUrl = vi
      .fn()
      .mockResolvedValue('https://example.com/signed.jpg');
    uploadFile = vi.fn().mockResolvedValue('users/3/fabrics/uploaded.jpg');
    deleteFile = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FabricService,
        {
          provide: DRIZZLE,
          useValue: {
            query: {
              fabrics: { findFirst },
              tagsForFabrics: { findMany: findManyTags },
            },
            insert,
            transaction: (
              callback: (tx: { insert: typeof insert }) => unknown,
            ) => callback({ insert }),
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

  it('forwards image bytes to the shape engine and returns the detected boundary', async () => {
    const result = {
      points: [
        { pctX: 20, pctY: 20 },
        { pctX: 80, pctY: 20 },
        { pctX: 80, pctY: 80 },
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
    ).resolves.toEqual(result);

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
        points: [
          { pctX: 20, pctY: 20 },
          { pctX: 120, pctY: 20 },
          { pctX: 80, pctY: 80 },
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
        area: 3600,
        userId: 3,
        createdAt: new Date('2025-01-15T10:30:00.000Z'),
      },
    ]);

    await expect(
      service.createFabric(
        {
          name: 'Cotton canvas',
          boundary: [
            { x: -250, y: 125 },
            { x: 250, y: 125 },
            { x: 250, y: 625 },
            { x: -250, y: 625 },
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
      area: 3600,
      userId: 3,
      createdAt: '2025-01-15T10:30:00.000Z',
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
    });
    expect(insertedFabric.boundary).toBeDefined();
    expect(insertedFabric.area).toBeDefined();
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
          boundary: [
            { x: -250, y: 125 },
            { x: 250, y: 125 },
            { x: 250, y: 625 },
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
        },
        3,
      ),
    ).rejects.toBe(databaseError);

    expect(deleteFile).toHaveBeenCalledWith('users/3/fabrics/uploaded.jpg');
  });

  it('returns a fabric with ISO date and tag names', async () => {
    findFirst.mockResolvedValue({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureS3Key: 'users/3/fabrics/fabric.jpg',
      isFavourite: true,
      area: 4.32,
      userId: 3,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      tags: [{ tag: { name: 'cotton' } }, { tag: { name: 'canvas' } }],
    });

    await expect(service.getFabricById(17, 3)).resolves.toEqual({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureS3Key: 'users/3/fabrics/fabric.jpg',
      pictureUrl: 'https://example.com/signed.jpg',
      isFavourite: true,
      area: 4.32,
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
      area: 2.1,
      userId: 3,
      createdAt: new Date('2025-02-01T00:00:00.000Z'),
      tags: [],
    });

    await expect(service.getFabricById(18, 3)).resolves.toMatchObject({
      description: undefined,
      pictureS3Key: undefined,
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
