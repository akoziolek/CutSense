import { Inject, Injectable} from '@nestjs/common'
import {eq, sql} from 'drizzle-orm'
import {DRIZZLE} from '../db/drizzle.provider.js';
import type { DrizzleDB } from '../db/drizzle.provider.js';
import {users} from '../db/schema.js';
import { ResourceConflictException } from '../common/exceptions/resource-conflict.exception.js';

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.googleId, googleId),
    })
    return user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.query.users.findFirst({
       where: eq(users.email, email.toLowerCase()),
    });
    return user ?? null;
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.db.query.users.findFirst({
       where: eq(users.id, id),
    });
    return user ?? null;
  }

  async nicknameExists(nickname: string): Promise<boolean> {
    const user = await this.db.query.users.findFirst({
      where: sql`lower(${users.nickname}) = lower(${nickname})`,
    });
    return !!user;
  }

  async create(data: NewUser): Promise<User> {
    try {
      const [user] = await this.db.insert(users).values(data).returning();
      return user;
    } catch (e) {
      // DB unique constraints are the guarantee
      const err = ((e as { cause?: unknown }).cause ?? e) as {
        code?: string;
        constraint?: string;
      };
      if (err.code === '23505') {
        if (err.constraint?.includes('nickname')) {
          throw new ResourceConflictException('This nickname is already taken. Please choose a different one.');
        }
        if (err.constraint?.includes('google')) {
          throw new ResourceConflictException('Account for this Google account already exists');
        }
        if (err.constraint?.includes('email')) {
          throw new ResourceConflictException('Account for this email address already exists', { field: 'email' });
        }
      }
      throw e;
    }
  }
}