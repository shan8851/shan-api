import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

import { meta, nowEntries, posts, projects, uses } from '../../db/schema.js';
import {
  runBootstrapImport,
  type RunBootstrapImportOptions,
} from '../../db/importer/runBootstrapImport.js';
import type { BootstrapContentSnapshot } from '../../db/importer/types.js';
import {
  createIntegrationHarness,
  type IntegrationHarness,
} from '../support/integrationHarness.js';

const createSnapshot = (): BootstrapContentSnapshot => ({
  uses: {
    lastUpdated: new Date('2026-02-20T00:00:00.000Z'),
    sections: [
      {
        title: 'Dev stack',
        items: [
          { label: 'Editor', value: 'VS Code' },
          { label: 'Terminal', value: 'Ghostty' },
        ],
      },
      {
        title: 'AI stack',
        items: [{ label: 'Coding', value: 'Codex' }],
      },
    ],
  },
  now: {
    lastUpdated: new Date('2026-02-21T00:00:00.000Z'),
    narrative: 'Current loop: ship and learn.',
    entries: [
      {
        label: 'Focus',
        text: 'Shipping API endpoints.',
        href: null,
      },
      {
        label: 'Learning',
        text: 'Tightening backend fundamentals.',
        href: 'https://example.com/learning',
      },
    ],
  },
  projects: {
    lastUpdated: new Date('2026-02-22T00:00:00.000Z'),
    items: [
      {
        sourceGroup: 'active_projects',
        title: 'Project One',
        summary: 'Primary active project.',
        href: 'https://example.com/project-one',
        payload: {
          source: 'test',
          sourceGroup: 'active_projects',
          track: 'core',
          status: 'live',
        },
      },
      {
        sourceGroup: 'ai_projects',
        title: 'Project Two',
        summary: 'Secondary AI project.',
        href: 'https://example.com/project-two',
        payload: {
          source: 'test',
          sourceGroup: 'ai_projects',
          status: 'in-progress',
        },
      },
    ],
  },
  posts: {
    lastUpdated: new Date('2026-02-24T00:00:00.000Z'),
    items: [
      {
        slug: 'building-with-agents',
        title: 'Building with agents',
        summary: 'Practical lessons from shipping with coding agents.',
        bodyMarkdown:
          '# Building with agents\n\nUse tight feedback loops and explicit constraints.',
        publishedAt: new Date('2026-02-20T00:00:00.000Z'),
        updatedAtSource: new Date('2026-02-24T00:00:00.000Z'),
        author: 'Shan',
        featured: true,
        tags: ['agents', 'backend'],
        readingTimeText: '1 min read',
        readingTimeMinutes: 1,
        payload: {
          source: 'test',
          sourcePath: 'content/writing/building-with-agents.md',
        },
      },
      {
        slug: 'shipping-principles',
        title: 'Shipping principles',
        summary: 'Execution rules for maintaining momentum.',
        bodyMarkdown:
          '# Shipping principles\n\nPrefer small, auditable changes.',
        publishedAt: new Date('2026-02-18T00:00:00.000Z'),
        updatedAtSource: null,
        author: null,
        featured: false,
        tags: ['execution'],
        readingTimeText: '1 min read',
        readingTimeMinutes: 1,
        payload: {
          source: 'test',
          sourcePath: 'content/writing/shipping-principles.md',
        },
      },
    ],
  },
});

const runImport = async (
  harness: IntegrationHarness,
  snapshot: BootstrapContentSnapshot,
  mode: RunBootstrapImportOptions['mode'] = 'apply',
) =>
  runBootstrapImport(harness.databaseConnection.client, {
    mode,
    snapshot,
  });

describe.sequential('bootstrap import', () => {
  let harness: IntegrationHarness;

  beforeAll(async () => {
    harness = await createIntegrationHarness();
  });

  afterEach(async () => {
    await harness.resetDatabase();
  });

  afterAll(async () => {
    await harness.stop();
  });

  it('inserts expected resource rows and meta keys on first apply', async () => {
    const snapshot = createSnapshot();

    const summary = await runImport(harness, snapshot);

    const [activeUses, activeNowEntries, activeProjects, activePosts, metaRows] =
      await Promise.all([
        harness.databaseConnection.client
          .select({ id: uses.id })
          .from(uses)
          .where(eq(uses.isActive, true)),
        harness.databaseConnection.client
          .select({ id: nowEntries.id })
          .from(nowEntries)
          .where(eq(nowEntries.isActive, true)),
        harness.databaseConnection.client
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.isActive, true)),
        harness.databaseConnection.client
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.isActive, true)),
        harness.databaseConnection.client
          .select({ key: meta.key, value: meta.value })
          .from(meta)
          .where(
            inArray(meta.key, [
              'uses_last_updated',
              'now_last_updated',
              'projects_last_updated',
              'posts_last_updated',
              'now_narrative',
              'global_last_updated',
            ]),
          ),
      ]);

    expect(summary.uses.inserted).toBe(snapshot.uses.sections.length);
    expect(summary.nowEntries.inserted).toBe(snapshot.now.entries.length);
    expect(summary.projects.inserted).toBe(snapshot.projects.items.length);
    expect(summary.posts.inserted).toBe(snapshot.posts.items.length);

    expect(activeUses).toHaveLength(snapshot.uses.sections.length);
    expect(activeNowEntries).toHaveLength(snapshot.now.entries.length);
    expect(activeProjects).toHaveLength(snapshot.projects.items.length);
    expect(activePosts).toHaveLength(snapshot.posts.items.length);
    expect(metaRows).toHaveLength(6);
  });

  it('is idempotent when applying the same snapshot twice', async () => {
    const snapshot = createSnapshot();

    await runImport(harness, snapshot);

    const secondRunSummary = await runImport(harness, snapshot);

    const [activeUses, activeNowEntries, activeProjects, activePosts, useVersions] =
      await Promise.all([
        harness.databaseConnection.client
          .select({ id: uses.id })
          .from(uses)
          .where(eq(uses.isActive, true)),
        harness.databaseConnection.client
          .select({ id: nowEntries.id })
          .from(nowEntries)
          .where(eq(nowEntries.isActive, true)),
        harness.databaseConnection.client
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.isActive, true)),
        harness.databaseConnection.client
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.isActive, true)),
        harness.databaseConnection.client
          .select({ version: uses.version })
          .from(uses)
          .where(eq(uses.isActive, true)),
      ]);

    expect(secondRunSummary.uses).toEqual({
      inserted: 0,
      updated: 0,
      deactivated: 0,
      unchanged: snapshot.uses.sections.length,
    });
    expect(secondRunSummary.nowEntries).toEqual({
      inserted: 0,
      updated: 0,
      deactivated: 0,
      unchanged: snapshot.now.entries.length,
    });
    expect(secondRunSummary.projects).toEqual({
      inserted: 0,
      updated: 0,
      deactivated: 0,
      unchanged: snapshot.projects.items.length,
    });
    expect(secondRunSummary.posts).toEqual({
      inserted: 0,
      updated: 0,
      deactivated: 0,
      unchanged: snapshot.posts.items.length,
    });

    expect(activeUses).toHaveLength(snapshot.uses.sections.length);
    expect(activeNowEntries).toHaveLength(snapshot.now.entries.length);
    expect(activeProjects).toHaveLength(snapshot.projects.items.length);
    expect(activePosts).toHaveLength(snapshot.posts.items.length);
    expect(useVersions.every((row) => row.version === 1)).toBe(true);
  });

  it('deactivates stale rows that are no longer present in snapshot', async () => {
    const firstSnapshot = createSnapshot();
    const secondSnapshot: BootstrapContentSnapshot = {
      ...firstSnapshot,
      uses: {
        ...firstSnapshot.uses,
        sections: firstSnapshot.uses.sections.slice(0, 1),
      },
      now: {
        ...firstSnapshot.now,
        entries: firstSnapshot.now.entries.slice(0, 1),
      },
      projects: {
        ...firstSnapshot.projects,
        items: firstSnapshot.projects.items.slice(0, 1),
      },
      posts: {
        ...firstSnapshot.posts,
        items: firstSnapshot.posts.items.slice(0, 1),
      },
    };

    await runImport(harness, firstSnapshot);
    const secondRunSummary = await runImport(harness, secondSnapshot);

    const [staleUse, staleNowEntry, staleProject, stalePost] = await Promise.all([
      harness.databaseConnection.client
        .select({ isActive: uses.isActive, version: uses.version })
        .from(uses)
        .where(eq(uses.title, 'AI stack'))
        .limit(1),
      harness.databaseConnection.client
        .select({ isActive: nowEntries.isActive, version: nowEntries.version })
        .from(nowEntries)
        .where(eq(nowEntries.label, 'Learning'))
        .limit(1),
      harness.databaseConnection.client
        .select({ isActive: projects.isActive, version: projects.version })
        .from(projects)
        .where(eq(projects.title, 'Project Two'))
        .limit(1),
      harness.databaseConnection.client
        .select({ isActive: posts.isActive, version: posts.version })
        .from(posts)
        .where(eq(posts.slug, 'shipping-principles'))
        .limit(1),
    ]);

    expect(secondRunSummary.uses.deactivated).toBe(1);
    expect(secondRunSummary.nowEntries.deactivated).toBe(1);
    expect(secondRunSummary.projects.deactivated).toBe(1);
    expect(secondRunSummary.posts.deactivated).toBe(1);

    expect(staleUse[0]?.isActive).toBe(false);
    expect(staleNowEntry[0]?.isActive).toBe(false);
    expect(staleProject[0]?.isActive).toBe(false);
    expect(stalePost[0]?.isActive).toBe(false);

    expect((staleUse[0]?.version ?? 0) > 1).toBe(true);
    expect((staleNowEntry[0]?.version ?? 0) > 1).toBe(true);
    expect((staleProject[0]?.version ?? 0) > 1).toBe(true);
    expect((stalePost[0]?.version ?? 0) > 1).toBe(true);
  });

  it('returns non-empty now/uses/projects/posts responses after import', async () => {
    const snapshot = createSnapshot();

    await runImport(harness, snapshot);

    const [nowResponse, usesResponse, projectsResponse, postsListResponse] =
      await Promise.all([
      harness.app.inject({ method: 'GET', url: '/v1/now' }),
      harness.app.inject({ method: 'GET', url: '/v1/uses' }),
      harness.app.inject({ method: 'GET', url: '/v1/projects?limit=20' }),
      harness.app.inject({ method: 'GET', url: '/v1/posts?limit=20' }),
    ]);

    const nowPayload = nowResponse.json() as {
      data: { items: unknown[]; updatedAt: string | null };
    };
    const usesPayload = usesResponse.json() as {
      data: { sections: unknown[]; updatedAt: string | null };
    };
    const projectsPayload = projectsResponse.json() as {
      data: unknown[];
    };
    const postsListPayload = postsListResponse.json() as {
      data: Array<{ slug: string; bodyMarkdown?: string }>;
    };

    const firstPostSlug = postsListPayload.data[0]?.slug;
    const postDetailResponse = await harness.app.inject({
      method: 'GET',
      url: `/v1/posts/${firstPostSlug ?? ''}`,
    });
    const postDetailPayload = postDetailResponse.json() as {
      data: { bodyMarkdown: string };
    };

    expect(nowResponse.statusCode).toBe(200);
    expect(usesResponse.statusCode).toBe(200);
    expect(projectsResponse.statusCode).toBe(200);
    expect(postsListResponse.statusCode).toBe(200);
    expect(postDetailResponse.statusCode).toBe(200);

    expect(nowPayload.data.items.length).toBeGreaterThan(0);
    expect(usesPayload.data.sections.length).toBeGreaterThan(0);
    expect(projectsPayload.data.length).toBeGreaterThan(0);
    expect(postsListPayload.data.length).toBeGreaterThan(0);
    expect(postsListPayload.data.every((postRecord) => postRecord.bodyMarkdown === undefined)).toBe(
      true,
    );
    expect(postDetailPayload.data.bodyMarkdown.length).toBeGreaterThan(0);

    expect(nowPayload.data.updatedAt).not.toBeNull();
    expect(usesPayload.data.updatedAt).not.toBeNull();
  });

  it('supports dry-run mode without writing data', async () => {
    const snapshot = createSnapshot();

    const summary = await runImport(harness, snapshot, 'dry-run');

    const [usesRows, nowRows, projectRows, postRows] = await Promise.all([
      harness.databaseConnection.client.select({ id: uses.id }).from(uses),
      harness.databaseConnection.client
        .select({ id: nowEntries.id })
        .from(nowEntries),
      harness.databaseConnection.client
        .select({ id: projects.id })
        .from(projects),
      harness.databaseConnection.client.select({ id: posts.id }).from(posts),
    ]);

    expect(summary.uses.inserted).toBe(snapshot.uses.sections.length);
    expect(summary.nowEntries.inserted).toBe(snapshot.now.entries.length);
    expect(summary.projects.inserted).toBe(snapshot.projects.items.length);
    expect(summary.posts.inserted).toBe(snapshot.posts.items.length);

    expect(usesRows).toHaveLength(0);
    expect(nowRows).toHaveLength(0);
    expect(projectRows).toHaveLength(0);
    expect(postRows).toHaveLength(0);
  });
});
