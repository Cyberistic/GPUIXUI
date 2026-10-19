# Plan 667 — The chip holds the chrome inside it

## Why

`dimensions.chipMinWidth` is documented as the token-input chip's minimum width,
but the metric contract only asks that it be positive. The field rule from plan
384 treats it as the chip's **outer** width (what `TagInputChip` paints as
`minWidth`), so nothing checks the chrome inside it:

```
themeMetricFailures(
  extendTheme(getTheme("light"), {
    dimensions: { chipMinWidth: 10, fieldMinWidth: 100 },
  }),
); // []
```

Verified on 2026-10-19 against this branch: both `themeMetricFailures` and the
total `themeFailures` return `[]`. The chip's own content box is
`10 − 2 × spacing.sm = 10 − 12 = −2px`: the caption label, the `spacing.xs` gap
and the 16px remove control cannot fit, while the documented guarantee says the
theme is good.

The chip paints its chrome from theme tokens and literals
(`packages/components/src/tag-input.tsx`, `TagInputChip`):

| Part | Value painted | Token owner |
| ---- | ------------- | ----------- |
| leading and trailing inset | `spacing.sm` (6px each) | `theme.spacing` |
| gap between label and remove control | `spacing.xs` (4px) | `theme.spacing` |
| label | `caption` role (12px) | `theme.typography` |
| remove control | 16 × 16px square | `theme.dimensions.fieldAdornmentSize` (16) |

Plan 384 declined to count this with the rationale *"`chipMinWidth` is documented
as the chip's content width and the theme ships no chip-padding token"*. Both
halves are now false: the chip's padding and gap are the theme's `spacing.sm`
and `spacing.xs`, and the component paints the value as an outer `minWidth`, so
the "content width" wording is the outlier (the field rule already adds only the
**field's** padding around it). The omission is what lets a 10px chip pass.

No colour, pair, floor, check, or shipped theme value changes: the shipped chip
is 80px against a 44px bound.

## Scope

Numeric contract plus documentation truth for one dimension:

- `themeMetricFailures` holds `chipMinWidth` to the chrome the component paints
  inside it, reading the theme's own spacing, type and adornment metrics.
- `scale.ts` and `docs/tokens.md` stop calling it a "content width" and describe
  the outer width the component paints.
- One regression suite, `chip-chrome-fit.test.ts`, states the erased-chip bug
  and proves the bound moves with the theme.

Out of scope: changing any shipped value, the `fieldMinWidth` rule (plan 384 /
624 / 634 keep their bounds), and the cross-team migration that makes
`TagInputChip` read `theme.dimensions.fieldAdornmentSize` for its 16px control
(recorded in `TODO.md`).

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | one `atLeast` rule for `chipMinWidth`, and the `dimensions` JSDoc bullet names it. |
| `packages/tokens/src/scale.ts` | the `chipMinWidth` JSDoc calls it the outer width and names the chrome. |
| `packages/tokens/src/chip-chrome-fit.test.ts` | new regression suite (header comment states the bug). |
| `packages/tokens/src/fixed-surface-insets.test.ts` | its field-negative fixture plants `chipMinWidth: 10`; raise it to 44 so the case still isolates the field bound. |
| `docs/tokens.md` | the dimension row's wording and the metric prose sentence. |
| `COMPONENTS.md` | the **Design tokens** and **Theme metric check** rows name the chip bound. |

## Exact edits

### 1. `packages/tokens/src/metrics.ts`

Add the rule immediately before the `fieldMinWidth` `atLeast` (the field bound
composes the chip, so the two read together):

```ts
// A chip's own minimum is an outer width — `TagInputChip` paints it as
// `minWidth` — so its content box is the minimum less its two `spacing.sm`
// insets. That box holds the caption label, the `spacing.xs` gap and the
// `fieldAdornmentSize` remove control. Plan 384 declined this half because the
// chip's padding was said to have no token; it is `spacing.sm`, so a 10px chip
// passed every check with a negative content box (plan 667).
...atLeast(
  "dimensions",
  "chipMinWidth",
  dimensions.chipMinWidth,
  2 * spacing.sm +
    spacing.xs +
    typography.caption.fontSize +
    dimensions.fieldAdornmentSize,
),
```

In the JSDoc `dimensions` bullet, after the field/query-row sentence ending
"so lowering `chipMinWidth` cannot free a field that can no longer show its own
query", add:

```
   The chip's own minimum is the outer width the component paints
   (`minWidth`), so it holds its two `spacing.sm` insets, one `caption` glyph,
   the `spacing.xs` gap and the `fieldAdornmentSize` remove control; the field
   bound above is the other half of the same composition.
```

### 2. `packages/tokens/src/scale.ts`

Replace

```ts
  /** 80px — the minimum content width of a token-input chip. */
  readonly chipMinWidth: number;
```

with

```ts
  /**
   * 80px — the minimum width of a token-input chip. An outer width: the chip's
   * content box holds two `spacing.sm` insets, a caption glyph, the `spacing.xs`
   * gap and the `fieldAdornmentSize` remove control.
   */
  readonly chipMinWidth: number;
```

### 3. `docs/tokens.md`

In the dimension table, replace the `dimensions.chipMinWidth` row's description

```
minimum content width of a token-input chip
```

with

```
minimum width of a token-input chip; its content box holds two `spacing.sm` insets, one `caption` glyph, the `spacing.xs` gap and the `fieldAdornmentSize` remove control
```

In the numeric-contract prose (the paragraph that says "a chip must fit inside
the field's content box — the minimum width less the field's two borders and its
`controlPaddingX.md` padding — because a chip equal to the outer width has no
room for the chrome painted inside it"), keep that sentence and add after it:

```
The chip's own minimum is the outer width `TagInputChip` paints, so it holds
the chrome inside it — two `spacing.sm` insets, one `caption` glyph, the
`spacing.xs` gap and the `fieldAdornmentSize` remove control — because a value
that only fits the field's content box can still clip the chip's label and
control (plan `667`).
```

Then, where the same paragraph states the shipped bounds ("At the shipped
metrics the query row needs 80px, the chip 102px, and the shipped 200px field
clears the larger"), append `; the chip's own 44px bound passes at 1.82 times`
(the field numbers do not move).

### 4. `COMPONENTS.md`

- **Design tokens** row: in the component-dimensions list, after
  "the calendar day cell, the time segment", add
  "the token-input chip, whose 80px minimum holds its own insets, a caption
  glyph, its gap and the remove control (plan 667)".
- **Theme metric check** row: after the plan-384/624/634 sentence that ends
  "every shipped set still passes at the 102px chip bound", add
  "The chip's own 80px minimum holds its two `spacing.sm` insets, one `caption`
  glyph, the `spacing.xs` gap and the `fieldAdornmentSize` remove control
  (44px, plan 667), so a `chipMinWidth: 10` with a passing field no longer
  returns `[]`."

Do not change any number in either row.

### 5. `packages/tokens/src/chip-chrome-fit.test.ts`

Header comment must state the bug: a 10px chip with a passing field returned
`[]` while its content box (`10 − 2 × spacing.sm`) was negative, and the
`field-chrome` suite could not see it because it measures the field, not the
chip.

Shape of the suite:

```ts
import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const chipFailures = (theme: Theme) =>
  themeMetricFailures(theme).filter(
    ({ group, member }) => group === "dimensions" && member === "chipMinWidth",
  );

const bound = (theme: Theme): number =>
  2 * theme.spacing.sm +
  theme.spacing.xs +
  theme.typography.caption.fontSize +
  theme.dimensions.fieldAdornmentSize;
```

Cases:

1. Every shipped theme's `dimensions.chipMinWidth` is at least its own bound,
   `chipFailures` is `[]` for each, and the tightest shipped ratio is
   `80 / 44` (`toBeCloseTo(80 / 44, 4)`).
2. The planted theme `{ chipMinWidth: 10, fieldMinWidth: 100 }` returns exactly:

   ```ts
   [{ group: "dimensions", member: "chipMinWidth", rule: "at-least", actual: 10, bound: 44 }]
   ```

   and proves the field still passes (`themeMetricFailures` has no
   `fieldMinWidth` entry), so the test is the chip's and not plan 624's rule.
3. The bound reads the theme's own tokens: widen `spacing.sm` from 6 to 10 while
   keeping the spacing ladder valid (`{ xs: 4, sm: 10, md: 12, lg: 16, xl: 20,
   "2xl": 28, "3xl": 36, "4xl": 52, "5xl": 68 }`) and set `chipMinWidth: 50` and
   `fieldMinWidth: 100`: the bound is `20 + 4 + 12 + 16 = 52`, so the result is
   exactly `{ …, actual: 50, bound: 52 }`. At 52 it is `[]`.
4. `themeFailures` carries the same failure with `kind: "metric"` for the
   planted theme.
5. The shipped pair is the documented pair: `getTheme("light")` has
   `chipMinWidth: 80` and a 44px bound, and `chipFailures` is `[]`.

Use `expect(...).toEqual([])` / exact objects (not `toContainEqual`) where the
case claims `[]`.

## Commands, in order

Before the rule, prove the suite can fail:

```sh
cd packages/tokens
nub exec vitest run src/chip-chrome-fit.test.ts
```

Expected: case 2 fails with `expected [] to deeply equal [ … ]` and case 3
fails the same way; cases 1 and 4's metric half fail on the planted value. If
every case passes before the rule, the test is not reading the contract — STOP.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/chip-chrome-fit.test.ts src/field-chrome-fit.test.ts src/metrics.test.ts src/docs.test.ts src/figures.test.ts
nub run check-types
```

Expected: all green. The existing plan-384/624/634 cases keep their exact
failures (the field bound is untouched).

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

## STOP conditions

- `themeMetricFailures` no longer returns the planted `chipMinWidth: 10`
  failure after the rule: stop and report; the insertion point or the group name
  is wrong.
- Any shipped theme fails the new rule: stop. The shipped bound is 44 and every
  set ships 80; a failure means a shipped value moved, which this plan does not
  authorise.
- A plan-384/624/634 case changes its failure or bound: stop. The field rule is
  out of scope.
- `docs.test.ts` derives the dimension table's description text (rather than its
  value): adapt only the sentence the guard owns, and if it cannot be adapted
  without moving a figure, stop and report.
- The chip component no longer paints `spacing.sm`/`spacing.xs`/a 16px control:
  stop and re-measure before writing the bound; do not copy this plan's numbers
  blindly.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | Run the new suite before adding the `atLeast`: case 2 and case 3 receive `[]` for their planted chips, and the total-check case reports no `chipMinWidth` metric. |
| Passes with the fix | The same suite after the rule: exact `{ actual: 10, bound: 44 }` and `{ actual: 50, bound: 52 }`, shipped sets `[]` at 1.82× at the tightest. |
| Cannot pass by widening the shipped chip | No shipped value changes; the planted 10 stays 10 and the rule reads the theme's own spacing/type/adornment, so deleting the rule fails the suite again. |
| Cannot pass by editing the test only | The total-check case goes through `themeFailures`, and the shipped enumeration case is the same call the package's own guarantee uses. |

## Acceptance

- [x] `themeMetricFailures` reports a `chipMinWidth` below its own chrome, and
      the total check carries it as `kind: "metric"`.
- [x] The bound reads `spacing.sm`, `spacing.xs`, `typography.caption.fontSize`
      and `dimensions.fieldAdornmentSize` from the theme, not literals.
- [x] The chip is documented as an outer width in `scale.ts` and
      `docs/tokens.md`; the 44px bound and 1.82× ratio are stated.
- [x] No shipped colour, pair, floor, metric or theme value moves.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed in `.agents/slop/plans/README.md`; `TODO.md` row ticked.
