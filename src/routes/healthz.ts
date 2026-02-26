import type { FastifyInstance } from 'fastify';

export const registerHealthzRoute = (app: FastifyInstance): void => {
  app.get('/healthz', async () => ({ status: 'ok' }));
};
