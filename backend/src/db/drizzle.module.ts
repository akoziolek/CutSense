import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { drizzleProvider, DRIZZLE } from './drizzle.provider.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [drizzleProvider],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
