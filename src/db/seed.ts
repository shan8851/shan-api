import { loadEnvironment } from '../config/env.js';

import { createDatabaseConnection } from './client.js';
import { meta, nowEntries } from './schema.js';

const seed = async (): Promise<void> => {
  const environment = loadEnvironment();
  const databaseConnection = createDatabaseConnection(environment.databaseUrl);

  const now = new Date();

  try {
    await databaseConnection.client
      .insert(meta)
      .values({
        key: 'global_last_updated',
        value: now.toISOString(),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: meta.key,
        set: {
          value: now.toISOString(),
          updatedAt: now,
        },
      });

    await databaseConnection.client
      .insert(meta)
      .values({
        key: 'now_narrative',
        value:
          'Current loop: ship small AI apps, get usage signal, then improve reliability.',
        updatedAt: now,
      })
      .onConflictDoNothing();

    await databaseConnection.client
      .insert(nowEntries)
      .values({
        slug: 'seed-now-entry',
        label: 'Seed entry',
        text: 'This is a scaffold seed row for first-run verification.',
        href: null,
        sortOrder: 0,
        payload: {},
        updatedAt: now,
      })
      .onConflictDoNothing();
  } finally {
    await databaseConnection.close();
  }
};

void seed();
