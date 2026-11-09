import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createRequire } from 'node:module';
import pLimit from 'p-limit';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import type {
  EngineFabric,
  EngineInput,
  EnginePiece,
  EngineResult,
  OptimizerEngine,
} from './optimizer-engine.types.js';


// the package is compiled by `npm install` (see the Dockerfile)
const nesting = createRequire(import.meta.url)('@cut-sense/nesting-engine') as {
  execute(fabric: EngineFabric, pieces: EnginePiece[], algorithmId: number): Promise<EngineResult>;
};

const TIMEOUT_MS = 60_000;
const MAX_QUEUED = 10;

@Injectable()
export class NestingEngine implements OptimizerEngine {
  private readonly logger = new Logger(NestingEngine.name);
  private readonly limit = pLimit(2); // the engine is CPU-bound

  async run({ fabric, pieces, algorithmId }: EngineInput): Promise<EngineResult> {
    if (this.limit.pendingCount >= MAX_QUEUED) {
      throw new ServiceUnavailableException('The optimizer is busy. Try again in a moment.');
    }

    return this.limit(async () => {
      let timer: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          nesting.execute(fabric, pieces, algorithmId),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new ExternalServiceException('Optimizer timed out.')),
              TIMEOUT_MS,
            );
          }),
        ]);
      } catch (e) {
        if (e instanceof ExternalServiceException) throw e;
        this.logger.warn(`Optimizer error: ${e instanceof Error ? e.message : String(e)}`);
        throw new ExternalServiceException('The optimizer failed to compute a layout.');
      } finally {
        clearTimeout(timer);
      }
    });
  }
}