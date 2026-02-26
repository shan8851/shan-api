import { desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type { DatabaseClient } from '../../db/client.js';
import { meta, uses } from '../../db/schema.js';
import {
  extractStringMetaValue,
  isRecord,
  toIsoString,
} from '../../lib/metaValues.js';

type UseSectionItem = {
  label: string;
  value: string;
};

type UseSection = {
  slug: string;
  title: string;
  items: UseSectionItem[];
};

type UsesSnapshotResponse = {
  data: {
    updatedAt: string | null;
    sections: UseSection[];
  };
};

const extractUseItems = (payloadValue: Record<string, unknown>): UseSectionItem[] => {
  const rawItems = payloadValue.items;

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((rawItem) => {
      if (!isRecord(rawItem)) {
        return null;
      }

      const label = rawItem.label;
      const value = rawItem.value;

      if (typeof label !== 'string' || typeof value !== 'string') {
        return null;
      }

      return { label, value };
    })
    .filter((item): item is UseSectionItem => item !== null);
};

const loadUsesSnapshot = async (
  databaseClient: DatabaseClient,
): Promise<UsesSnapshotResponse['data']> => {
  const [activeUses, lastUpdatedMetaRecord] = await Promise.all([
    databaseClient
      .select({
        slug: uses.slug,
        title: uses.title,
        payload: uses.payload,
        updatedAt: uses.updatedAt,
      })
      .from(uses)
      .where(eq(uses.isActive, true))
      .orderBy(desc(uses.updatedAt), desc(uses.id)),
    databaseClient
      .select({ value: meta.value })
      .from(meta)
      .where(eq(meta.key, 'uses_last_updated'))
      .limit(1),
  ]);

  const sections = activeUses.map((useSection) => ({
    slug: useSection.slug,
    title: useSection.title,
    items: extractUseItems(useSection.payload),
  }));

  const metaLastUpdated = extractStringMetaValue(lastUpdatedMetaRecord[0]?.value);
  const fallbackLastUpdated = toIsoString(activeUses[0]?.updatedAt);

  return {
    updatedAt: metaLastUpdated ?? fallbackLastUpdated,
    sections,
  };
};

export const registerUsesRoute = (
  app: FastifyInstance,
  databaseClient: DatabaseClient,
): void => {
  app.get('/v1/uses', async (): Promise<UsesSnapshotResponse> => {
    const data = await loadUsesSnapshot(databaseClient);

    return {
      data,
    };
  });
};
