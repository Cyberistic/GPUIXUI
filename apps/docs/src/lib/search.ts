import type { SortedResult } from "fumadocs-core/search";
import {
  createFromSource,
  createSearchAPI,
  type Index,
} from "fumadocs-core/search/server";
import { components } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { componentSymbols } from "@/component-meta/symbols";
import { valueExports } from "./api-values.generated";
import { capabilitySearchEntry } from "./capability-search";
import { exactNameRank, type GeneratedSearchEntry } from "./generated-search";
import { iconSearchEntry } from "./icon-search";
import { source } from "./source";
import { tokenSearchEntries } from "./token-search";

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
  content: [
    component.title,
    component.summary,
    ...component.parts.map((part) => part.name),
    ...component.api,
  ].join("\n"),
  url: componentSearchUrl(component),
  breadcrumbs: ["Components"],
  keywords: [
    component.packageName,
    ...component.parts.map((part) => part.name),
    ...component.api,
  ].join(" "),
});

const pageSearch = createFromSource(source);

/**
 * The generated value index is rendered React, not MDX prose, so the page index
 * never sees its rows — the same reason the component registry has its own
 * index (plans 419, 490). One document keeps every helper, hook, record and
 * icon value findable from ⌘K and sends the reader to the page that lists it.
 */
export const valueSearchIndex: Index = {
  title: "Values API",
  description:
    "Every function, hook, class, constant and inventory record the documented packages export.",
  content: valueExports
    .map((value) => `${value.name}: ${value.summary}`)
    .join("\n"),
  url: "/docs/api-values",
  breadcrumbs: ["API"],
  keywords: valueExports.map((value) => value.name).join(" "),
};

const generatedEntries: ReadonlyArray<GeneratedSearchEntry> = [
  ...tokenSearchEntries,
  capabilitySearchEntry,
  iconSearchEntry,
];

const generatedByUrl = new Map(
  generatedEntries.map((entry) => [entry.index.url, entry]),
);

const registrySearch = createSearchAPI("simple", {
  indexes: [
    ...components.map(componentSearchIndex),
    valueSearchIndex,
    ...generatedEntries.map((entry) => entry.index),
  ],
});

/** A component URL (page or filtered index) back to the record that owns it. */
const componentByUrl = new Map(
  components.map((component) => [componentSearchUrl(component), component]),
);

/**
 * How closely a component name matches a query: `0` equal, `1` prefix, `2` a
 * word prefix, `3` substring anywhere, `undefined` no match. A component name
 * is the strongest signal a reader can give ⌘K, so it is scored, not left to
 * the index's body-text ranking (plan 431).
 */
const matchRank = (name: string, query: string): number | undefined => {
  const normalized = name.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  if (normalized === needle) return 0;
  if (normalized.startsWith(needle)) return 1;
  if (normalized.split(/[^a-z0-9]+/).some((word) => word.startsWith(needle)))
    return 2;
  return normalized.includes(needle) ? 3 : undefined;
};

/**
 * The best rank a record earns for a query. Its title and every exported name
 * its props types imply are names a reader can type: `Spinner` is what the
 * consumer imports, even though the page is titled "Loading indicators"
 * (plan 500).
 */
const componentRank = (
  component: ComponentMetaInput,
  query: string,
): number | undefined => {
  const ranks = [component.title, ...componentSymbols(component)].flatMap(
    (name) => {
      const rank = matchRank(name, query);
      return rank === undefined ? [] : [rank];
    },
  );
  return ranks.length === 0 ? undefined : Math.min(...ranks);
};

interface Candidate {
  readonly result: SortedResult;
  readonly index: number;
  readonly rank: number;
  readonly titleLength: number;
}

/**
 * Generated prop tables are indexed by `fumadocs-typescript` as synthetic
 * headings and rows (`#type-table-…`), one per prop. They are not authored
 * prose, and their shared prop names (`aria-label`, `style`, `children`) match
 * almost any accessibility query, so a page with three tables could bury the
 * paragraph that answers the question (plan 479). The registry index still
 * makes every props **type** name findable (plan 442).
 */
const TYPE_TABLE_FRAGMENT = "#type-table-";

/** Drops generated type-table rows from the page index's results. */
export const withoutTypeTableRows = (
  results: ReadonlyArray<SortedResult>,
): ReadonlyArray<SortedResult> =>
  results.filter((result) => !result.url.includes(TYPE_TABLE_FRAGMENT));

/**
 * Merges the indexes into one ranked list (plan 431). A component name match —
 * its title or an exported name its props types imply (plan 500) — or an exact
 * promoted name from a generated document (`destructiveSoft`, `spacing.md`, a
 * scenario id, a hyphenated icon name; plans 504, 505 and 507) moves ahead of
 * prose; everything else keeps plan 419's order: page results first, registry
 * hits in the tail. A URL can be both a component record and a generated
 * document (the Icons page owns its name catalogue), so a candidate takes the
 * best of the two ranks. Ties break on the shorter title (`Buttons` before
 * `Button groups`) and then on the index's own order. One entry survives per
 * page URL, so a delivered component is not listed once as a page and again as
 * a registry record.
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
      const generated = generatedByUrl.get(result.url);
      const ranks = [
        component === undefined ? undefined : componentRank(component, query),
        exactNameRank(generated, query),
      ].filter((rank): rank is number => rank !== undefined);
      return {
        result,
        index,
        rank:
          ranks.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...ranks),
        titleLength:
          component?.title.length ?? generated?.index.title.length ?? 0,
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
  return mergeResults(
    withoutTypeTableRows(pageResults),
    registryResults,
    query,
  ).slice(0, limit);
};

/** Parses the route's `limit`; anything unparseable or out of range falls back. */
export const parseSearchLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed)
    ? DEFAULT_SEARCH_LIMIT
    : Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
};
