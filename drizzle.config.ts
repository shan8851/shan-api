import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

const databaseUrlForMigrations = process.env.DATABASE_URL_MIGRATIONS;

if (!databaseUrlForMigrations) {
  throw new Error('DATABASE_URL_MIGRATIONS is required for drizzle-kit');
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: databaseUrlForMigrations,
  },
});
