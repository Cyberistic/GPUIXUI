import type { SearchLink } from "fumadocs-ui/contexts/search";

/**
 * What the search dialog offers before a reader types.
 *
 * Fumadocs renders no list until a query has run, so a dialog opened with `⌘K`
 * was a blank panel. These are the entry points a first-time reader arrives for
 * plus the two indexes worth browsing. Every URL is a page this site mounts —
 * `search-links.test.ts` resolves each one to the file that serves it.
 */
export const searchLinks: SearchLink[] = [
  ["Getting started", "/docs/getting-started"],
  ["Installation", "/docs/installation"],
  ["Components", "/docs/components"],
  ["Primitives", "/docs/primitives"],
  ["Patterns", "/docs/patterns"],
  ["Theming", "/docs/theming"],
];
