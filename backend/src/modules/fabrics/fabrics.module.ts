import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { FabricController } from './fabric.controller.js';
import { FabricService } from './fabrics.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FabricController],
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
