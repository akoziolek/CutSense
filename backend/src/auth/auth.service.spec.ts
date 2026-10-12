import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { AuthenticationRequiredException } from '../common/exceptions/authentication-required.exception.js';
import { ResourceConflictException } from '../common/exceptions/resource-conflict.exception.js';

const profile = {
  email: 'a@b.pl',
  name: 'Ala',
  surname: 'K',
  avatar: 'http://x/y.png',
};

describe('AuthService', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  let users: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    nicknameExists: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  const registrationToken = async (): Promise<string> => {
    const result = await service.handleGoogleCallback(profile);
    if (result.status !== 'new') throw new Error('expected a new user');
    return result.registrationToken;
  };

  beforeEach(() => {
    users = {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      nicknameExists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue({ id: 1, nickname: 'Ala_Test' }),
    };
    service = new AuthService(users as unknown as UsersService, jwt);
  });

  describe('handleGoogleCallback', () => {
    it('recognizes an existing account and issues a session', async () => {
      users.findByEmail.mockResolvedValue({ id: 7 });

      const result = await service.handleGoogleCallback(profile);

      expect(result.status).toBe('existing');
      expect(users.findByEmail).toHaveBeenCalledWith('a@b.pl');
      expect(users.create).not.toHaveBeenCalled();
    });

    it('recognizes a new user and saves nothing to the database', async () => {
      const result = await service.handleGoogleCallback(profile);

      expect(result.status).toBe('new');
      expect(users.create).not.toHaveBeenCalled();
    });

    it('puts the Google data into the registration token', async () => {
      const data = service.readRegistrationToken(await registrationToken());

      expect(data).toEqual(profile);
    });
  });

  describe('readRegistrationToken', () => {
    it('rejects a missing token', () => {
      expect(() => service.readRegistrationToken(undefined)).toThrow(
        AuthenticationRequiredException,
      );
    });

    it('rejects a garbage token', () => {
      expect(() => service.readRegistrationToken('not-a-jwt')).toThrow(
        AuthenticationRequiredException,
      );
    });

    it('rejects an expired token', () => {
      const expired = jwt.sign(
        { ...profile, purpose: 'registration' },
        { expiresIn: '-1s' },
      );
      expect(() => service.readRegistrationToken(expired)).toThrow(
        AuthenticationRequiredException,
      );
    });

    it('rejects a session token used as a registration token', () => {
      expect(() =>
        service.readRegistrationToken(service.signSession(1)),
      ).toThrow(AuthenticationRequiredException);
    });
  });

  describe('register', () => {
    it('creates the user from Google data and the chosen nickname', async () => {
      const result = await service.register(
        await registrationToken(),
        'Ala_Test',
      );

      expect(users.create).toHaveBeenCalledWith({
        email: 'a@b.pl',
        name: 'Ala',
        surname: 'K',
        pictureUrl: 'http://x/y.png',
        nickname: 'Ala_Test',
      });
      expect(result.sessionToken).toBeTruthy();
      expect(result.nickname).toBe('Ala_Test');
    });

    it('rejects a taken nickname and creates nothing', async () => {
      users.nicknameExists.mockResolvedValue(true);

      await expect(
        service.register(await registrationToken(), 'Taken'),
      ).rejects.toBeInstanceOf(ResourceConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('rejects registration without a token', async () => {
      await expect(
        service.register(undefined, 'Ala_Test'),
      ).rejects.toBeInstanceOf(AuthenticationRequiredException);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('logs in instead of creating a duplicate if the account appeared meanwhile', async () => {
      const token = await registrationToken();
      users.findByEmail.mockResolvedValue({ id: 9, nickname: 'Existing' });

      const result = await service.register(token, 'Ala_Test');

      expect(users.create).not.toHaveBeenCalled();
      expect(result.nickname).toBe('Existing');
      expect(result.sessionToken).toBeTruthy();
    });
  });

  describe('getCurrentUser', () => {
    it('returns the public user data', async () => {
      users.findById.mockResolvedValue({
        id: 3,
        nickname: 'Ala',
        email: 'a@b.pl',
        pictureUrl: 'http://x/y.png',
        name: 'Ala',
      });

      await expect(service.getCurrentUser(3)).resolves.toEqual({
        id: 3,
        nickname: 'Ala',
        email: 'a@b.pl',
        avatar: 'http://x/y.png',
      });
    });

    it('rejects when the user no longer exists', async () => {
      users.findById.mockResolvedValue(null);

      await expect(service.getCurrentUser(3)).rejects.toBeInstanceOf(
        AuthenticationRequiredException,
      );
    });
  });
});