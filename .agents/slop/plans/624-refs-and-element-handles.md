# 624 — Refs and element handles have an answer

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 411, 413, 415, 419, 431, 482, 504, 587, 610, 623
## 1. Why this plan exists

Every host part's generated props table carries a bare row:

```
ref?    union
```

It is repeated on all **147** generated tables over the 66 component pages and
explained nowhere. Measured 2026-10-20 at `d78ca3de` against the real search
index:

| Query | First result before | What a reader meant |
| ----- | ------------------- | ------------------- |
| `ref` | `/docs/api-reference` | the `ref` prop a React consumer passes |
| `forwardRef` | *(nothing)* | whether a ref needs `forwardRef` in React 19 |
| `element handle` | a Separator limitation | what a ref actually receives |
| `imperative handle` | *(nothing)* | `useImperativeHandle` |
| `scroll into view` | *(spread across unrelated pages)* | `instance.scrollIntoView()` |

The facts exist in the installed runtime and in our own source, but no page
states them: `@gpuix/react`'s `Props` declares `ref?: Ref<PublicInstance>`;
`Instance` is `{ id, type, props, scrollIntoView?() }`; the reconciler attaches
`scrollIntoView()` which asks the (optional) renderer method; focus is **not** on
the instance — our components call `renderer?.focusElement?.(instance.id)`; and a
part that needs the host internally merges the caller's ref with its own instead
of overwriting it (`packages/components/src/internal/ref.ts`). `@gpuixui/primitives`
declares its own narrower props types and exposes no `ref`, which is the honest
half of the same answer.

This is the same defect class as plans 587 (shared host props) and 623 (state
types): repeated generated API metadata with no single owner. The page states
the contract once, the table derives the instance shape from the installed
declarations, and the search words reach the section.

## 2. Decisions

1. **The contract lives on Component API, under `## Refs and element handles`.**
   It is a convention every host part follows, not a component. The section sits
   directly after `## Shared host props`, because that paragraph already names
   `ref` as an inherited React prop and then drops it.
2. **The instance table is derived, never authored.** `src/lib/element-instance.ts`
   parses `interface Instance` from the installed `@gpuix/react` declarations and
   pairs each member with an authored summary. The guard fails in both
   directions: a member without a summary, a summary without a member. A
   dependency upgrade that adds a field therefore fails by name.
3. **The scope claim is proved, not asserted.** The page says a part accepts a
   `ref` when its props type extends `Props` (the generated `ref?` row is the
   evidence) and that `@gpuixui/primitives` exposes none. The test generates
   `CardProps` (components) and `ButtonProps` (primitives) with the app's own
   generator and requires exactly that difference.
4. **Focus gets the real recipe.** `PublicInstance` has no `focus()`. The page
   shows `useGpuix()` / `useGpuixRequired()` and `renderer?.focusElement?.(id)`,
   which is the call the shipped components make; the optics are optional
   because `NativeRenderer` declares the method optional.
5. **Merged refs are explained from the real helper.** The section includes
   `packages/components/src/internal/ref.ts` and states the bug it prevents
   ("the last `ref` wins") instead of listing eighteen call sites.
6. **Search is two mechanisms, as the established rule requires.** Exact page
   aliases carry the phrase forms (`ref`, `refs`, `forwardRef`, `element handle`,
   `imperative handle`, `scroll into view`); one generated document promotes the
   two distinctive names (`scrollIntoView`, `PublicInstance`) and indexes the
   member summaries. No generic word is promoted, so `reference` keeps the API
   reference page.

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/624-refs-and-element-handles.md` | this plan |
| `apps/docs/src/lib/element-instance.ts` | pure parser for `Props.ref`, `Instance`, `PublicInstance`; authored member summaries; violations |
| `apps/docs/src/lib/react-declarations.testing.ts` | resolve and read the installed `@gpuix/react` declarations and reconciler source (test-only `node:fs`) |
| `apps/docs/src/lib/element-instance.test.ts` | parser fixtures, installed-declaration guards, the two props-table proofs, the reconciler delegation guard |
| `apps/docs/src/lib/ref-search.ts` | the generated search entry for the instance table |
| `apps/docs/src/components/element-instance-table.tsx` | `<ElementInstanceTable />`, rows from the parser |
| `apps/docs/src/components/element-instance-table.test.tsx` | rendered rows, MDX registration, page block |
| `apps/docs/src/component-api-refs.test.ts` | the page's refs section, include, focus recipe, scope sentence and heading order |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/component-api.mdx` | the `## Refs and element handles` section, its example, `<ElementInstanceTable />` and the `ref.ts` include; description names refs |
| `apps/docs/src/component-api-page.test.ts` | add `Refs and element handles` to the section order |
| `apps/docs/src/components/mdx.tsx` | register `ElementInstanceTable` |
| `apps/docs/src/lib/search.ts` | import `refSearchEntry` and append it to `generatedSearchEntries` |
| `apps/docs/src/lib/search-docs.ts` | add the indexed-surface row (the list is compared exactly) |
| `apps/docs/src/lib/page-aliases.ts` | the ref vocabulary block on `/docs/component-api` |
| `apps/docs/src/lib/search.test.ts` | the five recovered queries and two regressions |
| `apps/docs/scripts/smoke-build.ts` | one production query: `forwardRef` reaches Component API first |
| `apps/docs/README.md` | the Component API paragraph names the refs section |
| `TODO.md` | tick the new row and the fraction |
| `.agents/slop/plans/README.md` | this plan's row |
| `PLAN.md` | decision D61 |

## 4. The data module

`src/lib/element-instance.ts`:

```ts
export interface InstanceMember {
  readonly name: string;
  readonly type: string;
  readonly optional: boolean;
  readonly summary: string;
}

/** The members `export interface Instance` declares, in source order. */
export const instanceMembers = (
  declarations: string,
): ReadonlyArray<Omit<InstanceMember, "summary">>;

/** The `ref` declaration inside `interface Props`, e.g. `Ref<PublicInstance>`. */
export const refPropType = (declarations: string): string | undefined;

/** `true` when `PublicInstance` is still the alias of `Instance`. */
export const publicInstanceIsInstance = (declarations: string): boolean;

/** Authored summaries, one per installed member. */
export const instanceSummaries: ReadonlyMap<string, string>;

export const instanceViolations = (input: {
  readonly declarations: string;
  readonly summaries: ReadonlyMap<string, string>;
}): ReadonlyArray<string>;
```

Parsing rules:

- find `export interface Instance {` and take its body to the matching `}`;
- a member is `name?: type;` or `name: type;` or `name?(): type;`;
- a method's type is normalised to `() => type` so the table can print it;
- `PublicInstance` is checked as `export type PublicInstance = Instance;`.

Authored summaries (exact wording is the page's copy):

| Member | Summary |
| ------ | ------- |
| `id` | the runtime's element id; the focus and locator APIs take it |
| `type` | the host element type (`div`, `text`, `input`, …) |
| `props` | the props the host was created with |
| `scrollIntoView` | asks the renderer to scroll the element into view; renderer method is optional, so treat it as best effort |

## 5. The page

Add after `## Shared host props`:

```mdx
## Refs and element handles

In React 19 a function component receives `ref` as an ordinary prop, so no
`forwardRef` wrapper is involved. Every part whose props type extends the
runtime's `Props` accepts one, and the `ref?` row in its generated table is that
contract; `@gpuixui/primitives` declares its own props types and exposes none.

<ElementInstanceTable />

...focus recipe, merged refs, and the include:
<include>../../../../../packages/components/src/internal/ref.ts</include>
```

The example must be copyable and compile as a standalone module:

```tsx
import { useGpuix } from "@gpuix/react";
import type { PublicInstance } from "@gpuix/react";
import { useRef } from "react";
import { SearchInput } from "@gpuixui/components/search-input";

const field = useRef<PublicInstance | null>(null);
const { renderer } = useGpuix();

<SearchInput ref={field} placeholder="Search projects" />;

// A ref has no focus(): ask the renderer with the instance id.
renderer?.focusElement?.(field.current?.id ?? -1);
field.current?.scrollIntoView?.();
```

## 6. Tests

| Test | What it must catch |
| ---- | ------------------ |
| `element-instance.test.ts` §1 | fixture parsing: a plain field, an optional field, an optional method |
| §2 | `instanceViolations` names a missing summary and an extra summary |
| §3 | the installed `Instance` has exactly the documented members — a dependency that adds one fails by name |
| §4 | `Props`, `InputProps`, `TextareaProps` and `AnchoredProps` all declare `ref?: Ref<PublicInstance>` |
| §5 | the installed reconciler still attaches `scrollIntoView` and calls `nativeRenderer.scrollIntoView?.` |
| §6 | `CardProps` has a `ref` row and primitives' `ButtonProps` has none, through the app's own generator |
| `element-instance-table.test.tsx` | one row per installed member, in order; registered in `getMDXComponents()`; the page renders it once |
| `component-api-refs.test.ts` | the heading, the scope sentence, the no-`focus()` statement, `focusElement`, the include and the real bookkeeping file |
| `search.test.ts` | `ref`, `forwardRef`, `element handle`, `imperative handle` and `scroll into view` reach `/docs/component-api` first; `reference` keeps `/docs/api-reference`, and `scrollbar` keeps Scrollable containers |
| `search-docs.test.ts` | the new indexed surface is listed (existing comparison) |

Two-direction proofs to run and record:

1. Delete the `publicInstanceIsInstance` assertion result by renaming the
   declaration in a fixture → §3 fails with the member/alias name.
2. Remove `onFocus` from the fixture? No — remove the `scrollIntoView` step from
   the page → `component-api-refs.test.ts` fails naming the include/recipe.
3. Remove the page alias block → `search.test.ts` reports `ref` first result as
   `/docs/api-reference`.
4. Add a fake member to the fixture summaries → §2 fails with the extra name.
5. Remove the `forwardRef` production query → the smoke still passes (negative
   control is not meaningful); instead delete the alias and run `smoke:build`
   after a build → exit `1` naming `forwardRef`.
6. Remove the `<ElementInstanceTable />` block → the page guard fails by name.

## 7. Commands

```sh
# 1. focused suites while iterating
cd apps/docs
nub exec vitest run src/lib/element-instance.test.ts src/component-api-refs.test.ts \
  src/components/element-instance-table.test.tsx src/lib/search.test.ts

# 2. the whole docs suite (every guard, ~2 min warm)
nub run --filter docs test

# 3. type gate
nub run --filter docs check-types

# 4. production build + crawl + search
nub run --filter docs smoke:build

# 5. repository gates
cd ../..
nub run check
nub run lint
```

Expected results: every command exit `0`; `smoke:build` reports the new page
count (unchanged: this adds a section, not a route) and the new query labelled
`imperative handle`.

## 8. STOP conditions

- The installed `@gpuix/react` declarations do not declare `ref` on `Props`, or
  `Instance` no longer has `id`/`type`/`props`/`scrollIntoView` → **STOP**: the
  runtime changed; re-plan against the installed package instead of editing the
  table.
- `renderer.focusElement` is no longer optional or no longer accepts an element
  id → **STOP** and re-measure before writing the recipe.
- `@gpuixui/primitives`' `ButtonProps` gains a `ref` → **STOP**: the scope
  sentence is false; either document both layers or change the sentence after
  measuring which primitives accept one.
- A page alias for `ref` changes the first result of `reference` or `scrollbar`
  → **STOP** and narrow the alias; do not widen the ranker.
- `smoke:build` cannot run (no Chrome / build failure) → report it as
  unverified; do not claim the production query passed.

## 9. Acceptance criteria

- `/docs/component-api#refs-and-element-handles` states the ref contract, renders
  the derived `PublicInstance` table, shows a copyable example, gives the focus
  recipe and includes `internal/ref.ts`.
- `⌘K` finds the section for `ref`, `forwardRef`, `element handle`,
  `imperative handle` and `scroll into view`, and the built index answers
  `imperative handle` first.
- The section's scope claim is guarded by the app's real generator in both
  directions.
- `nub run check`, `nub run lint` and `nub run test` pass; the scoped suites and
  `smoke:build` are recorded in this plan's status line.
- `TODO.md`, the plan index and `PLAN.md` D61 are updated in the same commit.

## 10. Results (2026-10-20)

Landed at `d78ca3de` + this commit's tree.

**Suites.** `nub run --filter docs test`: **136 files / 1 409 tests**, all green.
`nub run --filter docs check-types`: green. `smoke:build`: **107 pages, 235
links, 1 384 anchors**, search green, exit `0`. Scoped axe
(`nub scripts/smoke-a11y.ts --only /docs/component-api --no-build`): **1 page ×
2 schemes, 0 violations**.

**Repository gates.** `nub run check:tests` green; `nub exec oxlint …` exit `0`;
`nub exec oxfmt --check` clean (four new files reformatted before the check).
The root `nub run check` script itself cannot run in this worktree because the
root dependency tree is not installed (`sh: oxlint: command not found`); the
underlying commands were run individually through `nub exec`, as recorded here.

**Two-direction proofs, each run and reverted:**

1. Removed the `"ref"` page alias → `page-aliases.test.ts` failed on
   `ref → /docs/component-api` (1 failed / 384 passed).
2. Changed `instanceRows`' `id` type to `string` → `element-instance.test.ts`
   failed with `Instance.id is number, documented as string`.
3. Removed `<ElementInstanceTable />` from the page → the table suite and the
   page suite failed, each naming the missing block.
4. Removed both `imperative handle` aliases and rebuilt → `smoke:build` exited
   `1` with `/api/search?query=imperative%20handle: the first result is not
   under /docs/component-api`; restoring them returned exit `0`.
5. The fixture suite's missing-summary and orphaned-summary cases are asserted
   directly (plan §6).

**Measured limit, recorded rather than hidden:** `forwardRef` is not a useful
production query. It is answered once the prose names it, and even with the
alias removed the lexical index reaches the page through `ref`; the production
gate therefore uses `imperative handle`, which no prose contains. The unit suite
still asserts `forwardRef` and the other phrase forms through the alias table.

**An incidental guard hit:** the first draft of `component-api-refs.test.ts`
asserted a code fence with string literals shaped like imports
(`'from "@gpuix/react"'`). `architecture.test.ts` scans every `.ts/.tsx` for
that pattern and read the literals as real imports, failing the boundary law.
The assertions now name the specifiers without the `from "` prefix.

