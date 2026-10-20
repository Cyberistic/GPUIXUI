# 614 — Reader vocabulary, eleventh pass: the design system, the data grid and the failure phrasings

**Phase:** F (docs truth and search quality)
**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`, the
component-page template)
**Depends on:** 410, 419, 431, 561, 566, 568, 574, 579, 585, 598, 599, 603,
607, 608, 610, 611, 612
**Status:** implemented

## 1. What is wrong, measured

A sweep of the production ranker (the same `search()` the `/api/search` route
uses) on 2026-10-20 measured the queries below. Each is a phrase a reader types
when they mean the page in the third column. The right-hand column is the actual
first result before this plan.

| Query | Before | Owner the reader means |
| ----- | ------ | ---------------------- |
| `design system` | Text area limitations | `/docs/theming` |
| `design systems` | Text area limitations | `/docs/theming` |
| `data grid` | `/docs/components/stack` | `/docs/data-display` |
| `nothing shows` | `/docs/previews#when-nothing-is-proven` | `/docs/troubleshooting` |
| `empty window` | `/docs/components/empty-state` | `/docs/troubleshooting` |
| `window is empty` | `/docs/components/empty-state` | `/docs/troubleshooting` |
| `screen is empty` | `/docs/components/empty-state` | `/docs/troubleshooting` |
| `invisible text` | `/docs/components/text` | `/docs/troubleshooting` |
| `text invisible` | `/docs/components/text` | `/docs/troubleshooting` |
| `text is invisible` | `/docs/components/text` | `/docs/troubleshooting` |
| `why is my text invisible` | `/docs/components/text` | `/docs/troubleshooting` |
| `label is invisible` | `/docs/components/label` | `/docs/troubleshooting` |
| `colors are wrong` | Text area limitations | `/docs/troubleshooting` |
| `colours are wrong` | Text area limitations | `/docs/troubleshooting` |
| `wrong colors` | `/docs/components/color-picker` | `/docs/troubleshooting` |
| `wrong colours` | Theming semantic roles | `/docs/troubleshooting` |
| `window resize` | Separator limitations | `/docs/styling` |
| `resize window` | Separator limitations | `/docs/styling` |
| `window size` | Spinner sizes | `/docs/styling` |
| `chat` | Performance container table | `/docs/roadmap` |

Three of these are not vocabulary problems:

- **`design system` has no owner.** The repository has
  `docs/design-system.md` (identity, roles, states), and the site renders every
  value it describes on `/docs/theming` — but the phrase names no page, so ⌘K
  answers with a component's limitation. The Theming intro also never states the
  identity ("graphite and iris") the repository document leads with.
- **`data grid` regressed against plan 579's own claim.** Plan 579 says
  "`datagrid`, `data grid` and `sidebar` still reached Stack or nothing" and
  fixed them with the Data display summary; only `datagrid` and `sidebar` are
  guarded in `search.test.ts`. The two-word phrase still returns Stack, because
  the summary says `datagrids` (one word) and `descriptionMatchRank` compares
  words, not phrases. The tabular meaning is unambiguous, so the phrase belongs
  to Data display while plain `grid` keeps Stack.
- **`chat` names a tracked target.** `COMPONENTS.md` and the generated roadmap
  carry `Chat (AI conversation)` with status `todo`; the page that answers the
  request honestly is the roadmap, not a performance prose chunk.

The remaining seventeen are one exact phrase each whose page already answers it:

- Troubleshooting already has `## Nothing appears in the window` and
  `## The colours are wrong, or a label is invisible`; the phrases above are the
  words a reader types for those two sections.
- Styling already answers the resize question in its absent-CSS table: a
  media-query replacement is "Styles are resolved in JavaScript, so the app
  passes a different style for a different size."

`page-aliases.ts` matches the whole query only, so none of these can steal a
shorter query (`grid`, `text`, `label`, `empty state`, `resize`, `color`).

## 2. Design

Do not add a ranker rule. Use the three mechanisms the site already has:

1. **Exact page aliases** (`apps/docs/src/lib/page-aliases.ts`) for phrases
   whose page already explains the subject. An alias ranks `0` and is compared
   with the whole trimmed, lower-cased query.
2. **One authored sentence** on Theming for the design-system identity. The
   alias points at content that answers the query; it is not a substitute.
3. **One roadmap alias** (`apps/docs/src/lib/roadmap-aliases.ts`) for `chat`,
   whose target name and note both contain the word.

No new page, no new dependency, no ranker change. The alias table is editorial
search vocabulary (plan 598), the roadmap table is one word the target already
contains (plan 585), and the sentence is the missing identity statement
`MISSION.md` asks the docs to own.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/page-aliases.ts` | extend four blocks and the header comment (§4.1) |
| `apps/docs/src/lib/roadmap-aliases.ts` | add the `Chat (AI conversation)` row (§4.2) |
| `apps/docs/content/docs/theming.mdx` | description and one identity paragraph (§4.3) |
| `apps/docs/src/lib/page-aliases.test.ts` | add nineteen `owned` rows and two `regressions` rows (§4.4) |
| `apps/docs/src/lib/search.test.ts` | correct plan 579's comment so it names the alias, not the summary (§4.5) |
| `apps/docs/src/lib/roadmap-search.test.ts` | one end-to-end `chat` assertion (§4.6) |
| `apps/docs/src/lib/theming-page.test.ts` | **new** — the identity sentence and the `design system` destination (§4.7) |
| `apps/docs/scripts/smoke-build.ts` | four production search checks (§4.8) |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | tick the completed task under the docs-site workstream |

No package source changes.

## 4. Implementation

### 4.1 Aliases

`apps/docs/src/lib/page-aliases.ts` — append the terms to the existing blocks,
keeping each block's list style:

- `/docs/data-display` → `"data grid"`
- `/docs/styling` → `"window resize"`, `"resize window"`, `"window size"`
- `/docs/theming` → `"design system"`, `"design systems"`
- `/docs/troubleshooting` → `"nothing shows"`, `"empty window"`,
  `"window is empty"`, `"screen is empty"`, `"invisible text"`,
  `"text invisible"`, `"text is invisible"`, `"why is my text invisible"`,
  `"label is invisible"`, `"colors are wrong"`, `"colours are wrong"`,
  `"wrong colors"`, `"wrong colours"`

Extend the header comment with one paragraph naming plan 614 and the two
failures it closes: the design-system subject had no owner, and the two-word
`data grid` phrase plan 579 named was never guarded.

### 4.2 Roadmap alias

`apps/docs/src/lib/roadmap-aliases.ts`:

```ts
["Chat (AI conversation)", ["chat"]],
```

The guard (`roadmap-search.test.ts`) requires the target to exist in
`roadmap.generated.ts`, the word to occur in the target's name or note (it occurs
in both), and the term to shadow no component, page title or other alias.

### 4.3 Theming identity

`apps/docs/content/docs/theming.mdx` frontmatter description gains the subject
name at the front:

```
description: The GPUIXUI design system: semantic colour roles, spacing, radius, border widths, shadows, density and elevation, light, dark and high-contrast themes, platform styles for macOS, Linux and Windows, and the extension mechanism.
```

Directly after the opening paragraph (before `## Providers`) add:

```mdx
GPUIXUI's design system is **graphite and iris**: a cool graphite canvas with one
confident iris accent reserved for primary actions, focus and selection. This page
owns its values; [Typography](/docs/typography) owns the type scale,
[Styling](/docs/styling) the `style` prop and the CSS it replaces,
[Component API](/docs/component-api) the shared part contract, and
[Tokens API](/docs/tokens-api) the typed surface.
```

This is the identity sentence `docs/design-system.md` leads with, and the hub the
four pages lacked. No new numbers or claims: every linked page exists.

### 4.4 Page-alias tests

In `apps/docs/src/lib/page-aliases.test.ts`, append to `owned` (the list is
ordered by plan):

```ts
["design system", "/docs/theming"],
["design systems", "/docs/theming"],
["data grid", "/docs/data-display"],
["nothing shows", "/docs/troubleshooting"],
["empty window", "/docs/troubleshooting"],
["window is empty", "/docs/troubleshooting"],
["screen is empty", "/docs/troubleshooting"],
["invisible text", "/docs/troubleshooting"],
["text invisible", "/docs/troubleshooting"],
["text is invisible", "/docs/troubleshooting"],
["why is my text invisible", "/docs/troubleshooting"],
["label is invisible", "/docs/troubleshooting"],
["colors are wrong", "/docs/troubleshooting"],
["colours are wrong", "/docs/troubleshooting"],
["wrong colors", "/docs/troubleshooting"],
["wrong colours", "/docs/troubleshooting"],
["window resize", "/docs/styling"],
["resize window", "/docs/styling"],
["window size", "/docs/styling"],
```

Append to `regressions`:

```ts
["grid", "/docs/components/stack"],
["resize", "/docs/workspace"],
```

`empty state`, `text`, `label` and `color picker` already guard the component
owners the new phrases could steal. `resize` is plan 585's Workspace alias, so
the new `window resize` phrase cannot take it either.

### 4.5 Plan 579's comment

In `apps/docs/src/lib/search.test.ts`, the block comment above "reaches a page by
the alternate name its summary names (plan 579)" says the summary owns
`data grid`. Correct it to say the summary owns `datagrid` and `sidebar`, and the
two-word phrase is the guarded alias added by plan 614. Change no assertion in
that test; the new row lives in §4.4.

### 4.6 Roadmap test

In `apps/docs/src/lib/roadmap-search.test.ts`, add to the end of the roadmap
alias describe block:

```ts
it("finds the planned chat target by the word a reader types", async () => {
  const [first] = await search("chat");
  expect(first?.url).toBe("/docs/roadmap");
});
```

### 4.7 Theming page guard

New `apps/docs/src/lib/theming-page.test.ts`:

- reads `content/docs/theming.mdx` with `readFileSync` (the pattern
  `motion-truth.test.ts` uses) and requires the paragraph to contain
  `"graphite and iris"` and `"design system"`;
- requires the four hub links (`/docs/typography`, `/docs/styling`,
  `/docs/component-api`, `/docs/tokens-api`);
- requires `search("design system")` to return `/docs/theming` first.

Header comment states the bug: the identity existed only in the repository
document and `design system` reached a component's limitation.

### 4.8 Production checks

In `apps/docs/scripts/smoke-build.ts`, add to `searchChecks`:

```ts
{
  query: "design system",
  expected: "/docs/theming",
  first: true,
  what: "the design-system identity, which reached a component limitation before plan 614",
},
{
  query: "data grid",
  expected: "/docs/data-display",
  first: true,
  what: "the two-word data-grid phrase plan 579 named but never guarded",
},
{
  query: "invisible text",
  expected: "/docs/troubleshooting",
  first: true,
  what: "a failure phrasing the Troubleshooting page answers",
},
{
  query: "chat",
  expected: "/docs/roadmap",
  first: true,
  what: "the planned chat target, which reached a performance prose chunk before",
},
```

## 5. Commands and expected results

Run from `apps/docs` unless stated:

| Command | Expected |
| ------- | -------- |
| `nub run test -- src/lib/page-aliases.test.ts src/lib/roadmap-search.test.ts src/lib/theming-page.test.ts` | all pass; the new `owned` rows and the `chat` assertion fail before the code change |
| `nub run test` | 125 files / 1 208 tests pass (the new file adds three) |
| `nub run check-types` | exit `0` |
| `nub run --filter docs smoke:build` | exit `0`; the four checks named in §4.8 report "smoke: search checked" |
| `nub run check` (repo root) | exit `0` |
| `nub run lint` (repo root) | exit `0` |

Record the exact counts in this plan's §6 when they differ.

## 6. Test plan and two-direction proofs

The tests must be able to fail. Prove each direction and revert:

1. **Alias direction** — remove `["data grid", "/docs/data-display"]` from the
   Data display block; `page-aliases.test.ts` fails with
   `data grid → /docs/components/stack`, then passes when restored.
2. **Component-owner direction** — temporarily add `"text"` to the Theming
   block; the "does not shadow a component title, name or alias" test fails,
   then passes when reverted. This proves the misroute guard, not the ranker.
3. **Failure phrasing direction** — remove `["invisible text",
   "/docs/troubleshooting"]`; the owned row fails with `/docs/components/text`.
4. **Design-system content direction** — delete the identity paragraph from
   `theming.mdx`; `theming-page.test.ts` fails on the missing sentence, then
   passes when restored.
5. **Roadmap direction** — remove the `chat` alias; `roadmap-search.test.ts`
   fails with the performance page, then passes.
6. **No stolen word** — `grid`, `resize`, `text`, `label`, `empty state` and
   `color picker` keep their owners (the regression table).

Record the measured before/after for every row in §1.

## 7. STOP conditions

- **STOP** if a new alias shadows a page title, component title/symbol/alias or
  another page's term. Choose a different phrase; do not relax the guard.
- **STOP** if `data grid` cannot reach Data display without changing the
  ranker. Plan 579 fixed the subject with an alias-shaped mechanism; a ranker
  change is a different plan.
- **STOP** if Theming cannot honestly answer `design system` without copying
  `docs/design-system.md`. One identity paragraph and links are the scope; full
  porting is a separate plan.
- **STOP** if `chat` requires promoting a word the target does not contain, or
  if the roadmap guard rejects it as a shadowed term.
- **STOP** if any existing regression row (`grid`, `resize`, `text`, `label`,
  `empty state`, `color picker`, `read only`, `tabel`) changes owner.

## 8. Acceptance criteria

- The nineteen measured phrases return the owner in §1 as the first result.
- `search("design system")` returns `/docs/theming`, whose intro now states the
  identity and links the four layer owners.
- `data grid` is guarded in both the unit table and the built-site crawl, and
  plan 579's comment no longer claims the summary owns the phrase.
- `chat` reaches the roadmap and its planned `Chat (AI conversation)` row.
- No ranker change, no new dependency, no new page.
- `nub run test`, `nub run check-types`, `nub run smoke:build`, `nub run check`
  and `nub run lint` pass with the counts recorded in §6.
- This plan is indexed in `.agents/slop/plans/README.md`; `TODO.md` records the
  task as done.

## 9. Result

Implemented 2026-10-20 on `agent/docs-site`.

**Measured after.** The nineteen rows in §1 now return the owner first; the two
regression rows (`grid` → Stack, `resize` → Workspace) keep their owners. The
built-site crawl adds four production checks and passes: 105 pages, 1 357
anchors, `smoke: search checked`.

**Two-direction proofs (run, then reverted):**

1. Removing the `data grid` alias failed
   `data grid → /docs/data-display` (1 failed / 255 passed); restoring it
   passed.
2. Adding `text` to the Theming block failed "does not shadow a component
   title, name or alias"; reverting passed.
3. Removing `invisible text` failed `invisible text → /docs/troubleshooting`;
   restoring passed.
4. Deleting the identity paragraph from `theming.mdx` failed both content
   assertions in `theming-page.test.ts` (2 failed / 1 passed); restoring
   passed.
5. Removing the `chat` roadmap alias failed "finds the planned chat target by
   the word a reader types" (1 failed / 9 passed); restoring passed.

**Gate results:**

- `nub run --filter docs test`: 125 files / 1 208 tests passed.
- `nub run --filter docs check-types`: exit `0`.
- `nub run --filter docs smoke:build`: exit `0`, 105 pages, four new queries.
- `nub run check`: exit `0` (check:tests, oxlint, oxfmt, all workspace types).
- `nub run lint`: exit `0`.
- `nub run test` (root): every workspace passed; docs 125 files / 1 208 tests.

