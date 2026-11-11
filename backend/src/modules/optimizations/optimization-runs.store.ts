import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { EngineResult } from '../optimizer-engine/optimizer-engine.types.js';
import type { OptimizerInputDto } from './dto/optimizer-input.dto.js';

export interface StoredRun {
  id: string;
  userId: number | null; // null = started by a guest
  input: OptimizerInputDto;
  result: EngineResult; // already converted to millimetres
  expiresAt: number;
  savedId?: number;
  savedName?: string;
}

const TTL_MS = 60 * 60 * 1000;
const MAX_RUNS = 500;

@Injectable()
export class OptimizationRunsStore {
  private readonly runs = new Map<string, StoredRun>();

  put(run: Pick<StoredRun, 'userId' | 'input' | 'result'>): string {
    this.evictExpired();
    while (this.runs.size >= MAX_RUNS) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
    }
    const id = randomUUID();
    this.runs.set(id, { ...run, id, expiresAt: Date.now() + TTL_MS });
    return id;
  }

  get(id: string): StoredRun | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;
    if (run.expiresAt < Date.now()) {
      this.runs.delete(id);
      return undefined;
    }
    return run;
  }

  markSaved(id: string, savedId: number, name: string, userId: number): void {
    const run = this.runs.get(id);
    if (run) Object.assign(run, { savedId, savedName: name, userId });
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [id, run] of this.runs) {
      if (run.expiresAt < now) this.runs.delete(id);
    }
  }
}