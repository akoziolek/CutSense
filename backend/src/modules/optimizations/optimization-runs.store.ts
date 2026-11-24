import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { optimizationRuns } from '../../db/schema/schema.js';
import type { EngineResult } from '../optimizer-engine/optimizer-engine.types.js';
import type { OptimizerInputDto } from './dto/optimizer-input.dto.js';

export interface StoredRun {
  id: string;
  userId: number | null;
  input: OptimizerInputDto;
  result: EngineResult;
  expiresAt: number;
  savedId?: number;
  savedName?: string;
}

const TTL_MS = 60 * 60 * 1000;

@Injectable()
export class OptimizationRunsStore {
  private readonly logger = new Logger(OptimizationRunsStore.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async put(run: Pick<StoredRun, 'userId' | 'input' | 'result'>): Promise<string> {
    const id = randomUUID();
    await this.db.insert(optimizationRuns).values({
      id,
      userId: run.userId,
      input: run.input,
      result: run.result,
      expiresAt: new Date(Date.now() + TTL_MS),
    });
    return id;
  }

  async get(id: string): Promise<StoredRun | undefined> {
    const [row] = await this.db
      .select()
      .from(optimizationRuns)
      .where(and(eq(optimizationRuns.id, id), gt(optimizationRuns.expiresAt, new Date())))
      .limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      userId: row.userId,
      input: row.input,
      result: row.result,
      expiresAt: row.expiresAt.getTime(),
      savedId: row.savedId ?? undefined,
      savedName: row.savedName ?? undefined,
    };
  }

  async evictExpired(): Promise<number> {
      try {
        const result = await this.db
          .delete(optimizationRuns)
          .where(lt(optimizationRuns.expiresAt, new Date()))
          .returning({ id: optimizationRuns.id });
        
        return result.length;
      } catch (e) {
        this.logger.warn(`Could not evict expired runs: ${String(e)}`);
        return 0;
      }
    }
}