import type { Index } from "fumadocs-core/search/server";

/**
 * A search document whose rows are rendered React from package data rather than
 * authored MDX, so the Fumadocs page index cannot see them (plans 419, 490, 504,
 * 505). `names` are the names the document is **promoted** for: a query that
 * matches one outranks prose, the same way a component's title does.
 *
 * Producers choose the names carefully. A plain word (`input`, `label`, `theme`)
 * is never promoted, so the page that owns the word keeps the first result.
 */
export interface GeneratedSearchEntry {
  readonly index: Index;
  readonly names: ReadonlyArray<string>;
  /**
   * A precise symbol name (a state type) matches whole only: letting its words
   * prefix-match would promote `MenuCheckboxItemState` for `checkboxState` and
   * steal the exported helper's page (plan 623).
   */
  readonly exactNamesOnly?: boolean;
}

/**
 * A partial name match must never outrank a whole-query match (plans 561, 564).
 * The same rank separates a component's token match from its whole-name match.
 */
export const TOKEN_MATCH_RANK = 4;

/**
 * A camelCase, dotted or hyphenated name is distinctive enough to promote. A
 * plain word (`input`, `label`, `theme`) is indexed but never promoted, so the
 * page that owns the word keeps the first result (plans 504, 505, 569).
 */
export const isDistinctiveName = (name: string): boolean =>
  /[A-Z]/.test(name) || /[.-]/.test(name);

/** Words split on camelCase, acronym boundaries and punctuation, lowercased. */
const words = (value: string): ReadonlyArray<string> =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);

/** The words a reader typed; a single character cannot name anything. */
const queryWords = (query: string): ReadonlyArray<string> =>
  words(query).filter((word) => word.length > 1);

/** `true` when every query word prefixes a word of one promoted name. */
const namesVariant = (names: ReadonlyArray<string>, query: string): boolean => {
  const terms = queryWords(query);
  if (terms.length < 2) return false;
  return names.some((name) => {
    const nameWords = words(name);
    return terms.every((term) =>
      nameWords.some((word) => word.startsWith(term)),
    );
  });
};

/**
 * The rank a generated document earns for a query (plans 504, 564).
 *
 * - `0` — the query is exactly one of the entry's promoted names.
 * - `TOKEN_MATCH_RANK` — the query has at least two words and every word names
 *   part of one promoted name (`file tree` → `File trees`, `primary
 *   foreground` → `primaryForeground`, `chevrons up down` →
 *   `chevrons-up-down`).
 * - `undefined` — no match, including every single plain word. `input` must
 *   keep its component page, not promote `inputForeground`.
 */
export const promotedNameRank = (
  entry: GeneratedSearchEntry | undefined,
  query: string,
): number | undefined => {
  const needle = query.trim().toLowerCase();
  if (entry === undefined || needle.length === 0) return undefined;
  if (entry.names.some((name) => name.toLowerCase() === needle)) return 0;
  if (entry.exactNamesOnly === true) return undefined;
  return namesVariant(entry.names, query) ? TOKEN_MATCH_RANK : undefined;
};
