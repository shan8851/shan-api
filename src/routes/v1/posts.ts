import { and, desc, eq, lt, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type { DatabaseClient } from '../../db/client.js';
import { posts } from '../../db/schema.js';
import {
  decodeCursor,
  encodeCursor,
  parsePaginationQuery,
} from '../../lib/cursorPagination.js';

type PostsResponseItem = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
  tags: string[];
  readingTimeText: string | null;
  readingTimeMinutes: number | null;
};

type PostsListResponse = {
  data: PostsResponseItem[];
  page: {
    nextCursor: string | null;
    hasMore: boolean;
    asOf: string;
  };
};

type PostDetailResponse = {
  data: {
    slug: string;
    title: string;
    summary: string;
    bodyMarkdown: string;
    publishedAt: string;
    updatedAt: string;
    updatedAtSource: string | null;
    author: string | null;
    featured: boolean;
    tags: string[];
    readingTimeText: string | null;
    readingTimeMinutes: number | null;
  };
};

const listPosts = async (
  databaseClient: DatabaseClient,
  query: unknown,
): Promise<{ payload: PostsListResponse } | { error: string }> => {
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

  const activePostsCondition = eq(posts.isActive, true);
  const cursorCondition = cursorPosition
    ? or(
        lt(posts.publishedAt, cursorPosition.updatedAt),
        and(
          eq(posts.publishedAt, cursorPosition.updatedAt),
          lt(posts.id, cursorPosition.id),
        ),
      )
    : undefined;

  const whereCondition = cursorCondition
    ? and(activePostsCondition, cursorCondition)
    : activePostsCondition;

  const records = await databaseClient
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      featured: posts.featured,
      tags: posts.tags,
      readingTimeText: posts.readingTimeText,
      readingTimeMinutes: posts.readingTimeMinutes,
    })
    .from(posts)
    .where(whereCondition)
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(parsedQuery.limit + 1);

  const hasMore = records.length > parsedQuery.limit;
  const pageRecords = hasMore ? records.slice(0, parsedQuery.limit) : records;
  const lastRecord = pageRecords[pageRecords.length - 1];

  const nextCursor =
    hasMore && lastRecord
      ? encodeCursor({
          updatedAt: lastRecord.publishedAt,
          id: lastRecord.id,
        })
      : null;

  return {
    payload: {
      data: pageRecords.map((record) => ({
        slug: record.slug,
        title: record.title,
        summary: record.summary,
        publishedAt: record.publishedAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        featured: record.featured,
        tags: record.tags,
        readingTimeText: record.readingTimeText,
        readingTimeMinutes: record.readingTimeMinutes,
      })),
      page: {
        nextCursor,
        hasMore,
        asOf: new Date().toISOString(),
      },
    },
  };
};

const getPostBySlug = async (
  databaseClient: DatabaseClient,
  slug: string,
): Promise<PostDetailResponse | null> => {
  const matchedRows = await databaseClient
    .select({
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      bodyMarkdown: posts.bodyMarkdown,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      updatedAtSource: posts.updatedAtSource,
      author: posts.author,
      featured: posts.featured,
      tags: posts.tags,
      readingTimeText: posts.readingTimeText,
      readingTimeMinutes: posts.readingTimeMinutes,
    })
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.isActive, true)))
    .limit(1);

  const matchedPost = matchedRows[0];

  if (!matchedPost) {
    return null;
  }

  return {
    data: {
      slug: matchedPost.slug,
      title: matchedPost.title,
      summary: matchedPost.summary,
      bodyMarkdown: matchedPost.bodyMarkdown,
      publishedAt: matchedPost.publishedAt.toISOString(),
      updatedAt: matchedPost.updatedAt.toISOString(),
      updatedAtSource: matchedPost.updatedAtSource?.toISOString() ?? null,
      author: matchedPost.author,
      featured: matchedPost.featured,
      tags: matchedPost.tags,
      readingTimeText: matchedPost.readingTimeText,
      readingTimeMinutes: matchedPost.readingTimeMinutes,
    },
  };
};

export const registerPostsRoute = (
  app: FastifyInstance,
  databaseClient: DatabaseClient,
): void => {
  app.get('/v1/posts', async (request, reply): Promise<void> => {
    const response = await listPosts(databaseClient, request.query);

    if ('error' in response) {
      await reply.code(400).send({ error: response.error });
      return;
    }

    await reply.code(200).send(response.payload);
  });

  app.get('/v1/posts/:slug', async (request, reply): Promise<void> => {
    const slug = (request.params as { slug: string }).slug;
    const post = await getPostBySlug(databaseClient, slug);

    if (!post) {
      await reply.code(404).send({ error: 'not_found' });
      return;
    }

    await reply.code(200).send(post);
  });
};
