import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShapesEngineClient } from './shapes-engine.client.js';

@Module({
  imports: [ConfigModule],
  providers: [ShapesEngineClient],
  exports: [ShapesEngineClient],
})
export class ShapesEngineModule {}
