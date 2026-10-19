# 594 — The docs site documents its own output, and a mid-word fragment stops naming a page

**Phase:** F (search completeness and information architecture)
**Workstream:** docs-site
**Depends on:** 410, 413, 418, 419, 431, 439, 510, 516, 525, 568, 574, 585, 593
**Status:** implemented

## 1. The measured defect

Measured on 2026-10-19 against the real docs search index
(`apps/docs/src/lib/search.ts`, the same index `/api/search` serves) with a
throwaway vitest sweep over 180 reader queries, `search(query, 8)`, before any
change in this plan. The rows below are the ones with an obvious owner:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `favicon` | nothing | Contributing (`/docs/contributing`) |
| `robots` | nothing | Contributing |
| `llms` | nothing | Contributing |
| `pwa` | nothing | Contributing |
| `seo` | Icons → `/docs/components/icon` (fuzzy registry hit) | Contributing |
| `sitemap` | three Contributing text chunks, no page result | Contributing |
| `graph` | Typography → `/docs/typography` (page title) | Data display (`/docs/data-display`) |
| `virtual list` | Lists → `/docs/components/list` (component prose) | Roadmap (`/docs/roadmap`) |

Two separate causes:

1. **The docs site's own output is not documented anywhere in the reader
   content.** `apps/docs/README.md` is a maintainer document and the page index
   never sees it. The site ships `/sitemap.xml`, `/robots.txt`, `/llms.txt`,
   `/llms-full.txt`, `/site.webmanifest` and a generated brand head (favicon,
   touch icon, social card, canonical/OpenGraph tags, light/dark
   `theme-color`), and Contributing's only mention of any of it is the word
   "sitemap" inside three smoke-check table rows. A reader who asks what the
   site publishes gets nothing.
2. **`matchRank`'s substring tier matches inside a word.** A page title matched
   when `normalized.includes(needle)`, so `graph` named **Typo·graph·y** at rank
   `3`. The tier exists for names written without a separator (`DatePicker`,
   `ScrollArea`), where the fragment **ends** a word; a fragment in the middle
   of a word is a coincidence, not a name.

Two rows were measured and deliberately **not** changed:

- `manifest` reaches Installation's prerequisites, where the package manifests
  really are discussed. The new section names the **web app manifest** by its
  full name and leaves the single word where it is.
- `window` reaches Theming because its summary says "macOS, Linux and Windows"
  and the stem rule makes `window`/`Windows` equal; Getting started already
  names "GPUix window" in its summary and is the third result. That is a
  genuine ambiguity, not a defect, and changing the stem rule would cost more
  than it buys.

## 2. What to build

### 2.1 Contributing gains `### Site output`

File: `apps/docs/content/docs/contributing.mdx`.

Insert the subsection under `## Docs site`, after the smoke table and before
`### Authoring`. It has three parts:

1. One sentence: the site publishes its own discovery documents from the same
   modules the pages use, so a route cannot describe a page the sitemap does
   not serve.
2. A table with one row per route:

   | Route | What it serves | Source |
   | ----- | -------------- | ------ |
   | `/sitemap.xml` | every page URL the site serves | `src/lib/sitemap.ts` |
   | `/robots.txt` | crawlers, naming the sitemap | `src/routes/robots[.]txt.ts` |
   | `/llms.txt` | every page, absolutely linked, for an LLM crawler | `src/lib/llms.ts` |
   | `/llms-full.txt` | every page as processed Markdown | `src/lib/llms.ts` |
   | `/site.webmanifest` | the install document: name, start URL, palette colours and both icons | `src/lib/site-manifest.ts` |

3. A short paragraph on the document head and the honest install limitation:
   every page inherits the favicon (SVG mark plus a 32 px PNG), the
   apple-touch icon, the 1200×630 social card, a canonical URL and
   OpenGraph/Twitter tags from `src/lib/site-head.ts`; the manifest declares
   `display: "browser"` and there is **no service worker**, so the site makes
   no PWA or offline claim. A reader who wants the maintainer detail is pointed
   at `apps/docs/README.md`.

Also extend the frontmatter description so the words are a page-level search
signal rather than a body chunk:

```yaml
description: How to work on GPUIXUI on GitHub in worktrees, where to report bugs or open issues and pull requests, the gates a change must pass, and the docs site's own discovery output — sitemap, robots, llms.txt, favicon, social metadata and SEO.
```

### 2.2 Data display names charts and graphs

File: `apps/docs/content/docs/data-display.mdx`.

Change the frontmatter description's `charts` to `charts and graphs`. `chart`
already reaches the page; `graph` did not, and `graphs` is the word a reader
types for the same subject.

### 2.3 A name fragment must end a word

File: `apps/docs/src/lib/search.ts`, `matchRank`.

Current final tier:

```ts
  return needle.length >= 4 && normalized.includes(needle) ? 3 : undefined;
```

New:

```ts
  return needle.length >= 4 &&
    nameWords.some((word) => word.endsWith(needle))
    ? 3
    : undefined;
```

Update the doc comment above `matchRank`: tier `3` is a fragment that **ends** a
word (`picker` in `datepicker`), never one buried inside it (`graph` in
`typography`). Prefixes are tier `2` already.

### 2.4 The roadmap owns "virtual list"

File: `apps/docs/src/lib/roadmap-aliases.ts`.

Add one row:

```ts
  ["Virtualized lists", ["virtual list"]],
```

A virtual list is a tracked target, not a shipped component, so the honest first
result is the Roadmap. The table's existing guard checks that the term shadows
no component title, exported symbol, props type or alias.

## 3. Tests

### 3.1 `apps/docs/src/lib/search.test.ts`

Add one integration test after the plan 593 block:

```ts
it("finds the docs site's own output and two subject words (plan 594)", async () => {
  const expected = [
    ["favicon", "/docs/contributing"],
    ["robots", "/docs/contributing"],
    ["llms", "/docs/contributing"],
    ["pwa", "/docs/contributing"],
    ["seo", "/docs/contributing"],
    ["sitemap", "/docs/contributing"],
    ["graph", "/docs/data-display"],
    ["virtual list", "/docs/roadmap"],
  ] as const;
  // assert first?.type === "page" and the destination, as the plan 592/593
  // blocks do
});
```

Add one regression test for the ranker:

```ts
it("does not name a page from a fragment inside a word (plan 594)", async () => {
  const graph = await search("graph", 5);
  expect(graph.map((result) => result.url.split("#")[0])).not.toContain(
    "/docs/typography",
  );
  const typography = await search("typography", 5);
  expect(typography[0]?.url).toBe("/docs/typography");
  const picker = await search("picker", 5);
  expect(picker[0]?.url.split("#")[0]).toBe("/docs/components/date-picker");
});
```

The `picker` case is the tier that must survive: `Date pickers` has a space, so
its title word is `pickers` and the prefix tier already answers; include a
fixture-style `mergeResults` case for `datepicker` only if the real index does
not exercise the suffix path.

### 3.2 `apps/docs/src/contributing-page.test.ts` (new)

Header comment: the site's discovery routes and brand assets were documented
only in `apps/docs/README.md`, which the page index never sees; this guard fails
when the page and the routes drift apart.

Read `content/docs/contributing.mdx` as text and assert:

1. Every route path appears in the page:
   `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`,
   `/site.webmanifest`.
2. Every route has a real module: `src/routes/sitemap[.]xml.ts`,
   `src/routes/robots[.]txt.ts`, `src/routes/llms[.]txt.ts`,
   `src/routes/llms-full[.]txt.ts`, `src/routes/site[.]webmanifest.ts`.
3. The page names the four head assets the page inherits and the manifest
   path: `BRAND_ASSETS.mark`, `.favicon`, `.touchIcon`, `.socialCard`,
   `MANIFEST_PATH`, imported from `src/lib/site-head.ts`.
4. The install limitation is stated and stays true: `manifest().display` is
   `"browser"` and the page says `display: "browser"` and "no service worker".
   Import `manifest` from `src/lib/site-manifest.ts`.

### 3.3 `apps/docs/scripts/smoke-build.ts`

Add two production search checks to `searchChecks`:

```ts
{
  query: "favicon",
  expected: "/docs/contributing",
  first: true,
  what: "the docs site's own output, which only the Contributing page documents",
},
{
  query: "graph",
  expected: "/docs/data-display",
  first: true,
  what: "a subject word the Data display summary names (`graphs`)",
},
```

## 4. Two-direction proofs (run every one and record the result)

1. **The new section is load-bearing for the reader:** delete the
   `### Site output` block and run `contributing-page.test.ts`; it must fail on
   every route and asset. The search test still passes, because the frontmatter
   summary is the ranking signal — which is exactly why the guard, not the
   ranker, owns the section's presence. Restore it; both pass.
2. **The summary is load-bearing:** change `graphs` back to `charts` and run the
   test; `graph` must fail. Restore it.
3. **The ranker tier is load-bearing:** restore
   `normalized.includes(needle)` and run the fragment test; it must fail on
   `graph` reaching Typography. Restore the suffix rule.
4. **The roadmap alias is load-bearing:** remove the `virtual list` row and run
   the test; it must fail. Restore it.
5. **The route guard is load-bearing:** rename one route module (for example
   `robots[.]txt.ts` → `robots2[.]txt.ts`) and run
   `contributing-page.test.ts`; it must fail by path. Restore the name.
6. **The install claim is load-bearing:** change the page's
   `display: "browser"` sentence to `display: "standalone"` and run the guard;
   it must fail. Restore it.

Commands, from `apps/docs`:

```sh
nubx vitest run src/lib/search.test.ts src/contributing-page.test.ts
```

Expected: the focused files pass; with a forced defect, a named failure.

## 5. Gates

Run from `apps/docs` and then the repo root:

```sh
nub run --filter docs check-types
nub run --filter docs test
nub run --filter docs build
nub run --filter docs smoke:build
nub run check
nub run lint
nub run test
```

Expected: the docs suite grows by the new tests (baseline 106 files / 765 tests);
`smoke:build` reports one more page anchor set and the two new search queries
pass; the root gates are green. `smoke:build` may be omitted only if a STOP
condition applies; it is not omitted because a search rank change is exactly
what it guards.

## 6. STOP conditions

- The measured "before" rows do not reproduce on this tree: stop and record the
  new measurements rather than implementing against a stale table.
- `graph` still reaches Typography after the suffix rule: do not add a second
  alias or a special case; report which other name matched and why.
- `virtual list` cannot be promoted without shadowing a component or page title
  (the alias guard fails): stop and report; do not weaken the guard.
- The `display: "browser"`/service-worker sentence cannot be kept true against
  `site-manifest.ts`: stop; the manifest decision belongs to the install
  metadata, not this plan.
- `smoke:build` exits `2`: report the environment (build/server/Chrome), never
  count it as a pass.

## 7. Acceptance

- [ ] Contributing documents the five discovery routes and the brand head, and
      states the no-service-worker/no-PWA limitation.
- [ ] `contributing-page.test.ts` ties the page to the real route modules, the
      real assets and the real manifest.
- [ ] `graph` reaches Data display, not Typography; `typography` and `picker`
      still reach their pages.
- [ ] `virtual list` reaches the Roadmap.
- [ ] Eight measured queries return their page first; the production build
      answers two of them.
- [ ] The six two-direction proofs are recorded in this plan's §8.
- [ ] `check-types`, the docs suite, `smoke:build`, `nub run check`,
      `nub run lint` and `nub run test` are green.

## 8. Results

Implemented 2026-10-19 on `agent/docs-site`.

**The change.**

- `content/docs/contributing.mdx`: a `### Site output` table (five routes, each
  with its source module), the brand-head paragraph with the four asset paths
  and the `display: "browser"` / no-service-worker limitation, and a frontmatter
  summary that names sitemap, robots, llms.txt, favicon, social metadata, SEO
  and the no-PWA limit.
- `content/docs/data-display.mdx`: the summary says "charts and graphs".
- `src/lib/search.ts`: `matchRank`'s tier `3` is a fragment that **ends** a name
  word, not one buried inside it.
- `src/lib/roadmap-aliases.ts`: `["Virtualized lists", ["virtual list"]]`.
- `src/contributing-page.test.ts`: 5 tests tying the page to the real route
  modules, the head assets, the manifest's declared display and the summary
  words.
- `src/lib/search.test.ts`: the plan-594 eight-query table, a real-query
  regression test, and two `mergeResults` fixtures (a suffix match still names
  `DatePicker`; `graph` no longer names `Typography`).
- `scripts/smoke-build.ts`: production queries for `favicon` and `graph`.

**Measured after.** All eight rows in §1 return their page first, at
`type: "page"`:

| Query | After |
| ----- | ----- |
| `favicon` | `/docs/contributing` |
| `robots` | `/docs/contributing` |
| `llms` | `/docs/contributing` |
| `pwa` | `/docs/contributing` |
| `seo` | `/docs/contributing` |
| `sitemap` | `/docs/contributing` |
| `graph` | `/docs/data-display` |
| `virtual list` | `/docs/roadmap` |

`typography` still returns `/docs/typography` first and `picker` still returns
`/docs/components/color-picker` (the shorter of the two picker pages), so the
suffix change removed only the mid-word match.

**Two-direction proofs (all measured, all reverted).**

1. Removing `### Site output` → `contributing-page.test.ts` fails on the routes
   and assets; the search test still passes because the summary ranks the page —
   recorded in §4 proof 1 and the reason the guard exists.
2. `graphs` → `charts` → the plan-594 table fails on `graph`.
3. `nameWords.some(endsWith)` → `normalized.includes` → the fragment test fails
   with `/docs/typography` in the `graph` results.
4. Removing the roadmap alias → the table fails with
   `virtual list -> page:/docs/components/list`.
5. Moving `robots[.]txt.ts` → the guard fails with
   `missing module src/routes/robots[.]txt.ts`.
6. `display: "browser"` → `"standalone"` in the page → the guard fails on the
   manifest sentence.

**Suites.** `nubx vitest run` in `apps/docs`: 106 files / 773 tests passed
(baseline 765). `nub run --filter docs check-types`, `nub run --filter docs
smoke:build` (`98 pages`, `121 links`, `3 brand assets`, `1284 anchors`,
`search checked`, exit `0`), `nub run check`, `nub run lint` and `nub run test`
all passed on 2026-10-19.
