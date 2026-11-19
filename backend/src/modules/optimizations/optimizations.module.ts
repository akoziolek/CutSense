import { Module } from '@nestjs/common';
import { OptimizerEngineModule } from '../optimizer-engine/optimizer-engine.module.js';
import { OptimizationController } from './optimizations.controller.js';
import { OptimizationRunsStore } from './optimization-runs.store.js';
import { OptimizationsService } from './optimizations.service.js';
import { FabricModule } from '../fabrics/fabrics.module.js';
import { PatternsModule } from '../patterns/pattern.module.js';
import { OptimizationPdfService } from './pdf/optimization-pdf.service.js';

@Module({
  imports: [OptimizerEngineModule, FabricModule, PatternsModule],
  controllers: [OptimizationController],
  providers: [
    OptimizationsService,
    OptimizationRunsStore,
    OptimizationPdfService,
  ],
  exports: [OptimizationsService],
})
export class OptimizationsModule {}
