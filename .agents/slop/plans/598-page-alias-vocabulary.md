# 598 — A hand-authored page answers the phrase its metadata cannot

**Phase:** F (documentation platform, search)
**Workstream:** docs-site
**Depends on:** 410, 419, 431, 566, 568, 574, 579, 582, 585, 593, 597
**Status:** in progress — §6 is filled only by the runs in §3

## 1. The measured defect

Plan 597 §6.4 recorded one open limit: `system theme` returned the Switch page
although Dark mode's summary already contained the phrase, and it named the
cause correctly — a **ranker** question, to be answered by its own plan. This is
that plan. Measured 2026-10-20 at `cb969a7e` against the real `search()` the
`/api/search` route calls:

| Query | First result today | Owning page |
| ----- | ------------------ | ----------- |
| `theme switch` | `/docs/components/switch` | Dark mode (4th) |
| `switch theme` | `/docs/components/switch` | Dark mode (4th) |
| `theme toggle` | `/docs/components/toggle` | Dark mode (4th) |
| `toggle theme` | `/docs/components/toggle` | Dark mode (4th) |
| `theme switcher` | `/docs/theming` | Dark mode (5th) |
| `system theme` | `/docs/components/switch` | Dark mode (4th) |
| `color scheme` | `/docs/components/color-picker` | Dark mode (absent from the top five) |
| `colour scheme` | `/docs/theming#semantic-roles` | Dark mode (absent) |
| `hint` | `/docs/api-values` | Inline validation (absent) |
| `supporting text` | `/docs/components/text` | Inline validation (absent) |
| `demo` | `/docs/patterns/confirmation-flow#composition` | Examples (absent from the page results) |
| `sample` | `/docs/typography` | Examples (absent from the page results) |
| `how to use` | `/docs/components/toggle` | Getting started (absent) |
| `import` | `/docs/native-testing` | Getting started (absent) |
| `version` | `/docs/installation#prerequisites` | Installation (2nd) |

Why each is structural, not a missing summary word:

- **A phrase loses to a component name.** `nameRank` matches a component title's
  *word* with `TOKEN_MATCH_RANK` (4), a scene instruction matches at `3`, and a
  page summary phrase is offset to `3 + DESCRIPTION_MATCH_RANK` = 7. So
  `theme switch` and `system theme` cannot beat Switch: the Switch live scene's
  instruction ("Click the switch to turn the system theme on.") matches both
  words at rank `3`, and the component page's title token is never reached.
- **A phrase loses to a single summary word.** For `theme toggle`, Toggle owns
  the title token and Theming/Dark mode are summary matches; the phrase tier is
  *worse* than the one-word tier once the offset is added (7 vs 5), so the page
  whose summary contains **both** words never beats the page that contains one.
- **A word has no owner at all.** `hint`, `supporting text`, `demo`, `sample`,
  `how to use` and `import` are words a reader uses for a subject the page names
  differently (helper text, examples, quickstart, import). They return prose,
  another page, or nothing.
- **A word is a prefix of a phrase.** `version` already retrieves Installation's
  prerequisites, but the page itself is second behind its own heading.

A summary can carry these words, but it cannot win: the description tier is
deliberately below a title token (plan 568), and the scene-instruction tier sits
between them (plan 582). Changing either rule would re-rank most of the site.
The measured, narrow mechanism is an **editorial alias for a hand-authored
page**, matched only as the whole query — exactly the shape plans 566 and 585
already use for components and roadmap targets, which have no title or summary
field that can contain a reader's phrase.

## 2. What to build

### 2.1 The page-alias table

New file: `apps/docs/src/lib/page-aliases.ts`.

```ts
/**
 * The phrases a reader uses for a hand-authored page when its title and
 * summary cannot outrank a component's name (plan 598). ...
 */
export const pageAliases: ReadonlyMap<string, readonly string[]> = new Map([
  [
    "/docs/dark-mode",
    [
      "theme switch",
      "switch theme",
      "theme toggle",
      "toggle theme",
      "theme switcher",
      "system theme",
      "color scheme",
      "colour scheme",
    ],
  ],
  ["/docs/components/inline-validation", ["hint", "supporting text"]],
  ["/docs/examples", ["demo", "sample"]],
  ["/docs/getting-started", ["how to use", "import", "imports"]],
  ["/docs/installation", ["version", "versions"]],
]);

/** Every alias term, flattening the table for the guards. */
export const pageAliasTerms: ReadonlyArray<string> = [
  ...pageAliases.values(),
].flat();

/**
 * `0` when the alias names the whole query; `undefined` otherwise. An alias is
 * exact-only: a prefix would let `theme` claim Dark mode through
 * `theme switch`, and a word inside a phrase would let `switch` claim it too.
 */
export const pageAliasRank = (
  url: string,
  query: string,
): number | undefined => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  return (pageAliases.get(url) ?? []).some((alias) => alias === needle)
    ? 0
    : undefined;
};
```

Exact-only is deliberate and is the difference from `aliasMatchRank` (plan 566),
which allows a query prefix for a **component** term (`text` → `textbox`).
A page alias is a multiword phrase; no reader types a prefix of one, and
allowing it would let one word of a phrase claim a page it does not own.

### 2.2 The synthesized candidate

`src/lib/search.ts` gains, next to `pageDescriptionHits`:

```ts
/**
 * A page whose alias names the query is a candidate even when no index
 * returned it (`hint`, `demo`, `sample`) — the rule `pageTitleHits` uses
 * (plan 598).
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
```

`mergeResults` adds the rank for **page** results only, so a text chunk at the
alias page's URL can never be promoted (the rule plan 569 applied to generated
names):

```ts
const aliasRank =
  result.type === "page" ? pageAliasRank(result.url, query) : undefined;
```

and the `ranks` array gains `aliasRank` first. `search()` adds
`...pageAliasHits(query, pageMetadata)` to the registry candidates.

Rank `0` is above an exact component title? No: an exact page or component
**title** also ranks `0`, and the existing tie-break (`sourceRank`, then the
shorter title) keeps the title first. The table guard forbids an alias equal to
any page title, so that tie cannot arise from a correct table.

### 2.3 The guards

New file: `apps/docs/src/lib/page-aliases.test.ts`:

| Test | Fails when |
| ---- | ---------- |
| every key is a page `source.getPages()` serves | an alias outlives a renamed or deleted page |
| no key is a component page | a component record's metadata is bypassed |
| every keyed page has at least one term | an empty entry ships |
| every term is lower-case, trimmed and non-empty | a term cannot be compared |
| a term belongs to one page only | two pages claim the same phrase |
| no term equals a page title | an alias shadows a page's own name |
| no term equals a component title, slug, exported symbol, part, props type or component alias | the misroute class plan 566 guards |
| `pageAliasRank` is exact-only | a prefix or an inner word matches |
| the fifteen measured queries return the owning page **first** | the table or the wiring is lost |
| eight regression queries keep their current owner | a term steals `theme`, `switch`, `toggle`, `color picker`, `text`, `examples`, `dark mode` or `installation` |

The integration cases use the real `search()` with `{ timeout: 120_000 }`, the
budget plan 468 set for the cold index.

### 2.4 The production check

`scripts/smoke-build.ts`'s `searchChecks` gains two `first: true` rows:
`theme switch` → `/docs/dark-mode` and `hint` →
`/docs/components/inline-validation`. Both are phrases the page index does not
retrieve today, so the check proves the synthesis against the served build, not
only the in-process index.

### 2.5 The maintainer note

`apps/docs/README.md`'s `## Search` section gains one paragraph after the
component-alias paragraph: the table's file, the exact-only rule, the measured
queries, and the constraint that a term must not shadow a component or page
name. No other document repeats it.

## 3. Order of work and commands

Run from `apps/docs`.

1. `src/lib/page-aliases.ts` (§2.1); `src/lib/page-aliases.test.ts` table guards
   only.
2. `src/lib/search.ts`: `pageAliasHits`, the `mergeResults` rank and the
   `search()` candidate.
3. Add the fifteen-query table and the eight regressions to
   `page-aliases.test.ts`.
4. `nub run --filter docs test -- src/lib/page-aliases.test.ts` → every case
   passes; then the two-direction proofs in §5.
5. `scripts/smoke-build.ts` two queries; README paragraph.
6. `nub run --filter docs check-types`.
7. `nub run --filter docs test` (expect 112 files; the count is read from the
   run, never assumed).
8. `nub run --filter docs smoke:build` — the crawl, links, anchors and the two
   new search checks.
9. Root gates: `nub run check`, `nub run lint`, `nub run test`.

## 4. STOP conditions

- Stop if any regression query in §2.3 changes owner; report the query and both
  results instead of adding a ranker tier.
- Stop if the alias needs a rank other than `0`; a weaker rank is what already
  loses, and a stronger one does not exist.
- Stop if a term must be a prefix match (for example to make `theme sw` work);
  that is plan 566's component rule, not a page rule.
- Stop if a query passes only because the lexical index returned the page
  anyway; prove synthesis with a query the index misses (`hint`, `demo`).
- Stop if `smoke:build` cannot run (exit `2`); report it as unverified rather
  than a pass.

## 5. Test plan

The two-direction proofs, each run and reverted:

1. Delete `"theme switch"` from the table → the `theme switch` case fails; the
   first result is again Switch.
2. Delete both `theme switch` and `switch theme` and remove the Switch scene's
   instruction match by querying `theme switcher` → still fails.
3. Remove `...pageAliasHits(...)` from `search()` → `hint` and `demo` fail
   (the index does not retrieve either page).
4. Remove the `aliasRank` from `mergeResults` → the synthesized candidates are
   unranked, so every measured query fails.
5. Add `"switch"` as an alias term → the shadow guard fails by name.
6. Add the same term to two pages → the uniqueness guard fails.
7. Rename a key to `/docs/not-a-page` → the key guard fails.
8. Remove the wiring and run `smoke:build` → exit `1` on
   `/api/search?query=theme%20switch`.

Regressions checked by hand and recorded in §6: `theme` → Theming, `switch` →
Switch, `toggle` → Toggle, `color picker` → Color picker, `text` → Text,
`examples` → Examples, `dark mode` → Dark mode, `installation` → Installation,
`getting started` → Getting started, `table` → Data display, `panel` →
Workspace, `aria` → Accessibility, `focus ring` → Tokens API.

## 6. Measured results

Filled by the runs in §3. Nothing in this section may be written before the
command it reports has run.

### 6.1 What shipped

<!-- filled after implementation -->

### 6.2 Commands run

<!-- filled after implementation -->

### 6.3 Two-direction proofs (each run, then reverted)

<!-- filled after implementation -->

