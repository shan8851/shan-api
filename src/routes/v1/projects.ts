import { and, desc, eq, lt, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type { DatabaseClient } from '../../db/client.js';
import { projects } from '../../db/schema.js';
import {
  decodeCursor,
  encodeCursor,
  parsePaginationQuery,
} from '../../lib/cursorPagination.js';

type ProjectsResponseItem = {
  slug: string;
  title: string;
  summary: string;
  href: string | null;
  updatedAt: string;
  version: number;
  isActive: boolean;
  payload: Record<string, unknown>;
};

type ProjectsListResponse = {
  data: ProjectsResponseItem[];
  page: {
    nextCursor: string | null;
    hasMore: boolean;
    asOf: string;
  };
};

const listProjects = async (
  databaseClient: DatabaseClient,
  query: unknown,
): Promise<{ payload: ProjectsListResponse } | { error: string }> => {
  const parsedQuery = parsePaginationQuery(query);

  if ('error' in parsedQuery) {
    return { error: parsedQuery.error };
  }

  const cursorPosition = parsedQuery.cursor
    ? decodeCursor(parsedQuery.cursor)
    : null;

  if (parsedQuery.cursor && !cursorPosition) {
    return { error: 'Invalid cursor parameter' };
  }

  const activeProjectsCondition = eq(projects.isActive, true);
  const cursorCondition = cursorPosition
    ? or(
        lt(projects.updatedAt, cursorPosition.updatedAt),
        and(
          eq(projects.updatedAt, cursorPosition.updatedAt),
          lt(projects.id, cursorPosition.id),
        ),
      )
    : undefined;

  const whereCondition = cursorCondition
    ? and(activeProjectsCondition, cursorCondition)
    : activeProjectsCondition;

  const records = await databaseClient
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      summary: projects.summary,
      href: projects.href,
      updatedAt: projects.updatedAt,
      version: projects.version,
      isActive: projects.isActive,
      payload: projects.payload,
    })
    .from(projects)
    .where(whereCondition)
    .orderBy(desc(projects.updatedAt), desc(projects.id))
    .limit(parsedQuery.limit + 1);

  const hasMore = records.length > parsedQuery.limit;
  const pageRecords = hasMore ? records.slice(0, parsedQuery.limit) : records;
  const lastRecord = pageRecords[pageRecords.length - 1];

  const nextCursor =
    hasMore && lastRecord
      ? encodeCursor({
          updatedAt: lastRecord.updatedAt,
          id: lastRecord.id,
        })
      : null;

  return {
    payload: {
      data: pageRecords.map((record) => ({
        slug: record.slug,
        title: record.title,
        summary: record.summary,
        href: record.href,
        updatedAt: record.updatedAt.toISOString(),
        version: record.version,
        isActive: record.isActive,
        payload: record.payload,
      })),
      page: {
        nextCursor,
        hasMore,
        asOf: new Date().toISOString(),
      },
    },
  };
};

export const registerProjectsRoute = (
  app: FastifyInstance,
  databaseClient: DatabaseClient,
): void => {
  app.get('/v1/projects', async (request, reply): Promise<void> => {
    const response = await listProjects(databaseClient, request.query);

    if ('error' in response) {
      await reply.code(400).send({ error: response.error });
      return;
    }

    await reply.code(200).send(response.payload);
  });
};
