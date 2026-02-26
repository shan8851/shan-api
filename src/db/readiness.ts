import { sql } from 'drizzle-orm';

import type { DatabaseClient, DatabaseConnection } from './client.js';

type ReadinessCheckState = 'ok' | 'failed';

type ReadinessChecks = {
  database: ReadinessCheckState;
  migrations: ReadinessCheckState;
  query: ReadinessCheckState;
};

export type ReadinessResult = {
  status: 'ready' | 'not_ready';
  checks: ReadinessChecks;
  message?: string;
};

const getInitialReadinessChecks = (): ReadinessChecks => ({
  database: 'failed',
  migrations: 'failed',
  query: 'failed',
});

const checkDatabaseConnectivity = async (
  databasePool: DatabaseConnection['pool'],
): Promise<void> => {
  const databaseClient = await databasePool.connect();
  databaseClient.release();
};

const checkSimpleQueryPath = async (
  databaseClient: DatabaseClient,
): Promise<void> => {
  await databaseClient.execute(sql`select 1 as health_check`);
};

const checkMigrationState = async (
  databaseClient: DatabaseClient,
): Promise<void> => {
  const migrationTableResult = await databaseClient.execute<{
    table_present: boolean;
  }>(sql`
    select exists (
      select 1
      from information_schema.tables
      where table_name = '__drizzle_migrations'
    ) as table_present
  `);

  if (!migrationTableResult.rows[0]?.table_present) {
    throw new Error('__drizzle_migrations table not found');
  }
};

export const checkDatabaseReadiness = async (
  databaseConnection: DatabaseConnection,
): Promise<ReadinessResult> => {
  const readinessChecks = getInitialReadinessChecks();

  try {
    await checkDatabaseConnectivity(databaseConnection.pool);
    readinessChecks.database = 'ok';

    await checkSimpleQueryPath(databaseConnection.client);
    readinessChecks.query = 'ok';

    await checkMigrationState(databaseConnection.client);
    readinessChecks.migrations = 'ok';

    return {
      status: 'ready',
      checks: readinessChecks,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Readiness check failed';

    return {
      status: 'not_ready',
      checks: readinessChecks,
      message: errorMessage,
    };
  }
};
