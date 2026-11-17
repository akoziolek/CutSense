import * as fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import {
  StoragePaths,
  StorageService,
} from '../../../modules/storage/storage.service.js';
import * as schema from '../../schema/schema.js';
import {
  fabricTemplates,
  SEED_FABRIC_BOUNDARIES,
} from '../data/fabrics.data.js';

export async function seedFabrics(
  db: any,
  storageService: StorageService,
  users: { id: number }[],
  fabricTagRows: { id: number; name: string }[],
  fabricsAssetsDir: string,
) {
  const fabricValues = await Promise.all(
    fabricTemplates.map(async (template, index) => {
      const userId = users[index % users.length].id;

      const fileNumber = String(index + 1).padStart(2, '0');
      const fileName = `fabric_${fileNumber}.jpg`;
      const filePath = path.join(fabricsAssetsDir, fileName);

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
            StoragePaths.fabrics(userId),
          );
        } catch (uploadError) {
          console.warn(
            `Warning: Failed to upload ${fileName} to S3, skipping image.`,
            uploadError,
          );
        }
      }

      const boundary =
        SEED_FABRIC_BOUNDARIES[fileName] ??
        `POLYGON((0 0, ${template.imageWidthMm} 0, ${template.imageWidthMm} ${template.imageHeightMm}, 0 ${template.imageHeightMm}, 0 0))`;

      const isHex = !boundary.startsWith('POLYGON');

      return {
        name: template.name,
        description: template.description,
        pictureS3Key,
        boundary: isHex
          ? sql`ST_GeomFromWKB(decode(${boundary}, 'hex'))`
          : sql`ST_GeomFromText(${boundary}, 0)`,
        grainline: Math.floor(Math.random() * 360),
        imageWidthMm: template.imageWidthMm,
        imageHeightMm: template.imageHeightMm,
        areaMm2: template.areaMm2,
        userId,
      };
    }),
  );

  const fabrics = await db
    .insert(schema.fabrics)
    .values(fabricValues)
    .returning({ id: schema.fabrics.id });

  const fabricTagIds = new Map<string, number>(
    fabricTagRows.map(({ id, name }) => [name, id]),
  );

  const fabricTagNames = Array.from(fabricTagIds.keys());
  const fabricTagLinks: { fabricId: number; tagId: number }[] = [];

  fabrics.forEach((fabric: { id: number }, index: number) => {
    const tagNames = [
      fabricTagNames[index % fabricTagNames.length],
      fabricTagNames[(index + 2) % fabricTagNames.length],
    ];
    tagNames.forEach((tagName: string) => {
      const tagId = fabricTagIds.get(tagName);
      if (tagId !== undefined) {
        fabricTagLinks.push({ fabricId: fabric.id, tagId });
      }
    });
  });

  if (fabricTagLinks.length > 0) {
    await db.insert(schema.fabricTags).values(fabricTagLinks);
  }

  return fabrics;
}
