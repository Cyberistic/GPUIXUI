# 597 — The site's own output is findable by the words readers use

**Phase:** F (documentation platform, search)
**Workstream:** docs-site
**Depends on:** 410, 413, 419, 431, 490, 525, 568, 574, 594, 596
**Status:** implemented

## 1. The measured defect

Plan 596 shipped the per-page Markdown route and the **Copy Markdown** /
**View as Markdown** controls, and plan 594 documented the site's discovery
routes in Contributing's `### Site output` section. Both are real reader-facing
surfaces. Measured 2026-10-20 at `63a105a4` against the real `search()` the
`/api/search` route calls:

| Query | First result | Owning page |
| ----- | ------------ | ----------- |
| `page actions` | `/docs/component-pages` | Contributing `#site-output` |
| `copy page` | `/docs/component-pages` | Contributing `#site-output` |
| `page markdown` | `/docs/component-pages` | Contributing `#site-output` |
| `view as markdown` | `/docs/components/preview-card` | Contributing `#site-output` (2nd) |
| `raw markdown` | `/docs/components/text-area#accessibility-and-limitations` | Contributing `#site-output` (7th) |
| `open source` | `/docs/components/preview-card#states` | License (absent from the top five) |
| `not implemented` | `/docs/components/toast` | Roadmap (absent from the top five) |
| `token editor` | `/docs/tokens-api` | Theme editor (3rd) |

`markdown`, `site output`, `copy markdown`, `llms.txt`, `sitemap` and `robots`
already reach the right page, so the gap is narrower than a vocabulary sweep:
the **page-action vocabulary plan 596 introduced** has no document that owns it,
and three page summaries omit the word a reader uses for their subject.

Why each is structural, not a ranker bug:

- The controls' labels (`Copy Markdown`, `View as Markdown`) are React props of
  `MarkdownCopyButton` and an anchor in `src/routes/docs/$.tsx`; the words occur
  in the built HTML but not in the page index's authored text, so only the
  prose in Contributing's section matches — at prose rank, behind
  `component-pages`, whose title is closer to "page".
- Contributing's summary names `sitemap`, `robots`, `llms.txt`, `favicon`, `SEO`
  and `PWA` (plan 594) but not the page-action feature.
- `open source`, `not implemented` and `token editor` are words the owning
  pages' subjects cover but their summaries do not name (plan 574's rule).

`system theme` returns Switch first while Dark mode is fourth **although its
summary already contains "system theme"**. That is a ranker question, not an
authoring one; this plan records it as an open limit (§6) and does not touch the
ranker.

## 2. What to build

### 2.1 One source for the site-output route table

New file: `apps/docs/src/lib/site-output.ts`.

The route table is test data today (`src/contributing-page.test.ts` `routes`), so
a generated search entry cannot read it and the two would drift. Move it:

```ts
/** A route the docs site serves without an MDX page behind it. */
export interface SiteOutputRoute {
  readonly route: string;
  readonly module: string;
  /** The name ⌘K should promote this route for, when it has one. */
  readonly searchName?: string;
}

export const SITE_OUTPUT_ROUTES: ReadonlyArray<SiteOutputRoute> = [
  { route: "/sitemap.xml", module: "src/routes/sitemap[.]xml.ts", searchName: "sitemap.xml" },
  { route: "/robots.txt", module: "src/routes/robots[.]txt.ts", searchName: "robots.txt" },
  { route: "/llms.txt", module: "src/routes/llms[.]txt.ts", searchName: "llms.txt" },
  { route: "/llms-full.txt", module: "src/routes/llms-full[.]txt.ts", searchName: "llms-full.txt" },
  { route: "/docs/<slug>.md", module: "src/routes/docs/{$}[.]md.ts" },
  { route: MANIFEST_PATH, module: "src/routes/site[.]webmanifest.ts", searchName: "site.webmanifest" },
];
```

`MANIFEST_PATH` stays owned by `src/lib/site-head.ts`. `contributing-page.test.ts`
imports `SITE_OUTPUT_ROUTES` instead of its local array; its existing assertions
(`existsSync(module)`, the page's table row) are unchanged, so the move must not
change a result.

### 2.2 The page-action labels are exported once

`apps/docs/src/lib/page-markdown.ts` gains the two labels the page control
renders, so the control and the search entry cannot disagree:

```ts
/** The labels the page control renders; plan 597 promotes their words. */
export const PAGE_ACTIONS = {
  copy: "Copy Markdown",
  view: "View as Markdown",
} as const;
```

`src/routes/docs/$.tsx` renders `PAGE_ACTIONS.copy` (as `MarkdownCopyButton`'s
children, if the component accepts them; otherwise keep its default label and
document that the constant mirrors it) and `PAGE_ACTIONS.view` in the anchor.
`smoke:build` already asserts both strings in the built HTML, so a rename that
forgets the smoke fails there.

### 2.3 The search document

New file: `apps/docs/src/lib/site-output-search.ts`:

```ts
import type { GeneratedSearchEntry } from "./generated-search";
import { PAGE_ACTIONS } from "./page-markdown";
import { SITE_OUTPUT_ROUTES } from "./site-output";

export const siteOutputSearchEntry: GeneratedSearchEntry = {
  names: [
    ...SITE_OUTPUT_ROUTES.flatMap(({ searchName }) =>
      searchName === undefined ? [] : [searchName],
    ),
    PAGE_ACTIONS.copy.toLowerCase(),
    PAGE_ACTIONS.view.toLowerCase(),
    "page markdown",
    "raw markdown",
    "page actions",
    "copy page",
    "site output",
  ],
  index: {
    title: "Contributing",
    description:
      "The docs site's own output: discovery routes and the per-page Markdown control.",
    content: [
      ...SITE_OUTPUT_ROUTES.map(({ route }) => route),
      PAGE_ACTIONS.copy,
      PAGE_ACTIONS.view,
      "Every page can be copied or viewed as Markdown.",
    ].join("\n"),
    url: "/docs/contributing#site-output",
    breadcrumbs: ["Contributing"],
    keywords: [
      ...SITE_OUTPUT_ROUTES.map(({ route }) => route.replaceAll("/", " ")),
      "markdown page actions copy view download",
    ].join(" "),
  },
};
```

Every promoted name is either distinctive (`.xml`, `.txt`, `.webmanifest`) or a
whole multiword phrase, which `promotedNameRank` matches as a whole query or as
a token variant — the plan 569/589 rules. **No single plain word is promoted**,
so `markdown`, `page`, `copy` and `actions` keep their current owners.

Register it in `src/lib/search.ts` `generatedEntries`.

### 2.4 Page summaries that name their subject

Frontmatter `description` edits, each measured before it is kept:

| Page | Wording attempted | Query | Measured |
| ---- | ----------------- | ----- | -------- |
| `content/docs/license.mdx` | "Open source licences, …" | `open source` → `/docs/license` | **kept** — Preview card was first, License absent |
| `content/docs/roadmap.mdx` | "planned and not yet implemented" | `not implemented` → `/docs/roadmap` | **reverted** — Toast stayed first; the status bullet's wording ("tracked, not implemented") did not move it either |
| `content/docs/theme-editor.mdx` | "token roles" instead of "semantic roles" | `token editor` → `/docs/theme-editor` | **reverted** — Tokens API stayed first |

**A summary edit that does not move the first result is reverted and recorded
as a measured non-fix**, not kept as keyword stuffing (§6.4). Only the License
word became a test assertion.

## 3. Order of work and commands

Run from `apps/docs`.

1. `src/lib/site-output.ts`; `contributing-page.test.ts` imports it.
   `nubx vitest run src/contributing-page.test.ts` → 5/5 pass, unchanged.
2. `PAGE_ACTIONS` in `src/lib/page-markdown.ts`; `$.tsx` uses it.
   `nubx vitest run src/lib/page-markdown.test.ts` → 11/11.
3. `src/lib/site-output-search.ts` + register in `search.ts`.
4. `src/lib/site-output-search.test.ts` (§4). Run it; every query must now
   return the owning page first.
5. The three summary edits, one at a time, each checked with the probe query in
   §2.4 through `nubx vitest run src/lib/site-output-search.test.ts`; revert any
   that does not move the result.
6. `nub run --filter docs check-types`.
7. `nub run --filter docs test` (expect 110 files / 810 tests).
8. `nub run --filter docs smoke:build` — the production search check (§4), the
   99-page crawl and the internal-link audit.
9. Root gates: `nub run check`, `nub run lint`, `nub run test`.

## 4. Test plan

**`src/lib/site-output-search.test.ts` (new, offline, can fail).**

| Test | Fails when |
| ---- | ---------- |
| the entry promotes one name per `searchName` route and per page-action label | a route or label is added without a name |
| `promotedNameRank(entry, "VIEW AS MARKDOWN")` is `0` and `"page actions"` is `0` | the phrase list loses a name |
| no promoted name is a single plain word | a later edit promotes `markdown`/`page`/`copy`/`actions` |
| `search("page actions")[0].url` is `/docs/contributing#site-output` | the entry is dropped or outranked |
| the same for `copy page`, `page markdown`, `view as markdown`, `raw markdown` | one phrase misses |
| `search("markdown")[0].url` stays `/docs/roadmap` | the entry steals `markdown` from its plan 585 owner |
| `search("actions")[0]` is not the Contributing section | the multiword names leak into a single word |
| `open source`, `not implemented`, `token editor` reach their pages first | a summary loses its word (only for edits kept in §2.4) |

**`scripts/smoke-build.ts`** — one production query through the served
`/api/search`: `page actions` returns `/docs/contributing#site-output` first.
The existing search checks stay.

**Regressions checked by hand and recorded in §6:** `table` → Data display,
`panel` → Workspace, `aria` → Accessibility, `focus ring` → Tokens API, `modal
focus` → Capabilities, `input`/`label` → their component pages.

**Two-direction proofs (run, then revert):**

1. Remove the entry from `generatedEntries` → the phrase test fails, and
   `smoke:build` fails its `page actions` query.
2. Delete `page actions` from the entry's names → the exact-rank and phrase
   tests fail.
3. Delete a route's `searchName` → the per-route test fails.
4. Revert the kept summary edit → the `open source` test fails.
5. Remove a route from `SITE_OUTPUT_ROUTES` → `contributing-page.test.ts` fails
   (the shared table is compared with the page in both directions).

## 5. STOP conditions

- Stop if promoting a phrase changes any regression query above; report the
  query and the two results instead of adding a ranker rule.
- Stop if a summary edit does not move its query — revert it and record it; do
  not add a second word hoping it works.
- Stop if `promotedNameRank` would need to change; that is a ranker plan, not
  this one.
- Stop if `MarkdownCopyButton` does not accept children and the constant cannot
  be the rendered label; keep the constant as the single source for the search
  document only and say so on the line.

## 6. Measured results

Implemented 2026-10-20 on `agent/docs-site`, after plan 596 (`63a105a4`).

### 6.1 What shipped

| File | What it owns |
| ---- | ------------ |
| `apps/docs/src/lib/site-output.ts` | `SITE_OUTPUT_ROUTES`: one table for the routes the site serves without an MDX page |
| `apps/docs/src/lib/site-output-search.ts` | the generated search document for Contributing `#site-output` |
| `apps/docs/src/lib/page-markdown.ts` | `PAGE_ACTIONS` — the labels the control renders, read by the search document |
| `apps/docs/src/routes/docs/$.tsx` | the `View as Markdown` anchor renders `PAGE_ACTIONS.view` |
| `apps/docs/src/lib/search.ts` | registers the new generated entry |
| `apps/docs/src/contributing-page.test.ts` | compares the page's route table with `SITE_OUTPUT_ROUTES` **in both directions** |
| `apps/docs/src/lib/site-output-search.test.ts` | 9 tests: names, no plain-word promotion, exact ranks, phrases, routes, word owners |
| `apps/docs/scripts/smoke-build.ts` | two production queries: `page actions` and `open source` |
| `apps/docs/content/docs/license.mdx` | the summary names "open source" |

`MarkdownCopyButton` keeps its own label, including its "Copied Markdown"
state; `PAGE_ACTIONS.copy` mirrors that default and `smoke:build` pins both
strings in the built HTML, so the constant cannot drift silently.

### 6.2 Commands run

| Command | Result |
| ------- | ------ |
| `nubx vitest run src/lib/site-output-search.test.ts` | 9 tests pass |
| `nub run --filter docs check-types` | pass |
| `nub run --filter docs test` | **110 files / 810 tests pass** |
| `nub run --filter docs smoke:build` | exit `0`; 99 pages, 220 links, 1 288 anchors, search checked |
| `nub run --filter docs smoke:a11y` | exit `0`; 99 pages × 2 schemes, 0 violations |
| `nub run check`, `nub run lint`, `nub run test` | all exit `0` |

The first full run failed both integration tests with the 5 s default timeout:
the search index is built once, cold, while 110 workers start. The suite now
uses `{ timeout: 120_000 }`, the budget plan 468 established, with no assertion
changed.

### 6.3 Two-direction proofs (each run, then reverted)

| Proof | Measured failure |
| ----- | ---------------- |
| Remove the entry from `generatedEntries` | `site-output-search.test.ts`: **1 failed** — the page-action phrases no longer reach the section |
| Delete `page actions` from the entry's names | **2 failed** — the exact-rank test and the phrase test |
| Delete `searchName: "robots.txt"` | **1 failed** — "names every fixed route after its path" |
| Revert the License summary | **1 failed** — `open source` no longer reaches `/docs/license` |
| Delete the `/llms-full.txt` row from `SITE_OUTPUT_ROUTES` | `contributing-page.test.ts`: **1 failed** — the page documents a route the table omits |
| Remove the entry, then `smoke:build` | exit `1`: `/api/search?query=page%20actions: the first result is not under /docs/contributing#site-output` |

One nuance measured while proving the second row: deleting a name that also
appears in the document **content** (`view as markdown`) does **not** fail,
because the lexical index still retrieves the section — the promotion is a
rank guarantee, not the only path. Removing a name that exists only in `names`
(`page actions`) is the load-bearing case and does fail.

### 6.4 Limits (measured, not fixed)

- **`not implemented` → Toast first.** A summary edit and a reworded Roadmap
  status bullet both left the Toast limitation first; the prose hit outranks a
  page-description hit. A ranker change is required and belongs to its own plan,
  so both edits were reverted.
- **`token editor` → Tokens API first.** Naming "token roles" in the Theme
  editor summary did not outrank the Tokens API title; reverted.
- **`system theme` → Switch first** although Dark mode's summary contains the
  phrase (Dark mode is fourth). The same ranker question, recorded for a later
  plan.
- `markdown` still reaches `/docs/roadmap` because `roadmap-aliases.ts` owns it
  for the "Rich-text editing" target (plan 585); this plan promoted only
  multiword phrases so that owner is unchanged.
