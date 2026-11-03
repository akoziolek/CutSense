import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { PatternController } from './pattern.controller.js';
import { PatternsService } from './patterns.service.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';
import { StorageService } from '../storage/storage.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PatternController],
  providers: [PatternsService, ShapesEngineClient, StorageService],
  exports: [PatternsService],
})
export class PatternsModule {}
