import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export type DatabaseClient = NodePgDatabase<typeof schema>;

export type DatabaseConnection = {
  readonly client: DatabaseClient;
  readonly pool: Pool;
  close: () => Promise<void>;
};

export const createDatabaseConnection = (
  connectionString: string,
): DatabaseConnection => {
  const pool = new Pool({ connectionString });
  const client = drizzle(pool, { schema });

  const close = async (): Promise<void> => {
    await pool.end();
  };

  return {
    client,
    pool,
    close,
  };
};
