import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

type InternalApiKeyHeaderValue = string | string[] | undefined;

const normalizeInternalApiKey = (
  internalApiKeyHeaderValue: InternalApiKeyHeaderValue,
): string | null => {
  if (typeof internalApiKeyHeaderValue === 'string') {
    const trimmedApiKey = internalApiKeyHeaderValue.trim();
    return trimmedApiKey.length > 0 ? trimmedApiKey : null;
  }

  if (Array.isArray(internalApiKeyHeaderValue)) {
    const firstApiKey = internalApiKeyHeaderValue[0]?.trim();
    return firstApiKey && firstApiKey.length > 0 ? firstApiKey : null;
  }

  return null;
};

const sendUnauthorizedResponse = async (
  response: FastifyReply,
): Promise<void> => {
  await response.code(401).send({ error: 'unauthorized' });
};

export const createInternalApiKeyGuard = (
  allowedInternalApiKeys: ReadonlySet<string>,
): preHandlerHookHandler =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const providedInternalApiKey = normalizeInternalApiKey(
      request.headers[INTERNAL_API_KEY_HEADER],
    );

    if (!providedInternalApiKey) {
      await sendUnauthorizedResponse(reply);
      return;
    }

    if (!allowedInternalApiKeys.has(providedInternalApiKey)) {
      await sendUnauthorizedResponse(reply);
    }
  };
