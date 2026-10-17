import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.MIGRATOR_DATABASE_URL!,
  },
});
