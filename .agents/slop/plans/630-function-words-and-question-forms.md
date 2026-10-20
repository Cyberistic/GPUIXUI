# 630 — Search: a function word cannot name a component, and the measured question forms reach their owner

**Status:** implemented
**Phase:** F
**Depends on:** 410, 419, 431, 561, 566, 568, 598, 599, 607, 608, 610

## 1. The measured gap

The ranker scores every word of a query against every component name and page
title (`nameRank` in `apps/docs/src/lib/search.ts`). A word is compared as a
prefix, so the function word **`to`** is a prefix of **Toggle** and **Tooltip**.
Any question phrased with "to" therefore outranks the page that answers it.

Measured 2026-10-20 at `3f0924c9`, against the real index, first two results:

| Query | First result | Second result | Owner the reader meant |
| ----- | ------------ | ------------- | ---------------------- |
| `how to theme the app` | `components/toggle` | `theming` | Theming |
| `how to change the theme` | `components/toggle` | `theming` | Theming |
| `how to resize a panel` | `components/toggle` | `components/tooltip` | Workspace |
| `how to add a shortcut` | `components/toggle` | `components/tooltip` | Hotkey input |
| `how to center a div` | `components/toggle` | `components/tooltip` | Layouts (no owner yet) |
| `how to build a table` | `components/toggle` | `components/tooltip` | Data display |
| `how to display an error` | `components/toggle` | `components/tooltip` | Inline validation |
| `how to set width` | `components/toggle` | `components/tooltip` | Styling |
| `how to show a notification` | `components/toggle` | `components/tooltip` | Toasts |
| `to` | `components/toggle` | `components/tooltip` | — |

The same sweep measured the words below, which name a subject the site owns but
land on a section of another page or on nothing:

| Query | First result before | Owner |
| ----- | ------------------- | ----- |
| `padding` | Component pages | Styling's supported surface |
| `hover effect` | Architecture's `State and Effect` | Styling's supported surface |
| `outside click` / `click outside` | Cards / Icons | Component API's layering section |
| `tab index` / `tabindex` | Tabs / a Badge limitation | Accessibility |
| `autofocus` | Number field limitation | Accessibility |
| `display an error` / `validation message` | Data display / Message scroller | Inline validation |
| `show a notification` | Showcase | Toasts |
| `divider` | a Separators limitation section | Separators |
| `placeholder` | Number field limitation | Text inputs |
| `no results` | Toasts | Empty states |
| `centering` / `center content` | Component API / Cards | Layouts — which has **no** centring section yet |

`how to build a table`, `how to center content` and `how to set width` also have
no exact phrase; the table above is the honest answer the reader never saw.

## 2. The rule: a function word names nothing

Add one small, categorical rule to `nameRank`:

> A function word (`a`, `an`, `the`, `to`, `how`, `of`, `for`, `and`, `is`, …)
> is never name evidence, and a query made only of function words names nothing.

This is deliberately **not** a length threshold. A length threshold would also
discard `box`, `tab`, `api`, `app` and `set` — meaningful words inside a phrase —
while a function-word list is finite (English closed class), has no
reader-vocabulary drift, and names the actual defect: `to` is not a name.

The whole-query tier (`best(query)`) keeps working for every real short name:
`tab` still reaches Tabs, `box` still reaches Box, because those words are not
function words. `to` alone stops naming Toggle.

### 2.1 `apps/docs/src/lib/search.ts`

1. Add, beside `queryTerms` (around line 288):

```ts
/**
 * Closed-class English words: articles, prepositions, conjunctions, pronouns,
 * auxiliaries and wh-words. They are grammar, not names, and a query made only
 * of them names nothing. `to` was a prefix of Toggle and Tooltip, so
 * `how to theme the app` returned Toggle before Theming (plan 630). A real
 * short name (`tab`, `box`) is not in this set and keeps its page.
 */
const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "did",
  "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in",
  "into", "is", "it", "its", "me", "my", "no", "not", "of", "on", "or",
  "our", "should", "so", "than", "that", "the", "their", "them", "then",
  "there", "these", "they", "this", "to", "up", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "why", "will", "with", "would",
  "you", "your",
]);
```

2. In `nameRank`, skip the whole tier for a function-word-only query and filter
   the token tier:

```ts
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
```

Nothing else in the pipeline changes: aliases, descriptions, generated names,
the typo tier and scene instructions keep their own rules.

## 3. The measured vocabulary

Two existing guarded tables own the editorial vocabulary. Add only the rows
below; each term is exact-whole-query in both tables.

### 3.1 `apps/docs/src/lib/page-aliases.ts`

Append to the existing blocks (keep the file's alphabetical-ish grouping):

| Page | Terms to add |
| ---- | ------------ |
| `/docs/accessibility` | `tab index`, `tabindex`, `autofocus` |
| `/docs/component-api` | `outside click`, `click outside`, `close on outside click` |
| `/docs/data-display` | `build a table`, `how to build a table` |
| `/docs/layouts` | `center content`, `how to center content`, `centering`, `centring`, `center a div` |
| `/docs/styling` | `padding`, `hover effect`, `set width`, `how to set width` |

Extend the file's top doc comment with a "Plan 630" paragraph naming the
function-word rule and the five page owners.

### 3.2 `apps/docs/src/lib/component-aliases.ts`

| Record | Terms to add |
| ------ | ------------ |
| `empty-state` | `no results` |
| `inline-validation` | `display an error`, `how to display an error`, `validation message` |
| `separator` | `divider` |
| `text-input` | `placeholder` |
| `toast` | `show a notification`, `how to show a notification` |

Extend the top doc comment with the Plan 630 paragraph.

### 3.3 Deliberate non-fixes

- `spreadsheet` — no shipped component and no target of that name; the Data
  display page states what tables ship. Not promoted.
- `read only` — stays on Native elements, the deliberate plan 626 row. The
  site already answers the field behaviour on Text inputs.
- `how to validate a form` — already reaches Form; no row is added.
- `copy` — stays on Theme editor, the plan 627 decision about docs-site
  controls; the clipboard absence is on Selection and find.
- `how to add a shortcut` and `how to resize a panel` — measured as Toggle
  before the rule and as Keycap / Navigation menu keyboard sections after it.
  Neither post-fix owner answers the question, so no alias was added; a future
  question-form pass can give Hotkey input and Workspace their phrases.

## 4. The content the alias needs: `## Centring` on Layouts

An alias must land on prose that answers it. `apps/docs/content/docs/layouts.mdx`
has no centring sentence, so add this section before
`## Localization and direction`:

```mdx
## Centring

`align` places children across a stack's axis and `justify` distributes them
along it. Centre on both axes by giving the stack the box it should centre
inside — `fullHeight` for a column, `fullWidth` for a row:

```tsx
import { Stack, Text } from "@gpuixui/primitives";

<Stack direction="column" align="center" justify="center" gap="sm" fullHeight>
  <Text role="h3">No projects yet</Text>
  <Text tone="muted">Create a project to get started.</Text>
</Stack>;
```

A single item on one axis needs only that axis: `align="center"` in a row,
`justify="center"` in a column. There is no `margin: auto` and no CSS class —
the runtime places children with flexbox, and the parent or `fullWidth` /
`fullHeight` supplies the box to centre inside. `grow` makes an item take the
leftover space instead.
```

The fence must import `@gpuixui` and use only real props: `direction`, `align`,
`justify`, `gap`, `fullHeight` are `StackProps`; `role` and `tone` are
`TextProps`. `example-snippets.test.ts` compiles it, so a wrong prop fails by
name.

## 5. The Site search page names the rule

`apps/docs/content/docs/site-search.mdx`, ranking list item 3, add one sentence
after the "word inside a name" item:

> Function words never name anything: `how to theme the app` ranks by `theme`,
> because `to` is grammar rather than a name (plan 630).

No number is typed, so there is nothing to derive; the rule is categorical.

## 6. Production check

`apps/docs/scripts/smoke-build.ts` carries the search queries the built index
must answer. Add two rows beside the other reader-phrase rows:

```ts
{
  query: "how to center content",
  expected: "/docs/layouts",
  first: true,
  what: "a question form whose function words used to name Toggle (plan 630)",
},
{
  query: "how to display an error",
  expected: "/docs/components/inline-validation",
  first: true,
  what: "a question form the function word `to` used to steal (plan 630)",
},
```

## 7. Test plan

All tests live beside the code; no new test file is needed except where noted.

### 7.1 `apps/docs/src/lib/search.test.ts`

**A. The rule (positive, unaliased query).** Add one table and an `it.each`:

```ts
const functionWordQuestions = [
  ["how to theme the app", "/docs/theming"],
] as const;
```

It must be the **first** result. It fails before the rule: the measured first
result is `/docs/components/toggle`. `how to add a shortcut` was also measured
as Toggle before the rule, but after it Keycap is first and Hotkey input is not;
per §9 it is recorded rather than asserted, because the post-fix owner is not
the page the question asks for.

**B. Short real names still name their page.** Assert `tab` →
`/docs/components/tabs` and `box` → `/docs/components/box`. These prove the
rule is closed-class, not length-based; a length threshold would fail them.

**C. The measured question forms.** Add an `it.each` table for the aliased
queries, first result only:

| Query | Owner |
| ----- | ----- |
| `how to build a table` | `/docs/data-display` |
| `how to center content` | `/docs/layouts` |
| `how to display an error` | `/docs/components/inline-validation` |
| `how to set width` | `/docs/styling` |
| `how to show a notification` | `/docs/components/toast` |

**D. The measured words.**

| Query | Owner |
| ----- | ----- |
| `padding` | `/docs/styling` |
| `hover effect` | `/docs/styling` |
| `outside click` | `/docs/component-api` |
| `tab index` | `/docs/accessibility` |
| `autofocus` | `/docs/accessibility` |
| `validation message` | `/docs/components/inline-validation` |
| `divider` | `/docs/components/separator` |
| `placeholder` | `/docs/components/text-input` |
| `no results` | `/docs/components/empty-state` |

**E. Regressions.** Keep every existing table; add rows that must not move:

| Query | Owner | Why |
| ----- | ----- | --- |
| `how to install` | `/docs/installation` | an aliased question form the rule must not break |
| `how to use` | `/docs/getting-started` | same |
| `spacing` | `/docs/theming` | `padding` moves to Styling, `spacing` does not |
| `read only` | `/docs/native-elements` | the deliberate plan 626 row |
| `table` | `/docs/data-display` | `build a table` must not steal the one-word owner |
| `center` | `/docs/layouts` | the new centring aliases are exact; the `## Centring` section makes Layouts the owner of the bare word |
| `toast` | `/docs/components/toast` | `show a notification` must not steal the component name |

### 7.2 `apps/docs/src/lib/page-aliases.test.ts`

- Add every new page term to `owned`.
- Add the regression rows above that are page-level (`how to install`,
  `how to use`, `spacing`, `read only`, `table`, `center`).
- Update the header comment: Plan 630 adds the twelfth block (after the testing
  block) and moves no existing row.
- The structural guards (key exists, no component key, no shared term, no
  shadowing) must stay green; if one fails, the term conflicts with an owner
  and must be dropped rather than renamed.

### 7.3 `apps/docs/src/lib/component-aliases.test.ts`

No new test: every new row is validated by the existing structural guards, and
the measured behaviour is in `search.test.ts` (7.1 C/D). Run it.

### 7.4 Content guards

- `example-snippets.test.ts` compiles the new `tsx` fence in `layouts.mdx`.
- `page-aliases.test.ts` proves `/docs/layouts` exists.
- `smoke:build` proves the built index answers 7.1 C's two question forms.

### 7.5 Two-direction proofs (record the measured output in §11)

1. Comment out the `FUNCTION_WORDS` filter and the whole-tier guard; run 7.1 A.
   Expected: `how to theme the app` → `/docs/components/toggle`, failing both
   rows. Restore.
2. Delete one page alias row (`how to center content`); run 7.1 C. Expected:
   the Layouts row fails (the query falls back to Component API). Restore.
3. Delete one component alias row (`validation message`); run 7.1 D. Expected:
   the Inline validation row fails (Message scroller is first). Restore.
4. Delete the `## Centring` section from `layouts.mdx`; the alias still resolves
   (search is not content-aware), so this direction is checked by rereading the
   page: the alias may only point at prose that answers it. Record the page read.

## 8. Commands and expected results

Run from the worktree root.

```sh
# 1. The focused suite while iterating (the file builds the whole index once).
nub run --filter docs test -- search.test
# expected: the search and page-alias files pass; every new row is listed.

# 2. Type and content checks.
nub run --filter docs check-types
# expected: no diagnostics; the new fence compiles.

# 3. The docs suite (end-of-task check for this cross-cutting change).
nub run --filter docs test
# expected: 148 files / 1580 + new tests, all pass.

# 4. Root gates.
nub run check
nub run lint
# expected: both exit 0.

# 5. The production index.
nub run --filter docs smoke:build
# expected: exit 0; the crawl names both new question queries.
```

`nub run --filter docs test -- search.test` runs the whole docs suite in the
current Vitest setup unless the file path is passed to Vitest directly; if the
script forwards the argument as a filter, verify the run names the file. The
full suite in step 3 is the authoritative run either way.

## 9. STOP conditions

- **A structural alias guard fails** (shared term, shadowed name, component
  page key): stop, report the term and its conflict. Do not rename a component
  or page to fit an alias.
- **A guarded query outside this plan changes** (any existing `owned` or
  `regressions` row fails): stop and report the query and both results. Do not
  add a new alias to mask the regression; the rule is meant to be narrow.
- **`how to add a shortcut` does not reach Hotkey input** after the rule: drop
  that row from 7.1 A (it was measured as Toggle before, but the fallback after
  is not proven) and record the measured owner; keep
  `how to theme the app`, which is measured Toggle → Theming.
- **The Layouts fence does not compile**: correct the example against
  `StackProps`/`TextProps`; do not remove the fence or weaken
  `example-snippets.test.ts`.
- **`smoke:build` cannot build or serve**: record exit `2` with the reason;
  never report it as a pass.

## 10. Acceptance criteria

- [x] `to` no longer names Toggle or Tooltip inside a question; `how to theme
      the app` reaches Theming first.
- [x] `tab` and `box` still reach their component pages.
- [x] Every query in 7.1 C and D reaches its owner first.
- [x] `padding` moves from Component pages to Styling; `spacing` does not move.
- [x] The new `## Centring` section compiles and answers the alias.
- [x] `nub run --filter docs test`, `nub run check`, `nub run lint` and
      `nub run --filter docs smoke:build` exit `0`.
- [x] `TODO.md`, `PLAN.md` (D66), `apps/docs/README.md`, the Site search page
      and the plan index record the change.
- [x] The branch is committed and pushed to `origin/agent/docs-site`.


## 11. Measured results

Measured 2026-10-20 on `agent/docs-site`, all commands run from the worktree
root.

### 11.1 The rule, before and after

| Query | Before | After |
| ----- | ------ | ----- |
| `how to theme the app` | `/docs/components/toggle` | `/docs/theming` |
| `how to change the theme` | `/docs/components/toggle` | `/docs/theming` |
| `how to build a table` | `/docs/components/toggle` | `/docs/data-display` |
| `how to center content` | `/docs/components/toggle` | `/docs/layouts` |
| `how to display an error` | `/docs/components/toggle` | `/docs/components/inline-validation` |
| `how to set width` | `/docs/components/toggle` | `/docs/styling` |
| `how to show a notification` | `/docs/components/toggle` | `/docs/components/toast` |
| `padding` | `/docs/component-pages` | `/docs/styling` |
| `hover effect` | `/docs/architecture#state-and-effect` | `/docs/styling` |
| `outside click` | `/docs/components/card` | `/docs/component-api` |
| `tab index` | `/docs/components/tabs` | `/docs/accessibility` |
| `autofocus` | `/docs/components/number-field#…` | `/docs/accessibility` |
| `validation message` | `/docs/components/message-scroller` | `/docs/components/inline-validation` |
| `divider` | `/docs/components/separator#…` | `/docs/components/separator` |
| `placeholder` | `/docs/components/number-field#…` | `/docs/components/text-input` |
| `no results` | `/docs/components/toast` | `/docs/components/empty-state` |
| `centering` | `/docs/component-api` | `/docs/layouts` |
| `center` | `/docs/component-api` | `/docs/layouts` |
| `tab` | `/docs/components/tabs` | `/docs/components/tabs` |
| `box` | `/docs/components/box` | `/docs/components/box` |
| `to` | `/docs/components/toggle` | `/docs/components/button-group` |

`to` no longer promotes a name; its remaining result is the lexical index's
own order, not a name match.

### 11.2 Two-direction proofs

1. **The rule.** With the whole-tier guard and the token filter removed,
   `nub exec vitest run src/lib/search.test.ts -t "function word"` failed with
   `how to theme the app -> page:/docs/components/toggle`. Restored, the same
   test passed.
2. **The Layouts alias.** With `how to center content` removed,
   `-t "measured question"` failed with
   `how to center content -> page:/docs/components/card`. Restored, it passed.
3. **The component alias.** With `validation message` removed, the same test
   failed with
   `validation message -> page:/docs/components/message-scroller`. Restored,
   it passed.
4. **The content the alias names.** The `## Centring` fence is compiled by
   `src/example-snippets.test.ts` (5 tests pass), so the alias cannot point at
   a recipe whose props do not exist. The page was reread after the edit: the
   section states `align`/`justify`, the `fullHeight`/`fullWidth` box and the
   absence of `margin: auto`, which is what the query asks for.

### 11.3 Gates

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 148 files / **1 603 tests** passed (was 1 580; the two new tables add 23 rows) |
| `nub run check` | `check:tests`, `lint`, `fmt`, `check-types` all green |
| `nub run lint` | exit 0 |
| `nub run test` | every workspace green; `apps/docs` 148 / 1 603 |
| `nub run --filter docs smoke:build` | exit 0 — **112 pages**, 1 444 anchors, search checked, including the two new question queries |
| `nub run --filter docs smoke:search` | exit 0 — the palette, the component-index filter and the 390 px path still pass |
