import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import type { Registry } from 'prom-client';

export type MetricsRouteOptions = {
  preHandler: preHandlerHookHandler;
  metricsRegistry: Registry;
};

export const registerMetricsRoute = (
  app: FastifyInstance,
  routeOptions: MetricsRouteOptions,
): void => {
  app.get(
    '/metrics',
    {
      preHandler: routeOptions.preHandler,
    },
    async (_request, reply): Promise<void> => {
      const metricsPayload = await routeOptions.metricsRegistry.metrics();

      await reply
        .header('content-type', routeOptions.metricsRegistry.contentType)
        .send(metricsPayload);
    },
  );
};
