import { Module } from '@nestjs/common';
import { FabricController } from './fabric.controller.js';
import { FabricService } from './fabrics.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';

@Module({
  imports: [StorageModule],
  controllers: [FabricController],
  providers: [FabricService, ShapesEngineClient],
  exports: [FabricService],
})
export class FabricModule {}
