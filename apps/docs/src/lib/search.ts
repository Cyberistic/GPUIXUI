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

/**
 * Page results first — the docs are prose and keep their ranking — then
 * registry results, whose names have no page text to match. One limit caps the
 * merged list so the response stays bounded.
 */
export const search = async (
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): Promise<ReadonlyArray<SortedResult>> => {
  const [pageResults, registryResults] = await Promise.all([
    pageSearch.search(query, { limit }),
    registrySearch.search(query, { limit }),
  ]);
  return [...pageResults, ...registryResults].slice(0, limit);
};

/** Parses the route's `limit`; anything unparseable or out of range falls back. */
export const parseSearchLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed)
    ? DEFAULT_SEARCH_LIMIT
    : Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
};
