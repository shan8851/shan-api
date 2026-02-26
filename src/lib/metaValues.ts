export const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const extractStringMetaValue = (metaValue: unknown): string | null => {
  if (typeof metaValue === 'string') {
    return metaValue;
  }

  if (isRecord(metaValue)) {
    const objectValue = metaValue.value;

    if (typeof objectValue === 'string') {
      return objectValue;
    }
  }

  return null;
};

export const toIsoString = (
  value: Date | string | null | undefined,
): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
};
