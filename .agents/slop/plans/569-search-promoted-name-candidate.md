# 569 — A promoted name the lexical index cannot retrieve

**Workstream:** docs-site · **Phase:** F (polish; `MISSION.md`'s component and
page search) · **Depends on:** 410, 419, 431, 442, 447, 490, 500, 504, 505, 507,
518, 561, 564, 566, 568 · **Status:** done

Plan 564 taught `promotedNameRank` to match a generated name written the way a
reader writes it (`primary foreground` → `primaryForeground`). But the ranker
only sees the candidates the indexes return. The Fumadocs simple-search index is
lexical: it tokenises `focusRing` as one token, so `focus ring` never returns the
document that promotes it and there is nothing to rank. The result is measured,
not hypothetical.

Measured on 2026-10-19 (`9b2d9744`) against the same index the app serves:

| Query | First result today | The table that names it |
| ----- | ------------------ | ----------------------- |
| `focusRing` | `/docs/tokens-api#functions` (the authored function row) | Tokens API |
| `focus ring` | Number field — theming, keyboard and limitations prose | Tokens API — Functions |
| `elevation shadow` | `/docs/tokens-api#functions` as a **text** result only | Tokens API — Functions |
| `semantic roles` | `/docs/theming#semantic-roles` (already correct) | Theming — Semantic roles |

The function table on `/docs/tokens-api` is authored MDX, so its rows are in the
page index, but a camelCase name is one lexical token. `focus ring` never
retrieves the page. `elevation shadow` retrieves it only as body text, which is
why it currently appears above the page itself rather than as a named result.
`semantic roles` is the regression guard: the fix must not disturb a generated
document that already answers.

## 1. The rule

1. **A promoted name is a candidate even when the lexical index misses it.**
   `generatedNameHits(query)` returns one `type: "page"` result per generated
   entry whose `promotedNameRank(entry, query)` is defined — the same synthesis
   `pageTitleHits` already applies to page titles (plan 561) and
   `pageDescriptionHits` applies to authored summaries (plan 568).
   `search()` passes these hits with the registry results, so a variant name
   reaches `mergeResults` and its rank (exact `0`, variant `TOKEN_MATCH_RANK`)
   puts it ahead of prose.
2. **A URL is still listed once.** The synthesized hit carries the generated
   document's own URL, so `seenPages` deduplicates it against the registry hit
   when the lexical index *did* return it (an exact `focusRing` query).
3. **The Tokens API function table becomes a generated entry.** Its rows are
   authored, but its names are the package's real exports, so
   `src/lib/tokens-api-search.ts` derives `names` from
   `valueExports` (package `@gpuixui/tokens*`, kind `function` or `hook`,
   visibility `public`). The document exists to **promote**, not to duplicate
   the authored table: its `content` is one sentence about the table, and the
   names travel in `names`. The URL is `/docs/tokens-api#functions`, the anchor
   the page already renders. No hand-written component-name list.
4. **Only the document earns the name, not its body chunks.** The page index
   returns the token table as a text chunk at the same URL. `mergeResults`
   applies the generated rank only to `type: "page"` results, so the synthesized
   page leads and the table chunk follows, instead of the table outranking the
   page it belongs to.
5. **Only distinctive names are promoted.** A camelCase helper
   (`focusRing`, `elevationShadow`, `useTheme`) is promoted; a plain word
   (`alpha`, `spacing`) is indexed but not promoted, the rule plans 504/505
   established. `input` and `label` therefore keep their component pages.
6. **The production index is proven.** `smoke:build` adds three first-result
   checks: `focus ring` → `/docs/tokens-api`, `elevation shadow` →
   `/docs/tokens-api`, `semantic roles` → `/docs/theming#semantic-roles`. The dev
   suite is not the release gate.
7. **The rule is documented** in `apps/docs/README.md` (`## Search`).

## 2. Files

| Path | Change |
| ---- | ------ |
| `apps/docs/src/lib/generated-search.ts` | export `isDistinctiveName` (the plain-word rule shared with the token catalogue) |
| `apps/docs/src/lib/tokens-api-search.ts` | new: `tokensApiSearchEntry` derived from `valueExports` |
| `apps/docs/src/lib/token-search.ts` | use the shared `isDistinctiveName`; no behaviour change |
| `apps/docs/src/lib/search.ts` | `generatedNameHits`, wire into `generatedEntries` and `search()` |
| `apps/docs/src/lib/search.test.ts` | unit cases for synthesis and the single-word floor; integration cases for the five measured queries; header comment |
| `apps/docs/src/lib/tokens-api-search.test.ts` | new: every promoted name is a real token helper and the entry indexes `focusRing`/`elevationShadow` |
| `apps/docs/scripts/smoke-build.ts` | three `searchChecks` rows |
| `apps/docs/README.md` | one paragraph in `## Search` |
| `.agents/slop/plans/README.md` | this row |
| `TODO.md` | tick the docs-site task |
| `PLAN.md` | decision `D47` |

## 3. Implementation

### 3.1 `generated-search.ts`

```ts
/** A camelCase, dotted or hyphenated name is distinctive enough to promote. */
export const isDistinctiveName = (name: string): boolean =>
  /[A-Z]/.test(name) || /[.-]/.test(name);
```

`token-search.ts` replaces its local `isDistinctive` with this export. The
behaviour is identical for every name the catalogue produces (`[.-]` covers the
dots the old `includes(".")` covered); one rule, one place.

### 3.2 `tokens-api-search.ts`

```ts
const helperNames = valueExports
  .filter(
    (value) =>
      value.package.startsWith("@gpuixui/tokens") &&
      value.visibility === "public" &&
      (value.kind === "function" || value.kind === "hook"),
  )
  .map((value) => value.name);

export const tokensApiSearchEntry: GeneratedSearchEntry = {
  names: helperNames.filter(isDistinctiveName),
  index: {
    title: "Tokens API",
    description:
      "Theme shapes, extension helpers and the React provider in @gpuixui/tokens.",
    content:
      "The exported helpers documented in the Functions table, with their signatures and return values.",
    url: "/docs/tokens-api#functions",
    breadcrumbs: ["Tokens API"],
  },
};
```

The document exists to promote the names; the table itself is authored MDX and
stays visible to the page index. Duplicating the rows in `content` would make
the entry work only while its prose happened to repeat the query, which is the
retrieval dependency this plan removes.

### 3.3 `search.ts`

```ts
const generatedEntries = [
  accessibilitySearchEntry,
  ...tokenSearchEntries,
  tokensApiSearchEntry,
  capabilitySearchEntry,
  iconSearchEntry,
  roadmapSearchEntry,
];

/**
 * A generated document whose promoted name matches is a candidate even when
 * the lexical index never returned it (plan 569), the rule `pageTitleHits`
 * uses for titles.
 */
export const generatedNameHits = (
  query: string,
  entries: ReadonlyArray<GeneratedSearchEntry> = generatedEntries,
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
```

`search()` appends `...generatedNameHits(query)` beside `pageTitleHits` and
`pageDescriptionHits`. `mergeResults` scores a `type: "page"` result by
`generatedByUrl.get(result.url)`; the synthesized hit carries that URL, so the
rank and the dedupe follow from the existing rules. The generated rank is
applied only to page results, because a text chunk at the same URL (the Tokens
API table) is data inside the document, not the document.

### 3.4 Tests

`tokens-api-search.test.ts` (unit, no index):

- every promoted name is a real `valueExports` helper of a `@gpuixui/tokens`
  entry point;
- `focusRing` and `elevationShadow` are promoted and match their prose form;
- a plain helper (`alpha`) is **not** in `names` and does not match.

`search.test.ts` (unit, fixtures):

- `generatedNameHits("focus ring", [fixture("focusRing")])` returns one page
  result at the fixture's URL;
- `generatedNameHits("input", [fixture("inputForeground")])` returns `[]`;
- `generatedNameHits("focusRing", [...])` returns the exact hit;
- `mergeResults` keeps one entry when the synthesized hit and a registry hit
  share a URL;
- `mergeResults` leaves a same-URL **text** chunk behind the synthesized page.

`search.test.ts` (integration, real `source`):

- `focus ring` → a `type: "page"` result at `/docs/tokens-api#functions` first;
- `elevation shadow` → a `type: "page"` result at `/docs/tokens-api#functions`
  first (before it was only a text chunk);
- `semantic roles` → `/docs/theming#semantic-roles` first;
- `focusRing` still → `/docs/tokens-api` first;
- `input` → `/docs/components/text-input` first and `label` →
  `/docs/components/label` first.

## 4. Commands and expected results

From the repo root:

```sh
nub run --filter docs test
```

Expected: the suite before the change is **86 files / 603 tests**; this plan adds
one file and ten cases in `search.test.ts`, so the run is **86 files / 613
tests**, all green, no other suite changes.

```sh
nub run --filter docs check-types
nub run check
nub run lint
```

Expected: all green.

```sh
nub run --filter docs smoke:build
```

Expected: `smoke: ok`; the search table includes the three new rows; the page
count is unchanged (the new entry is a document, not a route).

## 5. Test plan (two directions)

Every guarded claim is measured before the fix or by reverting it.

| # | Claim | Direction 1 (must fail) | Direction 2 (must pass) |
| - | ----- | ----------------------- | ----------------------- |
| 1 | A variant promoted name is synthesized | remove `...generatedNameHits(query)` from `search()`; `focus ring` and `elevation shadow` return Number field/prose | restore; both first at `/docs/tokens-api` |
| 2 | The Tokens API names are promoted | drop `tokensApiSearchEntry` from `generatedEntries`; both queries regress again | restore; green |
| 3 | Only real helpers are promoted | add `"zzzNotAHelper"` to `names`; the real-exports test fails | remove; green |
| 4 | A plain word is not promoted | remove `.filter(isDistinctiveName)`; `input`/`label` move, the unit floor case fails | restore; component pages first |
| 5 | A generated page is still listed once | force the synthesized hit to use a different URL; the dedupe unit case fails | restore; one page |
| 6 | A body chunk does not outrank its page | apply the generated rank to every result type; the elevation-shadow case's first result is the table chunk, not a `page` | restore; the first result is `type: "page"` at `/docs/tokens-api#functions` |
| 7 | The semantic-roles answer is untouched | delete the colour-roles entry; `semantic roles` fails | restore; first at `/docs/theming#semantic-roles` |
| 8 | Production index | remove the synthesis; `smoke:build` fails naming `focus ring` and `elevation shadow` | restore; `smoke: ok` |

## 6. STOP conditions

- **STOP** if `focus ring` still returns the Number field page after synthesis;
  report the full result URLs instead of adding a second special case.
- **STOP** if the new entry changes the first result for any query the existing
  suite already asserts. Report the query and both URLs; do not weaken a test.
- **STOP** if `valueExports` has no `focusRing`/`elevationShadow` — the generated
  file is stale; run `nub run --filter docs api:values` and re-read this plan.
- **STOP** if `smoke:build` exits `2` (build or server failure); report the exit
  code, never a pass.

## 7. Measured results

Run on 2026-10-19 in `workspaces/docs-site`.

| Run | Command | Result |
| --- | ------- | ------ |
| suite | `nub run test` | 86 files / 613 tests, all green (docs 86/613, primitives 25/282) |
| types | `nub run check` | `check`, `lint`, `test`, `oxfmt` and every workspace `check-types` green |
| production crawl | `nub run --filter docs smoke:build` | exit `0`; 96 pages, 119 links, 1 260 anchors, search checked, `smoke: ok` |

Two-direction proofs:

1. **Synthesis removed** (`...generatedNameHits(query)` dropped): the new
   `reaches a generated document named in prose` case fails with three misses —
   `focus ring`, `elevation shadow` and `focusRing` no longer produce a page
   result; restoring it passes.
2. **Tokens API entry removed** (`tokensApiSearchEntry` dropped from
   `generatedEntries`): three cases fail (the integration case and the two
   merge/dedupe unit cases); restoring passes.
3. **Page-only rank reverted** (`generatedByUrl.get` applied to every result
   type): the integration case and `leaves prose behind a synthesized page`
   fail because the same-URL text chunk leads; restoring passes.
4. **Plain-word floor removed** (`.filter(isDistinctiveName)` dropped):
   `does not promote a plain helper name` fails on `alpha`; restoring passes.
5. **Colour-roles entry removed** (`tokenSearchEntries.slice(1)`):
   `semantic roles` falls back to `/docs/theming` instead of
   `/docs/theming#semantic-roles`; restoring passes.
6. **Production index**: the three new `smoke:build` rows are green in the full
   run above; removing the synthesis is the same defect measured in proof 1.

