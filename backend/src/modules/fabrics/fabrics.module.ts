import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { FabricController } from './fabric.controller.js';
import { FabricService } from './fabrics.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule, StorageModule, ConfigModule],
  controllers: [FabricController],
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
