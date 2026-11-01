import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { FabricController } from './fabric.controller.js';
import { FabricService } from './fabrics.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [FabricController],
  providers: [FabricService, ShapesEngineClient],
  exports: [FabricService],
})
export class FabricModule {}
