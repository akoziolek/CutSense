import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seed } from 'drizzle-seed';
import { Pool } from 'pg';
import * as schema from './schema.js';

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
  },
  {
    name: 'Stonewashed Linen',
    description:
      '100% natural linen (210 g/m²). Pre-washed relaxed texture, no ironing needed. Great for dresses and shorts.',
    width: 1450,
    length: 2500,
  },
  {
    name: 'Worsted Wool 120S',
    description:
      'High-grade suiting wool (280 g/m²). Crease-resistant and maintains sharp pleats.',
    width: 1500,
    length: 4000,
  },
  {
    name: 'Natural Mulberry Silk',
    description:
      'Luxury silk satin with high luster (85 g/m²). Requires precise cutting along the grainline.',
    width: 1380,
    length: 2000,
  },
  {
    name: 'Viscose Jersey with Elastane',
    description:
      'Stretch single-jersey knit (220 g/m²). 2-way stretch capacity up to 40%.',
    width: 1600,
    length: 3500,
  },
  {
    name: '11-Cord Cotton Corduroy',
    description:
      'Heavyweight ribbed corduroy (310 g/m²). Requires pattern layout matching nap direction.',
    width: 1400,
    length: 3000,
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
  const connectionString = process.env.RUNTIME_DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set RUNTIME_DATABASE_URL to seed the database.');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
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

    await seed(
      db,
      {
        users: schema.users,
        patterns: schema.patterns,
      },
      { seed: 20261010 },
    ).refine((funcs) => ({
      users: {
        count: 10,
        columns: {
          email: funcs.email(),
          name: funcs.firstName(),
          surname: funcs.lastName(),
          nickname: funcs.string({ isUnique: true }),
        },
      },
      patterns: {
        count: 16,
        columns: {
          name: funcs.valuesFromArray({
            values: patternTemplates.map((p) => p.name),
          }),
          description: funcs.valuesFromArray({
            values: patternTemplates.map((p) => p.description),
          }),
          size: funcs.valuesFromArray({ values: ['XS', 'S', 'M', 'L', 'XL'] }),
          starCount: funcs.default({ defaultValue: 0 }),
          starAverage: funcs.default({ defaultValue: '0' }),
        },
      },
    }));

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
    const fabrics = await db
      .insert(schema.fabrics)
      .values(
        fabricTemplates.map((template, index) => ({
          name: template.name,
          description: template.description,
          boundary: sql`ST_GeomFromText(${irregularFabricPolygon(index, template.width, template.width)}, 0)`,
          userId: users[index % users.length].id,
        })),
      )
      .returning({ id: schema.fabrics.id });

    const patternTagIds = new Map(
      patternTagRows.map(({ id, name }) => [name, id]),
    );
    const fabricTagIds = new Map(
      fabricTagRows.map(({ id, name }) => [name, id]),
    );

    const patternTagLinks: { patternId: number; tagId: number }[] = [];
    patterns.forEach((pattern, index) => {
      const tagNames = [
        patternTagNames[index % patternTagNames.length],
        patternTagNames[(index + 3) % patternTagNames.length],
      ];
      tagNames.forEach((tagName) => {
        const tagId = patternTagIds.get(tagName);
        if (tagId !== undefined)
          patternTagLinks.push({ patternId: pattern.id, tagId });
      });
    });
    if (patternTagLinks.length > 0)
      await db.insert(schema.patternTags).values(patternTagLinks);

    const fabricTagLinks: { fabricId: number; tagId: number }[] = [];
    fabrics.forEach((fabric, index) => {
      const tagNames = [
        fabricTagNames[index % fabricTagNames.length],
        fabricTagNames[(index + 2) % fabricTagNames.length],
      ];
      tagNames.forEach((tagName) => {
        const tagId = fabricTagIds.get(tagName);
        if (tagId !== undefined)
          fabricTagLinks.push({ fabricId: fabric.id, tagId });
      });
    });
    if (fabricTagLinks.length > 0)
      await db.insert(schema.fabricTags).values(fabricTagLinks);

    console.log('Generating irregular pattern pieces (Pattern Pieces)...');
    const pieceRows = patterns.flatMap((pattern, patternIndex) => {
      const piecesCount = 3 + (patternIndex % 3); // 3 to 5 pieces per garment pattern
      return Array.from({ length: piecesCount }, (_, pieceIndex) => ({
        patternId: pattern.id,
        boundary: sql`ST_GeomFromText(${irregularPolygon(patternIndex * 3 + pieceIndex, 10 + (pieceIndex % 3) * 5)}, 0)`,
      }));
    });

    if (pieceRows.length > 0) {
      await db.insert(schema.patternPieces).values(pieceRows);
    }

    const starRows: { patternId: number; userId: number; rating: number }[] =
      [];
    const patternRatings = new Map<number, number[]>();

    patterns.forEach((pattern, patternIndex) => {
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
    });

    if (starRows.length > 0)
      await db.insert(schema.patternStars).values(starRows);

    const favouriteRows: { patternId: number; userId: number }[] = [];
    patterns.forEach((pattern, patternIndex) => {
      const favouriteCount = Math.min(1 + (patternIndex % 3), users.length);
      for (let i = 0; i < favouriteCount; i++) {
        const user = users[(patternIndex + i) % users.length];
        favouriteRows.push({ patternId: pattern.id, userId: user.id });
      }
    });

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
    await pool.end();
  }
}

await main();
