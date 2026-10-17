import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './db/drizzle.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { FabricModule } from './modules/fabrics/fabrics.module.js';
import { StorageModule } from './modules/storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    AuthModule,
    UsersModule,
    FabricModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
