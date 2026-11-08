import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ForkedAddonEngine } from './forked-addon.engine.js';
import { OPTIMIZER_ENGINE } from './optimizer-engine.types.js';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: OPTIMIZER_ENGINE, useClass: ForkedAddonEngine }],
  exports: [OPTIMIZER_ENGINE],
})
export class OptimizerEngineModule {}