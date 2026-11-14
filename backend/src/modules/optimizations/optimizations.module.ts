import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { OptimizerEngineModule } from '../optimizer-engine/optimizer-engine.module.js';
import { OptimizationController } from './optimization.controller.js';
import { OptimizationRunsStore } from './optimization-runs.store.js';
import { OptimizationsService } from './optimizations.service.js';

@Module({
  imports: [AuthModule, OptimizerEngineModule],
  controllers: [OptimizationController],
  providers: [OptimizationsService, OptimizationRunsStore],
  exports: [OptimizationsService],
})
export class OptimizationsModule {}