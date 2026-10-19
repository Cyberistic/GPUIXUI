# 632 — The date field's disclosure glyph is the icon tier it paints

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 384
(the content-box rule), 556 (the date field), 601 (`dateFieldWidth`), 627
(the surface border), 631 (the Toast bound) ·
**Number block:** 500–699 (`tokens-theme` overflow; 630 is in use by
`components`, 631 by this workstream, so 632 is the next free number in every
worktree) ·
**Status:** done

## 1. The defect

Plan 601 gave `dateFieldWidth` its first bound and plan 627 added the trigger's
two borders. The bound still charges a **caption glyph** for the disclosure
marker:

```ts
// metrics.ts, as of plan 631
dateFieldWidth ≥
  3 * spacing.md +                 // padding both sides + the gap
  2 * borderWidth.thin +           // the trigger's two edges
  typography.label.fontSize +      // one value glyph
  typography.caption.fontSize      // the disclosure glyph
```

`packages/components/src/date-picker.tsx` `DatePickerTrigger` paints an icon,
not caption text:

```tsx
<PopoverTrigger … style={{ … gap: theme.spacing.md, width: 220, … }}>
  <text style={textStyle(theme, "label")}>{labelText}</text>
  <Icon name="chevron-down" color={…} size="sm" />
</PopoverTrigger>
```

`packages/icons/src/sizes.ts` publishes `ICON_SIZES = iconSize`, and the
`Icon` component resolves `size="sm"` through that table, so the marker is
`iconSize.sm` — **14px** at the shipped identity, four pixels wider than the
`caption` type (12px) the rule charges.

### The probe

At the shipped metrics the old bound is `24 + 2 + 13 + 12 = 51`. A copied theme
that keeps every other rule intact but leaves the date field at the old bound:

```ts
const tight = extendTheme(getTheme("light"), {
  dimensions: { dateFieldWidth: 52 },
});
```

`themeMetricFailures(tight)` and `themeFailures(tight)` both return **`[]`**
while the trigger needs `53`, so the disclosure chevron is painted outside the
field's content box. The shipped `220` hides the two-pixel gap at `4.31×` under
the old rule; the defect is in the guarantee an edited theme is told to rely on.

A second, coherent probe lifts the icon tier the trigger actually paints:

```ts
const lifted = extendTheme(getTheme("light"), {
  iconSize: { xs: 12, sm: 16, md: 18, lg: 22, xl: 26 },
});
```

It returns `[]` from every check with the shipped `dateFieldWidth: 220`, and a
copied `dateFieldWidth: 54` also returns `[]` while the trigger needs `55`.
`iconSize.sm` at 16 still fits its `label` line box (18), `iconSize.md` at 18
still fits the smallest control's content box (24 − 2), and the other fixed
surfaces only grow, so each case isolates the date rule.

The shipped identity (`220`) clears the corrected `53` at `4.15×`, so **no
colour, pair, floor, metric or shipped theme moves**. The date row in both
documents already says "disclosure glyph"; only the arithmetic and the words
that name its tier change.

## 2. Decision

Charge the theme's `sm` icon tier for the disclosure, not the caption type:

```ts
dateFieldWidth ≥
  3 * spacing.md +
  2 * borderWidth.thin +
  typography.label.fontSize +
  iconSize.sm
```

Identity bound: `24 + 2 + 13 + 14 = 53`.

Not changed:

- **`overlayWidth`** — plan 601 established that the calendar is a
  content-sized grid of seven `calendarCellSize` cells, not an overlay width.
- **one value glyph** — the date text wraps or truncates inside the flexible
  column; the marker and the insets do not reflow, so the bound keeps the same
  one-glyph proxy the Toast and overlay rows use.
- **the label's own content** — the placeholder and the formatted date are
  caller data, so the trigger width is a floor for its chrome, not a guarantee
  for the longest date a caller can hand it.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | replace the date bound's glyph term; update the **dimensions** bullet of `themeMetricFailures`' JSDoc |
| `packages/tokens/src/date-field-metrics.test.ts` | update the header and `contentBound`; add the pre-fix, lifted-tier and total-check cases |
| `docs/tokens.md` | the `dateFieldWidth` table row |
| `docs/design-system.md` | the date-trigger sentence in §6 |
| `packages/tokens/src/docs.test.ts` | the derived date-trigger sentence |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-632.md` | the audit note |

No other file. Do **not** edit `packages/components` or `packages/icons` in this
worktree; the component's migration to `theme.dimensions.dateFieldWidth` is
already a cross-team row (`TODO.md`, owner: `components`; plan 601).

## 4. `packages/tokens/src/metrics.ts`

Replace the date block's last term and its comment:

```ts
// A date trigger paints its value and the `sm` disclosure icon inside its own
// insets and gap; a field narrower than that chrome clips one of them. The
// marker is the icon tier `Icon size="sm"` resolves to, not the caption type
// (plan 632). A zero or non-finite width is its own rule's diagnostic.
...(usableBound(dimensions.dateFieldWidth)
  ? atLeast(
      "dimensions",
      "dateFieldWidth",
      dimensions.dateFieldWidth,
      3 * spacing.md +
        2 * borderWidth.thin +
        typography.label.fontSize +
        iconSize.sm,
    )
  : []),
```

In the `themeMetricFailures` JSDoc's **dimensions** bullet, replace

> a date trigger holds its own insets, its gap, one `label` glyph and its
> `caption` disclosure glyph,

with

> a date trigger holds its own insets, its gap, one `label` glyph and the `sm`
> disclosure icon it paints,

No other sentence changes.

## 5. `packages/tokens/src/date-field-metrics.test.ts`

Header comment: keep the plan-601 context and add the guarded defect — the
trigger paints `<Icon size="sm" />`, which resolves through `iconSize.sm`, while
the rule charged `caption.fontSize`, so a theme at the old 51px bound returned
`[]` while the trigger needed 53 and a lifted icon tier was not read.

`contentBound` becomes:

```ts
const contentBound = (theme: Theme): number =>
  3 * theme.spacing.md +
  2 * theme.borderWidth.thin +
  theme.typography.label.fontSize +
  theme.iconSize.sm;
```

Keep the existing five cases (they derive from `contentBound`; "ships the
trigger width" still asserts 220 and the 34 × 7 grid). Add:

1. **States the shipped disclosure tier.** `contentBound(lightTheme)` is
   exactly `53`; assert the components explicitly:
   `3 * spacing.md + 2 * borderWidth.thin + typography.label.fontSize +
   iconSize.sm` and that `iconSize.sm` (14) is not `typography.caption.fontSize`
   (12). This is the case that fails on the pre-fix tree with `51`.
2. **Reports the pre-fix width.** A theme with `dateFieldWidth: 52` fails with
   `{ group: "dimensions", member: "dateFieldWidth", rule: "at-least",
   actual: 52, bound: 53 }`. On the pre-fix tree this case returns `[]`.
3. **Reads the theme's own icon tier.** The coherent lifted fixture from §1
   (`iconSize.sm: 16`, `md: 18`, `lg: 22`, `xl: 26`) puts the bound at `55`:
   `dateFieldWidth: 54` fails with `bound: 55` and `55` passes. On the pre-fix
   tree the old bound is still `51`, so both pass and this case fails on its
   expectation.
4. **Carries through the total check.** Case 2's theme has a `kind: "metric"`
   entry with `member: "dateFieldWidth"` in `themeFailures`.

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/metrics.ts`),
   run the suite: the stated-bound case reports `51`, the 40px and 52px plants
   return `[]` against the helper's `53`, the lifted-tier case reports `51` and
   passes, and the total-check case finds no metric entry — five failures.
2. With the fix: all cases pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green.

## 6. Documentation

### `docs/tokens.md`

The `dimensions.dateFieldWidth` row:

> fixed date trigger width; holds its `spacing.md` insets, `spacing.md` gap, the
> `sm` disclosure icon and one `label` glyph inside its two borders

The prose sentence that currently reads "a fixed-width field, so
`dateFieldWidth` holds it rather than an overlay width" stays; add the tier it
charges only where the row names the members.

### `docs/design-system.md`

§6, the date-trigger sentence: replace "holds its insets, gap, disclosure glyph
and one `label` glyph" with "holds its insets, gap, `sm` disclosure icon and one
`label` glyph". The figures (`220`, `34 × 7 = 238`) do not move.

### `packages/tokens/src/docs.test.ts`

The "names the date field and does not call the calendar an overlay width" case
builds `designSystem` with the exact sentence; carry the same words and the
existing derived `dateFieldWidth`/`calendarCellSize` values.

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Charge the date trigger the icon it paints — `dateFieldWidth` was held to
its insets, gap, one `label` glyph and a `caption` disclosure glyph, but
`DatePickerTrigger` paints `<Icon size="sm" />`, which resolves to
`iconSize.sm`; a theme at the old 51px bound returned `[]` while the trigger
needed 53, and a lifted icon tier was never read. The bound now charges
`iconSize.sm`, every shipped set still passes (220 against 53) and no value
moves (plan 632)
```

Bump `271/344` → `272/345`, keeping the ten-cell bar at `[████████░░]`.

### `.agents/slop/plans/README.md`

Add the table row after 631 and a summary paragraph beside the other
`tokens-theme` summaries.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/date-field-metrics.test.ts src/docs.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green; no new file.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails the corrected bound — the identity or a platform
  spacing, border or icon tier disagrees with the arithmetic; that is a design
  decision;
- `DatePickerTrigger` no longer paints an `<Icon size="sm">` (or paints a
  different tier) — re-read the evidence from that worktree before changing the
  bound;
- the lifted-icon fixture trips another rule (an inline-icon fit, a control fit
  or a fixed surface) — keep it coherent as in §1 so each case isolates the
  date rule;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit;
- the shipped `220 / 53` figure disagrees with `figures.test.ts` — no document
  currently quotes the ratio, so report rather than adding one.

## 9. Acceptance

- The date bound charges `3 * spacing.md + 2 * borderWidth.thin +
  typography.label.fontSize + iconSize.sm`, all from the theme's own metrics.
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor, metric or shipped theme value moves.
- The new cases fail on the pre-fix tree (the stated 53, the 52px plant, the
  lifted 55 and the total-check entry) and pass after it.
- The catalogue, design system and JSDoc name the `sm` icon tier; the plan,
  audit note and README index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
