import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { OptimizationController } from './optimization.controller.js';
import { OptimizationsService } from './optimizations.service.js';

@Module({
  imports: [AuthModule],
  controllers: [OptimizationController],
  providers: [OptimizationsService],
  exports: [OptimizationsService],
})
export class OptimizationsModule {}
