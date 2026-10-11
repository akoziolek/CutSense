import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './db/drizzle.module.js';
import { FabricModule } from './modules/fabrics/fabrics.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    FabricModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}