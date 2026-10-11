import {ConflictException, Inject, Injectable} from '@nestjs/common'
import {eq, sql} from 'drizzle-orm'
import {DRIZZLE} from '../db/drizzle.provider.js';
import type { DrizzleDB } from '../db/drizzle.provider.js';
import {users} from '../db/schema.js';

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email.toLocaleLowerCase()))
        .limit(1);
    return user ?? null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
    return user ?? null;
  }

   async nicknameExists(nickname: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.nickname}) = lower(${nickname})`)
      .limit(1);
    return !!row;
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
          throw new ConflictException('This nickname is already taken');
        }
        throw new ConflictException(
          'Account for this email address already exists',
        );
      }
      throw e;
    }
  }
}