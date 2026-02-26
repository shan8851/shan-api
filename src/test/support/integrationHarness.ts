import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { FastifyInstance } from 'fastify';
import { resolve } from 'node:path';

import { createApp } from '../../app.js';
import { parseEnvironment, type AppEnvironment } from '../../config/env.js';
import {
  createDatabaseConnection,
  type DatabaseConnection,
} from '../../db/client.js';

export type IntegrationHarness = {
  app: FastifyInstance;
  databaseConnection: DatabaseConnection;
  environment: AppEnvironment;
  validInternalApiKey: string;
  resetDatabase: () => Promise<void>;
  stop: () => Promise<void>;
};

const VALID_INTERNAL_API_KEY = 'test-internal-api-key';

const getTruncateTablesQuery = (): string => `
  TRUNCATE TABLE
    uses,
    projects,
    posts,
    now_entries,
    meta
  RESTART IDENTITY CASCADE;
`;

const loadTestEnvironment = (
  databaseConnectionString: string,
): AppEnvironment =>
  parseEnvironment({
    DATABASE_URL: databaseConnectionString,
    DATABASE_URL_MIGRATIONS: databaseConnectionString,
    INTERNAL_API_KEYS: `${VALID_INTERNAL_API_KEY},test-next-key`,
    PORT: '3000',
  });

export const createIntegrationHarness = async (): Promise<IntegrationHarness> => {
  const postgresContainer: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine',
  ).start();

  const databaseConnectionString = postgresContainer.getConnectionUri();
  const environment = loadTestEnvironment(databaseConnectionString);
  const databaseConnection = createDatabaseConnection(databaseConnectionString);

  await migrate(databaseConnection.client, {
    migrationsFolder: resolve(process.cwd(), 'drizzle'),
  });

  const app = createApp({
    environment,
    databaseConnection,
  });

  const resetDatabase = async (): Promise<void> => {
    await databaseConnection.pool.query(getTruncateTablesQuery());
  };

  const stop = async (): Promise<void> => {
    await app.close();
    await databaseConnection.close();
    await postgresContainer.stop();
  };

  return {
    app,
    databaseConnection,
    environment,
    validInternalApiKey: VALID_INTERNAL_API_KEY,
    resetDatabase,
    stop,
  };
};
