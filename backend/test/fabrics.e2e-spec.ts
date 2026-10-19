import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
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
  let sessionCookie: string;

  beforeEach(async () => {
    findManyTags = vi
      .fn()
      .mockResolvedValue([
        { id: 2, name: 'cotton' },
        { id: 5, name: 'linen' },
      ]);
    findFirst = vi.fn().mockResolvedValue({
      id: 17,
      name: 'Cotton canvas',
      description: 'Medium-weight cotton',
      pictureS3Key: 'https://example.com/fabric.jpg',
      isFavourite: true,
      userId: 1,
      createdAt: new Date('2025-01-15T10:30:00.000Z'),
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
              GOOGLE_CALLBACK_URL: 'http://localhost:3000/v1/auth/google/callback',
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
      })
      .overrideProvider(StorageService)
      .useValue({
        generatePresignedUrl: vi
          .fn()
          .mockResolvedValue('https://example.com/fabric.jpg'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('v1');
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    sessionCookie = app
      .get(JwtService)
      .sign({ sub: '1', purpose: 'session' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
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
        pictureUrl: 'https://example.com/fabric.jpg',
        isFavourite: true,
        userId: 1,
        createdAt: '2025-01-15T10:30:00.000Z',
        tags: ['cotton', 'canvas'],
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
