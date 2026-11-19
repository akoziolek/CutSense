import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './db/drizzle.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { FabricModule } from './modules/fabrics/fabrics.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { PatternsModule } from './modules/patterns/pattern.module.js';
import { OptimizationsModule } from './modules/optimizations/optimizations.module.js';
import { StatisticsModule } from './modules/statistics/statistics.module.js';
import { SessionGuard } from './modules/auth/guards/session.guard.js';

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
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
