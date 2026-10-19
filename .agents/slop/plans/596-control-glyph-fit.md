# 596 — The matching icon must fit its control

**Phase:** F (contract completeness)
**Depends on:** 358 (the numeric contract), 372 (named sizes), 384 (content-box
fit), 517 (a fixed surface holds its paint), 521 (the inline icon's line box),
552 (the ladders walk the theme's own scale)
**Owner:** `tokens-theme`
**Paths:** `packages/tokens/src/metrics.ts`,
`packages/tokens/src/control-glyph-fit.test.ts` (new), `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md`, `.agents/slop/plans/README.md`

## Why

A control paints the icon tier that matches its own size, and the two values are
read from the theme directly:

- `packages/primitives/src/components/IconButton.tsx` maps
  `ICON_SIZE: { sm: "sm", md: "md", lg: "lg" }`, so an `IconButton size="lg"`
  paints `iconSize.lg` inside `density.controlHeight.lg`.
- `packages/primitives/src/core/style.ts` `sliderThumbStyle` sizes the thumb
  `theme.iconSize[spec.size]`, and `sliderTrackStyle` fixes the track's height
  at `theme.density.controlHeight[spec.size]`, so a thumb taller than the track
  is painted outside the control.

`themeMetricFailures` holds only the *default* glyph against the *smallest*
control (plan 384):

```ts
...atLeast(
  "density",
  "controlHeight.sm",
  density.controlHeight.sm,
  iconSize.md + 2 * borderWidth.thin,
),
```

That rule cannot see the largest pair. `iconSize.md` is bounded by the small
control, and the control ladder forces `md` and `lg` heights above `sm`, so a
large control still has room for the *default* glyph — but nothing bounds
`controlHeight.lg` against `iconSize.lg`, or `controlHeight.md` against
`iconSize.md`.

A probe on the shipped identity theme:

```ts
const plant = extendTheme(getTheme("light"), {
  iconSize: { lg: 48, xl: 48 },
});
themeFailures(plant); // []
```

The `lg` icon ladder (`12, 14, 16, 48, 48`) is non-decreasing, the two inline
tiers still fit their lines, and every other group is untouched, so all nine
checks return `[]` while every `IconButton size="lg"` paints a 48px glyph in a
36px control (34px content box) and every large slider paints a 48px thumb in a
36px track.

A second probe over the shipped sets reads every matching pair:

| density preset | `controlHeight` sm/md/lg | `iconSize` sm/md/lg | smallest margin |
| -------------- | ------------------------ | ------------------- | --------------- |
| compact | 24 / 28 / 32 | 14 / 16 / 20 | 8px |
| comfortable | 28 / 32 / 36 | 14 / 16 / 20 | 10px |
| spacious | 32 / 36 / 40 | 14 / 16 / 20 | 12px |

Every shipped platform style and recipe inherits one of those presets and the
identity icon ladder (a `PlatformStyle` that names neither), so the missing
rule is a contract hole, not a palette or preset defect: no shipped value moves.

## What to change

### 1. `packages/tokens/src/metrics.ts`

Add the matching-tier rule after the existing `iconSize.md` rule and before the
field-adornment rule, so the plan-384 case keeps reporting one failure:

```ts
// A control paints the icon tier that matches its size: `IconButton` maps
// `sm`/`md`/`lg` to the same `iconSize` tier, and a slider's thumb is
// `iconSize[size]` tall inside a `controlHeight[size]` track. The default
// glyph against the smallest control is the rule above; this is each size's
// own box. The control's two borders are painted inside its height.
...controlSizes.flatMap((size) =>
  atLeast(
    "density",
    `controlHeight.${size}`,
    density.controlHeight[size],
    iconSize[size] + 2 * borderWidth.thin,
  ),
),
```

`controlSizes` is already imported in this module (used by the padding rules).
No other rule changes: `atLeast` skips a non-finite bound, so one broken icon
tier keeps its `finite`/`positive` diagnostic instead of blaming the control.
A size whose control height is non-finite also keeps its `finite` diagnostic.

### 2. `packages/tokens/src/control-glyph-fit.test.ts` (new)

State the bug in the header: `IconButton size="lg"` paints `iconSize.lg` in
`controlHeight.lg` and a slider's thumb is `iconSize[size]` in the same control's
track, but only `controlHeight.sm` was measured against the default
`iconSize.md`, so a theme with a 48px large icon and a 36px large control passed
all nine checks while the glyph overflowed its box.

Cases:

1. **The regression is reported.** Build
   `extendTheme(lightTheme, { iconSize: { lg: 48, xl: 48 } })` and assert
   `themeMetricFailures(plant)` equals exactly:
   `[{ group: "density", member: "controlHeight.lg", rule: "at-least",
   actual: lightTheme.density.controlHeight.lg, bound: 50 }]`.
   This fails before the change (the checker returns `[]`) and is the defect in
   the test's own terms. `actual` is read from the base theme, not retyped.
2. **The default-glyph rule is unchanged.** Rebuild plan 384's plant —
   `density: { controlHeight: { sm: 24 } }` and
   `iconSize: { md: 23, lg: 24, xl: 25 }` — and assert the single plan-384
   failure (`controlHeight.sm`, actual 24, bound 25). This proves the new loop
   does not double-report the smallest control: its own matching tier
   (`iconSize.sm` 14 + 2) still fits.
3. **A lowered large control is reported by the fit rule, not only the ladder.**
   Set `density: { controlHeight: { lg: 24 } }` and
   `iconSize: { lg: 24, xl: 24 }` and assert the result
   `toContainEqual({ group: "density", member: "controlHeight.lg",
   rule: "at-least", actual: 24, bound: 26 })`. The control ladder also reports
   this plant, so this case uses `toContainEqual`, not a length assertion; it
   fails before the change because the fit failure is absent.
4. **Every shipped set fits every matching tier.** For every `shippedThemes`
   entry and every `controlSizes` member, assert
   `controlHeight[size] >= iconSize[size] + 2 * borderWidth.thin`, labelled with
   `theme.name`, and assert `themeMetricFailures(theme)` is `[]`. A future
   preset or platform style that raises an icon tier without its control fails
   here with the set's name.

### 3. `docs/tokens.md`

In the metric-rules paragraph (around "the smallest control must fit one
`label` line…"), extend the glyph clause: the default `iconSize.md` fits the
smallest control, **and each control size's matching icon tier must fit its own
content box**, because `IconButton` paints `iconSize[size]` and a slider's thumb
is that tall inside `controlHeight[size]`; a 48px large glyph in a 36px large
control returned `[]` from all nine checks while it overflowed. State that every
shipped pair keeps 8px or more and no value moves. Do not add a count that the
documents derive elsewhere.

### 4. `docs/design-system.md`

In §9's numeric paragraph, add the matching-tier clause to the sentence that
names the smallest control, inline icon and inline avatar. Keep the rest of the
paragraph; no floor, pair or value changes.

### 5. `packages/tokens/README.md`

In *Checking the numbers*, extend the "fit an icon, a field adornment or a chip
into a content box…" clause to name the matching size pair
(`controlHeight[size]` against `iconSize[size]`), so a copied theme that raises
only a large icon is described as caught. Keep the surrounding prose.

### 6. `COMPONENTS.md`

In the **Theme metric check** row, after the plan-384 sentence about the default
icon and field adornment fitting the smallest control's content box, add: each
control size's matching icon tier is held to its own content box as well, because
`IconButton` paints `iconSize[size]` inside `controlHeight[size]` and a slider's
thumb is `iconSize[size]` tall in that track; a 48px large icon on a 36px large
control returned `[]` while the glyph overflowed. Name plan `596`. Do not change
the row's group/rule indexes or any count.

### 7. `TODO.md`

Add one ticked row at the end of the design-tokens section and advance the
progress numerator by one:

> `[x]` Hold each control to the icon tier that matches its size — `IconButton`
> paints `iconSize[size]` in `controlHeight[size]` and a slider's thumb is that
> tall in the same track, but only `controlHeight.sm` was measured against the
> default `iconSize.md`, so `iconSize.lg: 48` returned `[]` from all nine checks
> while a large glyph overflowed its control; every size is now held to its own
> content box, every shipped pair keeps at least 8px and no value moves
> (plan 596).

### 8. `.agents/slop/plans/README.md`

Add the row after 595 with status `done` and a narrative paragraph naming the
`IconButton`/slider composition, the 48px plant and the fact that no shipped
value moves.

## Commands and expected results

1. `nub run --filter @gpuixui/tokens test -- src/control-glyph-fit.test.ts`
   - Before the `metrics.ts` change: cases 1 and 3 fail (the checker returns
     `[]`); cases 2 and 4 pass.
   - After: all four pass.
2. `nub run --filter @gpuixui/tokens check-types` → exit 0.
3. `nub run --filter @gpuixui/tokens test` → green (152 files become 153; five
   thousand nine hundred and sixty-six tests become five thousand nine hundred
   and seventy).
4. `nub run check` → exit 0.
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

Both directions: remove the new `controlSizes.flatMap` block and cases 1 and 3
fail; restore it and every case passes, every shipped ratio is above its bound
and no token value changes.

## STOP conditions

- Any shipped set fails the new rule — stop and report the set and both values;
  do not lower the bound or edit a shipped preset or platform style.
- The plan-384 case (case 2) gains a second failure — the new loop is comparing
  a pair the existing rule already owns; check that the bound is
  `iconSize[size] + 2 * borderWidth.thin`, not `iconSize.md` for every size.
- The plant reports more than the `controlHeight.lg` failure — the icon ladder
  or inline rules are also broken by the plant; adjust the plant (keep
  `iconSize.xl` equal to `lg`) rather than weakening the assertion.
- `metricMembers.density` has to change — it must not: the new rule reads
  existing `controlHeight`/`iconSize` members, it adds no member.

## Acceptance

- `themeMetricFailures(extendTheme(getTheme("light"), { iconSize: { lg: 48,
  xl: 48 } }))` reports `controlHeight.lg` at least `50`, where it returned
  `[]` before.
- Every shipped theme, platform variant and recipe still reports `[]`; every
  matching pair keeps at least 8px of content.
- The reference, design system, README and ledger name the matching-tier rule;
  the plan is indexed and the task is ticked.
- `nub run check`, `nub run lint` and `nub run test` pass.

## Outcome

Landed on `agent/tokens-theme`. `themeMetricFailures` now holds every control
size's matching icon tier to that control's content box
(`controlHeight[size] ≥ iconSize[size] + 2 * borderWidth.thin`). The plant —
identity light with `iconSize: { lg: 48, xl: 48 }` — is reported as a
`density`/`controlHeight.lg` failure at `at-least` 50 where all nine checks
returned `[]` while a 48px glyph painted in a 36px large `IconButton` and a
slider thumb outgrew its track. The plan-384 default-glyph rule still reports its
single `controlHeight.sm` failure; the new loop adds no duplicate. Every shipped
set already keeps at least 8px of content (compact) and 10px in the identity
comfortable preset, so no token value moves and no colour, pair, floor or
existing metric moves.

Both directions were verified: before the rule, cases 1 and 3 of
`control-glyph-fit.test.ts` failed (the checker returned `[]` and the ladder was
the only diagnostic); after it, all four cases pass. The suite grows by four
cases (153 files, 5,970 tests). `nub run check`, `nub run lint` and
`nub run test` pass.
