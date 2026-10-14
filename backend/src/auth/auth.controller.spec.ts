import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

const FRONT = 'http://localhost:5173';
const profile = { email: 'a@b.pl', name: 'Ala' };

describe('AuthController', () => {
  let auth: {
    handleGoogleCallback: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
  };
  let controller: AuthController;
  let res: { redirect: ReturnType<typeof vi.fn>; cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { handleGoogleCallback: vi.fn(), register: vi.fn() };
    const config = { getOrThrow: () => FRONT } as unknown as ConfigService;
    controller = new AuthController(auth as unknown as AuthService, config);
    res = { redirect: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn() };
  });

  const callback = (user: unknown) =>
    controller.googleCallback(
      { user } as unknown as Request,
      res as unknown as Response,
    );

  it('redirects to the login page with an error when Google auth failed', async () => {
    await callback(null);

    expect(res.redirect).toHaveBeenCalledWith(
      `${FRONT}/login?error=google_auth_failed`,
    );
    expect(auth.handleGoogleCallback).not.toHaveBeenCalled();
  });

  it('logs in an existing user: session cookie and redirect home', async () => {
    auth.handleGoogleCallback.mockResolvedValue({
      status: 'existing',
      sessionToken: 'S',
    });

    await callback(profile);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'S',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.redirect).toHaveBeenCalledWith(`${FRONT}/`);
  });

  it('sends a new user to the nickname screen with a registration cookie', async () => {
    auth.handleGoogleCallback.mockResolvedValue({
      status: 'new',
      registrationToken: 'R',
    });

    await callback(profile);

    expect(res.cookie).toHaveBeenCalledWith(
      'registration_token',
      'R',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.redirect).toHaveBeenCalledWith(`${FRONT}/?registration=1`);
  });

  it('register: swaps the registration cookie for a session cookie', async () => {
    auth.register.mockResolvedValue({ sessionToken: 'S', nickname: 'Ala_Test' });
    const req = { cookies: { registration_token: 'R' } } as unknown as Request;

    const result = await controller.register(
      req,
      { nickname: 'Ala_Test' },
      res as unknown as Response,
    );

    expect(auth.register).toHaveBeenCalledWith('R', 'Ala_Test');
    expect(res.clearCookie).toHaveBeenCalledWith('registration_token');
    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'S',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).toEqual({ nickname: 'Ala_Test' });
  });
});