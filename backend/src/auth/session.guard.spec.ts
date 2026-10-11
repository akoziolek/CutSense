import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { SessionGuard } from './session.guard.js';

describe('SessionGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const guard = new SessionGuard(jwt);

  const contextWith = (cookies: Record<string, string> | undefined) => {
    const req: { cookies?: Record<string, string>; user?: unknown } = { cookies };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
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
      UnauthorizedException,
    );
  });

  it('rejects a tampered token', () => {
    const { ctx } = contextWith({ session: 'abc.def.ghi' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects a registration token used as a session', () => {
    const token = jwt.sign({ sub: '5', purpose: 'registration' });
    const { ctx } = contextWith({ session: token });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});