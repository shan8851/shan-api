import { z } from 'zod';

export const defaultPageLimit = 20;
export const maxPageLimit = 50;

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  cursor: z.string().trim().min(1).optional(),
});

export type CursorPosition = {
  updatedAt: Date;
  id: number;
};

type PaginationQuerySuccess = {
  limit: number;
  cursor: string | null;
};

type PaginationQueryError = {
  error: string;
};

export const parsePaginationQuery = (
  query: unknown,
): PaginationQuerySuccess | PaginationQueryError => {
  const parsedQuery = paginationQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    return { error: 'Invalid query parameters' };
  }

  const requestedLimit = parsedQuery.data.limit ?? defaultPageLimit;

  return {
    limit: Math.min(requestedLimit, maxPageLimit),
    cursor: parsedQuery.data.cursor ?? null,
  };
};

export const encodeCursor = (cursorPosition: CursorPosition): string =>
  Buffer.from(
    `${cursorPosition.updatedAt.toISOString()}:${cursorPosition.id}`,
  ).toString('base64url');

export const decodeCursor = (cursor: string): CursorPosition | null => {
  let decodedCursor: string;

  try {
    decodedCursor = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const separatorIndex = decodedCursor.lastIndexOf(':');

  if (separatorIndex <= 0) {
    return null;
  }

  const updatedAtSegment = decodedCursor.slice(0, separatorIndex);
  const idSegment = decodedCursor.slice(separatorIndex + 1);

  const cursorId = Number(idSegment);
  const cursorUpdatedAt = new Date(updatedAtSegment);

  if (!Number.isSafeInteger(cursorId) || cursorId <= 0) {
    return null;
  }

  if (Number.isNaN(cursorUpdatedAt.getTime())) {
    return null;
  }

  return {
    id: cursorId,
    updatedAt: cursorUpdatedAt,
  };
};
