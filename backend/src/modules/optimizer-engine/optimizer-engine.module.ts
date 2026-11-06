import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OPTIMIZER_ENGINE } from './optimizer-engine.types.js';
import { ExeEngine } from './exe.engine.js';          // version 1
// import { ForkedAddonEngine } from './forked-addon.engine.js';   // version 2

@Module({
  imports: [ConfigModule],
  providers: [{ provide: OPTIMIZER_ENGINE, useClass: ExeEngine }], // or ForkedAddonEngine
  exports: [OPTIMIZER_ENGINE],
})
export class OptimizerEngineModule {}