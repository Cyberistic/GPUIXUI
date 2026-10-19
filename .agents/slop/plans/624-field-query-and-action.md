# 624 — The field minimum holds the query and the action it documents

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 384 (a
size that must fit must fit the content box), 523 (a control's horizontal
padding is a shape), 620 (the fixed surfaces hold their own chrome) ·
**Number block:** 500–699 (`tokens-theme` overflow; 624 is the next free number
in every worktree) ·
**Status:** done

## 1. The gap

`docs/tokens.md` documents `dimensions.fieldMinWidth` as *"narrowest field that
shows a query and an action"*, and the `TODO.md` migration row asks
`components` to read it as the field minimum. The metric contract governs it
in only one composition: the **chip** rule from plan 384, which requires
`fieldMinWidth >= chipMinWidth + 2 * controlPaddingX.md + 2 * borderWidth.thin`
(102px at the shipped identity).

Nothing measures the field's **own** query row. A search field paints a leading
glyph, the query and a trailing action, each separated by a gap and inset by
padding; a theme that lowers both the chip minimum and the field minimum clears
every rule today while the field cannot show the query and the action its own
documentation names.

Evidence (a probe run on this tree, 2026-10-19):

```ts
extendTheme(getTheme("light"), {
  dimensions: { chipMinWidth: 10, fieldMinWidth: 60 },
});
themeMetricFailures(/* the theme */); // []
```

A 60px field has a 42px content box (`60 - 2 * spacing.md - 2 *
borderWidth.thin`), and `SearchInput` paints 16 + 8 + 14 + 8 + 16 = 62px of
leading glyph, gap, query, gap and clear control inside it — the clear control
overlaps the query. `themeFailures` returns `[]`.

The failure mode is a **guarantee**, not a shipped composition: every shipped
set is 200px against the 102px chip bound, so no value moves. A brand that
copies a platform style and edits a compact field is exactly the
copy-and-own path the package promises to check.

## 2. Decision

Extend the **existing** `fieldMinWidth` rule from plan 384 to the larger of the
two compositions, so one member keeps one diagnostic:

```
chip   = chipMinWidth + 2 * controlPaddingX.md + 2 * borderWidth.thin
chrome = 2 * spacing.md + 2 * fieldAdornmentSize + 2 * spacing.md
         + body.fontSize
bound  = max(chip, chrome)
```

The chrome bound is the shipped `SearchInput` (`components/src/search-input.tsx`)
as it will paint after the recorded `fieldAdornmentSize` migration: `spacing.md`
padding on both sides, a leading adornment, a `spacing.md` gap, one `body` query
glyph, the same gap and the trailing action.

At the shipped identity: `chrome = 2*8 + 2*16 + 2*8 + 14 = 78`, `chip = 80 +
2*10 + 2*1 = 102`, so `bound = 102` and **no shipped or existing plan-384 test
changes**. A theme whose chip bound falls below 78 (a `chipMinWidth` under 56 at
the shipped padding and borders) is held to the field's own row instead.

Why merge instead of adding a second `at-least` rule on the same member: two
rules would report the same value twice when both fail, against the contract's
"one cause, one diagnostic" convention. Why not a new dimension member: the
field already owns `fieldMinWidth`, `fieldAdornmentSize` and `chipMinWidth`;
the composition is missing, not a token.

No colour, pair, floor, type, spacing, radius, density, elevation, motion,
border, icon or avatar value moves.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | replace the chip `atLeast` rule with the `max(chip, chrome)` rule and update the `dimensions` bullet in the `themeMetricFailures` JSDoc |
| `packages/tokens/src/field-chrome-fit.test.ts` | create |
| `packages/tokens/src/docs.test.ts` | add one guard for the catalogue's three figures |
| `docs/tokens.md` | the `fieldMinWidth` table cell and the chip paragraph in the metric section |
| `docs/design-system.md` | one clause in the metric paragraph (§9, around line 780) |
| `packages/tokens/README.md` | one clause in the metric paragraph ("Checking the numbers") |
| `COMPONENTS.md` | one clause in the `Theme metric check` row |
| `TODO.md` | add and tick the new row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. Do **not** edit `packages/components` in this worktree.

## 4. `packages/tokens/src/metrics.ts`

Find the rule that starts:

```ts
    // The chip sits inside the field's content box: the field's two borders
    // and its horizontal control padding are inside `fieldMinWidth`.
    ...atLeast(
      "dimensions",
      "fieldMinWidth",
      dimensions.fieldMinWidth,
      dimensions.chipMinWidth +
        2 * density.controlPaddingX.md +
        2 * borderWidth.thin,
    ),
```

Replace it with:

```ts
    // The field's content box holds one of the two compositions its minimum
    // width exists for: a token-input chip, or the query row `docs/tokens.md`
    // documents — a leading glyph, the query and a trailing action. The chip
    // needs the field's two borders and its horizontal control padding; the
    // query row paints the field's own `spacing.md` padding and two gaps
    // (`SearchInput`). The larger bound wins, so one value keeps one
    // diagnostic.
    ...atLeast(
      "dimensions",
      "fieldMinWidth",
      dimensions.fieldMinWidth,
      Math.max(
        dimensions.chipMinWidth +
          2 * density.controlPaddingX.md +
          2 * borderWidth.thin,
        2 * spacing.md +
          2 * dimensions.fieldAdornmentSize +
          2 * spacing.md +
          typography.body.fontSize,
      ),
    ),
```

Then update the `dimensions` bullet in the `themeMetricFailures` JSDoc (the
sentence that currently reads *"a chip fits in the field's content box — its
minimum width less the field's two borders and horizontal padding"*). It must
name both compositions:

> a chip fits in the field's content box — its minimum width less the field's
> two borders and horizontal padding — and the narrowest field also holds the
> query row it documents: the field's `spacing.md` padding, a leading
> `fieldAdornmentSize` glyph, the gap, one `body` query glyph, the same gap and
> the trailing action.

`at-least` and `within` already exist in `metricRules`; no index changes.

## 5. `packages/tokens/src/field-chrome-fit.test.ts`

Header comment: the guarded bug — `fieldMinWidth` was checked only against a
chip, so `chipMinWidth: 10` with `fieldMinWidth: 60` returned `[]` from
`themeFailures` while a `SearchInput` (padding, leading glyph, gap, query, gap,
clear control) could not show its query. Write the exact expression for the
shipped bound in the comment (78) and say plan 384's chip rule is unchanged
because 102 dominates at shipped metrics.

Cases:

1. **Every shipped set passes.** For each `shippedThemes` entry compute both
   bounds from that theme's own metrics and assert `fieldMinWidth` is at least
   the larger; collect `themeMetricFailures` and expect `[]`. Report the
   tightest ratio: `200 / 102 ≈ 1.96` for all 24 sets (they share the
   dimensions).
2. **States the shipped bound.** At `getTheme("light")`, the chrome bound is
   `78` (`2*8 + 2*16 + 2*8 + 14`), the chip bound is `102`, and the shipped
   `fieldMinWidth` is `200`.
3. **Reports a 60px field that clears the chip.** `extendTheme(getTheme("light"),
   { dimensions: { chipMinWidth: 10, fieldMinWidth: 60 } })` →
   `themeMetricFailures` equals exactly
   `[{ group: "dimensions", member: "fieldMinWidth", rule: "at-least",
   actual: 60, bound: 78 }]`. On the pre-fix tree the chip bound is 32, so the
   same theme returns `[]` — this is the both-directions case.
4. **Keeps plan 384's chip diagnostic.** `{ fieldMinWidth: 90, chipMinWidth: 80 }`
   still reports one failure with `bound: 102` — the larger bound must not
   change the case plan 384 shipped.
5. **Reads the theme's own spacing.** A theme with `chipMinWidth: 10`,
   `fieldMinWidth: 100` and `spacing: { md: 16, lg: 20, xl: 24, "2xl": 32,
   "3xl": 40, "4xl": 56, "5xl": 72 }` reports the field at `bound: 110`
   (`4*16 + 2*16 + 14`). This proves the rule is not a hardcoded 78. The
   spacing override keeps the ladder non-decreasing and moves no other
   dimension rule (the overlay and date bounds stay far below their values).
6. **Carries through the total check.** `themeFailures` on the case-3 theme
   contains a `kind: "metric"` entry with `member: "fieldMinWidth"` and
   `rule: "at-least"`.

Also add a case to `docs.test.ts`, beside *"states the fixed-surface chrome
fits"*, that builds the catalogue's figures from the implementation and
requires the sentence: `At the shipped metrics the query row needs 78px, the
chip 102px, and the shipped 200px field clears the larger`. Derive all three
from `spacing.md`, `dimensions.fieldAdornmentSize`, `typography.body.fontSize`,
`dimensions.chipMinWidth`, `defaultDensity.controlPaddingX.md`,
`borderWidth.thin` and `dimensions.fieldMinWidth` — never write a literal in
the assertion.

Use `extendTheme`, `getTheme` and `themeMetricFailures` from the package entry
in the test, as `fixed-surface-fit.test.ts` does.

### Proving both directions

1. Run `nub run --filter @gpuixui/tokens test` with the rule reverted to the
   pre-624 chip bound: case 3 must fail (`[]` observed, one failure expected)
   and case 5 must fail; cases 1, 2, 4 and 6 pass.
2. Restore the rule: all six pass.

Record the commands and the two outcomes in the commit message, not in the
test.

## 6. Documentation

### `docs/tokens.md`

- Table row: change the `dimensions.fieldMinWidth` Use cell to
  `narrowest field that shows a query and an action; holds its padding, a leading glyph, the query, the action and their two gaps, or a token-input chip`.
- In the metric section, after the chip sentence, add the query-row bound. The
  paragraph currently reads:

  > a chip must fit inside the field's content box — the minimum width less the
  > field's two borders and its `controlPaddingX.md` padding — because a chip
  > equal to the outer width has no room for the chrome painted inside it;

  Extend it with:

  > the same minimum also holds the query row the token documents — `2 *
  > spacing.md + 2 * fieldAdornmentSize + 2 * spacing.md + typography.body.fontSize`,
  > its padding, a leading glyph, the gap, one query glyph, the same gap and the
  > trailing action — and the larger of the two bounds is the rule, so lowering
  > `chipMinWidth` cannot free a field that can no longer show its own query
  > (plan `624`).

- State the shipped figures once: the chrome bound is 78 and the chip bound 102
  at the shipped metrics, and `fieldMinWidth` 200 clears the larger.

### `docs/design-system.md`

In §9's metric paragraph, after *"clip a type role's leading"*, add *"a field
minimum below the query and action it documents"*. Do not restate a number.

### `packages/tokens/README.md`

In "Checking the numbers", extend the clause that lists what the metric check
catches: after *"fit an icon, a field adornment or a chip into a content box
shorter or narrower than they are"*, add *"including the query row a field
minimum documents"*.

### `COMPONENTS.md`

`Theme metric check` row: after the fixed-surface sentence, add *"and the
narrowest field holds the query row its token documents — padding, a leading
glyph, the query, the trailing action and their gaps — or a token-input chip,
whichever is wider (plan 624)."*

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Hold the field minimum to the query row it documents — `fieldMinWidth`
was checked only against a chip, so a copied style with `chipMinWidth: 10` and
`fieldMinWidth: 60` returned `[]` while a search field's clear control
overlapped its query; the chip rule now takes the larger of the chip's content
box and the field's own padding, leading glyph, gap, query glyph, gap and
action, every shipped set still passes at the 102px chip bound and no value
moves (plan 624)
```

Bump the section count and bar by one (`266/339` → `267/340`).

### `.agents/slop/plans/README.md`

Add the table row after 623 and the summary paragraph before "How to use a
plan". Status `done` once the gates pass.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/field-chrome-fit.test.ts
   src/docs.test.ts` → all new cases pass.
3. `nub run --filter @gpuixui/tokens test` → every suite green; file count grows
   by one.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme fails the merged bound — the 78/102 figures are wrong for a
  platform's own spacing or type metrics, which is a design decision;
- the plan-384 case (`fieldMinWidth: 90`, `chipMinWidth: 80`) changes its
  reported bound from 102 — the merge is wrong;
- a case reports a second failure from another rule (for example a spacing
  ladder failure) — the fixture is wrong, not the rule;
- the chrome bound needs a literal instead of `spacing.md`, `fieldAdornmentSize`
  and `body.fontSize` — the component's paint must be re-checked before
  proceeding;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit.

## 9. Acceptance

- `fieldMinWidth` is held to the larger of the chip content box and the field's
  query row, both derived from the theme's own metrics.
- Every shipped identity theme, platform variant and recipe passes; no value
  moves, and plan 384's diagnostic is unchanged.
- The new test fails on the pre-fix tree (cases 3 and 5) and passes after it.
- The catalogue, design system, README and ledger name the invariant; the plan
  is indexed.
- `nub run check`, `nub run lint` and `nub run test` pass.
