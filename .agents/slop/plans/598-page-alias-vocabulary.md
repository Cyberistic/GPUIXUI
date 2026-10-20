# 598 — A hand-authored page answers the phrase its metadata cannot

**Phase:** F (documentation platform, search)
**Workstream:** docs-site
**Depends on:** 410, 419, 431, 566, 568, 574, 579, 582, 585, 593, 597
**Status:** implemented — §6 records the commands, the 31-test suite and the
eight two-direction proofs

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

Inline validation is a **component page**, so `hint` and `supporting text` are
component vocabulary, not page vocabulary: they belong in plan 566's
`component-aliases.ts` beside `helper text` and `error message`, and their
expected result (`/docs/components/inline-validation`) is unchanged. The page
table therefore owns only pages without a component record, which is also what
`summaryPages` already means (plan 568).

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

`component-aliases.ts` gains `hint` and `supporting text` for
`inline-validation`; the existing component-alias guards and smoke check cover
them, so this table stays page-only.

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
| the thirteen page queries and the two component queries return the owning page **first** | the table or the wiring is lost |
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
3. Add the thirteen page queries, the two component queries and the eight
   regressions to `page-aliases.test.ts`.
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
  anyway; prove synthesis with a query the index misses (`demo`, `sample`).
- Stop if `smoke:build` cannot run (exit `2`); report it as unverified rather
  than a pass.

## 5. Test plan

The two-direction proofs, each run and reverted:

1. Delete `"theme switch"` from the table → the `theme switch` case fails; the
   first result is again Switch.
2. Delete both `theme switch` and `switch theme` and remove the Switch scene's
   instruction match by querying `theme switcher` → still fails.
3. Remove `...pageAliasHits(...)` from `search()` → `demo` and `sample` fail
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

- `apps/docs/src/lib/page-aliases.ts` — the table, the flattened term list and
  the exact-only `pageAliasRank`.
- `apps/docs/src/lib/search.ts` — `pageAliasHits`, the `aliasRank` in
  `mergeResults` (page results only) and the candidate in `search()`.
- `apps/docs/src/lib/component-aliases.ts` — `hint` and `supporting text` on
  `inline-validation`, beside `helper text` and `error message`.
- `apps/docs/src/lib/page-aliases.test.ts` — 31 tests: 8 table guards, 15
  measured queries, 8 regressions.
- `apps/docs/scripts/smoke-build.ts` — `theme switch` → `/docs/dark-mode` and
  `hint` → `/docs/components/inline-validation`, both `first: true`.
- `apps/docs/README.md` — the `## Search` paragraph.

The five regressions the plan checked outside the new file are already guarded
in `src/lib/search.test.ts` and stayed green: `table` → Data display, `panel` →
Workspace, `aria` → Accessibility, `focus ring` → Tokens API, `getting started`
→ Getting started (an exact page title, `pageTitleHits`' rank `0`).

### 6.2 Commands run

From `apps/docs`:

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test src/lib/page-aliases.test.ts` | 1 file / 31 tests pass (9.4 s) |
| `nub run --filter docs check-types` | `fumadocs-mdx && tsc --noEmit` twice, exit `0` |
| `nub run --filter docs test` | **111 files / 841 tests** pass (30.5 s) |
| `nub run --filter docs smoke:build` | 99 pages, 220 links, 1 288 anchors, search checked, **exit `0`** |

From the repository root:

| Command | Result |
| ------- | ------ |
| `nub run check` | exit `0` (test-quality, lint, format, every package's types) |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` — docs 111 files / 841 tests, components 32 / 308, primitives 25 / 282, tokens 11 / 197, icons 3 / 19, testing 3 / 19, playground 2 / 11 |

### 6.3 Two-direction proofs (each run, then reverted)

| # | Forced defect | Measured failure |
| - | ------------- | ---------------- |
| 1 | delete `"theme switch"` from the table | 2 fail — the exact-only case (`expected undefined to be +0`) and `theme switch` (`expected '/docs/components/switch' to be '/docs/dark-mode'`) |
| 2 | delete the whole `/docs/dark-mode` entry | 9 fail; the before-results are plan 598 §1's table exactly: `system theme`/`theme switch` → Switch, `theme toggle`/`toggle theme` → Toggle, `theme switcher` → Theming page, `color scheme` → Color picker, `colour scheme` → `/docs/theming#semantic-roles` |
| 3 | drop `...pageAliasHits(...)` from `search()` | 7 fail: `demo` → `/docs/patterns/confirmation-flow#composition`, `sample` → `/docs/typography`, `how to use` → Toggle, `import` → Native testing, `theme toggle`, `toggle theme`, `color scheme`, `colour scheme` |
| 4 | drop `aliasRank` from `mergeResults` | 13 fail — every page-alias query; only the two component aliases still pass, which is the point of keeping them in `component-aliases.ts` |
| 5 | add `"switch"` as a term | `does not shadow a component title, name or alias` fails with `[ 'switch' ]`; the exact-only case also fails (`expected +0 to be undefined`) |
| 6 | add `"demo"` to a second page | `uses a term for one page only` fails with `[ 'demo' ]` |
| 7 | rename a key to `/docs/not-a-page` | `keys every alias to a page that exists` fails with `[ '/docs/not-a-page' ]` |
| 8 | remove the wiring, then `smoke:build` | **exit `1`** naming the query: with `pageAliasHits` gone, `FAIL /api/search?query=theme%20switch: the first result is not under /docs/dark-mode …`; with `hint` removed from the component alias, `FAIL /api/search?query=hint: … not under /docs/components/inline-validation`. Restored → `smoke: search checked`, `smoke: ok`, exit `0` |

Every proof was reverted and the file set above is the restored state; the final
`smoke:build` after restoration is the exit-`0` run recorded in §6.2.


