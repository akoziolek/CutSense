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
} from './optimizer-engine.types.js';

const nesting = createRequire(import.meta.url)('@cut-sense/nesting-engine') as {
  execute(
    fabric: EngineFabric,
    pieces: EnginePiece[],
    algorithmId: number,
  ): Promise<EngineResult>;
  calcMinimum(width: number, pieces: EnginePiece[]): Promise<number>;
};

const TIMEOUT_MS = 60_000;
const MAX_QUEUED = 40;

@Injectable()
export class NestingEngine implements OptimizerEngine {
  private readonly logger = new Logger(NestingEngine.name);
  private readonly limit = pLimit(2);

  async run(input: EngineInput): Promise<EngineResult> {
    const [result] = await this.runMany([input]);
    return result!;
  }

  async runMany(inputs: EngineInput[]): Promise<EngineResult[]> {
    this.assertCapacity(inputs.length);
    return Promise.all(
      inputs.map(({ fabric, pieces, algorithmId }) =>
        this.schedule(() => nesting.execute(fabric, pieces, algorithmId)),
      ),
    );
  }

  async calcMinimum({ width, pieces }: CalcMinimumInput): Promise<number> {
    this.assertCapacity(1);
    return this.schedule(() => nesting.calcMinimum(width, pieces));
  }

  private assertCapacity(jobs: number): void {
    if (this.limit.pendingCount + jobs > MAX_QUEUED) {
      throw new ServiceUnavailableException(
        'The optimizer is busy. Try again in a moment.',
      );
    }
  }

  private schedule<T>(task: () => Promise<T>): Promise<T> {
    return this.limit(async () => {
      let timer: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          task(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new ExternalServiceException('Optimizer timed out.')),
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