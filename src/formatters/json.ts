function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([key, nested]) => [key, sortValue(nested)]));
  }

  return value;
}

export function toStableJson(input: unknown, pretty = true): string {
  const normalized = sortValue(input);
  return `${JSON.stringify(normalized, null, pretty ? 2 : 0)}\n`;
}
