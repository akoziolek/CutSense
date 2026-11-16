import { Inject, Injectable } from '@nestjs/common';
import { count, eq, sql, type AnyColumn } from 'drizzle-orm';
import { type AnyPgTable } from 'drizzle-orm/pg-core';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { fabrics, optimizationResults, patterns } from './../../db/schema/schema.js';
import {
  ResourceStatDto,
  UserStatisticsDto,
} from './dto/user-statistics.dto.js';

@Injectable()
export class StatisticsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getUserStatistics(currentUserId: number): Promise<UserStatisticsDto> {
    const weekStart = this.getStartOfCurrentWeek();

    const [optimizationsStats, fabricsStats, patternsStats] = await Promise.all(
      [
        this.countResource(
          optimizationResults,
          optimizationResults.userId,
          optimizationResults.createdAt,
          currentUserId,
          weekStart,
        ),
        this.countResource(
          fabrics,
          fabrics.userId,
          fabrics.createdAt,
          currentUserId,
          weekStart,
        ),
        this.countResource(
          patterns,
          patterns.userId,
          patterns.createdAt,
          currentUserId,
          weekStart,
        ),
      ],
    );

    return {
      optimizations: optimizationsStats,
      fabrics: fabricsStats,
      patterns: patternsStats,
    };
  }

  private async countResource(
    table: AnyPgTable,
    userIdCol: AnyColumn,
    createdAtCol: AnyColumn,
    userId: number,
    weekStart: Date,
  ): Promise<ResourceStatDto> {
    const [row] = await this.db
      .select({
        total: count(),
        thisWeek:
          sql<number>`coalesce(sum(case when ${createdAtCol} >= ${weekStart} then 1 else 0 end), 0)`.mapWith(
            Number,
          ),
      })
      .from(table)
      .where(eq(userIdCol, userId));

    return {
      total: row?.total ?? 0,
      thisWeek: row?.thisWeek ?? 0,
    };
  }

  private getStartOfCurrentWeek(): Date {
    const now = new Date();
    const day = now.getUTCDay(); // 0 (sunday) - 6 (saturday)
    const diffToMonday = day === 0 ? -6 : 1 - day;

    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + diffToMonday,
      ),
    );
  }
}
