import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { SessionGuard } from './session.guard.js';
import { AUTH_TYPE_KEY } from '../../../common/decorators/auth.decorator.js';
import { AuthenticationRequiredException } from '../../../common/exceptions/authentication-required.exception.js';

describe('SessionGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new SessionGuard(jwt, new Reflector());

  const contextWith = (
    cookies: Record<string, string> | undefined,
    handler = () => {},
    controller = class {},
  ) => {
    const req: { cookies?: Record<string, string>; user?: unknown } = {
      cookies,
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => handler,
      getClass: () => controller,
    } as unknown as ExecutionContext;
    return { ctx, req };
  };

  it('lets a valid session through and exposes the user id', () => {
    const token = jwt.sign({ sub: '5', purpose: 'session' });
    const { ctx, req } = contextWith({ session: token });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user).toEqual({ id: 5 });
  });

  it('rejects a request without a session cookie', () => {
    expect(() => guard.canActivate(contextWith(undefined).ctx)).toThrow(
      AuthenticationRequiredException,
    );
  });

  it('rejects a tampered token', () => {
    const { ctx } = contextWith({ session: 'abc.def.ghi' });
    expect(() => guard.canActivate(ctx)).toThrow(
      AuthenticationRequiredException,
    );
  });

  it('rejects a registration token used as a session', () => {
    const token = jwt.sign({ sub: '5', purpose: 'registration' });
    const { ctx } = contextWith({ session: token });
    expect(() => guard.canActivate(ctx)).toThrow(
      AuthenticationRequiredException,
    );
  });

  it('allows a public route without a session', () => {
    const handler = () => {};
    Reflect.defineMetadata(AUTH_TYPE_KEY, 'public', handler);
    const { ctx } = contextWith(undefined, handler);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows an optional-auth route without a session', () => {
    const handler = () => {};
    Reflect.defineMetadata(AUTH_TYPE_KEY, 'optional', handler);
    const { ctx, req } = contextWith(undefined, handler);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('treats an invalid session as a guest on optional-auth routes', () => {
    const handler = () => {};
    Reflect.defineMetadata(AUTH_TYPE_KEY, 'optional', handler);
    const { ctx, req } = contextWith({ session: 'invalid' }, handler);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.user).toBeUndefined();
  });
});
