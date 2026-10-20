# 610 — Site search has a page: the two indexes, the ranking, the route, and how to index a new surface

Phase: F
Depends on: 410, 411, 419, 431, 442, 490, 500, 504, 505, 507, 524, 561, 564, 566, 568, 569, 570, 578, 580, 582, 587, 591, 598, 601, 607, 608, 609
Status: implemented

## 1. The measured defect

The site ships a search palette, a production search route, a ranking pipeline
and nineteen generated documents — and no page owns the subject. Measured
2026-10-20 at `6e3ac0a1` through the real `search()` the `/api/search` route
calls (harness in §4, step 1):

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `cmd k` | `/docs/component-pages` › *The gesture vocabulary* (text) | Site search |
| `cmd+k` | the same gesture-vocabulary text | Site search |
| `search index` | `/docs/components/search-input` (page) | Site search |
| `search ranking` | `/docs/components/search-input` (page) | Site search |
| `search results` | `/docs/components/search-input` (page) | Site search |
| `api/search` | `/docs/component-pages` › *Search vocabulary* (heading) | Site search |
| `ranking` | `/docs/components/range-slider` (page) | Site search |
| `lexical` | **(nothing)** | Site search |

Plan 608 §8.5 already recorded `search index` and `cmd k` as subjects "no page
states"; plan 569 and 570 recorded the opposite half — a generated surface is
invisible until someone adds an index document — but only in plan prose. Three
consequences:

1. **A reader cannot use what is undocumented.** `⌘K` / `Ctrl+K` is the site's
   only cross-page navigation shortcut, and no page tells a reader it exists.
2. **A contributor cannot extend search safely.** `PLAN.md` D32 states the rule
   ("every generated React surface owns a search index document"), but the rule
   lives in a decision table, not on the site; a new generated table ships
   unfindable unless its author has read the plans.
3. **`search` must not be stolen.** The Search input component owns the plain
   word today. The new page must be titled **Site search** and claim only the
   phrases that name the site feature, so `search`, `search input` and
   `combobox` keep their component pages.

## 2. What to build

### 2.1 `apps/docs/src/lib/search-ranks.ts` (new, pure)

The rank constants and the route limits move out of `src/lib/search.ts` so the
reader-facing table can render them without importing the server search module
(`fumadocs-core/search/server`, the MDX source) into the client bundle:

```ts
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 50;
export const DESCRIPTION_MATCH_RANK = 4;
export const TYPO_MATCH_RANK = 8;
export const PHRASE_TYPO_MATCH_RANK = 2;
```

`src/lib/search.ts` imports them and **re-exports them unchanged**
(`export { ... } from "./search-ranks"`), so every existing import — the route,
`search.test.ts`, `page-aliases.test.ts`, `typo.ts`'s callers — keeps working.
Do not move `matchRank`/`nameRank`: they stay private to `search.ts`.

### 2.2 `apps/docs/src/lib/search.ts` (edit, small)

- Rename the private `generatedEntries` to an exported
  `generatedSearchEntries` and use it in both places (`generatedByUrl`,
  `registrySearch`). Its doc comment says it is the list the Site search page
  renders, so a new document appears there and a test compares the two.

### 2.3 `apps/docs/src/lib/search-docs.ts` (new, pure data, client-safe)

No `node:fs`, no `search.ts`, no `fumadocs-core/search/server`. It imports only
`./search-ranks` and `./generated-search`:

```ts
export interface SearchRank {
  readonly constant: string;   // the exported name
  readonly value: string;      // rendered from the imported constant
  readonly means: string;      // one sentence
}
export const searchLimits = {
  default: DEFAULT_SEARCH_LIMIT,
  max: MAX_SEARCH_LIMIT,
} as const;
export const searchRanks: ReadonlyArray<SearchRank> = [...]; // §2.5 table
export interface IndexedSurface {
  readonly title: string;
  readonly url: string;
  readonly what: string;
}
export const indexedSurfaces: ReadonlyArray<IndexedSurface> = [...]; // §2.6
```

`indexedSurfaces` is a **written list, compared with the real array by a test**
(§3): importing the real entries into a client module would pull every token,
icon, roadmap and capability row into the bundle, the cost plan 604 removed.
The test is the guard; the page only renders strings.

### 2.4 `apps/docs/src/components/search-reference.tsx` (new)

One component, `<SearchReference />`, rendering three tables from
`search-docs.ts`, in this order:

1. **Rank constants** — `constant`, `value`, `means`, one row per exported
   constant, plus a row for the route limits (`10` default, `50` maximum).
   Values are `String(...)` of the real constants, never typed.
2. **Generated search documents** — one row per `indexedSurfaces` entry: title,
   URL, what the document makes findable. The section states that the component
   registry (66 records) and the Values API are indexed the same way.
3. No third table: the ranking order is prose (§2.5), because the sub-tiers
   (`0–3` inside a name, `4–7` inside a summary) are not separate constants and
   must not be presented as if they were.

Styling copies `src/components/platform-styles.tsx`: `not-prose`, bordered
`div`, `overflow-x-auto`, a `sr-only` caption, `th scope`, `text-sm`. No tokens
are introduced.

### 2.5 `apps/docs/content/docs/site-search.mdx` (new page)

Frontmatter title **Site search**; description:

> How the documentation site's search works: the ⌘K palette, the page and
> generated indexes, ranking and aliases, the /api/search route, and how to
> index a new generated surface.

Sidebar: `content/docs/meta.json`, after `component-pages`, before `license`
(the contributor-reference cluster). Sections, in order:

1. **Intro** — this page is the site's own search, not the `SearchInput`
   component (link it). One sentence on why it exists: the palette is the only
   cross-page navigation.
2. `## Using it` — `⌘K` on macOS, `Ctrl+K` elsewhere; the phone header carries a
   search icon button below `sm` (plans 519, 563); typing filters; `Enter` opens
   the highlighted result **and moves focus to the destination page**; `Escape`
   closes and returns focus to the opener (plan 506). State only what
   `smoke:search` operates.
3. `## The two indexes` — Fumadocs builds an index over every MDX page; the
   docs also own a `simple` index of documents rendered React from package data
   (`createSearchAPI("simple")`). One result per page URL after the merge, so a
   component is not listed twice (plan 431). Generated prop-table rows are
   dropped (plan 479).
4. `## Ranking` — `<SearchReference />`, then the order in prose: a name beats a
   scene instruction, which beats a name token and the start of a summary, which
   beats a summary phrase, which beats a one-edit misspelling, which beats index
   order. Ties break on the shorter title. Blank query → `[]`.
5. `## The search API` — `GET /api/search?query=…&limit=…`, the default and cap
   from the table, blank query → `[]`, an array of `SortedResult`
   (`id`, `url`, `type`, `content`), and a copyable `curl`:

   ```sh
   curl -s "http://localhost:3000/api/search?query=button&limit=3"
   ```

   Include the real route:

   ```mdx
   <include lang="ts" meta='title="apps/docs/src/routes/api/search.ts"'>
     ../../../src/routes/api/search.ts
   </include>
   ```

   Resolve the path from `content/docs/` as the other pages do (three `../` from
   `content/docs/` reaches `apps/docs/`).
6. `## Adding a searchable surface` — the D32 rule, in five concrete steps:
   build a `GeneratedSearchEntry` (`src/lib/generated-search.ts`), promote only
   distinctive names (`isDistinctiveName`: camelCase, dotted, hyphenated — never
   a plain word), add it to `generatedSearchEntries` (`src/lib/search.ts`), add
   it to `indexedSurfaces` and re-run the page test, and add one production query
   to `scripts/smoke-build.ts`. Include the contract file:

   ```mdx
   <include lang="ts" meta='title="apps/docs/src/lib/generated-search.ts"'>
     ../../../src/lib/generated-search.ts
   </include>
   ```

7. `## Vocabulary` — the two guarded editorial tables (`component-aliases.ts`,
   `page-aliases.ts`) and the typo tier (`typo.ts`); a component alias or page
   alias matches the **whole query** only (plan 579), and a plain word is never
   promoted from a generated document. Link Component pages' alias table.
8. `## What search does not do` — no semantic/vector search; one-edit typos
   only; no cross-language stemming beyond the shared English stem; no synonym
   expansion beyond the alias tables; no analytics or personalisation; a
   misspelling never outranks a real match. Honest, each sentence true of the
   code.
9. `## Related` — Components, Component pages, Contributing, Previews.

The page must not hand-count the generated documents or type `10`/`50` as prose
limits: the component renders both from `search-docs.ts`.

### 2.6 `apps/docs/src/lib/page-aliases.ts` (edit)

Add one block (whole-query terms only):

```ts
[
  "/docs/site-search",
  [
    "cmd k",
    "cmd+k",
    "ctrl k",
    "ctrl+k",
    "site search",
    "search index",
    "search indexes",
    "search ranking",
    "search results",
    "search api",
    "api/search",
    "lexical search",
    "full text search",
    "full-text search",
    "search document",
    "index document",
    "search architecture",
  ],
],
```

Do **not** add `command k` (Command menu owns that token), `search palette`
(Command palette) or `search` (Search input). `page-aliases.test.ts` already
fails on a key that is not a page, a shared term or a shadowed title; it will
validate the new block with no edit.

### 2.7 `apps/docs/scripts/smoke-build.ts` (edit)

Add three production queries to `searchChecks`, with the wording pattern the
list already uses:

| `query` | `expected` | `first` | `what` |
| ------- | ---------- | ------- | ------ |
| `cmd k` | `/docs/site-search` | `true` | the palette shortcut named by the page that owns site search |
| `search index` | `/docs/site-search` | `true` | the generated-document vocabulary |
| `search` | `/docs/components/search-input` | `true` | the component word the new page must not steal |

### 2.8 `apps/docs/src/lib/typo.ts` (edit, measured consequence)

Titling the page **Site search** creates a second one-edit target for `seach`:
the component name *Search input* and the page title *Site search* both match a
word at tier `2`, so `typoMatch` refuses the tie and `seach` fell back to the
lexical index's *Icon names* (measured while implementing: `seach ->
/docs/components/icon`, where plan 607 requires Search input).

The fix is a rule, not an exception: **a page title matches as a whole name or
a whole phrase, never by a word inside it.** A component title is a proper name
(`Search input` legitimately owns `seach`); a page title is a short subject
phrase whose words are generic (`site`, `search`, `component`), and a word of
one is not evidence that the page is what the reader misspelled. Concretely:

- `TypoName.kind` gains `"page"`; `targetTier` skips the word branch for it
  (whole-name tier `0`, phrase arm unchanged), and `phraseTier` treats a page
  like a name (tier `0`) rather than an alias.
- `search.ts` builds page titles with `kind: "page"`.
- `typo.test.ts` adds the measured pair (Site search + Search input → Search
  input) and proves a page title still matches as a whole name (`theem` →
  Theming, `componet` → Components).

STOP if any plan-607/608 typo expectation other than `seach` changes: that would
mean the rule is wider than this measurement.

## 3. Test plan

### `apps/docs/src/lib/search-docs.test.ts` (new)

Guards the data the page renders:

1. `searchLimits` equals `DEFAULT_SEARCH_LIMIT` / `MAX_SEARCH_LIMIT` and
   `default < max`.
2. `searchRanks` has one row per exported constant
   (`DEFAULT_SEARCH_LIMIT`, `MAX_SEARCH_LIMIT`, `DESCRIPTION_MATCH_RANK`,
   `TOKEN_MATCH_RANK`, `SCENE_MATCH_RANK`, `PHRASE_TYPO_MATCH_RANK`,
   `TYPO_MATCH_RANK`) and each `value` equals `String(constant)`; `SCENE_MATCH_RANK`
   is imported **here only** (`./scene-search`), never by the page module.
3. `indexedSurfaces` equals `generatedSearchEntries` as a set of `title → url`
   pairs, with no duplicate URL; the real count is asserted, not typed in the
   page (`expect(indexedSurfaces).toHaveLength(generatedSearchEntries.length)`).
4. Every source path the page names resolves from `apps/docs`:
   `src/lib/search.ts`, `src/lib/generated-search.ts`,
   `src/lib/page-aliases.ts`, `src/lib/component-aliases.ts`, `src/lib/typo.ts`,
   `src/routes/api/search.ts`, `src/search/search-focus.tsx`.
5. The route uses the documented boundary: its source contains
   `parseSearchLimit` and `search(`; `parseSearchLimit` clamps into
   `[1, MAX_SEARCH_LIMIT]` for `null`, `0`, `999` and `"x"` (import from
   `./search` in this test only).

### `apps/docs/src/components/search-reference.test.tsx` (new)

1. `renderToStaticMarkup(<SearchReference />)` contains `String(DEFAULT_SEARCH_LIMIT)`,
   `String(MAX_SEARCH_LIMIT)`, every `searchRanks` constant name and value, and
   every `indexedSurfaces` title and URL.
2. The markup carries no hard-coded limit text: `50` appears only where
   `String(MAX_SEARCH_LIMIT)` puts it (assert the row count, not a regex).
3. The page renders the component: `content/docs/site-search.mdx` contains
   `<SearchReference />`, no other page does, and the page's frontmatter
   description names `search index` and `ranking`.
4. The page includes the two source files
   (`src/routes/api/search.ts`, `src/lib/generated-search.ts`) — checked by the
   existing `content-references.test.ts` once the page is on disk; this test
   re-asserts the include tags so a removal fails here by page name.

### `apps/docs/src/lib/page-aliases` + search integration (in the same new suite)

Import `search` from `./search` under `{ timeout: 120_000 }` (the index build is
cold per file, like `search.test.ts`) and assert:

| Query | First URL |
| ----- | --------- |
| `cmd k` | `/docs/site-search` |
| `cmd+k` | `/docs/site-search` |
| `search index` | `/docs/site-search` |
| `search ranking` | `/docs/site-search` |
| `api/search` | `/docs/site-search` |
| `site search` | `/docs/site-search` |
| `search` | `/docs/components/search-input` |
| `search input` | `/docs/components/search-input` |
| `button` | `/docs/components/button` |
| `theming` | `/docs/theming` |
| `command palette` | `/docs/patterns/command-palette` |

The last five are regressions; the table in the test is the record.

### Two-direction proofs (run each, record the command and failure, revert)

1. Delete the `<SearchReference />` line from `site-search.mdx` → the component
   suite fails on "renders the generated reference".
2. Delete the `/docs/site-search` block from `page-aliases.ts` → the six
   vocabulary rows fall back (`cmd k` → component-pages, `search index` →
   Search input).
3. Point one `indexedSurfaces` URL at `/docs/components/button` → the data test
   fails by document title and URL.
4. Type a wrong literal (`value: "7"` for `TYPO_MATCH_RANK`, replacing the
   imported constant) → `search-docs.test.ts` fails the rank-constant row; the
   page reads the module, and the source guard fails if the imports it needs are
   removed. Revert immediately.
5. Remove `site-search` from `meta.json` → `content.test.ts` fails
   "orders every top-level page on disk in the sidebar".
6. Rename the component in `mdx.tsx`'s registration → the page render test fails
   by tag name.

## 4. Commands and expected results

1. **Measure (already run, reproduce before/after):** write the scratch harness
   described in §1, run
   `nub exec vitest run src/lib/__measure.test.ts --reporter=verbose`, delete it.
   Expected before: the §1 table. Expected after: every non-regression row first
   at `/docs/site-search`.
2. `nub run --filter docs test` → green; the new files are included in the
   count (record the new file/test totals in §6).
3. `nub run --filter docs check-types` → exit `0`.
4. `nub run --filter docs build` → exit `0`; the page is in the sitemap.
5. `nub run --filter docs smoke:build --no-build` → exit `0`, one more page and
   the three new queries green.
6. `nub run --filter docs smoke:search` → exit `0` (the palette path is
   unchanged; this proves the page did not disturb the UI).
7. Root gates: `nub run check`, `nub run lint`, `nub run test`.

## 5. STOP conditions

- `search.ts` cannot re-export the moved constants without a circular import or
  a type error → stop and report the import graph; do not duplicate the values.
- Importing `search-docs.ts` from the component pulls `fumadocs-core/search/server`
  or the MDX source into the client bundle (check the build output for a new
  large chunk) → stop; the module must stay data-only.
- A production query in §2.7 cannot be made first without stealing `search`
  from Search input → stop and report the measured ranking; do not weaken the
  regression row.
- Any gate is red for a reason outside this plan's files → stop and report the
  command and output; do not edit another workstream's paths.

## 6. Acceptance

- `/docs/site-search` exists, is in the sidebar, and renders the ranked signals,
  the limits and every generated document from code.
- The measured vocabulary rows reach the page; the five regression rows are
  unchanged; `smoke:build` proves three of them against the production index.
- The page names the real files, includes the real route and the real contract,
  and every path a reader copies resolves.
- All gates in §4 are green, and the results (file/test counts, page count,
  browser smoke exits) are recorded here.

## 7. What was measured

Implemented 2026-10-20 on `agent/docs-site`.

**Files:** `src/lib/search-ranks.ts`, `src/lib/search-docs.ts`,
`src/lib/search-docs.test.ts`, `src/components/search-reference.tsx`,
`src/components/search-reference.test.tsx`, `content/docs/site-search.mdx`,
`content/docs/meta.json`, `src/components/mdx.tsx`, `src/lib/page-aliases.ts`,
`src/lib/page-aliases.test.ts`, `src/lib/search.ts`, `src/lib/typo.ts`,
`src/lib/typo.test.ts`, `scripts/smoke-build.ts`.

**Before → after** (the harness from §1; the six owned queries now return the
page, the five regression rows are unchanged):

```text
cmd k          component-pages#the-gesture-vocabulary → /docs/site-search
search index   /docs/components/search-input          → /docs/site-search
search ranking /docs/components/search-input          → /docs/site-search
api/search     component-pages#search-vocabulary      → /docs/site-search
ranking        /docs/components/range-slider          → /docs/site-search
lexical        (nothing)                              → /docs/site-search
search         /docs/components/search-input          → unchanged
search input   /docs/components/search-input          → unchanged
```

**The second measured defect, found while implementing:** titling the page
*Site search* made `seach` ambiguous between the page title and the Search input
component, and the tie fell back to the lexical index — measured
`seach -> /docs/components/icon`, where plan 607 requires Search input. §2.8
records the rule that closes it (a page title matches as a whole name or whole
phrase, never by a word inside it) and the two tests that guard it.

**Gates:**

- `nub run --filter docs test` — 122 files / 1 117 tests, green.
- `nub run --filter docs check-types` — exit `0`.
- `nub run --filter docs build` — exit `0`.
- `nub run smoke:build --no-build` — 104 pages, 229 links, 1 348 anchors,
  search checked (the three new queries included), exit `0`.
- `nub run smoke:search` — palette, index filter and phone path green, exit `0`.
- `nub run check` — exit `0` (test-quality checker, lint, format, every
  workspace's types).
- `nub run test` — docs 122 / 1 117 and primitives 25 / 282, green.
- `nub run smoke:a11y` — 104 pages × 2 schemes, 0 violations, exit `0`; the
  new page's two tables are audited with every other page.

**Two-direction proofs (each run, then reverted):**

1. Removed `<SearchReference />` from the page → 2 tests failed:
   *renders the generated reference* and *is the only page that renders the
   reference*.
2. Deleted the `/docs/site-search` alias block → the vocabulary test failed with
   `search index -> /docs/components/search-input`,
   `search ranking -> /docs/components/search-input`,
   `api/search -> /docs/site-search#the-search-api` and `cmd k` landing on
   `#ranking` instead of the page top.
3. Pointed the Roadmap surface at `/docs/components/button` → the index test
   failed naming `Roadmap :: /docs/components/button`.
4. Typed `value: "7"` for `TYPO_MATCH_RANK` → the rank test failed on the
   `TYPO_MATCH_RANK` row (the source guard also fails if the imports are
   removed).
5. Removed `site-search` from `meta.json` → `content.test.ts` failed *orders
   every top-level page on disk in the sidebar* with `[ 'site-search' ]`.
6. Removed the component from `getMDXComponents()` → `mdx-components.test.ts`
   failed *registers every component the pages use* with
   `[ 'SearchReference' ]`.

**Deliberate test change:** `page-aliases.test.ts` moved `search index` from
`regressions` to `owned`. The row existed so a future owner would have to change
it deliberately; this plan is that change.
