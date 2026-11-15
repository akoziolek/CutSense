import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './db/drizzle.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { FabricModule } from './modules/fabrics/fabrics.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { PatternsModule } from './modules/patterns/pattern.module.js';
import { OptimizationsModule } from './modules/optimizations/optimizations.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    AuthModule,
    UsersModule,
    FabricModule,
    PatternsModule,
    StorageModule,
    OptimizationsModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
