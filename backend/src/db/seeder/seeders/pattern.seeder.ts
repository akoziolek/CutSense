import * as fs from 'fs';
import path from 'path';
import { eq, sql } from 'drizzle-orm';
import {
  StoragePaths,
  StorageService,
} from '../../../modules/storage/storage.service.js';
import * as schema from '../../schema/schema.js';
import {
  patternTemplates,
  SEED_PATTERN_PIECES_BY_SHEET,
} from '../data/patterns.data.js';

export async function seedPatterns(
  db: any,
  storageService: StorageService,
  users: { id: number }[],
  patternTagRows: { id: number; name: string }[],
  patternsAssetsDir: string,
) {
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

  await db.insert(schema.patterns).values(
    patternTemplates.map((template, index) => ({
      name: template.name,
      description: template.description,
      size: sizes[index % sizes.length],
      visibility: template.visibility ?? 'PRIVATE',
      starCount: 0,
      starAverage: '0',
      userId: users[index % users.length].id,
    })),
  );

  const patterns = await db
    .select({ id: schema.patterns.id, userId: schema.patterns.userId })
    .from(schema.patterns)
    .orderBy(schema.patterns.id);

  const patternTagIds = new Map<string, number>(
    patternTagRows.map(({ id, name }) => [name, id]),
  );

  const patternTagNames = Array.from(patternTagIds.keys());
  const patternTagLinks: { patternId: number; tagId: number }[] = [];

  patterns.forEach((pattern: { id: number; userId: number }, index: number) => {
    const tagNames = [
      patternTagNames[index % patternTagNames.length],
      patternTagNames[(index + 3) % patternTagNames.length],
    ];
    tagNames.forEach((tagName: string) => {
      const tagId = patternTagIds.get(tagName);
      if (tagId !== undefined) {
        patternTagLinks.push({ patternId: pattern.id, tagId });
      }
    });
  });

  if (patternTagLinks.length > 0) {
    await db.insert(schema.patternTags).values(patternTagLinks);
  }

  const patternImageRows: {
    patternId: number;
    pictureS3Key: string;
    imageWidthMm: number;
    imageHeightMm: number;
    orderIndex: number;
  }[] = [];

  for (let pIndex = 0; pIndex < patterns.length; pIndex++) {
    const pattern = patterns[pIndex];
    const template = patternTemplates[pIndex];

    const fileNumber = String(pIndex + 1).padStart(2, '0');
    const fileName = `sheet_${fileNumber}.jpg`;
    const filePath = path.join(patternsAssetsDir, fileName);

    let pictureS3Key: string | null = null;

    if (fs.existsSync(filePath)) {
      try {
        const buffer = fs.readFileSync(filePath);
        const mockFile = {
          originalname: fileName,
          mimetype: 'image/jpeg',
          buffer,
          size: buffer.length,
        } as Express.Multer.File;

        pictureS3Key = await storageService.uploadFile(
          mockFile,
          StoragePaths.patterns(pattern.userId),
        );
      } catch (uploadError) {
        console.warn(
          `Warning: Upload failed for ${fileName} (pattern: ${pattern.id})`,
          uploadError,
        );
      }
    }

    patternImageRows.push({
      patternId: pattern.id,
      pictureS3Key:
        pictureS3Key ??
        `users/${pattern.userId}/patterns/seed_pattern_${pattern.id}_1.jpg`,
      imageWidthMm: template.imageWidthMm,
      imageHeightMm: template.imageHeightMm,
      orderIndex: 0,
    });
  }

  const insertedPatternImages = await db
    .insert(schema.patternImages)
    .values(patternImageRows)
    .returning({
      id: schema.patternImages.id,
      patternId: schema.patternImages.patternId,
      orderIndex: schema.patternImages.orderIndex,
    });

  const pieceRows: {
    patternImageId: number;
    boundary: ReturnType<typeof sql>;
    grainline: number;
    normalCount: number;
    mirroredCount: number;
  }[] = [];

  for (let i = 0; i < insertedPatternImages.length; i++) {
    const img = insertedPatternImages[i];
    const fileNumber = String(i  + 1).padStart(2, '0');
    const fileName = `sheet_${fileNumber}.jpg`;

    const boundaries =
      SEED_PATTERN_PIECES_BY_SHEET[fileName] ??
      SEED_PATTERN_PIECES_BY_SHEET['sheet_01.jpg'];

    boundaries.forEach((boundary, pieceIndex) => {
      pieceRows.push({
        patternImageId: Number(img.id),
        boundary: sql`ST_GeomFromWKB(decode(${boundary}, 'hex'))`,
        grainline: Math.floor(Math.random() * 360),
        normalCount: 1,
        mirroredCount: pieceIndex % 2 === 0 ? 1 : 0,
      });
    });
  }

  if (pieceRows.length > 0) {
    await db.insert(schema.patternPieces).values(pieceRows);
  }

  const starRows: { patternId: number; userId: number; rating: number }[] = [];
  const patternRatings = new Map<number, number[]>();

  patterns.forEach(
    (pattern: { id: number; userId: number }, patternIndex: number) => {
      const ratingCount = 1 + (patternIndex % 3);
      const ratedUserIds = new Set<number>([pattern.userId]);

      for (
        let i = 0;
        i < users.length && ratedUserIds.size - 1 < ratingCount;
        i++
      ) {
        const user = users[(patternIndex + i + 1) % users.length];

        if (ratedUserIds.has(user.id)) continue;

        ratedUserIds.add(user.id);
        const rating = 4 + (i % 2);

        starRows.push({ patternId: pattern.id, userId: user.id, rating });

        const current = patternRatings.get(pattern.id) ?? [];
        current.push(rating);
        patternRatings.set(pattern.id, current);
      }
    },
  );

  if (starRows.length > 0)
    await db.insert(schema.patternStars).values(starRows);

  const favouriteRows: { patternId: number; userId: number }[] = [];
  patterns.forEach(
    (pattern: { id: number; userId: number }, patternIndex: number) => {
      const favouriteCount = Math.min(1 + (patternIndex % 3), users.length);
      for (let i = 0; i < favouriteCount; i++) {
        const user = users[(patternIndex + i) % users.length];
        favouriteRows.push({ patternId: pattern.id, userId: user.id });
      }
    },
  );

  if (favouriteRows.length > 0)
    await db.insert(schema.patternFavourites).values(favouriteRows);

  for (const pattern of patterns) {
    const ratings = patternRatings.get(pattern.id) ?? [];
    const starAverage =
      ratings.length === 0
        ? '0'
        : (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
    await db
      .update(schema.patterns)
      .set({ starCount: ratings.length, starAverage })
      .where(eq(schema.patterns.id, pattern.id));
  }

  return {
    patterns,
    piecesCount: pieceRows.length,
    favouritesCount: favouriteRows.length,
  };
}
