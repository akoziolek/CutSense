import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import cookieParser from 'cookie-parser';
import { DRIZZLE } from '../src/db/drizzle.provider.js';
import { DrizzleModule } from '../src/db/drizzle.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { FabricModule } from '../src/modules/fabrics/fabrics.module.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

describe('Fabrics endpoint (integration)', () => {
  let app!: INestApplication<App>;
  let findFirst: ReturnType<typeof vi.fn>;
  let findManyTags: ReturnType<typeof vi.fn>;
  let insert: ReturnType<typeof vi.fn>;
  let insertValues: ReturnType<typeof vi.fn>;
  let insertReturning: ReturnType<typeof vi.fn>;
  let uploadFile: ReturnType<typeof vi.fn>;
  let sessionCookie: string;

  beforeEach(async () => {
    findManyTags = vi
      .fn()
      .mockResolvedValue([
        { id: 2, name: 'cotton' },
        { id: 5, name: 'linen' },
      ]);
    insertReturning = vi.fn();
    insertValues = vi.fn(() => ({ returning: insertReturning }));
    insert = vi.fn(() => ({ values: insertValues }));
    uploadFile = vi.fn().mockResolvedValue('users/1/fabrics/uploaded.png');
    findFirst = vi.fn().mockResolvedValue({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureS3Key: 'https://example.com/fabric.jpg',
      isFavourite: true,
      area: 4.32,
      userId: 1,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
      boundaryGeoJson:
        '{"type":"Polygon","coordinates":[[[-250,125],[250,125],[250,625],[-250,625],[-250,125]]]}',
      tags: [{ tag: { name: 'cotton' } }, { tag: { name: 'canvas' } }],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              GOOGLE_CLIENT_ID: 'test-client-id',
              GOOGLE_CLIENT_SECRET: 'test-client-secret',
              GOOGLE_CALLBACK_URL:
                'http://localhost:3000/v1/auth/google/callback',
            }),
          ],
        }),
        DrizzleModule,
        FabricModule,
      ],
    })
      .overrideProvider(DRIZZLE)
      .useValue({
        query: {
          fabrics: { findFirst },
          tagsForFabrics: { findMany: findManyTags },
        },
        insert,
        transaction: (callback: (tx: { insert: typeof insert }) => unknown) =>
          callback({ insert }),
      })
      .overrideProvider(StorageService)
      .useValue({
        uploadFile,
        generatePresignedUrl: vi
          .fn()
          .mockResolvedValue('https://example.com/signed.jpg'),
        deleteFile: vi.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    sessionCookie = app.get(JwtService).sign({ sub: '1', purpose: 'session' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    vi.unstubAllGlobals();
  });

  it('rejects requests without an authenticated session', async () => {
    await request(app.getHttpServer())
      .get('/v1/fabrics/17')
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 401,
          errorCode: 'UNAUTHORIZED',
          path: '/v1/fabrics/17',
        });
      });

    expect(findFirst).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get('/v1/fabrics/tags').expect(401);
    expect(findManyTags).not.toHaveBeenCalled();
  });

  it('returns available fabric tags', async () => {
    await request(app.getHttpServer())
      .get('/v1/fabrics/tags')
      .set('Cookie', `session=${sessionCookie}`)
      .expect(200)
      .expect([
        { id: 2, name: 'cotton' },
        { id: 5, name: 'linen' },
      ]);

    expect(findManyTags).toHaveBeenCalledOnce();
  });

  it('requires an authenticated session to analyze a fabric photo', async () => {
    await request(app.getHttpServer())
      .post('/v1/fabrics/analyze-boundary')
      .expect(401);
  });

  it('returns the detected fabric boundary through the authenticated backend', async () => {
    const analysis = {
      points: [
        { pctX: 20, pctY: 20 },
        { pctX: 80, pctY: 20 },
        { pctX: 80, pctY: 80 },
      ],
      imageWidth: 800,
      imageHeight: 600,
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(analysis));
    vi.stubGlobal('fetch', fetchMock);

    await request(app.getHttpServer())
      .post('/v1/fabrics/analyze-boundary')
      .set('Cookie', `session=${sessionCookie}`)
      .attach(
        'picture',
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZsAAAAASUVORK5CYII=',
          'base64',
        ),
        {
        filename: 'fabric.png',
        contentType: 'image/png',
        },
      )
      .expect(201)
      .expect(analysis);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/analyze-fabric-boundary',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uploads a picture and creates a fabric from multipart boundary points', async () => {
    insertReturning.mockResolvedValue([
      {
        id: 21,
        name: 'Cotton canvas',
        description: 'Medium-weight cotton',
        pictureS3Key: 'users/1/fabrics/uploaded.png',
        isFavourite: false,
        area: 3600,
        userId: 1,
        createdAt: new Date('2025-01-15T10:30:00.000Z'),
      },
    ]);

    await request(app.getHttpServer())
      .post('/v1/fabrics')
      .set('Cookie', `session=${sessionCookie}`)
      .field('name', 'Cotton canvas')
      .field('description', 'Medium-weight cotton')
      .field('tagIds', JSON.stringify([2, 5]))
      .field(
        'boundary',
        JSON.stringify([
          { x: -250, y: 125 },
          { x: 250, y: 125 },
          { x: 250, y: 625 },
          { x: -250, y: 625 },
        ]),
      )
      .attach(
        'picture',
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZsAAAAASUVORK5CYII=',
          'base64',
        ),
        { filename: 'fabric.png', contentType: 'image/png' },
      )
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 21,
          name: 'Cotton canvas',
          description: 'Medium-weight cotton',
          pictureS3Key: 'users/1/fabrics/uploaded.png',
          pictureUrl: 'https://example.com/signed.jpg',
          area: 3600,
          boundary: [
            { x: -250, y: 125 },
            { x: 250, y: 125 },
            { x: 250, y: 625 },
            { x: -250, y: 625 },
          ],
          userId: 1,
          tags: [
            { id: 2, name: 'cotton' },
            { id: 5, name: 'linen' },
          ],
        });
      });

    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'fabric.png',
        mimetype: 'image/png',
      }),
      'users/1/fabrics',
    );
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cotton canvas',
        pictureS3Key: 'users/1/fabrics/uploaded.png',
        userId: 1,
      }),
    );
    expect(insertValues).toHaveBeenCalledWith([
      { fabricId: 21, tagId: 2 },
      { fabricId: 21, tagId: 5 },
    ]);
  });

  it('returns the requested fabric and its tags', async () => {
    await request(app.getHttpServer())
      .get('/v1/fabrics/17')
      .set('Cookie', `session=${sessionCookie}`)
      .expect(200)
      .expect({
        id: 17,
        name: 'Cotton canvas',
        description: 'Medium-weight cotton',
        pictureS3Key: 'https://example.com/fabric.jpg',
        pictureUrl: 'https://example.com/signed.jpg',
        isFavourite: true,
        area: 4.32,
        userId: 1,
        createdAt: '2025-01-15T10:30:00.000Z',
        boundary: [
          { x: -250, y: 125 },
          { x: 250, y: 125 },
          { x: 250, y: 625 },
          { x: -250, y: 625 },
        ],
        tags: [{ name: 'cotton' }, { name: 'canvas' }],
      });

    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('returns 400 when the fabric ID is not an integer', async () => {
    await request(app.getHttpServer())
      .get('/v1/fabrics/not-an-integer')
      .set('Cookie', `session=${sessionCookie}`)
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          path: '/v1/fabrics/not-an-integer',
        });
      });

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when the fabric is missing or not owned by the current user', async () => {
    findFirst.mockResolvedValueOnce(undefined);

    await request(app.getHttpServer())
      .get('/v1/fabrics/99')
      .set('Cookie', `session=${sessionCookie}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 404,
          errorCode: 'RESOURCE_NOT_FOUND',
          details: { resource: 'Fabric', id: 99 },
          path: '/v1/fabrics/99',
        });
      });
  });
});
