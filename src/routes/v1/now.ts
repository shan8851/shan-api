import { asc, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type { DatabaseClient } from '../../db/client.js';
import { meta, nowEntries } from '../../db/schema.js';
import { extractStringMetaValue, toIsoString } from '../../lib/metaValues.js';

type NowResponseItem = {
  slug: string;
  label: string;
  text: string;
  href: string | null;
};

type NowSnapshot = {
  updatedAt: string | null;
  narrative: string | null;
  items: NowResponseItem[];
};

type NowSnapshotResponse = {
  data: NowSnapshot;
};

const getLatestNowEntryUpdatedAt = (
  activeNowEntries: Array<{ updatedAt: Date }>,
): Date | null => {
  const latestUpdatedAt = activeNowEntries.reduce<Date | null>(
    (currentLatestUpdatedAt, nowEntry) => {
      if (!currentLatestUpdatedAt) {
        return nowEntry.updatedAt;
      }

      return nowEntry.updatedAt > currentLatestUpdatedAt
        ? nowEntry.updatedAt
        : currentLatestUpdatedAt;
    },
    null,
  );

  return latestUpdatedAt;
};

const loadNowSnapshot = async (
  databaseClient: DatabaseClient,
): Promise<NowSnapshot> => {
  const [activeNowEntries, narrativeMetaRecord, lastUpdatedMetaRecord] =
    await Promise.all([
      databaseClient
        .select({
          slug: nowEntries.slug,
          label: nowEntries.label,
          text: nowEntries.text,
          href: nowEntries.href,
          updatedAt: nowEntries.updatedAt,
        })
        .from(nowEntries)
        .where(eq(nowEntries.isActive, true))
        .orderBy(
          asc(nowEntries.sortOrder),
          desc(nowEntries.updatedAt),
          desc(nowEntries.id),
        ),
      databaseClient
        .select({ value: meta.value })
        .from(meta)
        .where(eq(meta.key, 'now_narrative'))
        .limit(1),
      databaseClient
        .select({ value: meta.value })
        .from(meta)
        .where(eq(meta.key, 'now_last_updated'))
        .limit(1),
    ]);

  const responseItems = activeNowEntries.map((entry) => ({
    slug: entry.slug,
    label: entry.label,
    text: entry.text,
    href: entry.href,
  }));

  const narrative = extractStringMetaValue(narrativeMetaRecord[0]?.value);

  const metaLastUpdated = extractStringMetaValue(lastUpdatedMetaRecord[0]?.value);
  const fallbackLastUpdated = toIsoString(
    getLatestNowEntryUpdatedAt(activeNowEntries),
  );

  return {
    updatedAt: metaLastUpdated ?? fallbackLastUpdated,
    narrative,
    items: responseItems,
  };
};

export const registerNowRoute = (
  app: FastifyInstance,
  databaseClient: DatabaseClient,
): void => {
  app.get('/v1/now', async (): Promise<NowSnapshotResponse> => {
    const data = await loadNowSnapshot(databaseClient);

    return {
      data,
    };
  });
};
