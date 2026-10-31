import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { PatternController } from './pattern.controller.js';
import { PatternsService } from './patterns.service.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';

@Module({
  imports: [AuthModule],
  controllers: [PatternController],
  providers: [PatternsService, ShapesEngineClient],
  exports: [PatternsService],
})
export class PatternsModule {}
