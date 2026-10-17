import {
  pgTable,
  pgEnum,
  bigint,
  varchar,
  integer,
  smallint,
  numeric,
  boolean,
  timestamp,
  primaryKey,
  geometry,
  index,
  doublePrecision
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { postgisPolygon } from './custom-types.js';

// ==========================================
// ENUMS
// ==========================================

export const visibilityLevelEnum = pgEnum('visibility_level', [
  'PUBLIC',
  'PRIVATE',
]);

export const patternSizeEnum = pgEnum('pattern_size', [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
]);

// ==========================================
// TABLES
// ==========================================

export const algorithmTypes = pgTable('algorithm_types', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 35 }).notNull().unique(),
  description: varchar('description', { length: 100 }),
});

export const tagsForPatterns = pgTable('tags_for_patterns', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const tagsForFabrics = pgTable('tags_for_fabrics', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  googleId: varchar('google_id', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  name: varchar('name', { length: 60 }).notNull(),
  surname: varchar('surname', { length: 60 }),
  nickname: varchar('nickname', { length: 64 }).unique(),
  pictureUrl: varchar('picture_url', { length: 2048 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const patterns = pgTable(
  'patterns',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    name: varchar('name', { length: 35 }).notNull(),
    description: varchar('description', { length: 400 }),
    size: patternSizeEnum('size').notNull(),
    visibility: visibilityLevelEnum('visibility').notNull().default('PRIVATE'),
    starCount: integer('star_count').notNull().default(0),
    starAverage: numeric('star_average', { precision: 3, scale: 2 })
      .notNull()
      .default('0'),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('patterns_user_id_idx').on(table.userId)],
);

export const patternPieces = pgTable(
  'pattern_pieces',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    patternId: bigint('pattern_id', { mode: 'number' })
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    // polygon on Cartesian coordinate system
    boundary: postgisPolygon('boundary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('pattern_pieces_pattern_id_idx').on(table.patternId),
    index('pattern_pieces_boundary_idx').using('gist', table.boundary),
  ],
);

export const fabrics = pgTable(
  'fabrics',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    name: varchar('name', { length: 35 }).notNull(),
    description: varchar('description', { length: 400 }),
    pictureS3Key: varchar('picture_s3_key', { length: 512 }).notNull(),
    boundary: postgisPolygon('boundary').notNull(),
    area: doublePrecision('area').notNull(),
    isFavourite: boolean('is_favourite').notNull().default(false),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('fabrics_user_id_idx').on(table.userId),
    index('fabrics_boundary_idx').using('gist', table.boundary),
  ],
);

export const placedPieces = pgTable(
  'placed_pieces',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    patternPieceId: bigint('pattern_piece_id', { mode: 'number' })
      .notNull()
      .references(() => patternPieces.id, { onDelete: 'cascade' }),
    optimizationResultId: bigint('optimization_result_id', { mode: 'number' })
      .notNull()
      .references(() => optimizationResults.id, { onDelete: 'cascade' }),
    rotationAngle: integer('rotation_angle').notNull(),
    isMirrored: boolean('is_mirrored').notNull(),
    placement: geometry('placement', {
      type: 'point',
      mode: 'xy',
      srid: 0,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('placed_pieces_pattern_piece_id_idx').on(table.patternPieceId),
    index('placed_pieces_optimization_result_id_idx').on(
      table.optimizationResultId,
    ),
    index('placed_pieces_placement_idx').using('gist', table.placement),
  ],
);

export const patternTags = pgTable(
  'pattern_tags',
  {
    patternId: bigint('pattern_id', { mode: 'number' })
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    tagId: bigint('tag_id', { mode: 'number' })
      .notNull()
      .references(() => tagsForPatterns.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.patternId, table.tagId] }),
    index('pattern_tags_tag_id_idx').on(table.tagId),
  ],
);

export const patternStars = pgTable(
  'pattern_stars',
  {
    patternId: bigint('pattern_id', { mode: 'number' })
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: smallint('rating').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.patternId, table.userId] }),
    index('pattern_stars_user_id_idx').on(table.userId),
  ],
);

export const patternFavourites = pgTable(
  'pattern_favourites',
  {
    patternId: bigint('pattern_id', { mode: 'number' })
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.patternId, table.userId] }),
    index('pattern_favourites_user_id_idx').on(table.userId),
  ],
);

export const fabricTags = pgTable(
  'fabric_tags',
  {
    fabricId: bigint('fabric_id', { mode: 'number' })
      .notNull()
      .references(() => fabrics.id, { onDelete: 'cascade' }),
    tagId: bigint('tag_id', { mode: 'number' })
      .notNull()
      .references(() => tagsForFabrics.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.fabricId, table.tagId] }),
    index('fabric_tags_tag_id_idx').on(table.tagId),
  ],
);

export const optimizationResults = pgTable(
  'optimization_results',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    name: varchar('name', { length: 35 }).notNull(),
    patternId: bigint('pattern_id', { mode: 'number' })
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    algorithmId: bigint('algorithm_id', { mode: 'number' })
      .notNull()
      .references(() => algorithmTypes.id, { onDelete: 'restrict' }),
    fabricWidth: integer('fabric_width'),
    fabricLength: integer('fabric_length'),
    customFabricId: bigint('custom_fabric_id', { mode: 'number' }).references(
      () => fabrics.id,
      { onDelete: 'cascade' },
    ),
    seamAllowance: integer('seam_allowance').notNull(),
    cuttingAllowance: integer('cutting_allowance').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('optimization_results_pattern_id_idx').on(table.patternId),
    index('optimization_results_algorithm_id_idx').on(table.algorithmId),
    index('optimization_results_custom_fabric_id_idx').on(table.customFabricId),
  ],
);

// ==========================================
// DRIZZLE RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  patterns: many(patterns),
  fabrics: many(fabrics),
  patterns_stars: many(patternStars),
  favourite_patterns: many(patternFavourites),
}));

export const patternsRelations = relations(patterns, ({ one, many }) => ({
  user: one(users, {
    fields: [patterns.userId],
    references: [users.id],
  }),
  pieces: many(patternPieces),
  tags: many(patternTags),
  stars: many(patternStars),
  optimizationResults: many(optimizationResults),
  favoritedBy: many(patternFavourites),
}));

export const patternPiecesRelations = relations(
  patternPieces,
  ({ one, many }) => ({
    pattern: one(patterns, {
      fields: [patternPieces.patternId],
      references: [patterns.id],
    }),
    placedPieces: many(placedPieces),
  }),
);

export const patternFavouritesRelations = relations(
  patternFavourites,
  ({ one }) => ({
    user: one(users, {
      fields: [patternFavourites.userId],
      references: [users.id],
    }),
    pattern: one(patterns, {
      fields: [patternFavourites.patternId],
      references: [patterns.id],
    }),
  }),
);

export const tagsForPatternsRelations = relations(
  tagsForPatterns,
  ({ many }) => ({
    patterns: many(patternTags),
  }),
);

export const patternTagsRelations = relations(patternTags, ({ one }) => ({
  pattern: one(patterns, {
    fields: [patternTags.patternId],
    references: [patterns.id],
  }),
  tag: one(tagsForPatterns, {
    fields: [patternTags.tagId],
    references: [tagsForPatterns.id],
  }),
}));

export const patternStarsRelations = relations(patternStars, ({ one }) => ({
  pattern: one(patterns, {
    fields: [patternStars.patternId],
    references: [patterns.id],
  }),
  user: one(users, {
    fields: [patternStars.userId],
    references: [users.id],
  }),
}));

export const fabricsRelations = relations(fabrics, ({ one, many }) => ({
  user: one(users, {
    fields: [fabrics.userId],
    references: [users.id],
  }),
  tags: many(fabricTags),
  optimizationResults: many(optimizationResults),
}));

export const tagsForFabricsRelations = relations(
  tagsForFabrics,
  ({ many }) => ({
    fabrics: many(fabricTags),
  }),
);

export const fabricTagsRelations = relations(fabricTags, ({ one }) => ({
  fabric: one(fabrics, {
    fields: [fabricTags.fabricId],
    references: [fabrics.id],
  }),
  tag: one(tagsForFabrics, {
    fields: [fabricTags.tagId],
    references: [tagsForFabrics.id],
  }),
}));

export const algorithmTypesRelations = relations(
  algorithmTypes,
  ({ many }) => ({
    optimizationResults: many(optimizationResults),
  }),
);

export const optimizationResultsRelations = relations(
  optimizationResults,
  ({ one, many }) => ({
    pattern: one(patterns, {
      fields: [optimizationResults.patternId],
      references: [patterns.id],
    }),
    algorithm: one(algorithmTypes, {
      fields: [optimizationResults.algorithmId],
      references: [algorithmTypes.id],
    }),
    customFabric: one(fabrics, {
      fields: [optimizationResults.customFabricId],
      references: [fabrics.id],
    }),
    placedPieces: many(placedPieces),
  }),
);

export const placedPiecesRelations = relations(placedPieces, ({ one }) => ({
  patternPiece: one(patternPieces, {
    fields: [placedPieces.patternPieceId],
    references: [patternPieces.id],
  }),
  optimizationResult: one(optimizationResults, {
    fields: [placedPieces.optimizationResultId],
    references: [optimizationResults.id],
  }),
}));
