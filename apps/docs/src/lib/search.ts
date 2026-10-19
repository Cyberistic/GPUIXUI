import type { SortedResult } from "fumadocs-core/search";
import {
  createFromSource,
  createSearchAPI,
  type Index,
} from "fumadocs-core/search/server";
import { components } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { componentSymbols } from "@/component-meta/symbols";
import { accessibilitySearchEntry } from "./accessibility-search";
import { valueExports } from "./api-values.generated";
import { capabilitySearchEntry } from "./capability-search";
import { aliasesFor } from "./component-aliases";
import {
  promotedNameRank,
  TOKEN_MATCH_RANK,
  type GeneratedSearchEntry,
} from "./generated-search";
import { iconSearchEntry } from "./icon-search";
import { roadmapSearchEntry } from "./roadmap-search";
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
    ...aliasesFor(component.slug),
  ].join("\n"),
  url: componentSearchUrl(component),
  breadcrumbs: ["Components"],
  keywords: [
    component.packageName,
    ...component.parts.map((part) => part.name),
    ...component.api,
    ...aliasesFor(component.slug),
  ].join(" "),
});

const pageSearch = createFromSource(source);

/**
 * A page's authored metadata; the two fields the ranker reads.
 *
 * `description` is optional because Fumadocs' `PageData` declares it so — the
 * app is a browser bundle where `effect` may not appear (`architecture.test.ts`),
 * so the boundary shape is kept rather than converted to `Option`.
 */
export interface PageMetadata {
  readonly title: string;
  readonly description: string | undefined;
}

/**
 * Every authored page, keyed by URL, read once at module load (plan 568). The
 * Fumadocs page index knows the body, not the frontmatter summary, so this is
 * the only place the description is available to ranking.
 */
const pageMetadata = new Map<string, PageMetadata>(
  source
    .getPages()
    .map((page) => [
      page.url,
      { title: page.data.title, description: page.data.description },
    ]),
);

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
  accessibilitySearchEntry,
  ...tokenSearchEntries,
  capabilitySearchEntry,
  iconSearchEntry,
  roadmapSearchEntry,
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
 * The pages whose summary can be their search identity: every authored page
 * without a component record (plan 568). A component already has a title,
 * symbols and aliases, so its summary never ranks and never needs a synthetic
 * hit.
 */
const summaryPages = new Map(
  [...pageMetadata].filter(([url]) => !componentByUrl.has(url)),
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

/** Words that can name something; a single character is noise. */
const queryTerms = (query: string): ReadonlyArray<string> =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);

/**
 * The best rank a name list earns for a query, in two tiers (plan 561).
 *
 * A whole-query match keeps plan 431's ranks (`0–3`). When the query is a
 * phrase, each word is tried against every name and its rank is offset by
 * `TOKEN_MATCH_RANK`, so `popover placement` still reaches `Popovers` while
 * `command palette` prefers the page whose own title matches the whole phrase.
 */
const nameRank = (
  names: ReadonlyArray<string>,
  query: string,
): number | undefined => {
  const best = (needle: string): number | undefined => {
    const ranks = names.flatMap((name) => {
      const rank = matchRank(name, needle);
      return rank === undefined ? [] : [rank];
    });
    return ranks.length === 0 ? undefined : Math.min(...ranks);
  };

  const whole = best(query);
  if (whole !== undefined) return whole;

  const tokens = queryTerms(query).flatMap((term) => {
    const rank = best(term);
    return rank === undefined ? [] : [rank + TOKEN_MATCH_RANK];
  });
  return tokens.length === 0 ? undefined : Math.min(...tokens);
};

/**
 * The best rank a record earns for a query. Its title, every exported name its
 * props types imply, and the reader's own vocabulary (plan 566) are names a
 * reader can type: `Spinner` is what the consumer imports even though the page
 * is titled "Loading indicators", and `textbox` is what a reader types for
 * "Text inputs".
 *
 * An alias is matched as a whole query only. A phrase keeps `nameRank`'s token
 * rule for titles, so `modal focus` still reaches the `modal-focus-trap`
 * capability row instead of the Dialogs page merely because one of its aliases
 * is `modal`.
 */
const aliasRank = (
  component: ComponentMetaInput,
  query: string,
): number | undefined => {
  const ranks = aliasesFor(component.slug).flatMap((alias) => {
    const rank = matchRank(alias, query);
    return rank === undefined ? [] : [rank];
  });
  return ranks.length === 0 ? undefined : Math.min(...ranks);
};

const componentRank = (
  component: ComponentMetaInput,
  query: string,
): number | undefined => {
  const ranks = [
    nameRank([component.title, ...componentSymbols(component)], query),
    aliasRank(component, query),
  ].filter((rank): rank is number => rank !== undefined);
  return ranks.length === 0 ? undefined : Math.min(...ranks);
};

/**
 * The same rule for hand-authored pages: the page index can answer a title
 * query with body headings and omit the page itself (`theming` returned the 44th
 * result, a heading, and no `/docs/theming`). A page whose own title names the
 * query is a candidate by definition.
 */
const pageTitleHits = (query: string): ReadonlyArray<SortedResult> =>
  source.getPages().flatMap((page) =>
    nameRank([page.data.title], query) === undefined
      ? []
      : [
          {
            id: `page-title:${page.url}`,
            url: page.url,
            type: "page" as const,
            content: page.data.title,
          },
        ],
  );

/**
 * The rank a page's authored description earns (plan 568): `0` the whole
 * description, `1` a whole word, `2` a word prefix, `3` every word of a phrase.
 * Unlike a title, a description is a sentence, so a **fragment** inside a word
 * (`lab` in `collaboration`) never matches.
 */
const descriptionMatchRank = (
  description: string,
  query: string,
): number | undefined => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  if (description.trim().toLowerCase() === needle) return 0;

  const words = description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
  if (words.includes(needle)) return 1;
  if (words.some((word) => word.startsWith(needle))) return 2;

  const terms = queryTerms(query);
  return terms.length > 1 &&
    terms.every((term) => words.some((word) => word.startsWith(term)))
    ? 3
    : undefined;
};

/** A summary names the page's subject one tier below its own title. */
export const DESCRIPTION_MATCH_RANK = 4;

/**
 * A page whose summary names the query is a candidate even when the page index
 * answered it with headings only or omitted it, the same rule `pageTitleHits`
 * applies to titles (plans 561, 568).
 */
export const pageDescriptionHits = (
  query: string,
  pages: ReadonlyMap<string, PageMetadata>,
): ReadonlyArray<SortedResult> =>
  [...pages].flatMap(([url, page]) =>
    page.description === undefined ||
    descriptionMatchRank(page.description, query) === undefined
      ? []
      : [
          {
            id: `page-description:${url}`,
            url,
            type: "page" as const,
            content: page.title,
          },
        ],
  );

interface Candidate {
  readonly result: SortedResult;
  readonly index: number;
  readonly rank: number;
  /** `0` when the result's own title names the query; otherwise `1` (plan 561). */
  readonly sourceRank: number;
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
 * prose; a page whose own title names the query is scored the same way (plan
 * 561), and a whole-query title match wins a tie against a generated row.
 * Everything else keeps plan 419's order: page results first, registry hits in
 * the tail. A URL can be both a component record and a generated
 * document (the Icons page owns its name catalogue), so a candidate takes the
 * best of the two ranks. A page's authored **description** names its subject one
 * tier below its title (plan 568), so `table` reaches Data display's summary
 * instead of a guide that mentions tables in passing. Ties break on the shorter
 * title (`Buttons` before `Button groups`) and then on the index's own order.
 * One entry survives per page URL, so a delivered component is not listed once
 * as a page and again as a registry record.
 *
 * `pages` defaults to empty so the fixture tests never depend on the content
 * tree; `search()` passes the real metadata map.
 *
 * Native `sort`/`Set` are deliberate: `effect` must not reach the docs bundle
 * (`architecture.test.ts`, plan 410 §2).
 */
export const mergeResults = (
  pageResults: ReadonlyArray<SortedResult>,
  registryResults: ReadonlyArray<SortedResult>,
  query: string,
  pages: ReadonlyMap<string, PageMetadata> = new Map(),
): ReadonlyArray<SortedResult> => {
  const ranked = [...pageResults, ...registryResults]
    .map((result, index): Candidate => {
      const component = componentByUrl.get(result.url);
      const generated = generatedByUrl.get(result.url);
      const page = result.type === "page" ? pages.get(result.url) : undefined;
      const pageTitleRank =
        result.type === "page" ? nameRank([result.content], query) : undefined;
      /**
       * Only a page that has no component record is scored by its summary
       * (plan 568). A component already has a title, exported symbols and
       * aliases; its summary is prose, and an incidental mention there
       * (`A categorised shortcut table…`) must not outrank the page that owns
       * the subject.
       */
      const descriptionRank =
        page?.description === undefined || component !== undefined
          ? undefined
          : descriptionMatchRank(page.description, query);
      const ranks = [
        component === undefined ? undefined : componentRank(component, query),
        promotedNameRank(generated, query),
        pageTitleRank,
        descriptionRank === undefined
          ? undefined
          : descriptionRank + DESCRIPTION_MATCH_RANK,
      ].filter((rank): rank is number => rank !== undefined);
      return {
        result,
        index,
        rank:
          ranks.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...ranks),
        sourceRank: pageTitleRank === undefined ? 1 : 0,
        titleLength:
          component?.title.length ??
          generated?.index.title.length ??
          page?.title.length ??
          (pageTitleRank === undefined ? 0 : result.content.length),
      };
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.sourceRank - right.sourceRank ||
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
    [
      ...pageTitleHits(query),
      ...pageDescriptionHits(query, summaryPages),
      ...registryResults,
    ],
    query,
    pageMetadata,
  ).slice(0, limit);
};

/** Parses the route's `limit`; anything unparseable or out of range falls back. */
export const parseSearchLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed)
    ? DEFAULT_SEARCH_LIMIT
    : Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
};
