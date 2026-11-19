import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { NestFactory } from '@nestjs/core';
import { StorageService } from '../../modules/storage/storage.service.js';
import { DRIZZLE } from '../drizzle.provider.js';
import * as schema from '../schema/schema.js';
import { SeedModule } from './seed.module.js';

import { seedDictionaries } from './seeders/dictionary.seeder.js';
import { seedFabrics } from './seeders/fabric.seeder.js';
import { seedPatterns } from './seeders/pattern.seeder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fabricsAssetsDir = path.join(__dirname, 'assets/fabrics');
const patternsAssetsDir = path.join(__dirname, 'assets/patterns');

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule);

  try {
    const db = app.get(DRIZZLE);
    const storageService = app.get(StorageService);

    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .limit(1);

    if (existingUser) {
      console.info(
        'Database already contains data – skipping demo data generation.',
      );
      return;
    }

    console.log('1. Seeding dictionaries, tags & users...');
    const { users, patternTagRows, fabricTagRows } = await seedDictionaries(db);

    console.log('2. Seeding fabrics...');
    const fabrics = await seedFabrics(
      db,
      storageService,
      users,
      fabricTagRows,
      fabricsAssetsDir,
    );

    console.log('3. Seeding patterns, pieces, stars and favourites...');
    const { patterns, piecesCount, favouritesCount } = await seedPatterns(
      db,
      storageService,
      users,
      patternTagRows,
      patternsAssetsDir,
    );

    console.log(
      `Success! Seeded: ${users.length} users, ${patterns.length} patterns, ${fabrics.length} fabric sheets, ${piecesCount} 2D pieces, and ${favouritesCount} pattern favourites.`,
    );
  } finally {
    await app.close();
  }
}

await main();
