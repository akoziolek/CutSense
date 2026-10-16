import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationRequiredException } from '../../common/exceptions/authentication-required.exception.js';
import type { UsersService } from '../../modules/users/users.service.js';
import { AuthService } from '../auth.service.js';
import { SessionGuard } from './session.guard.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

const profile = { googleId: '123456789', email: 'a@b.pl', name: 'Ala' };

describe('Session and tokens expiration', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new SessionGuard(jwt);
  const start = new Date('2026-01-01T12:00:00Z').getTime();
  let service: AuthService;

  const ctxWith = (session: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ cookies: { session } }),
      }),
    }) as unknown as ExecutionContext;

  const at = (offsetMs: number) => vi.setSystemTime(new Date(start + offsetMs));

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    at(0);
    service = new AuthService(
      { findByGoogleId: vi.fn().mockResolvedValue(null) } as unknown as UsersService,
      jwt,
    );
  });

  afterEach(() => vi.useRealTimers());

  describe('session token (7 days)', () => {
    it('is valid right before 7 days expiration', () => {
      const token = service.signSession(5);
      at(7 * DAY - SECOND);
      expect(guard.canActivate(ctxWith(token))).toBe(true);
    });

    it('is rejected after 7 days', () => {
      const token = service.signSession(5);
      at(7 * DAY + SECOND);
      expect(() => guard.canActivate(ctxWith(token))).toThrow(
        AuthenticationRequiredException,
      );
    });
  });

  describe('registration token (15 minutes)', () => {
    const newToken = async () => {
      const result = await service.handleGoogleCallback(profile);
      if (result.status !== 'new') throw new Error('expected a new user');
      return result.registrationToken;
    };

    it('registration with expired token does not save anything', async () => {
      const create = vi.fn();
      const svc = new AuthService(
        { findByGoogleId: vi.fn().mockResolvedValue(null),
          create } as unknown as UsersService,
        jwt,
      );
      const result = await svc.handleGoogleCallback(profile);
      if (result.status !== 'new') throw new Error('expected a new user');

      at(16 * MINUTE);
      await expect(svc.register(result.registrationToken, 'Ala_Test')).rejects.toBeInstanceOf(
        AuthenticationRequiredException,
      );
      expect(create).not.toHaveBeenCalled();
    });
  });
});