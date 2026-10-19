# 634 — The field's query row charges the icon it paints

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 384
(the content-box rule), 624 (`fieldMinWidth`'s query row), 632 (the date
trigger's disclosure icon) ·
**Number block:** 500–699 (`tokens-theme` overflow; 630 is in use by
`components`, 633 by `playground`, 631–632 by this workstream, so 634 is the
next free number in every worktree) ·
**Status:** planned

## 1. The defect

Plan 624 gave `fieldMinWidth` a second bound — the query row `SearchInput`
paints — and plan 384 made the chip fit the field's content box. The query-row
bound charges **two** `fieldAdornmentSize` glyphs:

```ts
// metrics.ts, as of plan 632
fieldMinWidth ≥
  Math.max(
    chipMinWidth + 2 * controlPaddingX.md + 2 * borderWidth.thin, // 102
    2 * spacing.md +                 // padding both sides
      2 * fieldAdornmentSize +       // the leading glyph AND the trailing action
      2 * spacing.md +               // the two gaps
      typography.body.fontSize,      // one query glyph
  );                                 // 78 at the shipped identity
```

`packages/components/src/search-input.tsx` paints its leading marker as an
**icon**, not an adornment box:

```tsx
<div style={{ display: "flex", flexDirection: "row", gap: theme.spacing.md,
              paddingLeft: theme.spacing.md, paddingRight: theme.spacing.md, … }}>
  <Icon name="search" color={…} size="md" />
  <input … />
  {/* clear control: width: 18, height: 18 */}
</div>
```

`packages/icons/src/sizes.ts` publishes `ICON_SIZES = iconSize`, so
`size="md"` resolves through `iconSize.md` — **16px** at the shipped identity,
the same value as `fieldAdornmentSize`, which is why the undercount is
invisible today. The **trailing** clear control is the adornment the token
names; the **leading** magnifier is the `md` icon tier.

### The probe

Lift the icon tier the leading glyph is painted with, keeping every other rule
coherent (`sm` stays inline-safe at 14 ≤ the `label` line 18; `md` 20 fits the
`sm` control's 26px content box and the 36px `lg` control; the ladder is
non-decreasing):

```ts
const lifted = extendTheme(getTheme("light"), {
  iconSize: { xs: 12, sm: 14, md: 20, lg: 24, xl: 28 },
  dimensions: { chipMinWidth: 10, fieldMinWidth: 81 },
});
```

`chipMinWidth: 10` keeps the chip bound at `10 + 20 + 2 = 32`, so only the
query row decides the result. The query row now needs
`8 + 20 + 8 + 14 + 8 + 16 + 8 = 82`, but the old rule still reads
`2 * 16 = 32` for the two glyphs and computes `78`. `themeMetricFailures(lifted)`
and `themeFailures(lifted)` both return **`[]`** while the magnifier has one
pixel less than the content box holds — the field clips or shoves its own
leading glyph, the same defect plan 632 fixed one tier over.

The shipped identity keeps `iconSize.md === fieldAdornmentSize === 16`, so the
bound is **78 before and after** and no shipped value, colour, pair, floor or
metric moves.

## 2. Decision

Charge the leading glyph at `iconSize.md` and the trailing action at
`fieldAdornmentSize`:

```ts
2 * spacing.md +
  iconSize.md +
  2 * spacing.md +
  typography.body.fontSize +
  dimensions.fieldAdornmentSize
```

Identity bound: `16 + 16 + 16 + 14 + 16 = 78`, unchanged.

Not changed:

- **the chip branch** — plan 384's content box is a different composition and
  its 102px bound is untouched.
- **`fieldAdornmentSize`** — it keeps its documented job: the clear control (or
  any adornment) inside a field, still the trailing term and still the
  `controlHeight.sm` fit rule.
- **one query glyph** — the query text is caller data; the bound keeps the one
  `body` glyph proxy plan 624 chose.
- **the date trigger** — plan 632 already charges `iconSize.sm` there.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | replace one `fieldAdornmentSize` term with `iconSize.md` in the `fieldMinWidth` bound; update the **dimensions** bullet of `themeMetricFailures`' JSDoc |
| `packages/tokens/src/field-chrome-fit.test.ts` | update the header and `chromeBound`; add the lifted-tier, corrected-bound and total-check cases |
| `docs/tokens.md` | the `fieldMinWidth` and `fieldAdornmentSize` table rows; the query-row expression in the metric prose |
| `packages/tokens/src/docs.test.ts` | the derived query-row expression in "states the field's own query-row bound" |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-634.md` | the audit note |

No other file. Do **not** edit `packages/components`, `packages/icons` or the
design system: `docs/design-system.md` only says the field minimum must not
shrink "below the query and the action its token documents" (line 786), which
stays true and quotes no number. The components' migration to
`theme.dimensions` remains a cross-team row (plan 353/601).

## 4. `packages/tokens/src/metrics.ts`

In the `fieldMinWidth` block (the `Math.max`'s second branch), replace

```ts
        2 * spacing.md +
          2 * dimensions.fieldAdornmentSize +
          2 * spacing.md +
          typography.body.fontSize,
```

with

```ts
        2 * spacing.md +
          iconSize.md +
          2 * spacing.md +
          typography.body.fontSize +
          dimensions.fieldAdornmentSize,
```

and extend the comment above the rule: the leading glyph is the `md` icon
`SearchInput` paints (plan 634), the trailing control is the adornment the token
names, and the shipped tiers are equal so the bound does not move.

In the `themeMetricFailures` JSDoc's **dimensions** bullet, replace

> a leading `fieldAdornmentSize` glyph

with

> a leading `md` icon

so the sentence reads "the field's `spacing.md` padding, a leading `md` icon,
the gap, one `body` query glyph, the same gap and the trailing
`fieldAdornmentSize` action".

No other sentence changes.

## 5. `packages/tokens/src/field-chrome-fit.test.ts`

Header comment: keep the plan-624 context and add the guarded defect — the
query row's leading marker is `<Icon size="md" />`, which resolves through
`iconSize.md`, while the rule charged `fieldAdornmentSize` for both glyphs, so a
theme that lifted the icon tier returned `[]` while the field clipped its own
magnifier.

`chromeBound` becomes:

```ts
const chromeBound = (theme: Theme): number =>
  2 * theme.spacing.md +
  theme.iconSize.md +
  2 * theme.spacing.md +
  theme.typography.body.fontSize +
  theme.dimensions.fieldAdornmentSize;
```

Keep the existing cases (their shipped figures and the 110px spacing case are
unchanged). Add:

1. **States the shipped tier equality.** `chromeBound(base)` is still `78`,
   `base.iconSize.md === base.dimensions.fieldAdornmentSize` (both 16), and
   `base.dimensions.fieldMinWidth` is 200. This case pins why the correction
   moves no shipped value; it passes before and after.
2. **Reads the icon tier the query row paints.** The lifted fixture from §1
   (`iconSize.md: 20`, `chipMinWidth: 10`, `fieldMinWidth: 81`) fails with
   `{ group: "dimensions", member: "fieldMinWidth", rule: "at-least",
   actual: 81, bound: 82 }`. On the pre-fix tree the bound is 78 and this case
   receives `[]` — it is the case that proves the fix.
3. **Accepts the corrected bound.** The same fixture at
   `fieldMinWidth: 82` returns `[]`, so case 2 is not passing on a broken
   fixture.
4. **Carries the failure through the total check.** Case 2's theme has a
   `kind: "metric"` entry with `member: "fieldMinWidth"` and `bound: 82` in
   `themeFailures`.

The existing "reads the theme's own padding" case still computes
`2 * 16 + 16 + 2 * 16 + 14 + 16 = 110` after `spacing.md` moves to 16, so its
`bound: 110` expectation does not change.

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/metrics.ts`),
   run `cd packages/tokens && nub x vitest run src/field-chrome-fit.test.ts`:
   the lifted-tier cases report `[]`/78 where they expect the 82 failure, and
   the total-check case finds no metric entry — four failures; the shipped and
   spacing cases pass.
2. With the fix: all cases pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green.

## 6. Documentation

### `docs/tokens.md`

- The `dimensions.fieldMinWidth` row (line ~1065): "narrowest field that shows a
  query and an action; holds its padding, the `md` leading icon, the query, the
  `fieldAdornmentSize` action and their two gaps, or a token-input chip".
- The `dimensions.fieldAdornmentSize` row (line ~1066): "trailing clear control
  (or other adornment) inside a field; the leading query icon is `iconSize.md`".
- The metric prose (line ~2427): the expression becomes
  `2 * spacing.md + iconSize.md + 2 * spacing.md +
  typography.body.fontSize + fieldAdornmentSize`, and the words become "its
  padding, the leading `md` icon, the gap, one query glyph, the same gap and the
  trailing `fieldAdornmentSize` action". The following sentence ("At the shipped
  metrics the query row needs 78px, the chip 102px …") does not move.

### `packages/tokens/src/docs.test.ts`

The `chrome` expression in "states the field's own query-row bound" becomes

```ts
const chrome =
  2 * spacing.md +
  iconSize.md +
  2 * spacing.md +
  typography.body.fontSize +
  dimensions.fieldAdornmentSize;
```

The derived sentence stays `… needs 78px …` because the shipped tiers are
equal. `iconSize` is already imported for the Toast bound.

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Charge the field's query row the icon it paints — `fieldMinWidth`
charged both glyphs of the query row as `fieldAdornmentSize`, but
`SearchInput` paints its leading magnifier as `<Icon size="md" />`, which
resolves through `iconSize.md`; a copied theme that lifted the icon tier to 20
returned `[]` while the query row needed 82 against the old 78, so the field
could clip its own leading glyph. The bound now reads `iconSize.md` for the lead
and `fieldAdornmentSize` for the trailing action, every shipped set passes (200
against 102) and no shipped value moves (plan 634)
```

Bump `272/345` → `273/346`, keeping the ten-cell bar at `[████████░░]`.

### `.agents/slop/plans/README.md`

Add the table row after 632 and a summary paragraph beside the other
`tokens-theme` summaries.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/field-chrome-fit.test.ts src/docs.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green; no new file.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails the corrected bound — an identity or platform
  `iconSize.md`, `fieldAdornmentSize` or `body` size disagrees with the
  arithmetic; that is a design decision;
- `SearchInput` no longer paints `<Icon size="md" />` (or paints a different
  tier) — re-read the evidence from the components worktree before changing the
  bound;
- the lifted fixture trips another rule (the inline-icon fit, a control fit or
  the icon ladder) — keep it coherent as in §1 so each case isolates the query
  row;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit;
- the shipped `200 / 102` figure disagrees with `figures.test.ts` — no document
  currently quotes the query-row ratio, so report rather than adding one.

## 9. Acceptance

- The query-row bound reads `iconSize.md` for the leading glyph and
  `fieldAdornmentSize` for the trailing action, both from the theme's own
  metrics.
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor, metric or shipped theme value moves.
- The new cases fail on the pre-fix tree (the 81px plant, the 82px acceptance
  and the total-check entry) and pass after it.
- The catalogue and JSDoc name the `md` leading icon; the plan, audit note and
  README index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
