import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { meta, nowEntries, projects, uses } from '../../db/schema.js';
import {
  createIntegrationHarness,
  type IntegrationHarness,
} from '../support/integrationHarness.js';

type NowEndpointResponse = {
  data: {
    updatedAt: string | null;
    narrative: string | null;
    items: Array<{
      slug: string;
      label: string;
      text: string;
      href: string | null;
    }>;
  };
};

type UsesEndpointResponse = {
  data: {
    updatedAt: string | null;
    sections: Array<{
      slug: string;
      title: string;
      items: Array<{
        label: string;
        value: string;
      }>;
    }>;
  };
};

type ProjectsEndpointResponse = {
  data: Array<{
    slug: string;
    title: string;
    summary: string;
    href: string | null;
    updatedAt: string;
    version: number;
    isActive: boolean;
    payload: Record<string, unknown>;
  }>;
  page: {
    nextCursor: string | null;
    hasMore: boolean;
    asOf: string;
  };
};

const getProtectedEndpointHeaders = (
  internalApiKey: string,
): Record<string, string> => ({
  'x-internal-api-key': internalApiKey,
});

const isIsoDateString = (value: string): boolean =>
  !Number.isNaN(new Date(value).getTime());

describe.sequential('endpoint integration tests', () => {
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

  it('returns liveness response from GET /healthz', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('returns empty now snapshot when no active entries exist', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/now',
    });

    const payload = response.json() as NowEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload).toEqual({
      data: {
        updatedAt: null,
        narrative: null,
        items: [],
      },
    });
  });

  it('uses latest now row updatedAt when now_last_updated meta is absent and ignores global meta', async () => {
    const olderNow = new Date('2026-02-19T00:00:00.000Z');
    const newerNow = new Date('2026-02-20T00:00:00.000Z');
    const unrelatedGlobalUpdatedAt = new Date('2026-02-25T00:00:00.000Z');

    await harness.databaseConnection.client
      .insert(meta)
      .values([
        {
          key: 'now_narrative',
          value: 'Current loop is shipping and tightening reliability.',
          updatedAt: olderNow,
        },
        {
          key: 'global_last_updated',
          value: unrelatedGlobalUpdatedAt.toISOString(),
          updatedAt: unrelatedGlobalUpdatedAt,
        },
      ]);

    await harness.databaseConnection.client.insert(nowEntries).values([
      {
        slug: 'second-item',
        label: 'Second item',
        text: 'Second detail',
        href: null,
        sortOrder: 1,
        payload: {},
        updatedAt: newerNow,
      },
      {
        slug: 'first-item',
        label: 'First item',
        text: 'First detail',
        href: 'https://example.com',
        sortOrder: 0,
        payload: {},
        updatedAt: olderNow,
      },
    ]);

    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/now',
    });

    const payload = response.json() as NowEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload.data.narrative).toBe(
      'Current loop is shipping and tightening reliability.',
    );
    expect(payload.data.updatedAt).toBe('2026-02-20T00:00:00.000Z');
    expect(payload.data.items).toEqual([
      {
        slug: 'first-item',
        label: 'First item',
        text: 'First detail',
        href: 'https://example.com',
      },
      {
        slug: 'second-item',
        label: 'Second item',
        text: 'Second detail',
        href: null,
      },
    ]);
  });

  it('prefers now_last_updated meta for now snapshot updatedAt', async () => {
    const rowTimestamp = new Date('2026-02-20T00:00:00.000Z');
    const nowMetaTimestamp = new Date('2026-02-22T00:00:00.000Z');
    const unrelatedGlobalUpdatedAt = new Date('2026-02-25T00:00:00.000Z');

    await harness.databaseConnection.client
      .insert(meta)
      .values([
        {
          key: 'now_narrative',
          value: 'Current loop is shipping and tightening reliability.',
          updatedAt: rowTimestamp,
        },
        {
          key: 'now_last_updated',
          value: nowMetaTimestamp.toISOString(),
          updatedAt: nowMetaTimestamp,
        },
        {
          key: 'global_last_updated',
          value: unrelatedGlobalUpdatedAt.toISOString(),
          updatedAt: unrelatedGlobalUpdatedAt,
        },
      ]);

    await harness.databaseConnection.client.insert(nowEntries).values({
      slug: 'single-item',
      label: 'Single item',
      text: 'Single detail',
      href: null,
      sortOrder: 0,
      payload: {},
      updatedAt: rowTimestamp,
    });

    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/now',
    });

    const payload = response.json() as NowEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload.data.updatedAt).toBe('2026-02-22T00:00:00.000Z');
  });

  it('returns empty uses snapshot when no active entries exist', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/uses',
    });

    const payload = response.json() as UsesEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload).toEqual({
      data: {
        updatedAt: null,
        sections: [],
      },
    });
  });

  it('uses latest uses row updatedAt when uses_last_updated meta is absent and ignores global meta', async () => {
    const olderTimestamp = new Date('2026-02-19T00:00:00.000Z');
    const newerTimestamp = new Date('2026-02-20T00:00:00.000Z');
    const unrelatedGlobalUpdatedAt = new Date('2026-02-21T00:00:00.000Z');

    await harness.databaseConnection.client.insert(meta).values({
      key: 'global_last_updated',
      value: unrelatedGlobalUpdatedAt.toISOString(),
      updatedAt: unrelatedGlobalUpdatedAt,
    });

    await harness.databaseConnection.client.insert(uses).values([
      {
        slug: 'older-section',
        title: 'Older section',
        payload: {
          items: [{ label: 'Editor', value: 'VS Code' }],
        },
        updatedAt: olderTimestamp,
      },
      {
        slug: 'newer-section',
        title: 'Newer section',
        payload: {
          items: [{ label: 'Terminal', value: 'Ghostty' }],
        },
        updatedAt: newerTimestamp,
      },
    ]);

    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/uses',
    });

    const payload = response.json() as UsesEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload.data.updatedAt).toBe('2026-02-20T00:00:00.000Z');
    expect(payload.data.sections).toEqual([
      {
        slug: 'newer-section',
        title: 'Newer section',
        items: [{ label: 'Terminal', value: 'Ghostty' }],
      },
      {
        slug: 'older-section',
        title: 'Older section',
        items: [{ label: 'Editor', value: 'VS Code' }],
      },
    ]);
  });

  it('prefers uses_last_updated meta for uses snapshot updatedAt', async () => {
    const rowTimestamp = new Date('2026-02-20T00:00:00.000Z');
    const usesMetaTimestamp = new Date('2026-02-23T00:00:00.000Z');
    const unrelatedGlobalUpdatedAt = new Date('2026-02-25T00:00:00.000Z');

    await harness.databaseConnection.client.insert(meta).values([
      {
        key: 'uses_last_updated',
        value: usesMetaTimestamp.toISOString(),
        updatedAt: usesMetaTimestamp,
      },
      {
        key: 'global_last_updated',
        value: unrelatedGlobalUpdatedAt.toISOString(),
        updatedAt: unrelatedGlobalUpdatedAt,
      },
    ]);

    await harness.databaseConnection.client.insert(uses).values({
      slug: 'single-section',
      title: 'Single section',
      payload: {
        items: [{ label: 'Editor', value: 'VS Code' }],
      },
      updatedAt: rowTimestamp,
    });

    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/uses',
    });

    const payload = response.json() as UsesEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload.data.updatedAt).toBe('2026-02-23T00:00:00.000Z');
  });

  it('returns empty projects list response when no active rows exist', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/projects',
    });

    const payload = response.json() as ProjectsEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload.data).toEqual([]);
    expect(payload.page.hasMore).toBe(false);
    expect(payload.page.nextCursor).toBeNull();
    expect(isIsoDateString(payload.page.asOf)).toBe(true);
  });

  it('returns paginated projects and supports cursor pagination', async () => {
    await harness.databaseConnection.client.insert(projects).values([
      {
        slug: 'oldest-project',
        title: 'Oldest project',
        summary: 'Oldest summary',
        href: null,
        payload: { source: 'legacy' },
        updatedAt: new Date('2026-02-20T00:00:01.000Z'),
      },
      {
        slug: 'middle-project',
        title: 'Middle project',
        summary: 'Middle summary',
        href: 'https://example.com/middle',
        payload: { source: 'core' },
        updatedAt: new Date('2026-02-20T00:00:02.000Z'),
      },
      {
        slug: 'newest-project',
        title: 'Newest project',
        summary: 'Newest summary',
        href: 'https://example.com/newest',
        payload: { source: 'core' },
        updatedAt: new Date('2026-02-20T00:00:03.000Z'),
      },
    ]);

    const firstPageResponse = await harness.app.inject({
      method: 'GET',
      url: '/v1/projects?limit=2',
    });

    const firstPagePayload = firstPageResponse.json() as ProjectsEndpointResponse;

    expect(firstPageResponse.statusCode).toBe(200);
    expect(firstPagePayload.data.map((projectRecord) => projectRecord.slug)).toEqual(
      ['newest-project', 'middle-project'],
    );
    expect(firstPagePayload.page.hasMore).toBe(true);
    expect(typeof firstPagePayload.page.nextCursor).toBe('string');

    const cursor = firstPagePayload.page.nextCursor ?? '';
    const secondPageResponse = await harness.app.inject({
      method: 'GET',
      url: `/v1/projects?limit=2&cursor=${cursor}`,
    });

    const secondPagePayload =
      secondPageResponse.json() as ProjectsEndpointResponse;

    expect(secondPageResponse.statusCode).toBe(200);
    expect(secondPagePayload.data.map((projectRecord) => projectRecord.slug)).toEqual(
      ['oldest-project'],
    );
    expect(secondPagePayload.page.hasMore).toBe(false);
    expect(secondPagePayload.page.nextCursor).toBeNull();
  });

  it('caps projects limit to 50 records', async () => {
    const startTimestamp = new Date('2026-02-20T00:00:00.000Z').getTime();
    const projectRows = Array.from({ length: 55 }, (_value, index) => ({
      slug: `project-${index + 1}`,
      title: `Project ${index + 1}`,
      summary: `Summary ${index + 1}`,
      href: null,
      payload: { index: index + 1 },
      updatedAt: new Date(startTimestamp + index * 1000),
    }));

    await harness.databaseConnection.client.insert(projects).values(projectRows);

    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/projects?limit=100',
    });

    const payload = response.json() as ProjectsEndpointResponse;

    expect(response.statusCode).toBe(200);
    expect(payload.data).toHaveLength(50);
    expect(payload.page.hasMore).toBe(true);
    expect(typeof payload.page.nextCursor).toBe('string');
  });

  it('returns 400 for an invalid projects cursor', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/v1/projects?cursor=invalid-cursor-token',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Invalid cursor parameter' });
  });

  it('rejects unauthorized requests for GET /readyz', async () => {
    const noHeaderResponse = await harness.app.inject({
      method: 'GET',
      url: '/readyz',
    });

    const invalidHeaderResponse = await harness.app.inject({
      method: 'GET',
      url: '/readyz',
      headers: getProtectedEndpointHeaders('invalid-key'),
    });

    expect(noHeaderResponse.statusCode).toBe(401);
    expect(invalidHeaderResponse.statusCode).toBe(401);
    expect(noHeaderResponse.json()).toEqual({ error: 'unauthorized' });
  });

  it('returns ready response for authorized GET /readyz', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/readyz',
      headers: getProtectedEndpointHeaders(harness.validInternalApiKey),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ready',
      checks: {
        database: 'ok',
        migrations: 'ok',
        query: 'ok',
      },
    });
  });

  it('returns not ready when readiness check fails', async () => {
    const appWithFailingReadiness = createApp({
      environment: harness.environment,
      databaseConnection: harness.databaseConnection,
      readyzCheck: async () => ({
        status: 'not_ready',
        checks: {
          database: 'failed',
          migrations: 'failed',
          query: 'failed',
        },
        message: 'forced failure for test',
      }),
    });

    try {
      const response = await appWithFailingReadiness.inject({
        method: 'GET',
        url: '/readyz',
        headers: getProtectedEndpointHeaders(harness.validInternalApiKey),
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        status: 'not_ready',
        checks: {
          database: 'failed',
          migrations: 'failed',
          query: 'failed',
        },
        message: 'forced failure for test',
      });
    } finally {
      await appWithFailingReadiness.close();
    }
  });

  it('enforces auth on GET /metrics and returns Prometheus payload', async () => {
    const unauthorizedResponse = await harness.app.inject({
      method: 'GET',
      url: '/metrics',
    });

    const authorizedResponse = await harness.app.inject({
      method: 'GET',
      url: '/metrics',
      headers: getProtectedEndpointHeaders(harness.validInternalApiKey),
    });

    expect(unauthorizedResponse.statusCode).toBe(401);
    expect(authorizedResponse.statusCode).toBe(200);
    expect(authorizedResponse.headers['content-type']).toContain('text/plain');
    expect(authorizedResponse.body).toContain('shan_api_up');
  });
});
