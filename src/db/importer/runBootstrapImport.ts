import { isDeepStrictEqual } from 'node:util';

import { eq, inArray } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { meta, nowEntries, projects, uses } from '../schema.js';
import { toSlug } from '../../lib/slugify.js';
import type {
  BootstrapContentSnapshot,
  BootstrapImportSummary,
  ImportMode,
  MetaImportSummary,
  ResourceImportSummary,
} from './types.js';

type ResourceSyncOptions<TDesiredRow> = {
  mode: ImportMode;
  resourceUpdatedAt: Date;
  desiredRows: TDesiredRow[];
};

const createInitialResourceSummary = (): ResourceImportSummary => ({
  inserted: 0,
  updated: 0,
  deactivated: 0,
  unchanged: 0,
});

const createSlugFactory = () => {
  const slugCounts = new Map<string, number>();

  return (slugBase: string, fallbackLabel: string): string => {
    const normalizedSlugBase = toSlug(slugBase) || toSlug(fallbackLabel) || 'item';
    const currentCount = (slugCounts.get(normalizedSlugBase) ?? 0) + 1;

    slugCounts.set(normalizedSlugBase, currentCount);

    return currentCount === 1
      ? normalizedSlugBase
      : `${normalizedSlugBase}-${currentCount}`;
  };
};

const withSortOffsetTimestamp = (baseTimestamp: Date, index: number): Date =>
  new Date(baseTimestamp.getTime() - index);

const resolveResourceTimestamp = (
  resourceTimestamp: Date | null,
  fallbackTimestamp: Date,
): Date => resourceTimestamp ?? fallbackTimestamp;

const toIsoString = (value: Date): string => value.toISOString();

const syncUsesRows = async (
  databaseClient: DatabaseClient,
  syncOptions: ResourceSyncOptions<{
    slug: string;
    title: string;
    payload: Record<string, unknown>;
    updatedAt: Date;
  }>,
): Promise<ResourceImportSummary> => {
  const existingRows = await databaseClient
    .select({
      id: uses.id,
      slug: uses.slug,
      title: uses.title,
      payload: uses.payload,
      version: uses.version,
      isActive: uses.isActive,
    })
    .from(uses);

  const existingRowsBySlug = new Map(
    existingRows.map((existingRow) => [existingRow.slug, existingRow]),
  );

  const desiredSlugs = new Set(syncOptions.desiredRows.map((desiredRow) => desiredRow.slug));

  const summary = createInitialResourceSummary();

  for (const desiredRow of syncOptions.desiredRows) {
    const existingRow = existingRowsBySlug.get(desiredRow.slug);

    if (!existingRow) {
      summary.inserted += 1;

      if (syncOptions.mode === 'apply') {
        await databaseClient.insert(uses).values({
          slug: desiredRow.slug,
          title: desiredRow.title,
          payload: desiredRow.payload,
          isActive: true,
          version: 1,
          updatedAt: desiredRow.updatedAt,
        });
      }

      continue;
    }

    const hasMeaningfulChange =
      existingRow.title !== desiredRow.title ||
      !isDeepStrictEqual(existingRow.payload, desiredRow.payload) ||
      !existingRow.isActive;

    if (!hasMeaningfulChange) {
      summary.unchanged += 1;
      continue;
    }

    summary.updated += 1;

    if (syncOptions.mode === 'apply') {
      await databaseClient
        .update(uses)
        .set({
          title: desiredRow.title,
          payload: desiredRow.payload,
          isActive: true,
          version: existingRow.version + 1,
          updatedAt: desiredRow.updatedAt,
        })
        .where(eq(uses.id, existingRow.id));
    }
  }

  const staleRows = existingRows.filter(
    (existingRow) => existingRow.isActive && !desiredSlugs.has(existingRow.slug),
  );

  summary.deactivated += staleRows.length;

  if (syncOptions.mode === 'apply') {
    for (const staleRow of staleRows) {
      await databaseClient
        .update(uses)
        .set({
          isActive: false,
          version: staleRow.version + 1,
          updatedAt: syncOptions.resourceUpdatedAt,
        })
        .where(eq(uses.id, staleRow.id));
    }
  }

  return summary;
};

const syncNowRows = async (
  databaseClient: DatabaseClient,
  syncOptions: ResourceSyncOptions<{
    slug: string;
    label: string;
    text: string;
    href: string | null;
    sortOrder: number;
    payload: Record<string, unknown>;
    updatedAt: Date;
  }>,
): Promise<ResourceImportSummary> => {
  const existingRows = await databaseClient
    .select({
      id: nowEntries.id,
      slug: nowEntries.slug,
      label: nowEntries.label,
      text: nowEntries.text,
      href: nowEntries.href,
      sortOrder: nowEntries.sortOrder,
      payload: nowEntries.payload,
      version: nowEntries.version,
      isActive: nowEntries.isActive,
    })
    .from(nowEntries);

  const existingRowsBySlug = new Map(
    existingRows.map((existingRow) => [existingRow.slug, existingRow]),
  );

  const desiredSlugs = new Set(syncOptions.desiredRows.map((desiredRow) => desiredRow.slug));

  const summary = createInitialResourceSummary();

  for (const desiredRow of syncOptions.desiredRows) {
    const existingRow = existingRowsBySlug.get(desiredRow.slug);

    if (!existingRow) {
      summary.inserted += 1;

      if (syncOptions.mode === 'apply') {
        await databaseClient.insert(nowEntries).values({
          slug: desiredRow.slug,
          label: desiredRow.label,
          text: desiredRow.text,
          href: desiredRow.href,
          sortOrder: desiredRow.sortOrder,
          payload: desiredRow.payload,
          isActive: true,
          version: 1,
          updatedAt: desiredRow.updatedAt,
        });
      }

      continue;
    }

    const hasMeaningfulChange =
      existingRow.label !== desiredRow.label ||
      existingRow.text !== desiredRow.text ||
      existingRow.href !== desiredRow.href ||
      existingRow.sortOrder !== desiredRow.sortOrder ||
      !isDeepStrictEqual(existingRow.payload, desiredRow.payload) ||
      !existingRow.isActive;

    if (!hasMeaningfulChange) {
      summary.unchanged += 1;
      continue;
    }

    summary.updated += 1;

    if (syncOptions.mode === 'apply') {
      await databaseClient
        .update(nowEntries)
        .set({
          label: desiredRow.label,
          text: desiredRow.text,
          href: desiredRow.href,
          sortOrder: desiredRow.sortOrder,
          payload: desiredRow.payload,
          isActive: true,
          version: existingRow.version + 1,
          updatedAt: desiredRow.updatedAt,
        })
        .where(eq(nowEntries.id, existingRow.id));
    }
  }

  const staleRows = existingRows.filter(
    (existingRow) => existingRow.isActive && !desiredSlugs.has(existingRow.slug),
  );

  summary.deactivated += staleRows.length;

  if (syncOptions.mode === 'apply') {
    for (const staleRow of staleRows) {
      await databaseClient
        .update(nowEntries)
        .set({
          isActive: false,
          version: staleRow.version + 1,
          updatedAt: syncOptions.resourceUpdatedAt,
        })
        .where(eq(nowEntries.id, staleRow.id));
    }
  }

  return summary;
};

const syncProjectRows = async (
  databaseClient: DatabaseClient,
  syncOptions: ResourceSyncOptions<{
    slug: string;
    title: string;
    summary: string;
    href: string | null;
    payload: Record<string, unknown>;
    updatedAt: Date;
  }>,
): Promise<ResourceImportSummary> => {
  const existingRows = await databaseClient
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      href: projects.href,
      payload: projects.payload,
      version: projects.version,
      isActive: projects.isActive,
    })
    .from(projects);

  const existingRowsBySlug = new Map(
    existingRows.map((existingRow) => [existingRow.slug, existingRow]),
  );

  const desiredSlugs = new Set(syncOptions.desiredRows.map((desiredRow) => desiredRow.slug));

  const summary = createInitialResourceSummary();

  for (const desiredRow of syncOptions.desiredRows) {
    const existingRow = existingRowsBySlug.get(desiredRow.slug);

    if (!existingRow) {
      summary.inserted += 1;

      if (syncOptions.mode === 'apply') {
        await databaseClient.insert(projects).values({
          slug: desiredRow.slug,
          title: desiredRow.title,
          summary: desiredRow.summary,
          href: desiredRow.href,
          payload: desiredRow.payload,
          isActive: true,
          version: 1,
          updatedAt: desiredRow.updatedAt,
        });
      }

      continue;
    }

    const hasMeaningfulChange =
      existingRow.title !== desiredRow.title ||
      existingRow.summary !== desiredRow.summary ||
      existingRow.href !== desiredRow.href ||
      !isDeepStrictEqual(existingRow.payload, desiredRow.payload) ||
      !existingRow.isActive;

    if (!hasMeaningfulChange) {
      summary.unchanged += 1;
      continue;
    }

    summary.updated += 1;

    if (syncOptions.mode === 'apply') {
      await databaseClient
        .update(projects)
        .set({
          title: desiredRow.title,
          summary: desiredRow.summary,
          href: desiredRow.href,
          payload: desiredRow.payload,
          isActive: true,
          version: existingRow.version + 1,
          updatedAt: desiredRow.updatedAt,
        })
        .where(eq(projects.id, existingRow.id));
    }
  }

  const staleRows = existingRows.filter(
    (existingRow) => existingRow.isActive && !desiredSlugs.has(existingRow.slug),
  );

  summary.deactivated += staleRows.length;

  if (syncOptions.mode === 'apply') {
    for (const staleRow of staleRows) {
      await databaseClient
        .update(projects)
        .set({
          isActive: false,
          version: staleRow.version + 1,
          updatedAt: syncOptions.resourceUpdatedAt,
        })
        .where(eq(projects.id, staleRow.id));
    }
  }

  return summary;
};

const syncMetaValues = async (
  databaseClient: DatabaseClient,
  mode: ImportMode,
  metaEntries: Array<{ key: string; value: string; updatedAt: Date }>,
): Promise<MetaImportSummary> => {
  const summary: MetaImportSummary = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
  };

  const keys = metaEntries.map((metaEntry) => metaEntry.key);

  const existingMetaRows = keys.length
    ? await databaseClient
        .select({
          key: meta.key,
          value: meta.value,
          updatedAt: meta.updatedAt,
        })
        .from(meta)
        .where(inArray(meta.key, keys))
    : [];

  const existingMetaRowsByKey = new Map(
    existingMetaRows.map((existingMetaRow) => [existingMetaRow.key, existingMetaRow]),
  );

  for (const metaEntry of metaEntries) {
    const existingMetaRow = existingMetaRowsByKey.get(metaEntry.key);

    if (!existingMetaRow) {
      summary.inserted += 1;

      if (mode === 'apply') {
        await databaseClient.insert(meta).values({
          key: metaEntry.key,
          value: metaEntry.value,
          updatedAt: metaEntry.updatedAt,
        });
      }

      continue;
    }

    const hasValueChanged = !isDeepStrictEqual(existingMetaRow.value, metaEntry.value);
    const hasTimestampChanged =
      existingMetaRow.updatedAt.getTime() !== metaEntry.updatedAt.getTime();

    if (!hasValueChanged && !hasTimestampChanged) {
      summary.unchanged += 1;
      continue;
    }

    summary.updated += 1;

    if (mode === 'apply') {
      await databaseClient
        .update(meta)
        .set({
          value: metaEntry.value,
          updatedAt: metaEntry.updatedAt,
        })
        .where(eq(meta.key, metaEntry.key));
    }
  }

  return summary;
};

const getLatestTimestamp = (timestamps: Date[]): Date | null => {
  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latestTimestamp, timestamp) =>
    timestamp > latestTimestamp ? timestamp : latestTimestamp,
  );
};

export type RunBootstrapImportOptions = {
  mode: ImportMode;
  snapshot: BootstrapContentSnapshot;
  executionTimestamp?: Date;
};

export const runBootstrapImport = async (
  databaseClient: DatabaseClient,
  options: RunBootstrapImportOptions,
): Promise<BootstrapImportSummary> => {
  const executionTimestamp = options.executionTimestamp ?? new Date();

  const usesTimestamp = resolveResourceTimestamp(
    options.snapshot.uses.lastUpdated,
    executionTimestamp,
  );
  const nowTimestamp = resolveResourceTimestamp(
    options.snapshot.now.lastUpdated,
    executionTimestamp,
  );
  const projectsTimestamp = resolveResourceTimestamp(
    options.snapshot.projects.lastUpdated,
    executionTimestamp,
  );

  const usesSlugFactory = createSlugFactory();
  const nowSlugFactory = createSlugFactory();
  const projectsSlugFactory = createSlugFactory();

  const desiredUseRows = options.snapshot.uses.sections.map((section, index) => ({
    slug: usesSlugFactory(`uses-${section.title}`, 'uses-section'),
    title: section.title,
    payload: {
      source: 'shan_site',
      items: section.items,
    },
    updatedAt: withSortOffsetTimestamp(usesTimestamp, index),
  }));

  const desiredNowRows = options.snapshot.now.entries.map((entry, index) => ({
    slug: nowSlugFactory(`now-${entry.label}`, 'now-entry'),
    label: entry.label,
    text: entry.text,
    href: entry.href,
    sortOrder: index,
    payload: {
      source: 'shan_site',
    },
    updatedAt: withSortOffsetTimestamp(nowTimestamp, index),
  }));

  const desiredProjectRows = options.snapshot.projects.items.map((project, index) => ({
    slug: projectsSlugFactory(
      `${project.sourceGroup}-${project.title}`,
      'project-item',
    ),
    title: project.title,
    summary: project.summary,
    href: project.href,
    payload: project.payload,
    updatedAt: withSortOffsetTimestamp(projectsTimestamp, index),
  }));

  const usesSummary = await syncUsesRows(databaseClient, {
    mode: options.mode,
    resourceUpdatedAt: usesTimestamp,
    desiredRows: desiredUseRows,
  });

  const nowSummary = await syncNowRows(databaseClient, {
    mode: options.mode,
    resourceUpdatedAt: nowTimestamp,
    desiredRows: desiredNowRows,
  });

  const projectsSummary = await syncProjectRows(databaseClient, {
    mode: options.mode,
    resourceUpdatedAt: projectsTimestamp,
    desiredRows: desiredProjectRows,
  });

  const latestGlobalTimestamp = getLatestTimestamp([
    usesTimestamp,
    nowTimestamp,
    projectsTimestamp,
  ]);

  const metaEntries = [
    {
      key: 'uses_last_updated',
      value: toIsoString(usesTimestamp),
      updatedAt: usesTimestamp,
    },
    {
      key: 'now_last_updated',
      value: toIsoString(nowTimestamp),
      updatedAt: nowTimestamp,
    },
    {
      key: 'projects_last_updated',
      value: toIsoString(projectsTimestamp),
      updatedAt: projectsTimestamp,
    },
    {
      key: 'now_narrative',
      value: options.snapshot.now.narrative,
      updatedAt: nowTimestamp,
    },
    ...(latestGlobalTimestamp
      ? [
          {
            key: 'global_last_updated',
            value: toIsoString(latestGlobalTimestamp),
            updatedAt: latestGlobalTimestamp,
          },
        ]
      : []),
  ];

  const metaSummary = await syncMetaValues(
    databaseClient,
    options.mode,
    metaEntries,
  );

  return {
    mode: options.mode,
    uses: usesSummary,
    nowEntries: nowSummary,
    projects: projectsSummary,
    meta: metaSummary,
  };
};
