import { Module } from '@nestjs/common';
import { PatternController } from './pattern.controller.js';
import { PatternsService } from './patterns.service.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';
import { StorageService } from '../storage/storage.service.js';
import { NestingEngine } from '../optimizer-engine/nesting.engine.js';

@Module({
  controllers: [PatternController],
  providers: [
    PatternsService,
    ShapesEngineClient,
    StorageService,
    NestingEngine,
  ],
  exports: [PatternsService],
})
export class PatternsModule {}
