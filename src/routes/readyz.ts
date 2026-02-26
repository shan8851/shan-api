import type { FastifyInstance, preHandlerHookHandler } from 'fastify';

import type { ReadinessResult } from '../db/readiness.js';

export type ReadyzRouteOptions = {
  preHandler: preHandlerHookHandler;
  checkReadiness: () => Promise<ReadinessResult>;
};

export const registerReadyzRoute = (
  app: FastifyInstance,
  routeOptions: ReadyzRouteOptions,
): void => {
  app.get(
    '/readyz',
    {
      preHandler: routeOptions.preHandler,
    },
    async (_request, reply): Promise<void> => {
      const readinessResult = await routeOptions.checkReadiness();
      const statusCode = readinessResult.status === 'ready' ? 200 : 503;

      await reply.code(statusCode).send(readinessResult);
    },
  );
};
