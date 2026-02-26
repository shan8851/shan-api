import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const createSharedResourceColumns = () => ({
  id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  slug: text('slug').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
});

export const uses = pgTable(
  'uses',
  {
    ...createSharedResourceColumns(),
    title: text('title').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    usesSlugUniqueIndex: uniqueIndex('uses_slug_unique_index').on(table.slug),
    usesUpdatedAtIdIndex: index('uses_updated_at_id_index').on(table.updatedAt, table.id),
  }),
);

export const projects = pgTable(
  'projects',
  {
    ...createSharedResourceColumns(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    href: text('href'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    projectsSlugUniqueIndex: uniqueIndex('projects_slug_unique_index').on(table.slug),
    projectsUpdatedAtIdIndex: index('projects_updated_at_id_index').on(table.updatedAt, table.id),
  }),
);

export const posts = pgTable(
  'posts',
  {
    ...createSharedResourceColumns(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    bodyMarkdown: text('body_markdown').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' })
      .notNull(),
    updatedAtSource: timestamp('updated_at_source', {
      withTimezone: true,
      mode: 'date',
    }),
    author: text('author'),
    featured: boolean('featured').notNull().default(false),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    readingTimeText: text('reading_time_text'),
    readingTimeMinutes: real('reading_time_minutes'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    postsSlugUniqueIndex: uniqueIndex('posts_slug_unique_index').on(table.slug),
    postsPublishedAtIdDescIndex: index('posts_published_at_id_desc_index').on(
      table.publishedAt.desc(),
      table.id.desc(),
    ),
    postsUpdatedAtIdIndex: index('posts_updated_at_id_index').on(
      table.updatedAt,
      table.id,
    ),
  }),
);

export const nowEntries = pgTable(
  'now_entries',
  {
    ...createSharedResourceColumns(),
    label: text('label').notNull(),
    text: text('text').notNull(),
    href: text('href'),
    sortOrder: integer('sort_order').notNull().default(0),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    nowEntriesSlugUniqueIndex: uniqueIndex('now_entries_slug_unique_index').on(table.slug),
    nowEntriesUpdatedAtIdIndex: index('now_entries_updated_at_id_index').on(table.updatedAt, table.id),
  }),
);

export const meta = pgTable('meta', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});
