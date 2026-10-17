# Plan 322 — The loading skeleton on the accent a selectable row hovers

**Workstream:** `tokens-theme`
**Phase:** F (contract completeness)
**Depends on:** 071 (public contrast contract), 078/094 (skeleton surface pairs),
300/309 (the quiet panel and interactive fills as surfaces), 312/314/316 (the row
wash audit)
**Status:** ready

## 1. Why

`skeletonSurfaces` in `packages/tokens/src/contrast.ts` is the list of surfaces a
loading placeholder fills:

```ts
const skeletonSurfaces = [
  "background", "card", "popover", "muted", "hover", "active", "selected",
] as const;
```

Plan 094 added the quiet panel and the `hover`/`active`/`selected` washes with
the reason “a skeleton row is hovered, pressed and selected like any other”. The
contract has since established (plans 312, 314, 316) that **`accent` is the fill
a selectable list row paints on hover**: `packages/components/src/list.tsx:692`
sets `hover: { backgroundColor: theme.colors.accent }` when `selectable`. A
loading row in a selectable list is the API-invited composition — a paginated
list renders placeholder rows inside the same row wrapper — so a skeleton can
sit on `accent`.

The skeleton is the one painted value the row-wash audits never added to
`accent`, and it has no designed edge to fall back on (unlike a soft status chip,
plan 300). A copied platform style or brand theme could retint `accent` until a
loading row's placeholder disappears while `themeContrastFailures` returns `[]`.

Scope check: `skeletonSurfaces` is the only list that omits `accent` while
claiming to cover every row wash. `secondaryTextPairs`, `statusTextSurfacePairs`,
`primaryTextPairs`, `ringPairs`, `controlBoundaryPairs`, `inactiveBaseSurfaces`,
`rowTextPairs` and `softBorderSurfacePairs` all contain it.

A probe over the identity themes (light/dark, default/high), every shipped
platform variant and both recipes in both modes found **every shipped set already
clears 1.05:1** with the skeleton present (the identity light accent `#EEF0FF`
against the `#CBD1DB` skeleton is the tightest light case; the dark iris accents
are far apart). No colour moves.

## 2. What changes

### 2.1 `packages/tokens/src/contrast.ts`

Add `accent` to `skeletonSurfaces`, before `selected`, matching the order the
other row-wash lists use (`hover`, `active`, `accent`, `selected`):

```ts
const skeletonSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;
```

Update the comment above it: the four row washes a loading row can paint are
`hover`, `active`, the `accent` a selectable row hovers and `selected`. No colour
value changes.

### 2.2 `packages/tokens/src/skeleton-washes.test.ts`

- Header: add plan 322 and the `accent` composition (a selectable row paints
  `accent` on hover; the placeholder has no edge to fall back on).
- The local `surfaces` list gains `"accent"` between `"active"` and
  `"selected"`, so the “keeps every shipped theme's placeholder perceivable”
  loop and the “keeps a pressed loading row visible” loop measure it, and the
  pair-list assertion expects the new order.
- Add one test: **“reports a skeleton that vanishes into the accent wash”**:
  ```ts
  const light = getTheme("light");
  const regressed = extendTheme(light, {
    colors: { skeleton: light.colors.accent },
  });
  const failures = themeContrastFailures(regressed).filter(
    ({ foreground }) => foreground === "skeleton",
  );
  expect(
    failures.map(({ background, pairClass, floor }) => ({
      background,
      pairClass,
      floor,
    })),
  ).toContainEqual({
    background: "accent",
    pairClass: "surface",
    floor: contrastFloors.default.surface,
  });
  ```
  Use `toContainEqual` rather than `toEqual` only if another skeleton pair can
  also fail when the skeleton equals the light accent (check the run; if the
  light background/card/popover also fail, assert the full list instead). The
  purpose is that the public checker names `accent`, which it cannot do before
  the pair exists.

### 2.3 `packages/tokens/src/contrast.test.ts`

The pair-count assertion moves from `261` to `262` (`261 + 1`). Do not change
any other count or the existing “vanishes into every surface” regression — its
white accent is not part of that fixture; if adding `accent` produces an extra
failure there, extend the expected list with the `accent` row rather than
weakening the case.

### 2.4 `packages/tokens/src/docs.test.ts`

- The “states the skeleton floor the contract enforces” test derives `surfaces`
  from `contrastPairs` and asserts the exact order. Add `"accent"` between
  `"active"` and `"selected"` in its expected array (the generated sentence
  follows automatically).
- The floors-table guard at the `loading skeleton` row is a literal string; add
  `/accent` between `/active` and `/selected`:
  `` `... and the `hover`/`active`/`accent`/`selected` washes | ...` ``.
  Build it from `contrastFloors` as the file already does; do not hard-code the
  numeric floors.

### 2.5 `docs/tokens.md`

- “A loading skeleton is a surface too: it is held to 1.05:1 against …” gains
  the `accent` wash between `active` and `selected`, with the reason: a
  selectable list row paints `accent` on hover, and the placeholder has no
  designed edge to fall back on.
- The contract-growth paragraph that ends “Plan `320` … taking it from 257 to
  **261**.” gains: “Plan `322` adds the `accent` wash a selectable row hovers,
  taking it from 261 to **262**.”
- No colour table changes.

### 2.6 `docs/design-system.md`

- §8 state table, `loading` row: the list of surfaces gains `accent` (keep the
  plan-094 sentence).
- §9 floors table, `loading skeleton` row: `… the \`hover\`/\`active\`/\`accent\`/\`selected\`
  washes`. This is the row `docs.test.ts` holds.

### 2.7 `packages/tokens/README.md`

In “Checking a theme”, the sentence “the loading skeleton on those three, the
`muted` panel and the `hover`/`active`/`selected` washes a loading row paints”
gains the `accent` wash. Do not quote a pair count (the README does not).

### 2.8 `COMPONENTS.md`

- `Design tokens` row: the clause “the loading skeleton is held to the same
  floor on the `muted` panel and the `hover`/`active`/`selected` washes a loading
  row paints” gains the `accent` wash a selectable row hovers (plan 322).
- `Theme contrast check` row: “the same 261 contrast pairs” becomes “the same
  262 contrast pairs”, and append one sentence naming plan 322. Keep the rest of
  the row unchanged.

### 2.9 `TODO.md` and the plan index

- Add and tick a task under “Design tokens and theming”:
  “Hold the loading skeleton on the `accent` wash a selectable list row hovers —
  `skeletonSurfaces` covered `hover`/`active`/`selected` but not `accent`, so an
  edited theme could erase a placeholder row while the checker returned `[]`;
  every shipped set passes, so no colour moves and the contract grows 261 → 262
  (plan 322).”
- Update the progress line from `89/118` to `90/119` (one task added, one
  completed). **Re-count the subsection first**; the bar must equal the number
  of `[x]`/total rows, not be copied blindly.
- Add plan 322 to `.agents/slop/plans/README.md` after 321, status `done`, and
  append one commentary sentence to the block's running commentary.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 51 files / 3202 tests. Stop if red.

2. Add the test changes **before** `contrast.ts` and run only the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/skeleton-washes.test.ts
   ```
   Expected: FAIL on the pair list (7 pairs, not 8) and on the new regression
   (the checker has no `skeleton`/`accent` failure). Record the output.

3. Add `accent` to `skeletonSurfaces`, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/skeleton-washes.test.ts src/contrast.test.ts src/docs.test.ts
   ```
   Expected: PASS after the count and document updates. If the shipped-loop test
   fails, STOP: the probe said every set clears the floor; a failure means a
   colour decision, not a lowered floor.

4. Whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 51 files. The test count grows by one.

5. Repository gates:
   ```sh
   nub run check
   nub run lint
   nub run fmt
   ```
   Expected: all green.

6. Confirm every changed count says **262** and every skeleton surface list
   names `accent`. `rg "261"` should return no live claim about the token pair
   count (the plan files may mention it historically).

## 4. STOP conditions

Stop and report instead of improvising if:

- any shipped identity, platform or recipe theme fails the new 1.05:1 pair — the
  plan asserts no colour moves; a failure needs a colour decision;
- `contrastPairs.length` is not 261 before the change;
- adding `accent` to the “vanishes into every surface” fixture produces more
  failures than its expected list and the fix would require changing that
  fixture's intent;
- `list.tsx` no longer paints `accent` on a selectable row's hover, or the
  `Skeleton` component cannot be composed inside a row (re-check the sibling
  worktrees first; if the composition is gone, record it and close the task as
  “not applicable” rather than adding a pair no composition paints);
- any gate was already red before this change for reasons outside this
  workstream.

## 5. Acceptance

- `skeletonSurfaces` contains `accent` between `active` and `selected`.
- `themeContrastFailures` names a skeleton-on-`accent` failure when the two
  roles are equal.
- Every shipped set still returns `[]`; no colour value changes.
- The test file fails without §2.1 and passes with it.
- `docs/tokens.md`, `docs/design-system.md`, the README and both `COMPONENTS.md`
  rows are current; the plan index and `TODO.md` are ticked.
- `nub run check`, `nub run lint`, `nub run test` pass.
