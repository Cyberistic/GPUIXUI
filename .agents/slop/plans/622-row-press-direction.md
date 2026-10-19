# 622 — The selectable row's press direction

**Phase:** F (the interaction contract) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 502 (`themeDirectionFailures` and `stateLadders`), 619 (the
selectable row's press step), 621 (the last landing plan) ·
**Number block:** 500–699 (`tokens-theme` overflow; 622 is free in every
worktree) ·
**Status:** done

## 1. The gap

Plan 619 published the selectable row's press **distance**:

```ts
export const rowPressStepPairs: readonly ContrastPair[] = [
  ["active", "accent", "step"],
];
```

A selectable `List` row paints `accent` under the pointer and `active` while
pressed, so `active` must be one 1.05:1 step past the `accent` hover. But a
contrast ratio is symmetric: the pair cannot say which way the press moved. A
press that moves *toward* the canvas is exactly the defect plan 097 replaced for
the filled families, and plan 502 shipped `themeDirectionFailures` to catch it.
Its ladder list does not name the row's press:

```ts
export const stateLadders: ReadonlyArray<StateLadder> = [
  ...filledControlFamilies.map(/* x → xHover → xActive */),
  { name: "softAction", roles: [...] },
  { name: "wash", roles: ["hover", "active"] },
  { name: "selection", roles: ["accent", "selected"] },
];
```

So a copied dark theme can paint a row that *darkens* on press — toward the
canvas — while the step passes and every check returns `[]`. Measured on the
shipped identity dark theme with four row fills and the divider moved one step:

| Role | Value | Why |
| ---- | ----- | --- |
| `accent` | `#393939` | the hover wash a selectable row paints |
| `active` | `#333333` | the press, **darker** than the hover |
| `hover` | `#2C2C2C` | the generic wash, darker than the press, so that ladder still steps |
| `selected` | `#3F3F3F` | a step past `accent`, so the selection ladder still steps |
| `border` | `#414A57` | the divider stays visible on the selected fill |

`contrastRatio(active, accent)` is **1.094:1**, above the 1.05 step floor, and
`themeFailures(theme)` returns **`[]`**. In a dark theme the press is expected
to move lighter; this one moves darker. `rowPressStepPairs` reports the distance
and nothing reports the direction.

## 2. Decision

Add the row press to `stateLadders`:

```ts
{
  name: "rowPress",
  roles: ["accent", "active"],
},
```

after `selection`, so the failure order reads: the four filled families, the
panel action, the generic wash, the selected step, the row press.

The ladder is **not** derived at module level. `rowPressStepPairs` lives in
`contrast.ts`, which `direction.ts` already imports `relativeLuminance` from;
deriving the roles from the pair would be legal, but the pair is typed as a
general `ReadonlyArray<ContrastPair>` and indexing it would need a fallback or
an assertion. Instead the new suite derives the expected ladder from the
published pair (`[to, from]` → `[from, to]`) and fails if the two drift, which is
the same guarantee without a cast.

The name is `rowPress`, matching `rowPressStepPairs` and distinct from the
generic `wash` ladder (`hover` → `active`) and the `selection` ladder
(`accent` → `selected`). A row's press follows the `accent` hover, not the
generic wash, so it is its own ladder.

No token value moves: every shipped set already presses away from the canvas on
`accent` → `active` (checked in §8, step 1).

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/direction.ts` | add the `rowPress` ladder; name it in the `stateLadders` and `themeDirectionFailures` JSDoc |
| `packages/tokens/src/state-direction.test.ts` | add `rowPressStepPairs` to the "publishes a distance for every ladder step" set |
| `packages/tokens/src/row-press.example.ts` | create the executed inversion example |
| `packages/tokens/src/row-press-direction.test.ts` | create (new suite) |
| `docs/tokens.md` | §Interaction direction and §Step floors |
| `docs/design-system.md` | §11 direction and the pressed-state row |
| `packages/tokens/README.md` | the ninth-check paragraph |
| `COMPONENTS.md` | one clause in the `Total theme check` row's direction sentence |
| `TODO.md` | add one design-tokens row, tick it, bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. Do **not** edit `packages/components` or any consumer.

## 4. `packages/tokens/src/direction.ts`

In the `stateLadders` array, after the `selection` entry:

```ts
  {
    name: "selection",
    roles: ["accent", "selected"],
  },
  // A selectable row hovers `accent` and presses `active`; the distance is
  // published by `rowPressStepPairs`, and this ladder is its direction. It
  // follows the accent hover, not the generic `hover` wash, so it is its own
  // ladder.
  { name: "rowPress", roles: ["accent", "active"] },
```

Update the `stateLadders` JSDoc: "the four filled families ..., the action a soft
status panel carries, the generic wash a ghost or outline control paints, the
selected step past the accent a row hovers with, and the selectable row's press
past that accent hover (`accent` → `active`, the direction of
`rowPressStepPairs`)".

Update the `themeDirectionFailures` JSDoc's opening sentence: "Every ladder step
that moves toward the canvas" gains "— including the selectable row's press, not
only the filled families and the wash —". Do not add a count.

## 5. `packages/tokens/src/state-direction.test.ts`

Add `rowPressStepPairs` to the import from `./index.js`. In the case
`"publishes a distance for every ladder step"`, add it to the measured list:

```ts
    const measured = new Set(
      [
        ...stateStepPairs,
        ...softActionStepPairs,
        ...washStepPairs,
        ...selectionStepPairs,
        ...rowPressStepPairs,
      ].map(([from, to]) => `${from}|${to}`),
    );
```

That is the only change to this file. Without it, the new ladder fails the
existing case (it has no published distance); with it, the case proves the two
lists stay paired.

## 6. `packages/tokens/src/row-press.example.ts` (create)

```ts
import { extendTheme, getTheme, themeDirectionFailures } from "./index.js";

/**
 * A dark theme whose selectable row presses toward the canvas. `accent` is the
 * fill a row hovers with and `active` the fill it presses with; the two are a
 * 1.094:1 step, so the contrast contract accepts them, but the press moves
 * darker in a dark theme instead of lighter.
 */
export const invertedRowPressTheme = extendTheme(getTheme("dark"), {
  colors: {
    accent: "#393939",
    hover: "#2C2C2C",
    active: "#333333",
    selected: "#3F3F3F",
    border: "#414A57",
  },
});

/** The one failure the direction check reports for it. */
export const rowPressFailures = themeDirectionFailures(invertedRowPressTheme);
```

The suite must import both exports so the example runs (the plan-350 guard).

## 7. `packages/tokens/src/row-press-direction.test.ts` (create)

Header comment must state the bug being guarded:

> Guards the defect plan 622 fixes: plan 619 published the selectable row's
> press **distance** (`rowPressStepPairs`, `active` one step from the `accent`
> hover) but `stateLadders` did not name the ladder, so a copied dark theme
> could darken on press — toward the canvas — while the step passed and
> `themeFailures` returned `[]`. The row press is the last pointer ladder the
> direction check was not walking.

Imports: `describe`, `expect`, `it` from `vitest`; `contrastFloors`,
`contrastPairs`, `contrastRatio`, `rowPressStepPairs`, `shippedThemes`,
`stateLadders`, `themeContrastFailures`, `themeDirectionFailures`, `themeFailures`
from `./index.js`; `invertedRowPressTheme` from `./row-press.example.js`.

Cases:

1. **`passes every shipped set`** — for each `{ theme }` of `shippedThemes`,
   `expect(themeDirectionFailures(theme), theme.name).toEqual([])`. This exercises
   both modes (the shipped identity light and dark halves, the platform variants
   and the recipes).
2. **`reports a dark row that presses darker than its hover`** — on
   `invertedRowPressTheme`:
   - `expect(themeContrastFailures(invertedRowPressTheme)).toEqual([])` — the
     1.094:1 step and every floor are why the contrast half cannot see it;
   - `expect(themeDirectionFailures(invertedRowPressTheme)).toHaveLength(1)`
     and `toMatchObject({ ladder: "rowPress", from: "accent", to: "active",
     expected: "lighter" })`;
   - assert `fromLuminance` / `toLuminance` are finite and
     `toLuminance < fromLuminance` (`toBeLessThan`; do not compare the whole
     object to float literals).
3. **`carries the inversion through the total check`** — `themeFailures` on the
   same theme has exactly one entry, `kind: "direction"`, and the same ladder.
4. **`mirrors the published step pair`** — map `rowPressStepPairs` to
   `{ name: "rowPress", roles: [from, to] }` and `expect(stateLadders)` to
   contain each; also assert `stateLadders.filter(({ name }) => name ===
   "rowPress")` has length 1. This fails if a later edit changes the pair
   without the ladder.
5. **`keeps the distance it measures`** — the planted pair
   `contrastRatio(active, accent)` is `>= contrastFloors[theme.contrast].step`
   and `contrastPairs` contains `["active", "accent", "step"]`. This states that
   the case is a direction defect, not a collapsed step.

Do not add a light-mode planted theme: in a light palette `accent` is shared by
the filled accent family, the inline-code wash and status text on a row, so
forcing a light inversion requires moving a dozen unrelated roles; the shipped
light sets in case 1 exercise the `"darker"` branch, and the existing primary
light/dark cases in `state-direction.test.ts` already prove the mode-dependent
direction.

## 8. Commands and expected results

1. Before any edit, probe the shipped ladder (a scratch script, not committed):
   for every `shippedThemes` entry, `relativeLuminance(active) > relativeLuminance(accent)`
   in dark and `<` in light. Expected: **24/24 pass** — no token value has to
   move.
2. Create the new suite **before** the ladder; from `packages/tokens` run
   `nub x vitest run src/row-press-direction.test.ts`.
   Expected: **3 failed / 2 passed** — cases 2, 3 and 4 fail (no `rowPress`
   failure); cases 1 and 5 pass because the shipped sets step correctly and the
   planted step is already 1.094:1. Record the exact counts.
3. Add the ladder and the JSDoc; rerun the same command → **5 passed**.
4. Run `nub x vitest run src/state-direction.test.ts src/row-press-direction.test.ts`
   → both files green (the distance case now includes the new pair).
5. `nub run --filter @gpuixui/tokens test` → the baseline is
   **165 files / 6,080 tests**; the new suite makes **166 files / 6,085 tests**.
   If the count differs, explain why before committing.
6. `nub run check` → `check:tests`, lint, format and type-check green.
7. `nub run lint` → green.
8. `nub run test` → the same file/test total as step 5.

Both directions: after step 5, run
`git stash push -- packages/tokens/src/direction.ts` and rerun the new suite →
the three cases fail again; `git stash pop` → green.

## 9. STOP conditions

- **A shipped set fails the new ladder.** All 24 step away from the canvas; if
  one does not, stop — this plan does not authorise a colour change.
- **`rowPressStepPairs` no longer names `active` from `accent`.** Re-read
  `contrast.ts`; if the pair moved, stop and re-derive the ladder.
- **The planted theme returns a second failure.** The whole point is that the
  five edited roles pass every other check; if `themeFailures` reports contrast,
  hierarchy or metric as well, the values were transcribed wrong — stop and
  re-measure, do not weaken the assertion.
- **The existing distance case needs more than the one added list.** Only
  `measured` may change in `state-direction.test.ts`; any other change means the
  audit was incomplete.
- **A command must edit a path outside §3.** Stop.
- **A gate fails for a reason unrelated to this change.** Stop, record the exact
  output, and do not paper over it.

## 10. Acceptance criteria

- `themeDirectionFailures` reports a selectable row whose `accent` → `active`
  press moves toward the canvas, tagged `ladder: "rowPress"`.
- The new suite fails without the ladder (3/5) and passes with it (5/5), and the
  example is imported by the suite.
- Every shipped theme, platform variant and recipe still passes
  `themeDirectionFailures` and `themeFailures`; no token value moves.
- `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md`
  name the ladder; `TODO.md` and the plan index are current; all gates in §8 are
  green.
