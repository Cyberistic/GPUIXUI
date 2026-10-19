# 631 — The Toast card holds its dismiss control

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 620 (the
fixed-surface bounds), 627 (the content-box rule), 629 (the inbox's own chrome) ·
**Number block:** 500–699 (`tokens-theme` overflow; 630 is in use by
`components`, so 631 is the next free number in every worktree) ·
**Status:** done

## 1. The defect

Plan 620 gave `toastWidth` its first bound, plan 627 added the card's two
borders, and plan 629 closed the same class of gap for the inbox's header. The
Toast's bound still counts only the **title row it starts with**:

```ts
// metrics.ts, as of plan 629
toastWidth ≥
  2 * spacing.lg +               // the card's padding
  iconSize.md +                  // the tone icon
  spacing.lg +                   // the gap beside it
  typography.bodyStrong.fontSize // one title glyph
  + 2 * borderWidth.thin
```

`packages/components/src/toast/viewport.tsx` paints one more control in that
row, unconditionally, after the title:

- the content row is `flexDirection: "row"`, `gap: theme.spacing.lg`,
  `padding: theme.spacing.lg`;
- the children are the `md` tone icon, the flexible title column, an
  **optional** action `Button size="sm"`, and an **always-painted**
  `IconButton label="Dismiss" size="sm"`;
- `packages/components/src/internal/button.tsx` gives `IconButton` a square box:
  `width: side, height: side` where `side = controlHeight(theme, size)`.

So the non-wrapping chrome is:

```
2 * spacing.lg            // card padding
+ iconSize.md             // tone icon
+ spacing.lg              // icon → title
+ bodyStrong.fontSize     // one title glyph (the title wraps)
+ spacing.lg              // title → dismiss
+ density.controlHeight.sm // the square dismiss control
+ 2 * borderWidth.thin    // the card's own edges
```

The 3px tone bar and the optional action stay outside the bound, exactly as
plans 620 and 627 decided: the bar has no token, and an action's label is
consumer content.

### The probe

At the shipped metrics the old bound is `24 + 16 + 12 + 14 + 2 = 68`. A theme
whose card keeps its title but loses its dismiss control passes every check:

```ts
const clipped = extendTheme(getTheme("light"), {
  dimensions: { toastWidth: 100 },
});
```

`themeMetricFailures(clipped)` and `themeFailures(clipped)` both return **`[]`**
while the card needs `108`, so the dismiss control is painted outside a card
with `overflow: "hidden"` — the user cannot close the toast.

A second, coherent probe lifts the `sm` control the dismiss is built from:

```ts
const lifted = extendTheme(getTheme("light"), {
  typography: { label: { lineHeight: 40 } },
  density: { controlHeight: { sm: 48, md: 52, lg: 56 }, rowHeight: 60 },
  dimensions: { toastWidth: 90, calendarCellSize: 48 },
});
```

It returns `[]` from every check while the card needs `128`. The old bound is
also exactly `68`: `67` fails and `68` passes today, which the new suite pins as
the pre-fix edge.

The shipped identity (`380`) clears the corrected `108` at `3.52×`, so **no
colour, pair, floor, metric or shipped theme moves**. The defect is in the
guarantee an edited theme is told to rely on.

## 2. Decision

Add the gap and the dismiss control to the Toast bound:

```ts
toastWidth ≥
  2 * spacing.lg +
  iconSize.md +
  spacing.lg +
  typography.bodyStrong.fontSize +
  spacing.lg +
  density.controlHeight.sm +
  2 * borderWidth.thin
```

Identity bound: `24 + 16 + 12 + 14 + 12 + 28 + 2 = 108`.

Not changed:

- **the 3px tone bar** — component chrome without a token, already excluded by
  plans 620 and 627; this plan does not invent a metric for it.
- **the optional action `Button`** — its label is caller content and it is
  absent by default, so it cannot be a fixed bound.
- **`notificationPanelWidth` and `overlayMinWidth`** — their rows hold all
  always-painted chrome (the unread dot; the leading icon and label) plus both
  borders.
- **the title's own length** — the title column is `flexGrow: 1, minWidth: 0`,
  so the card holds one glyph and lets the text wrap or truncate; this unit is
  about the control that does not reflow.

### The rule's one exactness check

Does the dismiss control paint after one `spacing.lg` gap? Yes: the content row
is a flex row with `gap: theme.spacing.lg`, and the icon, title column, optional
action and dismiss are its children. With no action, the title→dismiss gap is
one `spacing.lg`; the bound is therefore exact for the default toast (title and
description, no action).

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | replace the Toast bound; update the **dimensions** bullet of `themeMetricFailures`' JSDoc |
| `packages/tokens/src/toast-chrome-fit.test.ts` | create |
| `packages/tokens/src/fixed-surface-fit.test.ts` | `toastBound`, its two figures and the own-spacing case |
| `packages/tokens/src/surface-border-fit.test.ts` | `toastBound`, the `bordered` fixture, its two figures and the Toast plant |
| `packages/tokens/src/docs.test.ts` | the derived fixed-surface sentence's `toastBound` |
| `docs/tokens.md` | the `toastWidth` table row and the fixed-surface paragraph |
| `docs/design-system.md` | the fixed-surface sentence in §6 |
| `COMPONENTS.md` | the Toast clause and the `68 / 5.59×` figures in the `Theme metric check` row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-631.md` | the audit note |

No other file. Do **not** edit `packages/components` in this worktree; the
consumer's migration to `theme.dimensions` is already a cross-team row.

## 4. `packages/tokens/src/metrics.ts`

Replace the Toast rule (the comment and block beginning *"A Toast's fixed card
holds its own chrome"*) with:

```ts
// A Toast's fixed card holds its own chrome: the content row is `spacing.lg`
// padding on both sides, the `md` tone icon, the `lg` gap beside it, one
// `bodyStrong` title glyph, the `lg` gap after the title and the square `sm`
// dismiss control (`IconButton` is `controlHeight.sm` wide), inside the card's
// two `borderWidth.thin` edges (plans 627 and 631). The 3px tone bar is
// consumer chrome, not a metric, so the bound leaves it out; the action is
// optional and label-sized, so it is content, not chrome. A zero or non-finite
// width is the sign rule's diagnostic, so the fit waits for a usable value.
...(usableBound(dimensions.toastWidth)
  ? atLeast(
      "dimensions",
      "toastWidth",
      dimensions.toastWidth,
      2 * spacing.lg +
        iconSize.md +
        spacing.lg +
        typography.bodyStrong.fontSize +
        spacing.lg +
        density.controlHeight.sm +
        2 * borderWidth.thin,
    )
  : []),
```

Update the `themeMetricFailures` JSDoc's **dimensions** bullet: after the
existing Toast sentence add "**and the dismiss control it always paints** — the
`lg` gap after the title and a square `sm` control — because the title column
flexes while the control does not (plan 631)." Adjust the quoted figure
`68` → `108` and `5.59×` → `3.52×`.

## 5. `packages/tokens/src/toast-chrome-fit.test.ts`

Header comment: the guarded defect — plan 620 bounded the Toast card by its
padding, tone icon, one gap and one title glyph, and plan 627 added the card's
two borders, but `toast/viewport.tsx` also paints an unconditional `sm`
`IconButton` after a `spacing.lg` gap, so `toastWidth: 100` returned `[]` from
every check while the card needed 108 and its `overflow: "hidden"` clipped the
dismiss control. State that no shipped value moves.

Cases:

1. **Every shipped set passes.** `shippedThemes.forEach` →
   `themeMetricFailures(theme)` is `[]`, and `toastWidth` is at least the
   derived bound; the tightest shipped clearance is `380 / 108`.
2. **States the shipped bound.** `toastBound(getTheme("light"))` is exactly
   `108`; the shipped identity is `380`, and the chrome is
   `24 + 16 + 12 + 14 + 12 + 28 + 2`.
3. **Reports the pre-fix width.** A theme with `toastWidth: 100` fails with
   `{ member: "toastWidth", rule: "at-least", actual: 100, bound: 108 }`. This
   is the case that fails on the pre-fix tree with `[]`.
4. **The bound is a minimum, not a maximum.** `108` passes; `107` fails at the
   same bound.
5. **The dismiss control sets the width.** The coherent lifted theme from §1
   (`toastWidth: 90`) reports `bound: 128`; `128` passes and `127` fails.
6. **Reads the theme's own gap.** Lifting `spacing.lg` to `24` (keeping the
   ladder above it) raises the bound to `156`; a `toastWidth: 155` theme fails
   at `156` and `156` passes.
7. **Carries through the total check.** Case 3's theme has a `kind: "metric"`
   entry with `member: "toastWidth"` in `themeFailures`.

The helper:

```ts
const toastBound = (theme: Theme): number =>
  2 * theme.spacing.lg +
  theme.iconSize.md +
  theme.spacing.lg +
  theme.typography.bodyStrong.fontSize +
  theme.spacing.lg +
  theme.density.controlHeight.sm +
  2 * theme.borderWidth.thin;
```

### Proving both directions

1. On the pre-fix tree (`git stash push -- packages/tokens/src/metrics.ts`), run
   the new suite: cases 3–7 fail (each returns `[]` or the old `68`/`104`
   bound); cases 1 and 2 fail only on the stated bound.
2. With the fix: all seven pass.
3. `nub run --filter @gpuixui/tokens test` → all suites green; one more file.

## 6. Existing suites

### `fixed-surface-fit.test.ts`

- `toastBound` gains `+ theme.spacing.lg + theme.density.controlHeight.sm`
  before the borders.
- Its `tightest.toast` expectation becomes `380 / 108` (drop the old `5.59`).
- "states the shipped bounds": `toastBound(base)` → `108`.
- "reports a toast narrower than its chrome": `actual: 40`, `bound: 108`.
- "reads the theme's own spacing": `roomy` becomes `toastWidth: 120` (passes
  `108`); tightening `lg` to 24 raises the bound to `156`, so `120` fails at
  `156`.
- "carries the failures through the total check" keeps `toastWidth: 40`; the
  bound it carries is not asserted, so no change.

### `surface-border-fit.test.ts`

- `toastBound` gains the same two terms.
- The `bordered` fixture gains `toastWidth: 160`, because with
  `borderWidth.thin: 12`, `controlHeight.sm: 48` and `spacing.lg: 12` its bound
  is `24 + 16 + 12 + 14 + 12 + 48 + 24 = 150`; the fixture must clear it so each
  case isolates one rule.
- The shipped clearance becomes `380 / 108`.
- "states the shipped identity bounds": `toastBound(base)` → `108`.
- "reports a Toast narrower than its chrome plus borders": `bordered({ toastWidth: 80 })`
  now reports `actual: 80, bound: 150`.

### `docs.test.ts`

The "states the fixed-surface chrome fits" case's local `toastBound` gains
`+ spacing.lg + defaultDensity.controlHeight.sm` before the borders; its derived
sentence then prints `3.52×` for the toast. No sentence text needs hand-editing
in the test.

## 7. Documentation

### `docs/tokens.md`

- `dimensions.toastWidth` row:
  *"fixed toast card width; holds its padding, tone icon, two `lg` gaps, the
  square `sm` dismiss control and one `bodyStrong` title inside its two
  borders"*.
- In the "Three fixed surfaces hold the chrome painted inside them" paragraph,
  replace the Toast formula and explanation:

  > A toast card is `2 * spacing.lg + iconSize.md + spacing.lg +
  > typography.bodyStrong.fontSize + spacing.lg + density.controlHeight.sm +
  > 2 * borderWidth.thin` at least — its padding, tone icon, the gap beside it,
  > one title glyph, the gap after the title and the square `sm` dismiss
  > control, with the 3px tone bar and the optional action left to consumer
  > chrome, inside the card's two borders.

  and change the shipped headroom sentence to
  `380 / 320 / 180` clear the three by `3.52× / 6.15× / 3.27×` (plans `620`,
  `627` and `631`).

### `docs/design-system.md`

§6, the fixed-surface sentence: name the toast's dismiss control, e.g. "a Toast
card additionally holds its square `sm` dismiss control after a `spacing.lg`
gap, because the title column flexes and the control does not."

### `COMPONENTS.md`

`Theme metric check` row:

- "the shipped 380/320/180 clear the 68/52/55 bounds at 5.59×/6.15×/3.27×" →
  "the shipped 380/320/180 clear the 108/52/55 bounds at 3.52×/6.15×/3.27×".
- The clause "a 20px toast card narrower than its own chrome" gains "the toast
  card counts the square `sm` dismiss control it always paints (plan 631)".

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Hold the Toast's dismiss control inside its card — the card bound counted
its padding, tone icon, one gap and one title glyph, but `toast/viewport.tsx`
always paints a square `sm` `IconButton` after another `spacing.lg` gap, so a
theme with `toastWidth: 100` returned `[]` while the card needed 108 and
`overflow: "hidden"` clipped the control; the bound now counts the gap and the
dismiss control, every shipped set still passes (380 against 108) and no value
moves (plan 631)
```

Bump `270/343` → `271/344`, keeping the ten-cell bar at `[████████░░]`.

### `.agents/slop/plans/README.md`

Add the table row after 629 and a summary paragraph beside the other
`tokens-theme` summaries.

## 8. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/toast-chrome-fit.test.ts src/fixed-surface-fit.test.ts src/surface-border-fit.test.ts src/docs.test.ts`
   → every case passes.
3. `nub run --filter @gpuixui/tokens test` → all suites green; file count grows
   by one.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 9. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails the new bound — the identity or a platform spacing,
  density or border disagrees with the arithmetic; that is a design decision;
- `toast/viewport.tsx` has changed shape (no unconditional dismiss `IconButton`,
  a different gap, or a non-square control) — re-read the evidence from that
  worktree before changing the bound;
- a plant reports more than one `dimensions` failure — keep the lifted fixture
  coherent (`label.lineHeight`, all three control heights, `rowHeight`,
  `calendarCellSize`) so each case isolates one rule;
- the derived docs sentence cannot be built from the shipped metrics — the
  document's wording and the rule have drifted, so report instead of guessing;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit.

## 10. Acceptance

- The Toast bound counts the padding, tone icon, both gaps, the title glyph, the
  square `sm` dismiss control and the card's two borders, all from the theme's
  own metrics.
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor, metric or shipped theme value moves.
- The new suite fails on the pre-fix tree (cases 3–7) and passes after it.
- The catalogue, design system, README and ledger name the invariant and the
  figures; the plan, audit note and README index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
