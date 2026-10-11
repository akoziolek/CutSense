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
}