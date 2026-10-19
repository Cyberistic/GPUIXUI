# Plan 673 — The interaction ladders' ordered index

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/direction.ts`,
> `packages/tokens/src/direction-reference.test.ts` (new),
> `packages/tokens/src/state-ladder-index.example.ts` (new),
> `packages/tokens/src/readme.test.ts`, `packages/tokens/README.md`,
> `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`,
> `.agents/slop/plans/README.md`. No colour, pair, floor, metric or shipped
> theme moves.

## Execution record (2026-10-19)

- The index, the typed fields and the four argument sources were added first,
  then the three prose cases failed on the pre-fix text exactly as measured: the
  `DirectionFailure` field doc did not name `stateLadderNames`, the
  `themeDirectionFailures` JSDoc named five of the six derived `*StepPairs`
  lists, and the README named neither the index nor `selectionPress`.
- A first test draft sliced only the interface's leading JSDoc, which does not
  carry the field's sentence; the case now reads the declaration body, so it
  guards the text a reader actually sees on the field.
- After the edits: the focused six suites are **275/275**, the package is
  **187 files / 6694 tests**, and `nub run check`, `nub run lint` and
  `nub run test` are green.
- Both directions were re-proved by reverting the two paragraphs and the README
  sentence to their pre-fix wording: **3 failed / 37 passed** in
  `direction-reference.test.ts` + `readme.test.ts`. Restoring the files returned
  both suites to green.

## Why

`stateLadders` is the ordered list of interaction ladders the direction check
walks: the four filled families, `softAction`, the generic wash, the selected
step and two row presses. It is the one interaction catalogue without an
ordered, typed index, while every sibling owns one — `themeChecks`,
`contrastPairClasses`, `metricRules`, `colorForms`, `stateFillRoles`,
`selectionFillRoles`, `statusTones`, `platformNames`, `motionLevels`.

Two published surfaces have already drifted from it:

1. `direction.ts`, the `DirectionFailure` interface:

   > The ladder the step belongs to — a family, `softAction`, `wash`,
   > `selection` or `selectionPress`.

   Plan 622 added `rowPress`; the sentence never grew it.

2. `direction.ts`, the `themeDirectionFailures` JSDoc:

   > An **equal** pair is not reported here — `stateStepPairs`,
   > `washStepPairs`, `selectionStepPairs`, `rowPressStepPairs` and
   > `softActionStepPairs` report a collapsed step.

   Plan 651 added `selectionPressStepPairs`; the list still names five of the
   six step-pair lists, so a reader following the reference looks for a seventh
   equal-pair owner that does not exist and never sees the one that does.

3. `packages/tokens/README.md`:

   > `stateLadders` names the four filled families, the panel action, the
   > generic wash, the selected step and the selectable row's press …

   The selected row's press (`selectionPress`) is missing, and no surface names
   the owner a table can iterate. `readme.test.ts` reads the check's ordinal and
   payload but not this sentence.

The failure mode is the one plans `391` and `602` closed for the contrast
reference and the diagnostic order: a public JSDoc that retypes a list instead
of naming its owner drifts one plan behind, while every test stays green. The
index also removes the reason to retype the names at all: a diagnostics table
iterates `stateLadderNames`, and `DirectionFailure.ladder` narrows to it.

## Scope

- Ship `stateLadderNames` (ordered, `as const`) and `StateLadderName` in
  `direction.ts`; type `StateLadder.name` and `DirectionFailure.ladder` with it.
- Correct the two published `direction.ts` paragraphs and the README paragraph.
- Add `state-ladder-index.example.ts`, a copyable grouped failure report, and
  the `StateLadderName` type row plus the index mention in the catalogue.
- Guard it with `direction-reference.test.ts` (index totality, the two source
  paragraphs, every derived step-pair list, both docs pages and the README) and
  a `readme.test.ts` case.
- No source composition, token value, pair, floor, metric or shipped theme
  changes.

Out of scope: the direction walk itself (its ladders, roles and `toward`
exception are correct); `themeDirectionFailures`' behaviour; the platform,
contrast and metric contracts.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/direction.ts` | `stateLadderNames`, `StateLadderName`, typed `name`/`ladder`, corrected JSDoc. |
| `packages/tokens/src/direction-reference.test.ts` | new guard suite. |
| `packages/tokens/src/state-ladder-index.example.ts` | new executed example. |
| `packages/tokens/src/readme.test.ts` | the README ladder case. |
| `packages/tokens/README.md` | the ladder paragraph. |
| `docs/tokens.md` | `StateLadderName` row, the direction paragraph, the docs-site index list, the example link. |
| `docs/design-system.md` | the direction paragraph names the index and both row presses. |
| `COMPONENTS.md` | the Design tokens row names the index. |
| `TODO.md`, `.agents/slop/plans/README.md` | ledger and index. |

## Exact edits

### 1. `packages/tokens/src/direction.ts` — the index

After the imports and before `StateLadder`, add:

```ts
/**
 * Every interaction ladder the library documents, in documentation order: the
 * four filled families, derived from `filledControlFamilies`, then the panel
 * action, the generic wash, the selected step and the two row presses.
 * `StateLadderName` derives from this list, so a new ladder joins the type,
 * `stateLadders` and every diagnostics table from one edit.
 *
 * @example
 * ```ts
 * import { stateLadderNames, stateLadders } from "@gpuixui/tokens";
 *
 * const names = stateLadderNames.filter((name) =>
 *   stateLadders.some((ladder) => ladder.name === name),
 * );
 * ```
 */
export const stateLadderNames = [
  ...filledControlFamilies,
  "softAction",
  "wash",
  "selection",
  "selectionPress",
  "rowPress",
] as const;

/** A ladder from {@link stateLadderNames}. */
export type StateLadderName = (typeof stateLadderNames)[number];
```

Change `StateLadder.name` from `string` to:

```ts
  /** The ladder's name: one member of `stateLadderNames`. */
  readonly name: StateLadderName;
```

Change `DirectionFailure.ladder` to:

```ts
  /** The ladder the step belongs to, one member of `stateLadderNames`. */
  readonly ladder: StateLadderName;
```

In `stateLadders`' JSDoc, add one clause after "the selected row's press, the
one ladder that moves toward the canvas":

> `stateLadderNames` is that list's ordered index.

(the exact edit below). The array itself is unchanged: the families still come
from `filledControlFamilies.map`, and the five fixed entries still carry their
literal names, which now type-check against the union.

### 2. `packages/tokens/src/direction.ts` — the two stale paragraphs

`DirectionFailure.ladder`'s JSDoc: replace

```
   * The ladder the step belongs to — a family, `softAction`, `wash`, `selection` or `selectionPress`.
```

with

```
   * The ladder the step belongs to, one member of `stateLadderNames`.
```

`themeDirectionFailures`' JSDoc: replace

```
   * reported here — `stateStepPairs`, `washStepPairs`, `selectionStepPairs`,
   * `rowPressStepPairs` and `softActionStepPairs` report a collapsed step — and a
```

with

```
   * reported here — `stateStepPairs`, `washStepPairs`, `selectionStepPairs`,
   * `rowPressStepPairs`, `selectionPressStepPairs` and `softActionStepPairs`
   * report a collapsed step — and a
```

### 3. `packages/tokens/src/state-ladder-index.example.ts` (new)

```ts
import type { ThemeColors } from "./color.js";
import {
  stateLadderNames,
  themeDirectionFailures,
  type DirectionFailure,
  type StateLadderName,
} from "./index.js";
import type { Theme } from "./theme.js";

/** One ladder's failures, in `stateLadderNames` order. */
export interface StateLadderRow {
  /** The ladder's documented name. */
  readonly name: StateLadderName;
  /** The failures that ladder owns; empty when every step moves away. */
  readonly failures: ReadonlyArray<DirectionFailure>;
}

/**
 * Group a theme's direction failures by ladder. `stateLadderNames` is the
 * ordered owner of the names, so a report iterates the index instead of
 * retyping the four families or the two row presses, and
 * `DirectionFailure.ladder` narrows to the same union.
 */
export const stateLadderRows = (
  theme: Theme,
): ReadonlyArray<StateLadderRow> => {
  const failures = themeDirectionFailures(theme);
  return stateLadderNames.map((name) => ({
    name,
    failures: failures.filter((failure) => failure.ladder === name),
  }));
};

/** The roles one ladder paints, resolved for a preview. */
export const stateLadderColors = (
  theme: Theme,
  row: StateLadderRow,
): ReadonlyArray<{ readonly role: keyof ThemeColors; readonly color: string }> => {
  const ladder = stateLadders.find((candidate) => candidate.name === row.name);
  if (ladder === undefined) {
    return [];
  }
  return ladder.roles.map((role) => ({ role, color: theme.colors[role] }));
};
```

Import `stateLadders` in the first import block. `stateLadderColors`'s
`if (ladder === undefined) return []` is total but unreachable when the index
and the array agree; the guard suite proves they do, and the example does not
assert totality with a cast.

### 4. `packages/tokens/src/direction-reference.test.ts` (new)

Header states the bug: the `DirectionFailure` JSDoc omitted `rowPress` after
plan 622, the `themeDirectionFailures` JSDoc omitted `selectionPressStepPairs`
after plan 651, and the README omitted `selectionPress`; nothing read any of the
three because `docs.test.ts` guards the Markdown pages and `readme.test.ts` the
costs, not this paragraph. `node:fs` is deliberate, like the other tree-local
documentation guards.

Cases:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFloors, selectionStepPairs } from "./contrast.js";
import {
  stateLadderNames,
  stateLadders,
  themeDirectionFailures,
} from "./direction.js";
import { filledControlFamilies } from "./styles.js";
import { getTheme, extendTheme } from "./theme.js";
import { stateLadderRows } from "./state-ladder-index.example.js";

const source = readFileSync(new URL("./direction.ts", import.meta.url), "utf8");
const contrastSource = readFileSync(
  new URL("./contrast.ts", import.meta.url),
  "utf8",
);
const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const designSystem = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

const proseAt = (marker: string): string => { /* slice the /** block, as contrast-reference.test.ts does */ };
```

- **indexes every ladder once, in documentation order**:
  `expect(stateLadders.map(({ name }) => name)).toEqual([...stateLadderNames]);`
  and `new Set(stateLadderNames).size === stateLadderNames.length`.
- **names the index in both source paragraphs**: both `proseAt("interface DirectionFailure")`
  and `proseAt("export function themeDirectionFailures")` contain
  `` `stateLadderNames` ``.
- **names every step-pair list** (derived): read every `export const (\w+StepPairs)`
  from `contrast.ts`, require each in the function prose. The pre-fix source has
  six lists and names five, so the case fails.
- **names every fixed ladder in the README**:
  `const fixed = stateLadderNames.filter((name) => !filledControlFamilies.some((family) => family === name));`
  expect the README to contain `` `stateLadderNames` `` and each fixed name in
  backticks.
- **names the index and the step owners in both pages**: `catalogue` and
  `designSystem` contain `` `stateLadderNames` ``; each contains every derived
  step-pair name.
- **groups a real failure by ladder (the example runs)**:
  ```ts
  const inverted = extendTheme(getTheme("light"), {
    colors: {
      primary: "#3A2A9A",
      primaryHover: "#4A38AE",
      primaryActive: "#5A46C2",
    },
  });
  const rows = stateLadderRows(inverted);
  expect(rows).toHaveLength(stateLadderNames.length);
  expect(rows.find(({ name }) => name === "primary")?.failures).toHaveLength(2);
  expect(rows.filter(({ failures }) => failures.length > 0)).toHaveLength(1);
  ```
  This also proves `DirectionFailure.ladder` narrows: the `.find` predicate
  compares against the union without a cast. `contrastFloors` and
  `selectionStepPairs` are imported only if needed — drop them if unused.

### 5. `packages/tokens/README.md` — the ladder paragraph

Replace

```
ninth: `stateLadders` names the four filled families, the panel action, the
generic wash, the selected step and the selectable row's press, and each step
must move away from the canvas
```

with

```
ninth: `stateLadders` — indexed by `stateLadderNames` — walks the four filled
families, the panel action, the generic wash, the selected step and both row
presses (`rowPress` and `selectionPress`), and each step must move away from the
canvas
```

### 6. `packages/tokens/src/readme.test.ts`

Add after the "states the payload type of every check" case:

```ts
it("names every interaction ladder from the index", () => {
  expect(readme).toContain("`stateLadderNames`");
  const fixed = stateLadderNames.filter(
    (name) => !filledControlFamilies.some((family) => family === name),
  );
  expect(fixed.length).toBeGreaterThan(0);
  fixed.forEach((name) => expect(readme, name).toContain(`\`${name}\``));
});
```

Add the two imports (`stateLadderNames` from `./direction.js`,
`filledControlFamilies` from `./styles.js`).

### 7. `docs/tokens.md`

- Types table, after the `StateLadder` row:

```
| `StateLadderName` | A ladder from `stateLadderNames`: the four filled families plus `softAction`, `wash`, `selection`, `selectionPress` and `rowPress`. |
```

- Direction paragraph: after

  > `stateLadders` is the ordered list of ladders the design system documents:

  add the index clause, e.g. the first sentence becomes

  > `stateLadders` is the ordered list of ladders the design system documents —
  > `stateLadderNames` is its index, so a diagnostics table iterates the names
  > instead of retyping them:

- *For documentation sites*: add `stateLadderNames` to

  > `densityNames` and `densityPresets` are the preset order and its metrics;
  > `controlSizes`, `elevationLevels`, `motionLevels`, `motionPhases`,
  > `typefaceRoles` and `metricGroups` index the remaining groups.

  → "…; `controlSizes`, `elevationLevels`, `motionLevels`, `motionPhases`,
  `typefaceRoles`, `metricGroups` and `stateLadderNames` index the remaining
  groups." and link the new example beside `scale-indexes.example.ts`:

  ```
  A runnable table builder is
  [`src/scale-indexes.example.ts`](../packages/tokens/src/scale-indexes.example.ts),
  and [`src/state-ladder-index.example.ts`](../packages/tokens/src/state-ladder-index.example.ts)
  groups a theme's direction failures by ladder.
  ```

- The `DirectionFailure` type row's purpose: "…with both luminances" stays.

### 8. `docs/design-system.md`

Replace

```
list includes the selectable row's press (`accent` → `active`), not only the
filled families, the panel action, the wash and the selected step, so a dark row
that presses darker than its hover is reported while the 1.094:1 step passes.
```

with

```
list, `stateLadderNames`, covers both row presses — `accent` → `active` and
`selected` → `selectedActive` — so a dark row that presses darker than its
hover is reported while the 1.094:1 step passes.
```

### 9. `COMPONENTS.md`

In the Design tokens row, replace

```
`colorRoles` and `textRoles` index the colour and type roles and `densityNames`
the density presets for generated doc tables
```

with

```
`colorRoles` and `textRoles` index the colour and type roles, `densityNames`
the density presets and `stateLadderNames` the interaction ladders for generated
doc tables
```

### 10. `TODO.md` and `.agents/slop/plans/README.md`

Tick after the plan-672 row and add the plan index row after `672`.

## Commands, in order

Prove the guard can fail on the untouched source: create the test file first and
run it.

```sh
cd packages/tokens
nub exec vitest run src/direction-reference.test.ts
```

Expected before the source edits: the "names every step-pair list" case fails
(`selectionPressStepPairs` is absent), the source-paragraph cases fail
(`stateLadderNames` does not exist yet), and the README case fails. The test
will not compile until `stateLadderNames` exists; make the index edit first,
then run the two prose cases to see them fail before correcting the paragraphs.
If every case passes on the untouched paragraphs, **STOP** and re-measure.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/direction-reference.test.ts src/readme.test.ts src/docs.test.ts src/snippets.test.ts src/examples.test.ts src/public-types.test.ts
nub run check-types
```

Expected: all green; `public-types.test.ts` fails until the `StateLadderName`
row is in `docs/tokens.md`, which is the intended proof that the type index is
still total.

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

## STOP conditions

- `stateLadders.map(({ name }) => name)` does not equal `stateLadderNames`:
  either the index or the array is out of order. Fix the order; do not relax the
  case to a set comparison.
- A ladder's `name` no longer type-checks against `StateLadderName`: the array
  names a ladder the index does not. Add it to the index (and the docs) rather
  than widening the type back to `string`.
- The step-pair scan finds a name that is not a collapsed-step list: the
  convention changed; adapt the pattern, do not hardcode the six.
- Any colour, pair, floor, metric or shipped theme must move: **STOP**. This plan
  moves none.
- `docs.test.ts` or `readme.test.ts` fails on a sentence this plan did not
  touch: report it; do not weaken the guard.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | `selectionPressStepPairs` is absent from `themeDirectionFailures`' JSDoc; `rowPress` is absent from `DirectionFailure.ladder`'s; the README omits `selectionPress`; `stateLadderNames` does not exist. |
| Passes with the fix | The index equals the array's names in order, each fixed ladder is named in the README, every derived step-pair list is named in the source and both pages, and the example groups an inverted primary ladder into two failures while every other row is empty. |
| Cannot pass by changing a literal | The step-list expectation is derived by scanning `contrast.ts`; the README members are derived from `stateLadderNames` minus `filledControlFamilies`; the array/index equality is a full ordered comparison. |
| No token change smuggled in | `git diff --name-only` lists only the nine files above; no theme, pair, floor or metric value appears in the diff. |

## Acceptance

- [x] `stateLadderNames` and `StateLadderName` ship, and `StateLadder.name` /
      `DirectionFailure.ladder` narrow to the union.
- [x] The two `direction.ts` paragraphs and the README paragraph are correct.
- [x] `StateLadderName` is in the catalogue's type index and the example is
      linked and executed.
- [x] `direction-reference.test.ts` and the new `readme.test.ts` case fail on the
      pre-fix text and pass after it.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed; `TODO.md` row ticked.
