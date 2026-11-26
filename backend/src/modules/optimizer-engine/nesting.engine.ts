import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createRequire } from 'node:module';
import pLimit from 'p-limit';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import type {
  CalcMinimumInput,
  EngineFabric,
  EngineInput,
  EnginePiece,
  EngineResult,
  OptimizerEngine,
  EnginePosition,
  NestingStats,
  CalculateStatsInput,
} from './optimizer-engine.types.js';

const nesting = createRequire(import.meta.url)('@cut-sense/nesting-engine') as {
  execute(
    fabric: EngineFabric,
    pieces: EnginePiece[],
    algorithmId: number,
  ): Promise<EngineResult>;
  calcMinimum(width: number, pieces: EnginePiece[]): Promise<number>;
  calculateStatsFor(
    fabric: EngineFabric,
    pieces: EnginePiece[],
    placements: EnginePosition[],
  ): Promise<NestingStats>;
};

const TIMEOUT_MS = 60_000;
const MAX_QUEUED = 10;

@Injectable()
export class NestingEngine implements OptimizerEngine {
  private readonly logger = new Logger(NestingEngine.name);
  private readonly limit = pLimit(2); // the engine is CPU-bound

  async run({
    fabric,
    pieces,
    algorithmId,
  }: EngineInput): Promise<EngineResult> {
    return this.runInPool(() => nesting.execute(fabric, pieces, algorithmId));
  }

  async calcMinimum({ width, pieces }: CalcMinimumInput): Promise<number> {
    return this.runInPool(() => nesting.calcMinimum(width, pieces));
  }

  async calculateStats({
    fabric,
    pieces,
    placements,
  }: CalculateStatsInput): Promise<NestingStats> {
    return this.runInPool(() =>
      nesting.calculateStatsFor(fabric, pieces, placements),
    );
  }

  private async runInPool<T>(task: () => Promise<T>): Promise<T> {
    if (this.limit.pendingCount >= MAX_QUEUED) {
      throw new ServiceUnavailableException(
        'The optimizer is busy. Try again in a moment.',
      );
    }

    return this.limit(async () => {
      let timer: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          task(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(new ExternalServiceException('Optimizer timed out.')),
              TIMEOUT_MS,
            );
          }),
        ]);
      } catch (e) {
        if (e instanceof ExternalServiceException) throw e;
        this.logger.warn(
          `Optimizer error: ${e instanceof Error ? e.message : String(e)}`,
        );
        throw new ExternalServiceException(
          'The optimizer failed to compute a layout.',
        );
      } finally {
        clearTimeout(timer);
      }
    });
  }
}
