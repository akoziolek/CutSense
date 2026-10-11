import { Module } from '@nestjs/common';
import { FabricController } from './fabric.controller.js';
import { FabricService } from './fabrics.service.js';

@Module({
  controllers: [FabricController],
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
