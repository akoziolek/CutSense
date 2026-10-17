import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/schema.js'

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDB = NodePgDatabase<typeof schema>;

export const drizzleProvider = {
  provide: DRIZZLE,
  useFactory: (configService: ConfigService) => {
    const connectionString = configService.get<string>('RUNTIME_DATABASE_URL');
    const pool = new Pool({ connectionString });
    return drizzle(pool, { schema });
  },
  inject: [ConfigService],
};