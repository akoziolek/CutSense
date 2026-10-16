import { describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../../db/drizzle.provider.js';
import { UsersService } from './users.service.js';
import { ResourceConflictException } from '../../common/exceptions/resource-conflict.exception.js';

const dbFailingWith = (error: unknown) =>
  ({
    insert: () => ({
      values: () => ({ returning: () => Promise.reject(error) }),
    }),
  }) as unknown as DrizzleDB;

const newUser = {
  googleId: 'g1',
  email: 'a@b.pl',
  name: 'Ala',
  nickname: 'Ala',
};

describe('UsersService.create', () => {
  it('returns the inserted row', async () => {
    const row = { id: 1, ...newUser };
    const db = {
      insert: () => ({
        values: () => ({ returning: vi.fn().mockResolvedValue([row]) }),
      }),
    } as unknown as DrizzleDB;

    await expect(new UsersService(db).create(newUser)).resolves.toEqual(row);
  });

  it('maps a nickname unique violation to ConflictException', async () => {
    const error = {
      cause: { code: '23505', constraint: 'users_nickname_unique' },
    };

    await expect(
      new UsersService(dbFailingWith(error)).create(newUser),
    ).rejects.toThrow(
      'This nickname is already taken. Please choose a different one.',
    );
  });

  it('maps an e-mail unique violation to ConflictException', async () => {
    const error = {
      cause: { code: '23505', constraint: 'users_email_unique' },
    };

    await expect(
      new UsersService(dbFailingWith(error)).create(newUser),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it('rethrows unrelated database errors', async () => {
    const error = new Error('connection lost');

    await expect(
      new UsersService(dbFailingWith(error)).create(newUser),
    ).rejects.toBe(error);
  });

  it('maps a google id unique violation to ResourceConflictException', async () => {
    const error = {
      cause: { code: '23505', constraint: 'users_google_id_unique' },
    };
    await expect(
      new UsersService(dbFailingWith(error)).create({
        ...newUser,
        googleId: 'g1',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });
});
