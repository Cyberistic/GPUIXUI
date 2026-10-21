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
import { automationSearchEntry } from "./automation-search";
import { capabilitySearchEntry } from "./capability-search";
import { aliasesFor } from "./component-aliases";
import {
  promotedNameRank,
  TOKEN_MATCH_RANK,
  type GeneratedSearchEntry,
} from "./generated-search";
import { iconSearchEntry } from "./icon-search";
import { hostPropsSearchEntry } from "./host-props-search";
import { layeringSearchEntry } from "./layering-search";
import { pageAliasRank, pageAliases } from "./page-aliases";
import { partStatesSearchEntry } from "./part-states-search";
import { platformSearchEntry } from "./platform-search";
import { refSearchEntry } from "./ref-search";
import { roadmapSearchEntry } from "./roadmap-search";
import {
  sceneInstructionByUrl,
  sceneInstructionHits,
  sceneInstructionRank,
  scenesIndexEntry,
} from "./scene-search";
import { source } from "./source";
import { siteOutputSearchEntry } from "./site-output-search";
import { stylingSearchEntry } from "./styling-search";
import { nativeElementsSearchEntry } from "./native-elements-search";
import { nativeTextSearchEntry } from "./native-text-search";
import { troubleshootingErrorSearchEntry } from "./troubleshooting-error-search";
import { selectionSearchEntry } from "./selection-search";
import { testingSearchEntry } from "./testing-search";
import { tokenSearchEntries } from "./token-search";
import { tokensApiSearchEntry } from "./tokens-api-search";
import { updaterSearchEntry } from "./updater-search";
import { eventsSearchEntry } from "./events-search";
import { stem, typoMatch, type TypoName } from "./typo";
import {
  DEFAULT_SEARCH_LIMIT,
  DESCRIPTION_MATCH_RANK,
  MAX_SEARCH_LIMIT,
  PHRASE_TYPO_MATCH_RANK,
  TYPO_MATCH_RANK,
} from "./search-ranks";

export {
  DEFAULT_SEARCH_LIMIT,
  DESCRIPTION_MATCH_RANK,
  MAX_SEARCH_LIMIT,
  PHRASE_TYPO_MATCH_RANK,
  TYPO_MATCH_RANK,
};

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
    component.slug,
    ...component.parts.map((part) => part.name),
    ...component.api,
    ...aliasesFor(component.slug),
  ].join("\n"),
  url: componentSearchUrl(component),
  breadcrumbs: ["Components"],
  keywords: [
    component.packageName,
    component.slug,
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

/**
 * Every docs-owned document: rendered React from package data, so the page index
 * never sees it. The Site search page renders this list, and a test compares the
 * page's copy with it (plan 610).
 */
export const generatedSearchEntries: ReadonlyArray<GeneratedSearchEntry> = [
  accessibilitySearchEntry,
  hostPropsSearchEntry,
  layeringSearchEntry,
  partStatesSearchEntry,
  refSearchEntry,
  ...tokenSearchEntries,
  tokensApiSearchEntry,
  capabilitySearchEntry,
  iconSearchEntry,
  platformSearchEntry,
  roadmapSearchEntry,
  scenesIndexEntry,
  siteOutputSearchEntry,
  stylingSearchEntry,
  nativeElementsSearchEntry,
  nativeTextSearchEntry,
  troubleshootingErrorSearchEntry,
  selectionSearchEntry,
  testingSearchEntry,
  automationSearchEntry,
  updaterSearchEntry,
  eventsSearchEntry,
];

const generatedByUrl = new Map(
  generatedSearchEntries.map((entry) => [entry.index.url, entry]),
);

const registrySearch = createSearchAPI("simple", {
  indexes: [
    ...components.map(componentSearchIndex),
    valueSearchIndex,
    ...generatedSearchEntries.map((entry) => entry.index),
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
 * Every name a one-edit query can be a misspelling of (plan 607): a component's
 * title, slug, exported symbols, declared parts and reader aliases; every page
 * title; and every editorial page alias. The component URL is
 * `componentSearchUrl`, so a planned record still opens the filtered index. A
 * title is a `name`; an alias is vocabulary and ranks one tier below it.
 */
const typoNames: ReadonlyArray<TypoName> = [
  ...components.flatMap((component) => {
    const url = componentSearchUrl(component);
    return [
      ...[
        component.title,
        component.slug,
        ...componentSymbols(component),
        ...component.parts.map((part) => part.name),
      ].map((name): TypoName => ({ name, url, kind: "name" })),
      ...aliasesFor(component.slug).map(
        (name): TypoName => ({ name, url, kind: "alias" }),
      ),
    ];
  }),
  ...source.getPages().map(
    (page): TypoName => ({
      name: page.data.title,
      url: page.url,
      kind: "page",
    }),
  ),
  ...[...pageAliases].flatMap(([url, terms]) =>
    terms.map((name): TypoName => ({ name, url, kind: "alias" })),
  ),
];

/**
 * The stems of the words in a name, in order.
 *
 * Stems are compared only in `matchRank` and in `descriptionMatchRank`'s
 * whole-word tier, after the exact and prefix tiers, so an exact name still
 * wins and a fragment inside a word is still rank `3` (plans 585, 593). The
 * inflection rules themselves, including the guard that stops `used` → `us`,
 * live in `stem` (`typo.ts`), because the typo tier compares the same words
 * (plan 607).
 */
const stems = (value: string): ReadonlyArray<string> =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0)
    .map(stem);

/**
 * How closely a component name matches a query: `0` equal, `1` prefix, `2` a
 * word prefix, `3` a word suffix, `undefined` no match. A component name
 * is the strongest signal a reader can give ⌘K, so it is scored, not left to
 * the index's body-text ranking (plan 431).
 *
 * The word tiers also compare stems (plan 585), so a title in another
 * inflection (`Theming`, `GPUix capabilities`) is still named by the query,
 * while the suffix tier keeps plan 568's whole-spelling rule.
 */
const matchRank = (name: string, query: string): number | undefined => {
  const normalized = name.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  if (normalized === needle) return 0;
  if (normalized.startsWith(needle)) return 1;
  const nameWords = normalized.split(/[^a-z0-9]+/);
  if (nameWords.some((word) => word.startsWith(needle))) return 2;
  const queryStem = stem(needle);
  const wordStems = stems(normalized);
  if (nameWords.length === 1 && wordStems[0] === queryStem) return 1;
  if (wordStems.some((word) => word === queryStem)) return 2;
  /**
   * A three-letter fragment is too weak to name a page: `log` is a substring
   * of `Dialogs` and used to outrank the page that owns log viewers. A longer
   * fragment must **end** a word — `picker` in `datepicker` — because a
   * fragment buried in the middle (`graph` in `typography`) is a coincidence,
   * not a name (plans 431, 594).
   */
  return needle.length >= 4 && nameWords.some((word) => word.endsWith(needle))
    ? 3
    : undefined;
};

/** Words that can name something; a single character is noise. */
const queryTerms = (query: string): ReadonlyArray<string> =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);

/**
 * Closed-class English words: articles, prepositions, conjunctions, pronouns,
 * auxiliaries and wh-words (plan 630). They are grammar, not names, and a query
 * made only of them names nothing. `to` is a prefix of Toggle and Tooltip, so
 * `how to theme the app` returned Toggle before Theming. A real short name
 * (`tab`, `box`) is not in this set and keeps its page.
 */
const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "should",
  "so",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "up",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

/**
 * The best rank a name list earns for a query, in two tiers (plan 561).
 *
 * A whole-query match keeps plan 431's ranks (`0–3`). When the query is a
 * phrase, each word is tried against every name and its rank is offset by
 * `TOKEN_MATCH_RANK`, so `popover placement` still reaches `Popovers` while
 * `command palette` prefers the page whose own title matches the whole phrase.
 * A function word is never evidence (plan 630).
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

  const whole = FUNCTION_WORDS.has(query.trim().toLowerCase())
    ? undefined
    : best(query);
  if (whole !== undefined) return whole;

  const tokens = queryTerms(query)
    .filter((term) => !FUNCTION_WORDS.has(term))
    .flatMap((term) => {
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
/**
 * An alias names the query, not the other way round (plan 579). The generic
 * `matchRank` also matches a word inside a multiword name, so `panel` matched
 * the alias `side panel` and stole the Workspace subject. An alias therefore
 * matches only the whole name or a query prefix of it.
 */
const aliasMatchRank = (alias: string, query: string): number | undefined => {
  const name = alias.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  if (name === needle) return 0;
  return name.startsWith(needle) ? 1 : undefined;
};

const aliasRank = (
  component: ComponentMetaInput,
  query: string,
): number | undefined => {
  const ranks = aliasesFor(component.slug).flatMap((alias) => {
    const rank = aliasMatchRank(alias, query);
    return rank === undefined ? [] : [rank];
  });
  return ranks.length === 0 ? undefined : Math.min(...ranks);
};

/**
 * A declared part is a name a reader types (`CardTitle`, `DialogClose`), and
 * the Fumadocs index only knows it as prose inside the page, so without this it
 * never outranks an arbitrary heading that happens to mention it (plan 580).
 * A part name two compound records share (`MenuGroup`) ranks both; the existing
 * tie-break picks one, and the shared name cannot honestly pick a single page.
 */
const componentNames = (
  component: Pick<ComponentMetaInput, "slug" | "title" | "api" | "parts">,
): ReadonlyArray<string> => [
  component.slug,
  component.title,
  ...componentSymbols(component),
  ...component.parts.map((part) => part.name),
];

const componentRank = (
  component: ComponentMetaInput,
  query: string,
): number | undefined => {
  const ranks = [
    nameRank(componentNames(component), query),
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
 * (`lab` in `collaboration`) never matches. A whole word is compared by stem
 * too (plan 593), so `resize` matches the summary's `resizable`; the prefix and
 * phrase tiers keep the literal spelling.
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
  const needleStem = stem(needle);
  if (words.some((word) => stem(word) === needleStem)) return 1;
  if (words.some((word) => word.startsWith(needle))) return 2;

  const terms = queryTerms(query);
  return terms.length > 1 &&
    terms.every((term) => words.some((word) => word.startsWith(term)))
    ? 3
    : undefined;
};

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

/**
 * A page whose alias names the query is a candidate even when no index
 * returned it (`demo`, `sample`) — the rule `pageTitleHits` uses (plan 598).
 */
export const pageAliasHits = (
  query: string,
  pages: ReadonlyMap<string, PageMetadata>,
): ReadonlyArray<SortedResult> =>
  [...pages].flatMap(([url, page]) =>
    pageAliasRank(url, query) === undefined
      ? []
      : [
          {
            id: `page-alias:${url}`,
            url,
            type: "page" as const,
            content: page.title,
          },
        ],
  );

/**
 * A generated document whose promoted name matches is a candidate even when the
 * lexical index never returned it (plan 569): the index tokenises `focusRing`
 * as one word, so `focus ring` never retrieves the table that names it. The
 * synthesis applies the rule `pageTitleHits` uses for titles; the rank itself
 * still comes from `promotedNameRank` in `mergeResults`.
 */
export const generatedNameHits = (
  query: string,
  entries: ReadonlyArray<GeneratedSearchEntry> = generatedSearchEntries,
): ReadonlyArray<SortedResult> =>
  entries.flatMap((entry) =>
    promotedNameRank(entry, query) === undefined
      ? []
      : [
          {
            id: `generated-name:${entry.index.url}`,
            url: entry.index.url,
            type: "page" as const,
            content: entry.index.title,
          },
        ],
  );

/**
 * A page whose name a one-edit query misspells is a candidate even when the
 * lexical index answered it with unrelated prose or nothing at all (plan 607):
 * `acordian` and `dropdwon` returned no result before this, and `botton`
 * returned Toggle. The synthesis applies the rule `pageTitleHits` uses; the
 * rank still comes from `TYPO_MATCH_RANK` in `mergeResults`.
 */
export const typoHits = (
  query: string,
  names: ReadonlyArray<TypoName> = typoNames,
): ReadonlyArray<SortedResult> => {
  const target = typoMatch(query, names);
  return target === undefined
    ? []
    : [
        {
          id: `typo:${target.url}`,
          url: target.url,
          type: "page" as const,
          content: pageMetadata.get(target.url)?.title ?? target.name,
        },
      ];
};

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
 * as a page and again as a registry record. A one-edit misspelling of a name is
 * a candidate at `TYPO_MATCH_RANK` — below every real match — and only for the
 * page itself, never a text chunk at its URL (plan 607). `names` defaults to
 * empty so the fixture tests never depend on the real content tree; `search()`
 * passes the site's typo targets.
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
  scenes: ReadonlyMap<string, string> = new Map(),
  names: ReadonlyArray<TypoName> = [],
): ReadonlyArray<SortedResult> => {
  const typo = typoMatch(query, names);
  const ranked = [...pageResults, ...registryResults]
    .map((result, index): Candidate => {
      const component = componentByUrl.get(result.url);
      /**
       * Only the document itself earns its promoted name; a text chunk inside
       * the same URL (the Tokens API function table) is prose (plan 569).
       */
      const generated =
        result.type === "page" ? generatedByUrl.get(result.url) : undefined;
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
      /**
       * Only the page itself earns an editorial alias; a text chunk at the same
       * URL is prose (plan 598).
       */
      const aliasRank =
        result.type === "page" ? pageAliasRank(result.url, query) : undefined;
      /**
       * Only the page itself earns a typo hit; a text chunk at the same URL is
       * prose, the rule plan 569 set for generated documents (plan 607). A
       * whole-phrase typo is name evidence and scores with a real word match;
       * a single misspelled word stays below every real rank (plan 608).
       */
      const typoRank =
        typo !== undefined && result.type === "page" && typo.url === result.url
          ? typo.phrase
            ? PHRASE_TYPO_MATCH_RANK
            : TYPO_MATCH_RANK
          : undefined;
      const ranks = [
        aliasRank,
        component === undefined ? undefined : componentRank(component, query),
        promotedNameRank(generated, query),
        sceneInstructionRank(scenes.get(result.url), query),
        pageTitleRank,
        descriptionRank === undefined
          ? undefined
          : descriptionRank + DESCRIPTION_MATCH_RANK,
        typoRank,
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
      ...pageAliasHits(query, pageMetadata),
      ...generatedNameHits(query),
      ...typoHits(query),
      ...sceneInstructionHits(query),
      ...registryResults,
    ],
    query,
    pageMetadata,
    sceneInstructionByUrl,
    typoNames,
  ).slice(0, limit);
};

/** Parses the route's `limit`; anything unparseable or out of range falls back. */
export const parseSearchLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed)
    ? DEFAULT_SEARCH_LIMIT
    : Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
};
