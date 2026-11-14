import * as schema from '../../schema/schema.js';
import {
  algorithmSeeds,
  fabricTagNames,
  patternTagNames,
} from '../data/constants.data.js';

export async function seedDictionaries(db: any) {
  await db
    .insert(schema.algorithmTypes)
    .values(algorithmSeeds)
    .onConflictDoNothing({ target: schema.algorithmTypes.name });

  await db
    .insert(schema.tagsForPatterns)
    .values(patternTagNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.tagsForPatterns.name });

  await db
    .insert(schema.tagsForFabrics)
    .values(fabricTagNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.tagsForFabrics.name });

  await db.insert(schema.users).values(
    Array.from({ length: 10 }, (_, i) => ({
      googleId: `google-seed-id-${i + 1}`,
      email: `user${i + 1}@example.com`,
      name: `User${i + 1}`,
      surname: `Test`,
      nickname: `user_${i + 1}`,
    })),
  );

  const [users, patternTagRows, fabricTagRows] = await Promise.all([
    db.select({ id: schema.users.id }).from(schema.users),
    db
      .select({
        id: schema.tagsForPatterns.id,
        name: schema.tagsForPatterns.name,
      })
      .from(schema.tagsForPatterns),
    db
      .select({
        id: schema.tagsForFabrics.id,
        name: schema.tagsForFabrics.name,
      })
      .from(schema.tagsForFabrics),
  ]);

  return { users, patternTagRows, fabricTagRows };
}
