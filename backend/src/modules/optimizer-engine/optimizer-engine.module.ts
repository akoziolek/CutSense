import { Module } from '@nestjs/common';
import { NestingEngine } from './nesting.engine.js';
import { OPTIMIZER_ENGINE } from './optimizer-engine.types.js';

@Module({
  providers: [{ provide: OPTIMIZER_ENGINE, useClass: NestingEngine }],
  exports: [OPTIMIZER_ENGINE],
})
export class OptimizerEngineModule {}