import type { SortedResult } from "fumadocs-core/search";
import {
  createFromSource,
  createSearchAPI,
  type Index,
} from "fumadocs-core/search/server";
import { components } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { source } from "./source";

export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;

/**
 * A planned component has no page, so its result must not pretend it does. It
 * opens the index with the filter applied (plan 421), where the honest status
 * and the component's row are.
 */
export const componentSearchUrl = (
  component: Pick<ComponentMetaInput, "slug" | "status" | "title">,
): string =>
  component.status === "planned"
    ? `/docs/components?q=${encodeURIComponent(component.title)}`
    : `/docs/components/${component.slug}`;

/**
 * One simple-search document per registry record (plan 419). The page index is
 * built from MDX, so it never sees the rendered component records; without
 * this, searching for a component from another page returns nothing.
 */
export const componentSearchIndex = (component: ComponentMetaInput): Index => ({
  title:
    component.status === "planned"
      ? `${component.title} (planned)`
      : component.title,
  description: component.summary,
  content: `${component.title}\n${component.summary}`,
  url: componentSearchUrl(component),
  breadcrumbs: ["Components"],
  keywords: component.packageName,
});

const pageSearch = createFromSource(source);

const registrySearch = createSearchAPI("simple", {
  indexes: components.map(componentSearchIndex),
});

/** A component URL (page or filtered index) back to the record that owns it. */
const componentByUrl = new Map(
  components.map((component) => [componentSearchUrl(component), component]),
);

/**
 * How closely a component title matches a query: `0` equal, `1` prefix, `2` a
 * word prefix, `3` substring anywhere, `undefined` no title match. A component
 * name is the strongest signal a reader can give ⌘K, so it is scored, not left
 * to the index's body-text ranking (plan 431).
 */
const matchRank = (title: string, query: string): number | undefined => {
  const normalized = title.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  if (normalized === needle) return 0;
  if (normalized.startsWith(needle)) return 1;
  if (normalized.split(/[^a-z0-9]+/).some((word) => word.startsWith(needle)))
    return 2;
  return normalized.includes(needle) ? 3 : undefined;
};

interface Candidate {
  readonly result: SortedResult;
  readonly index: number;
  readonly rank: number;
  readonly titleLength: number;
}

/**
 * Merges the two indexes into one ranked list (plan 431). A component title
 * match moves ahead of prose; everything else keeps plan 419's order — page
 * results first, registry hits in the tail. Ties break on the shorter title
 * (`Buttons` before `Button groups`) and then on the index's own order. One
 * entry survives per page URL, so a delivered component is not listed once as
 * a page and again as a registry record.
 *
 * Native `sort`/`Set` are deliberate: `effect` must not reach the docs bundle
 * (`architecture.test.ts`, plan 410 §2).
 */
export const mergeResults = (
  pageResults: ReadonlyArray<SortedResult>,
  registryResults: ReadonlyArray<SortedResult>,
  query: string,
): ReadonlyArray<SortedResult> => {
  const ranked = [...pageResults, ...registryResults]
    .map((result, index): Candidate => {
      const component = componentByUrl.get(result.url);
      const rank =
        component === undefined ? undefined : matchRank(component.title, query);
      return {
        result,
        index,
        rank: rank ?? Number.POSITIVE_INFINITY,
        titleLength: component?.title.length ?? 0,
      };
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.titleLength - right.titleLength ||
        left.index - right.index,
    );

  const seenPages = new Set<string>();
  return ranked
    .map((candidate) => candidate.result)
    .filter((result) => {
      if (result.type !== "page") return true;
      if (seenPages.has(result.url)) return false;
      seenPages.add(result.url);
      return true;
    });
};

/**
 * Both indexes are queried at the widest supported limit so the merge can rank
 * candidates; the caller's limit caps the answer. An empty query has no answer:
 * the page index would otherwise return arbitrary prose (plan 431).
 */
export const search = async (
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): Promise<ReadonlyArray<SortedResult>> => {
  if (query.trim().length === 0) return [];
  const [pageResults, registryResults] = await Promise.all([
    pageSearch.search(query, { limit: MAX_SEARCH_LIMIT }),
    registrySearch.search(query, { limit: MAX_SEARCH_LIMIT }),
  ]);
  return mergeResults(pageResults, registryResults, query).slice(0, limit);
};

/** Parses the route's `limit`; anything unparseable or out of range falls back. */
export const parseSearchLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed)
    ? DEFAULT_SEARCH_LIMIT
    : Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
};
