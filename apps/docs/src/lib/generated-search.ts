import type { Index } from "fumadocs-core/search/server";

/**
 * A search document whose rows are rendered React from package data rather than
 * authored MDX, so the Fumadocs page index cannot see them (plans 419, 490, 504,
 * 505). `names` are the exact names the document is **promoted** for: a query
 * that matches one outranks prose, the same way a component's title does.
 *
 * Producers choose the names carefully. A plain word (`input`, `label`, `theme`)
 * is never promoted, so the page that owns the word keeps the first result.
 */
export interface GeneratedSearchEntry {
  readonly index: Index;
  readonly names: ReadonlyArray<string>;
}

/** `0` when `query` is exactly one of the entry's promoted names. */
export const exactNameRank = (
  entry: GeneratedSearchEntry | undefined,
  query: string,
): number | undefined => {
  const needle = query.trim().toLowerCase();
  if (entry === undefined || needle.length === 0) return undefined;
  return entry.names.some((name) => name.toLowerCase() === needle)
    ? 0
    : undefined;
};
