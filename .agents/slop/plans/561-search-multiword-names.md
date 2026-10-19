# 561 — Search ranks a component named inside a multi-word query

**Phase:** F (docs search quality).
**Owner:** `docs-site`.
**Depends on:** 410, 411, 419, 431, 442, 490, 500, 504, 505, 506.
**Status:** ready to implement.

## 0. Why

Plan 431 taught the search API that a component **name** outranks prose, and
plan 500 extended the name set to exported symbols (`Spinner`, `ScrollArea`). The
ranker compares the **whole query** with a name. A reader types natural phrases,
not single words, so the promotion misses whenever the component is one token of
the query — and the body-text index decides instead.

Measured on the dev server, 2026-10-19 (`curl /api/search?query=…&limit=10`):

| Query | Result #1 | Where the obvious page ranks |
| ----- | --------- | ---------------------------- |
| `popover placement` | `Box` variants text | `Popover` #6 |
| `button loading` | `Spinner` composition | `Buttons` #9 |
| `input label` | `Settings form` pattern | `Text inputs` absent from the top 10 |
| `command palette` | `Roadmap` | `Command palette` #2 |
| `dialog focus` | `Confirmation flow` | `Dialogs` absent from the top 5 |

Two causes:

1. `componentRank` calls `matchRank(name, query)` with the whole query, so
   `"popover placement"` matches neither `Popovers` nor `PopoverContent`.
2. `mergeResults` ranks a candidate only through `componentByUrl` (the registry)
   and `generatedByUrl`. A page whose **title** is the query
   (`Command palette`) gets no rank, so raw term frequency wins.

The second cause also means a named component cannot surface at all when neither
index returns its page: `popover placement` returns text fragments from the
Popover page but never the page itself.

This plan fixes both without weakening the existing rules: an exact/prefix
single-word query still wins, a blank query still returns `[]`, a page is still
listed once, and a planned record still points at the filtered index.

## 1. Design

### 1.1 Two tiers of name match

Keep `matchRank` as the primitive (0 equal, 1 prefix, 2 word prefix, 3
substring). Add `nameRank(names, query)`:

- **full query** — the best `matchRank` over the names, as today; ranks `0–3`.
- **any token** — split the query on whitespace (tokens shorter than 2
  characters are ignored), take the best `matchRank` over every name/token pair,
  and add `TOKEN_RANK_OFFSET = 4`; ranks `4–7`.

A full-query match therefore always outranks a token-only match. This is what
keeps `command palette` on the pattern page rather than on `Command menus`: the
pattern's own title matches the whole query.

`componentRank` becomes `nameRank([title, ...componentSymbols(component)], query)`.

### 1.2 Page titles are names too

In `mergeResults`, a `type: "page"` result is scored by its own `content` (the
page title) with the same `nameRank`. Its rank is the better of:

- the component record that owns the URL (when it is a component page),
- the generated document that owns the URL (existing `exactNameRank`),
- the result's own page title.

Non-page results (text, heading) keep `Infinity`: their relevance is the body
match, and promoting them would turn a snippet that mentions a word into a
second answer.

### 1.3 A named page is always a candidate

The page index does not guarantee a page result for a page's own title: with
`theming` it returned the 44th result as a heading fragment and never
`/docs/theming`. `search` therefore appends a synthesized `page` result for
every page whose title matches (`nameRank`), using `source.getPages()` and the
page's real URL and title.

This covers component pages too (their titles are page titles), so the registry
index does not need a parallel synthesis: it already returns a component for a
name query, and its result is ranked by `componentRank`. `mergeResults` still
deduplicates page results by URL, so a page the index did return is listed once.

The synthesized `id` is `page-title:<url>`, which cannot collide with a
Fumadocs id.

### 1.4 What does not change

- `matchRank` scoring and its single-word behaviour (plans 431, 500).
- Generated-document promotion (`exactNameRank`, plans 504, 505, 507).
- Type-table rows are still dropped (plan 479).
- The empty-query guard, the limit clamp and the URL dedupe.
- The index filter (`matchesComponent`) is a local title/summary filter, not the
  ⌘K ranker; this plan does not change it.

## 2. Exact files

| Action | Path | What |
| ------ | ---- | ---- |
| edit | `apps/docs/src/lib/search.ts` | `nameRank`, token offset, page-title rank, synthesized name hits |
| edit | `apps/docs/src/lib/search.test.ts` | the new ranking rules, both directions |
| edit | `apps/docs/README.md` | one sentence on the two-tier name rank |
| edit | `TODO.md` | add and tick the task in the docs-site block |
| edit | `.agents/slop/plans/README.md` | index this plan |
| edit | `PLAN.md` | decision row D43 |

## 3. Steps

1. Add `TOKEN_RANK_OFFSET`, `queryTerms` and `nameRank` to `search.ts`.
2. Route `componentRank` through `nameRank`.
3. Score `type: "page"` results by `content` in `mergeResults`, combining with
   the existing component/generated ranks.
4. Add `pageTitleHits(query)` and append it to the registry results inside
   `search` (before merging).
5. Add the tests in §5.
6. Run every command in §4; record the measured before/after in §6.
7. Tick `TODO.md`, index the plan, commit and push `agent/docs-site`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | exit 0; every existing search test still passes, the new cases included |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs smoke:build` | exit 0; the production search query (`Spinner`) still answers |
| `nub run --filter docs smoke:search` | exit 0; ⌘K opens, types, navigates and restores focus |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

## 5. Test plan (each test must be able to fail)

In `src/lib/search.test.ts`:

1. **A component named inside a phrase reaches its page** —
   `search("popover placement")[0].url === "/docs/components/popover"`.
   Fails today: the first five results are Box, Spinner and Date picker text,
   and Popover is sixth.
2. **The first token names the component, the second is prose** —
   `search("button loading")[0].url === "/docs/components/button"`.
   Fails today: Spinner ranks first.
3. **A page title that matches the whole query beats a component token match** —
   `search("command palette")[0].url === "/docs/patterns/command-palette"`.
   Fails today: Roadmap ranks first.
4. **A component token reaches its page when body fragments rank first** —
   `search("dialog focus")[0].url === "/docs/components/dialog"`.
   Fails today: Confirmation flow owns the top five.
5. **A component page outranks a pattern that uses it** —
   `search("input label", 3)` contains `/docs/components/text-input` (and/or
   `/docs/components/label`) before `/docs/patterns/settings-form`.
6. **A page titled by the query reaches its own page** —
   `search("theming")[0].url === "/docs/theming"` (today the first three hits
   are the `## Theming` heading on component pages, and the page is 44th) and
   `search("example")[0].url === "/docs/examples"` (today a Getting started
   heading wins).
7. **A named component survives a second word that matches nothing** —
   `search("popover zzzz")[0].url === "/docs/components/popover"`.
8. **Unit: a page title token match is ranked** —
   `mergeResults([titledPage("/docs/components/popover", "Popovers")], [], "popover placement")[0]`
   is the Popover page (a `titledPage` fixture carries the real title).
9. **Unit: a full page-title match outranks a token-only component match** —
   `mergeResults([pageResult("/docs/patterns/command-palette")], [pageResult("/docs/components/command-menu")], "command palette")[0]`
   is the pattern page.
10. **Unit: a title hit does not duplicate a returned page** —
    `search("toast dismiss")` lists `/docs/components/toast` once as a page
    result.

Existing tests must stay green: exact names (`button`, `Spinner`), props types
(`ButtonProps`), part names (`DialogTitle`), planned URLs, blank queries,
deduplication and the limit.

Two-direction proofs to run and record in §6:

- Revert `componentRank` to a whole-query `matchRank` → tests 1, 2, 4 and 5
  fail with the measured wrong URLs (`box#variants`, `spinner#composition`,
  `confirmation-flow#related`).
- Remove `pageTitleHits` from `search` → test 6 fails (the page index answered
  only with headings).
- Remove the page-title score from `mergeResults` → test 3 fails with
  `/docs/roadmap` first, and test 6 fails too.
- Make token matches rank without the offset (or drop the full-query tier) →
  test 3 fails (the token match ties or wins).

## 6. Results

Run 2026-10-19 on `agent/docs-site`, against the dev server's real
`/api/search` (limit 5) and then the production build.

### Before and after

| Query | Before, result #1 | After, result #1 |
| ----- | ----------------- | ---------------- |
| `popover placement` | `/docs/components/box#variants` | `/docs/components/popover` |
| `button loading` | `/docs/components/spinner#composition` | `/docs/components/button` |
| `dialog focus` | `/docs/patterns/confirmation-flow#related` | `/docs/components/dialog` |
| `command palette` | `/docs/roadmap` | `/docs/patterns/command-palette` |
| `input label` | `/docs/patterns/settings-form` | `/docs/components/label` (then `text-input`) |
| `theming` | `/docs/components/accordion#theming` | `/docs/theming` |
| `example` | `/docs/getting-started#try-the-library-in-an-example` | `/docs/examples` |

Queries with no name match keep their old order: `keyboard`, `accessibility`,
`open`, `docs`, `layout` and `dark` returned the same head of list before and
after.

### Commands

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 77 files / 533 tests passed |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs smoke:search` | exit 0; `smoke: search palette checked` |
| `nub run --filter docs smoke:build` | exit 0; 95 pages, 118 links, 1 182 anchors, production search answered |
| `nub run check` | exit 0 (tests quality, lint, format, every workspace's types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0; every workspace green, docs 533 |

### Two-direction proofs (each applied, observed, then reverted)

1. **Whole-query ranking only** (the old `componentRank`) — 7 tests failed with
   the measured wrong URLs: `box#variants` for `popover placement`,
   `spinner#composition` for `button loading`, `confirmation-flow` for
   `dialog focus`, no `/docs/components/text-input` in the top five,
   `box#variants` for `popover zzzz`, no page-type Toast hit, and the
   page-title-token unit test returned `/docs/components/popover#theming`.
2. **`pageTitleHits` removed** — 2 tests failed: `theming` returned
   `/docs/components/accordion#theming` and `example` returned
   `/docs/getting-started`.
3. **Page-title score removed from `mergeResults`** — 4 tests failed:
   `command palette` returned `/docs/roadmap`, `theming` and `example` returned
   their heading fragments, and the unit fixture returned `command-menu`.
4. **Token offset set to `0`** — the new unit fixture failed with
   `/docs/components/button` beating a page titled `Buttons guide`, which is
   exactly the tie the offset exists to prevent.

## 7. STOP conditions

- An existing search test regresses and the only fix is to change its assertion
  — stop and report; the rules in plans 431/500 are not negotiable.
- `smoke:build` finds a page the synthesized result points at that does not
  exist — stop; that is a registry/page mismatch, not a search bug.
- The cold search suite exceeds its 120 s budget on a loaded host — record it and
  stop; the budget is plan 468's.

## 8. Acceptance

- The seven measured queries (and `popover zzzz`) return their obvious page
  first.
- Every pre-existing search rule still holds (exact name, symbol, props, part,
  generated document, empty query, dedupe, limit).
- The production search smoke answers and the full gates in §4 pass.
