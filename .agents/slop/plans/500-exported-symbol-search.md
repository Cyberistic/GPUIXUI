# 500 — A component's exported symbol reaches its page

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 411, 419, 431, 442, 454, 479, 487

## 1. Why this plan exists

Plan 431's rule is *a component's exact name reaches its page*: `mergeResults`
scores a query against the registry **title**, so `button` promotes
`/docs/components/button` above prose. That rule is right, and it is incomplete.

A reader who uses the library knows the **exported symbol**, not the inventory
title. The inventory names are deliberately human (`Loading indicators`,
`Scrollable containers`, `Confirmation dialogs`), while the code exports
`Spinner`, `ScrollArea` and `ConfirmDialog`. The registry's own search document
already contains those stems through `api` (`SpinnerProps`), so ⌘K *finds* the
page — but only in the registry appendix, after every prose hit.

Measured 2026-10-18 against the production build (`/api/search`, 90 pages):

| Query (real export) | Page it means | Result |
| --- | --- | --- |
| `Spinner` | `spinner` | rank **7**, behind `/docs/patterns/settings-form` |
| `ScrollArea` | `scroll-area` | rank **10**, behind `/docs/patterns/settings-form` |
| `TextArea` | `text-area` | rank **10**, behind `/docs/api-values` |
| `ButtonGroup` | `button-group` | rank 7, behind `/docs/patterns/settings-form` |
| `NumberField` | `number-field` | rank 7, behind `/docs/extending` |
| `OTPField` | `otp-field` | rank 4, behind `/docs/extending` |
| `Field` | `inline-validation` | rank 6, behind `/docs/components/fieldset` |
| `ConfirmDialog` | `confirm-dialog` | rank 4, behind `/docs/patterns` |
| `Grid` | `stack` | rank 8, behind a Date picker accessibility anchor |

`spinner`, `scrollArea`, `textArea`, `buttonGroup`, `numberField`, `otpField`,
`field`, `confirmDialog` and `grid` are the nine stems a reader actually types.
The title rule cannot see any of them, because none is the title.

## 2. What the record already proves

Each record lists its documented props types in `api` (plan 415/441). Every
props type names its component family by suffixing `Props`:

- `SpinnerProps` → `Spinner`
- `ScrollAreaProps` → `ScrollArea`
- `OTPFieldProps` → `OTPField`
- `FieldProps` → `Field`
- `StackProps`, `GridProps` → `Stack`, `Grid`

147 props types across the registry follow the rule. It is already how
`/docs/api-reference` groups the types by page, so the stem is not a new claim:
the page *documents* `SpinnerProps`, therefore `Spinner` is the name a consumer
writes. Three types have no same-named value export (`MenuGroupProps` on the two
menu records, `ToastViewportProps` on Toast, whose viewport lives in a part
file); their stems are still the right search term for the page that documents
the type, so the rule stays uniform and needs no exception table.

No new metadata, no generated file and no source reading at runtime: the
registry is already in the server bundle.

## 3. Change

### 3.1 `apps/docs/src/component-meta/symbols.ts` (new)

```ts
import type { ComponentMetaInput } from "./schema";

const PROPS_SUFFIX = "Props";

/**
 * The component names a record's documented props types imply. `SpinnerProps`
 * on the Loading indicators page is why a reader who types `Spinner` — the
 * real export — reaches it.
 */
export const componentSymbols = (
  component: Pick<ComponentMetaInput, "api">,
): ReadonlyArray<string> => [
  ...new Set(
    component.api
      .filter(
        (name) => name.endsWith(PROPS_SUFFIX) && name.length > PROPS_SUFFIX.length,
      )
      .map((name) => name.slice(0, -PROPS_SUFFIX.length)),
  ),
];
```

- Pure, total, no dependencies. One rule, one place: the search ranker and any
  later surface read the same function.

### 3.2 `apps/docs/src/lib/search.ts`

- Import `componentSymbols`.
- In `mergeResults`, a candidate's rank is the best `matchRank` over the title
  **and** the symbols (`Math.min` of the defined ranks). Exact and prefix still
  score ahead of word prefix and substring, so nothing about plan 431 changes.
- `componentSearchIndex` keeps `api` in `content`/`keywords` (it already is);
  do not add a second copy.
- Update the doc comment: a component name is the strongest signal, and its
  exported symbol counts as a name.

### 3.3 `apps/docs/scripts/smoke-build.ts`

- The search check table gains an optional `first: true`; when set, the **first**
  returned URL must be the expected page, not merely present.
- Add one check: `{ query: "Spinner", expected: "/docs/components/spinner",
  first: true, what: "an exported component symbol" }`.
- The existing four checks keep presence semantics.

### 3.4 Docs

- `apps/docs/README.md` → **Search**: say a component's documented props type
  contributes its exported name (`SpinnerProps` → `Spinner`) to the title
  ranking, so a symbol query reaches the page first, and that the built-site
  smoke checks one symbol in the production index.
- `content/docs/component-pages.mdx` is generated from `sectionsFor` and names
  no search rule; leave it untouched unless a guard fails.

## 4. Test plan

| Test | Catches | Two-direction proof |
| --- | --- | --- |
| `src/component-meta/symbols.test.ts` (new) | a stem rule that keeps the suffix, drops a type without it, fails to dedupe, or includes an empty stem | remove the `endsWith` filter: the `Foo` fixture is returned and the assertion fails |
| `src/lib/search.test.ts` → `search("Spinner")` | a symbol query that lands in the appendix (the measured defect) | reverting §3.2 makes the result rank 7 and not `results[0]`; the assertion fails by name |
| `src/lib/search.test.ts` → `mergeResults(..., "ScrollArea")` | a ranker that scores only titles | drop `componentSymbols` from the rank expression: prose stays first and the assertion fails |
| `src/components/component-index.test.tsx` | the index filter losing the symbol it already matches via `api` | assert `matchesComponent(record("spinner"), "Spinner")`; change the filter to title-only and it fails |
| `smoke:build` symbol query with `first: true` | a production index that no longer ranks the symbol | with §3.2 reverted, the crawl exits `1` naming `/api/search?query=Spinner` |

The exact-title, props-type, part-name, value-index and empty-query tests stay
green unchanged: symbols only add candidates, they never remove one.

## 5. Commands and expected results

| Command | Expected |
| --- | --- |
| `nub run --filter docs test` | 0; +2 files, all green |
| `nub run --filter docs check-types` | 0 |
| `nub run --filter docs smoke:build` | 0; 90 pages, 109 links, search checked (the new first-result rule included) |
| `nub run check` | 0 |
| `nub run lint` | 0 |
| `nub run test` | 0 |
| `nub .agents/slop/scratch/symbol-search.ts` | no `LOW` row (scratch probe, not part of the product) |

## 6. STOP conditions

- **STOP** if ranking a symbol above a *different* component's exact title match.
  A title query must still win; if a real record makes that impossible, report
  the pair rather than changing the rank scale.
- **STOP** if the registry's `api` lists a type whose stem names a different
  component than the page documents. That is a record defect; fix the record or
  record the exception in `TODO.md`, do not add a per-record override.
- **STOP** if `smoke:build` cannot start (no build/preview): that is exit `2`,
  not a pass. Report it; do not lower the check.
- **STOP** if a docs page, inventory row or component source must change. This
  plan is search-only; another workstream owns those paths.

## 7. Acceptance

- `Spinner`, `ScrollArea`, `TextArea`, `ButtonGroup`, `NumberField`, `OTPField`,
  `Field`, `ConfirmDialog` and `Grid` each return their own page first from
  `/api/search`.
- The existing exact-title, props-type, part-name, helper and empty-query rules
  are unchanged.
- The built-site smoke proves one symbol against the production index, not only
  against a fixture.
- All commands in §5 pass; the plan is indexed, `TODO.md` is ticked and the
  change is pushed on `agent/docs-site`.

## 8. Results

Implemented 2026-10-18.

- **The rule landed in one place.** `src/component-meta/symbols.ts` derives the
  names from a record's documented `api` types (`SpinnerProps` → `Spinner`,
  deduped, suffix-less types ignored). `src/lib/search.ts` ranks a candidate by
  the best `matchRank` over its title **and** its symbols, so the scale plan 431
  defined now applies to the name a consumer imports.
- **The measured defect is gone.** The same probe over the rebuilt production
  output returns the owning page first for all nine stems: `Spinner` →
  `spinner`, `ScrollArea` → `scroll-area`, `TextArea` → `text-area`,
  `ButtonGroup` → `button-group`, `NumberField` → `number-field`, `OTPField` →
  `otp-field`, `Field` → `inline-validation`, `ConfirmDialog` →
  `confirm-dialog`, `Grid` → `stack`. Before the change six of them (and three
  more) sat outside the top three.
- **The suites pin it.** New `src/component-meta/symbols.test.ts` (4 tests)
  proves the stem rule, the suffix-less rejection, dedupe and the nine real
  records; `search.test.ts` gains the `Spinner` first-result rule, a
  nine-symbol table and a `mergeResults` unit case; `component-index.test.tsx`
  proves the local filter already matches the symbol through the props type
  (no filter change was needed). The docs suite is now **56 files / 369 tests**
  (was 55 / 361).
- **The production index is guarded.** `smoke:build`'s search table gained an
  optional `first` rule and a `Spinner` check. Two-direction proof, measured:
  with `componentRank` temporarily reverted to the title-only expression, the
  three new search tests failed by name (`Spinner` landed on
  `/docs/patterns/settings-form`) and the crawl **exited `1`** with
  `FAIL /api/search?query=Spinner: the first result is not under
  /docs/components/spinner for an exported symbol that is not the record's
  title`; with the fix restored the crawl exits `0` over 90 pages / 109 links
  and the nine-symbol probe reports `misses=0`.
- **Gates.** `nub run check`, `nub run lint` and `nub run test` all exit `0`.
  No component page, registry record, component source or inventory row changed;
  `apps/docs/README.md` **Search** names the symbol rule.

