import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    DATABASE_URL_MIGRATIONS: z.url(),
    INTERNAL_API_KEYS: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3000),
  })
  .transform((parsedEnvironmentValues) => {
    const internalApiKeys = parsedEnvironmentValues.INTERNAL_API_KEYS.split(',')
      .map((apiKey) => apiKey.trim())
      .filter((apiKey) => apiKey.length > 0);

    if (internalApiKeys.length === 0) {
      throw new Error('INTERNAL_API_KEYS must include at least one non-empty key');
    }

    return {
      databaseUrl: parsedEnvironmentValues.DATABASE_URL,
      databaseUrlMigrations: parsedEnvironmentValues.DATABASE_URL_MIGRATIONS,
      internalApiKeys: Object.freeze(internalApiKeys),
      internalApiKeySet: new Set(internalApiKeys),
      port: parsedEnvironmentValues.PORT,
    };
  });

export type AppEnvironment = z.infer<typeof envSchema>;

export const parseEnvironment = (
  environmentValues: NodeJS.ProcessEnv,
): AppEnvironment => envSchema.parse(environmentValues);

export const loadEnvironment = (): AppEnvironment => {
  loadDotEnv();
  return parseEnvironment(process.env);
};
