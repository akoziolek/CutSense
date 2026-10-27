import 'dotenv/config';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, sql } from 'drizzle-orm';
import { NestFactory } from '@nestjs/core';
import {
  StoragePaths,
  StorageService,
} from '../../modules/storage/storage.service.js';
import { DRIZZLE } from '../drizzle.provider.js';
import * as schema from '../schema/schema.js';
import { SeedModule } from './seed.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fabricsAssetsDir = path.join(__dirname, 'assets/fabrics');

const algorithmSeeds = [
  {
    name: 'Bottom-Left Decreasing',
    description:
      'Sorts pieces by area descending before placing pieces at the lowest, leftmost valid coordinate.',
  },
  {
    name: 'Bottom-Left Fill with Rotation',
    description: 'Scans bounding space for the lowest-leftmost hole..',
  },
  {
    name: 'Contour-Guided Bottom-Left',
    description:
      'Slides irregular piece contours directly along positioned polygons to minimize voids.',
  },
];

const patternTagNames = [
  'winter',
  'spring',
  'summer',
  'autumn',
  'dresses',
  'skirts',
  'trousers',
  'blouses',
  'shirts',
  'outerwear',
  'undergarments',
  'accessories',
];

const fabricTagNames = [
  'synthetic',
  'natural',
  'semi-synthetic',
  'cotton',
  'linen',
  'wool',
  'silk',
  'viscose',
  'polyester',
  'knit',
  'woven',
  'cashmere',
  'blend',
  'leather',
  'elastane',
  'corduroy',
  'velvet',
];

const patternTemplates = [
  {
    name: 'Oversized Button-Down Shirt',
    description:
      'Classic oversized shirt with dropped shoulders, cuffs, and a band collar. Ideal for linen and cotton woven fabrics.',
  },
  {
    name: 'Pleated Suit Trousers',
    description:
      'Tailored high-waisted trousers with front pleats, creased legs, and side-seam pockets.',
  },
  {
    name: 'Wrap Midi Dress',
    description: 'Flowy wrap dress with a V-neckline and a flared panel skirt.',
  },
  {
    name: 'Double-Breasted Wool Coat',
    description:
      'Warm tailored coat with wide lapels, full lining, and a back vent. Pattern pieces account for heavy material thickness.',
  },
  {
    name: 'Draped Jersey Blouse',
    description:
      'Fitted top with a draped cowl neckline. Designed for high-stretch viscose knits.',
  },
  {
    name: 'A-Line Pleated Skirt',
    description:
      'Classic A-line skirt with a contoured waistband and a hidden side zipper closure.',
  },
  {
    name: 'Unisex Bomber Jacket',
    description:
      'Sporty outerwear featuring ribbed collar, cuffs, and hem, along with welt pockets.',
  },
  {
    name: 'Linen Drawstring Shorts',
    description:
      'Casual summer shorts with an elasticated drawstring waistband and wide leg openings.',
  },
];

const fabricTemplates = [
  {
    name: 'Premium Organic Cotton',
    description:
      'Plain-weave cotton fabric (160 g/m²). Natural, breathable, ideal for shirts and blouses.',
    width: 1500,
    length: 3000,
    area: 4.5,
  },
  {
    name: 'Stonewashed Linen',
    description:
      '100% natural linen (210 g/m²). Pre-washed relaxed texture, no ironing needed. Great for dresses and shorts.',
    width: 1450,
    length: 2500,
    area: 3.625,
  },
  {
    name: 'Worsted Wool 120S',
    description:
      'High-grade suiting wool (280 g/m²). Crease-resistant and maintains sharp pleats.',
    width: 1500,
    length: 4000,
    area: 6,
  },
  {
    name: 'Natural Mulberry Silk',
    description:
      'Luxury silk satin with high luster (85 g/m²). Requires precise cutting along the grainline.',
    width: 1380,
    length: 2000,
    area: 2.76,
  },
  {
    name: 'Viscose Jersey with Elastane',
    description:
      'Stretch single-jersey knit (220 g/m²). 2-way stretch capacity up to 40%.',
    width: 1600,
    length: 3500,
    area: 5.6,
  },
  {
    name: '11-Cord Cotton Corduroy',
    description:
      'Heavyweight ribbed corduroy (310 g/m²). Requires pattern layout matching nap direction.',
    width: 1400,
    length: 3000,
    area: 4.2,
  },
];

function irregularFabricPolygon(
  variant: number,
  width = 1500,
  length = 3000,
): string {
  const shapes = [
    [
      [200, 0],
      [width - 200, 50],
      [width, 400],
      [width - 100, length / 2],
      [width, length - 300],
      [width - 300, length],
      [300, length - 100],
      [0, length - 400],
      [100, length / 2],
      [0, 300],
      [200, 0],
    ],
    [
      [0, 0],
      [width - 400, 0],
      [width, 300],
      [width, length],
      [0, length],
      [0, 0],
    ],
    [
      [150, 0],
      [width, 0],
      [width - 50, length - 200],
      [200, length],
      [0, length - 150],
      [150, 0],
    ],
  ];

  const points = shapes[variant % shapes.length];
  const formatted = points.map(([x, y]) => `${x} ${y}`).join(', ');
  return `POLYGON((${formatted}))`;
}

function irregularPolygon(variant: number, scale = 1): string {
  const offsetX = (variant % 5) * 20;
  const offsetY = Math.floor(variant / 5) * 15;
  const shapes = [
    // Torso / Front panel
    [
      [0, 0],
      [15, 0],
      [18, 6],
      [15, 9],
      [12, 9],
      [12, 24],
      [3, 24],
      [3, 9],
      [0, 6],
      [0, 0],
    ],
    // Sleeve
    [
      [0, 0],
      [18, 0],
      [15, 9],
      [12, 21],
      [6, 24],
      [3, 15],
      [0, 0],
    ],
    // Trouser leg / Skirt panel
    [
      [0, 0],
      [12, 0],
      [15, 3],
      [12, 15],
      [12, 27],
      [3, 27],
      [6, 12],
      [0, 9],
      [0, 0],
    ],
    // Collar / Gusset
    [
      [0, 0],
      [15, 0],
      [21, 27],
      [3, 24],
      [0, 0],
    ],
  ];

  const points = shapes[variant % shapes.length];
  const formattedPoints = points
    .map(([x, y]) => `${offsetX + x * scale} ${offsetY + y * scale}`)
    .join(', ');

  return `POLYGON((${formattedPoints}))`;
}

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

    console.log('Seeding dictionaries and tags...');

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

    const insertedUsers = await db
      .insert(schema.users)
      .values(
        Array.from({ length: 10 }, (_, i) => ({
          googleId: `google-seed-id-${i + 1}`,
          email: `user${i + 1}@example.com`,
          name: `User${i + 1}`,
          surname: `Test`,
          nickname: `user_${i + 1}`,
        })),
      )
      .returning({ id: schema.users.id });

    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

    await db.insert(schema.patterns).values(
      patternTemplates.map((template, index) => ({
        name: template.name,
        description: template.description,
        size: sizes[index % sizes.length],
        starCount: 0,
        starAverage: '0',
        userId: insertedUsers[index % insertedUsers.length].id,
      })),
    );

    const [users, patterns, patternTagRows, fabricTagRows] = await Promise.all([
      db.select({ id: schema.users.id }).from(schema.users),
      db
        .select({ id: schema.patterns.id, userId: schema.patterns.userId })
        .from(schema.patterns)
        .orderBy(schema.patterns.id),
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

    console.log('Generating irregular fabric sheets (Fabrics)...');
    const fabricValues = await Promise.all(
      fabricTemplates.map(async (template, index) => {
        const userId = users[index % users.length].id;

        const fileNumber = String(index + 1).padStart(2, '0');
        const fileName = `fabric_${fileNumber}.jpg`;
        const filePath = path.join(fabricsAssetsDir, fileName);

        let pictureS3Key: string | null = null;

        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);

          const mockFile = {
            originalname: fileName,
            mimetype: 'image/jpeg',
            buffer,
            size: buffer.length,
          } as Express.Multer.File;

          const folderPath = StoragePaths.fabrics(userId);
          pictureS3Key = await storageService.uploadFile(mockFile, folderPath);
        } else {
          console.warn(`File ${fileName} doesn't exist in${fabricsAssetsDir}.`);
        }

        return {
          name: template.name,
          description: template.description,
          pictureS3Key: pictureS3Key,
          boundary: sql`ST_GeomFromText(${irregularFabricPolygon(index, template.width, template.length)}, 0)`,
          imageWidthCm: template.width,
          imageHeightCm: template.length,
          area: template.area,
          userId,
        };
      }),
    );

    const fabrics = await db
      .insert(schema.fabrics)
      .values(fabricValues)
      .returning({ id: schema.fabrics.id });

    const patternTagIds = new Map<string, number>(
      patternTagRows.map(({ id, name }: { id: number; name: string }) => [
        name,
        id,
      ]),
    );
    const fabricTagIds = new Map<string, number>(
      fabricTagRows.map(({ id, name }: { id: number; name: string }) => [
        name,
        id,
      ]),
    );

    const patternTagLinks: { patternId: number; tagId: number }[] = [];
    patterns.forEach(
      (pattern: { id: number; userId: number }, index: number) => {
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
      },
    );
    if (patternTagLinks.length > 0)
      await db.insert(schema.patternTags).values(patternTagLinks);

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
    if (fabricTagLinks.length > 0)
      await db.insert(schema.fabricTags).values(fabricTagLinks);

    console.log('Generating irregular pattern pieces (Pattern Pieces)...');
    const pieceRows = patterns.flatMap(
      (pattern: { id: number; userId: number }, patternIndex: number) => {
        const piecesCount = 3 + (patternIndex % 3);
        return Array.from({ length: piecesCount }, (_, pieceIndex: number) => ({
          patternId: pattern.id,
          boundary: sql`ST_GeomFromText(${irregularPolygon(patternIndex * 3 + pieceIndex, 10 + (pieceIndex % 3) * 5)}, 0)`,
        }));
      },
    );

    if (pieceRows.length > 0) {
      await db.insert(schema.patternPieces).values(pieceRows);
    }

    const starRows: { patternId: number; userId: number; rating: number }[] =
      [];
    const patternRatings = new Map<number, number[]>();

    patterns.forEach(
      (pattern: { id: number; userId: number }, patternIndex: number) => {
        const ratingCount = 1 + (patternIndex % 3);
        for (let i = 0; i < ratingCount; i++) {
          const user = users[(patternIndex + i + 1) % users.length];
          if (user.id === pattern.userId) continue;

          const rating = 4 + (i % 2); // Ratings 4 or 5
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

    console.log(
      `Success! Seeded: ${users.length} users, ${patterns.length} patterns, ${fabrics.length} fabric sheets, ${pieceRows.length} 2D pieces, and ${favouriteRows.length} pattern favourites.`,
    );
  } finally {
    await app.close();
  }
}

await main();
