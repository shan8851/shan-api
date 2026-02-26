import type { FastifyInstance } from 'fastify';

import { createApp } from './app.js';
import { loadEnvironment } from './config/env.js';
import {
  createDatabaseConnection,
  type DatabaseConnection,
} from './db/client.js';

const registerShutdownHooks = (
  app: FastifyInstance,
  databaseConnection: DatabaseConnection,
): void => {
  let shutdownStarted = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;

    app.log.info({ signal }, 'Shutdown signal received');

    await app.close();
    await databaseConnection.close();

    app.log.info('Shutdown complete');
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

const startServer = async (): Promise<void> => {
  const environment = loadEnvironment();
  const databaseConnection = createDatabaseConnection(environment.databaseUrl);
  const app = createApp({
    environment,
    databaseConnection,
  });

  registerShutdownHooks(app, databaseConnection);

  try {
    await app.listen({
      host: '0.0.0.0',
      port: environment.port,
    });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    await databaseConnection.close();
    process.exit(1);
  }
};

void startServer();
