/**
 * The search rank constants and route limits, apart from the search pipeline so
 * the reader-facing reference page can render them without importing the server
 * index into the browser bundle (plan 610). `src/lib/search.ts` re-exports every
 * value here, so nothing that already imported them changes.
 */

/** How many results the route returns when `limit` is absent or unparseable. */
export const DEFAULT_SEARCH_LIMIT = 10;

/** The largest `limit` the route honours; the merge ranks at this width. */
export const MAX_SEARCH_LIMIT = 50;

/** A summary names the page's subject one tier below its own title. */
export const DESCRIPTION_MATCH_RANK = 4;

/**
 * A one-edit typo of a single word is a candidate, never a winner over a real
 * match (plan 607): one above the highest real rank (`3` for a summary phrase,
 * offset by `DESCRIPTION_MATCH_RANK`).
 */
export const TYPO_MATCH_RANK = 8;

/**
 * A phrase whose every word names a word of one whole title or alias is name
 * evidence, not prose (plan 608): it sits with a real word-level name match
 * (`2`).
 */
export const PHRASE_TYPO_MATCH_RANK = 2;
