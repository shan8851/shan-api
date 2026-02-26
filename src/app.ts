import Fastify, { type FastifyInstance } from 'fastify';
import type { Registry } from 'prom-client';

import { createInternalApiKeyGuard } from './auth/internalApiKeyAuth.js';
import type { AppEnvironment } from './config/env.js';
import type { DatabaseConnection } from './db/client.js';
import { checkDatabaseReadiness, type ReadinessResult } from './db/readiness.js';
import { createMetricsRegistry } from './metrics/registry.js';
import { registerHealthzRoute } from './routes/healthz.js';
import { registerMetricsRoute } from './routes/metrics.js';
import { registerReadyzRoute } from './routes/readyz.js';
import { registerNowRoute } from './routes/v1/now.js';
import { registerProjectsRoute } from './routes/v1/projects.js';
import { registerUsesRoute } from './routes/v1/uses.js';

export type CreateAppOptions = {
  environment: AppEnvironment;
  databaseConnection: DatabaseConnection;
  metricsRegistry?: Registry;
  readyzCheck?: () => Promise<ReadinessResult>;
};

export const createApp = (createAppOptions: CreateAppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });

  const metricsRegistry =
    createAppOptions.metricsRegistry ?? createMetricsRegistry();
  const internalApiKeyGuard = createInternalApiKeyGuard(
    createAppOptions.environment.internalApiKeySet,
  );

  const readyzCheck =
    createAppOptions.readyzCheck ??
    (() => checkDatabaseReadiness(createAppOptions.databaseConnection));

  registerHealthzRoute(app);
  registerNowRoute(app, createAppOptions.databaseConnection.client);
  registerUsesRoute(app, createAppOptions.databaseConnection.client);
  registerProjectsRoute(app, createAppOptions.databaseConnection.client);
  registerReadyzRoute(app, {
    preHandler: internalApiKeyGuard,
    checkReadiness: readyzCheck,
  });
  registerMetricsRoute(app, {
    preHandler: internalApiKeyGuard,
    metricsRegistry,
  });

  return app;
};
