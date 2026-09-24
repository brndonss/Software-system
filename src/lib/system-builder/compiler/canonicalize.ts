export function normalizeCanonicalString(value: string): string {
  return value.normalize("NFKC").trim();
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortCanonicalValue(value));
}

export function sortCanonicalValue(value: unknown): unknown {
  if (typeof value === "string") return normalizeCanonicalString(value);
  if (Array.isArray(value)) return value.map(sortCanonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortCanonicalValue(entry)]),
    );
  }
  return value;
}

export function sortByKey<T extends { key: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.key.localeCompare(right.key));
}
