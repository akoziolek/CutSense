import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fork } from 'node:child_process';
import path from 'node:path';
import pLimit from 'p-limit';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import type { EngineInput, EngineResult, OptimizerEngine } from './optimizer-engine.types.js';

const TIMEOUT_MS = 60_000;
const MAX_QUEUED = 10;

type ChildMessage = { ok: true; result: EngineResult } | { ok: false; error: string };

@Injectable()
export class ForkedAddonEngine implements OptimizerEngine {
  private readonly addonPath: string;
  private readonly childPath: string;
  private readonly limit = pLimit(2); // the engine is CPU-bound

  constructor(config: ConfigService) {
    this.addonPath = config.getOrThrow<string>('PMG_ENGINE_PATH');
    this.childPath =
      config.get<string>('ENGINE_CHILD_PATH') ??
      path.resolve(process.cwd(), 'native/engine-child.mjs');
  }

  async run(input: EngineInput): Promise<EngineResult> {
    if (this.limit.pendingCount >= MAX_QUEUED) {
      throw new ServiceUnavailableException('The optimizer is busy. Try again in a moment.');
    }

    return this.limit(
      () =>
        new Promise<EngineResult>((resolve, reject) => {
          const child = fork(this.childPath, [], {
            env: { ...process.env, PMG_ENGINE_PATH: this.addonPath },
            execArgv: [], // do not inherit --inspect / watch flags
          });
          let settled = false;
          const settle = (fn: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn();
            child.kill('SIGKILL'); // the child is single-use
          };
          const timer = setTimeout(
            () => settle(() => reject(new ExternalServiceException('Optimizer timed out.'))),
            TIMEOUT_MS,
          );

          child.once('message', (m: ChildMessage) =>
            settle(() =>
              m.ok ? resolve(m.result) : reject(new ExternalServiceException(m.error)),
            ),
          );
          child.once('error', (e) =>
            settle(() =>
              reject(new ExternalServiceException(`Optimizer failed to start: ${e.message}`)),
            ),
          );
          child.once('exit', (code, signal) =>
            settle(() =>
              reject(new ExternalServiceException(`Optimizer crashed (${signal ?? code}).`)),
            ),
          );

          child.send(input);
        }),
    );
  }
}