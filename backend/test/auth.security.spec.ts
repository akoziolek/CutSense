import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { GoogleAuthGuard } from '../src/auth/guards/google-auth.guard.js';
import { SessionGuard } from '../src/auth/guards/session.guard.js';

const SECRET = 'test-secret';
const FRONT = 'http://localhost:5173';
const profile = { email: 'a@b.pl', name: 'ala', surname: 'M', avatar: 'http://x/y.png' };

// ---- mocks ----
const users = {
  findByGoogleId: vi.fn(),
  findById: vi.fn(),
  nicknameExists: vi.fn(),
  create: vi.fn(),
};

let googleResult: unknown = profile;
const fakeGoogleGuard = {
  canActivate: (ctx: ExecutionContext) => {
    ctx.switchToHttp().getRequest().user = googleResult;
    return true;
  },
};

// ---- token helpers ----
const jwt = new JwtService({ secret: SECRET });
const sessionToken = (sub = '5', expiresIn: JwtSignOptions['expiresIn'] = '1h') =>
  jwt.sign({ sub, purpose: 'session' }, { expiresIn });
const registrationToken = (expiresIn: JwtSignOptions['expiresIn'] = '15m') =>
  jwt.sign({ ...profile, purpose: 'registration' }, { expiresIn });

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
// valid header and signature, but a different payload
const tamper = (token: string, payload: object) => {
  const [h, , s] = token.split('.');
  return `${h}.${b64(payload)}.${s}`;
};

// ---- response helpers ----
const setCookies = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
const cookie = (res: request.Response, name: string) =>
  setCookies(res).find((c) => c.startsWith(`${name}=`));
const cookieValue = (c: string) => c.split(';')[0].split('=').slice(1).join('=');
const isCleared = (c?: string) => !!c && c.includes('Expires=Thu, 01 Jan 1970');

describe('Auth module guards (HTTP)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET })],
      controllers: [AuthController],
      providers: [
        AuthService,
        SessionGuard,
        { provide: UsersService, useValue: users },
        { provide: ConfigService, useValue: { getOrThrow: () => FRONT } },
      ],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue(fakeGoogleGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    vi.resetAllMocks();
    googleResult = profile;
    users.findByGoogleId.mockResolvedValue(null);
    users.nicknameExists.mockResolvedValue(false);
    users.create.mockResolvedValue({ id: 1, nickname: 'ala_Test' });
  });

  // =====================================================
  describe('GET /v1/auth/me: ochrona sesji', () => {
    const unauthorized = (res: request.Response) => {
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
      expect(users.findById).not.toHaveBeenCalled();
    };

    it('401 without cookies', async () => {
      unauthorized(await http().get('/v1/auth/me').expect(401));
    });

    it('401 for expired session', async () => {
      const res = await http()
        .get('/v1/auth/me')
        .set('Cookie', `session=${sessionToken('5', -1)}`)
        .expect(401);
      unauthorized(res);
    });

    it('401 for tampered token (changed user)', async () => {
      const forged = tamper(sessionToken('5'), { sub: '1', purpose: 'session' });
      unauthorized(await http().get('/v1/auth/me').set('Cookie', `session=${forged}`).expect(401));
    });

    it('200 for valid session with only public fields', async () => {
      users.findById.mockResolvedValue({
        id: 5, nickname: 'ala', email: 'a@b.pl', pictureUrl: 'http://x/y.png',
        name: 'ala', surname: 'K', createdAt: new Date(), updatedAt: new Date(),
      });
      const res = await http()
        .get('/v1/auth/me')
        .set('Cookie', `session=${sessionToken('5')}`)
        .expect(200);
      expect(Object.keys(res.body).sort()).toEqual(['avatar', 'email', 'id', 'nickname']);
    });
  });

  // =====================================================
  describe('POST /v1/auth/register: ochrona rejestracji', () => {
    const send = (cookieHeader: string | undefined, body: object) => {
      const req = http().post('/v1/auth/register');
      if (cookieHeader) req.set('Cookie', cookieHeader);
      return req.send(body);
    };

    it('401 without registration token and nothing is saved', async () => {
      await send(undefined, { nickname: 'ala_Test' }).expect(401);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('401 when session token is provided instead of registration token', async () => {
      await send(`registration_token=${sessionToken()}`, { nickname: 'ala_Test' }).expect(401);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('401 for expired registration token', async () => {
      await send(`registration_token=${registrationToken(-1)}`, { nickname: 'ala_Test' }).expect(401);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('401 for tampered registration token (foreign email)', async () => {
      const forged = tamper(registrationToken(), {
        ...profile, email: 'victim@x.pl', purpose: 'registration',
      });
      await send(`registration_token=${forged}`, { nickname: 'ala_Test' }).expect(401);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('400 when client tries to submit additional fields (email, id)', async () => {
      await send(`registration_token=${registrationToken()}`, {
        nickname: 'ala_Test', email: 'attacker@evil.com', id: 1,
      }).expect(400);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('201: e-mail comes from the token, session is set, registration token is cleared', async () => {
      const res = await send(`registration_token=${registrationToken()}`, { nickname: 'ala_Test' }).expect(201);

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: profile.email, nickname: 'ala_Test' }),
      );
      expect(cookie(res, 'session')).toContain('HttpOnly');
      expect(isCleared(cookie(res, 'registration_token'))).toBe(true);
    });
  });

  // =====================================================
  describe('GET /v1/auth/google/callback: cookies and redirections', () => {
    it('existing user: 7-day session, HttpOnly, SameSite=Lax', async () => {
      users.findByGoogleId.mockResolvedValue({ id: 7 });
      const res = await http().get('/v1/auth/google/callback').expect(302);

      expect(res.headers.location).toBe(`${FRONT}/`);
      const c = cookie(res, 'session')!;
      expect(c).toContain('HttpOnly');
      expect(c).toContain('SameSite=Lax');
      expect(c).toContain('Max-Age=604800');

      // czas życia ciasteczka = czas życia tokenu
      const payload = jwt.decode(cookieValue(c)) as { sub: string; exp: number; iat: number };
      expect(payload.sub).toBe('7');
      expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);
    });

    it('new user: only registration token (15 min), no session and no save', async () => {
      const res = await http().get('/v1/auth/google/callback').expect(302);

      expect(res.headers.location).toBe(`${FRONT}/?registration=1`);
      expect(cookie(res, 'session')).toBeUndefined();
      const c = cookie(res, 'registration_token')!;
      expect(c).toContain('HttpOnly');
      expect(c).toContain('Max-Age=900');
      expect(users.create).not.toHaveBeenCalled();
    });

    it('failed Google login: redirection with error and no cookies', async () => {
      googleResult = null;
      const res = await http().get('/v1/auth/google/callback').expect(302);

      expect(res.headers.location).toBe(`${FRONT}/?error=google_auth_failed`);
      expect(setCookies(res)).toHaveLength(0);
    });
  });

  // =====================================================
  describe('POST /v1/auth/logout', () => {
    it('204 without session and clears both cookies with the same options', async () => {
      const res = await http().post('/v1/auth/logout').expect(204);

      for (const name of ['session', 'registration_token']) {
        const c = cookie(res, name);
        expect(isCleared(c)).toBe(true);
        expect(c).toContain('HttpOnly');
        expect(c).toContain('SameSite=Lax');
        expect(c).toContain('Path=/');
      }
    });

    it('works also with an expired session (you can always log out)', async () => {
      await http()
        .post('/v1/auth/logout')
        .set('Cookie', `session=${sessionToken('5', -1)}`)
        .expect(204);
    });
  });
});