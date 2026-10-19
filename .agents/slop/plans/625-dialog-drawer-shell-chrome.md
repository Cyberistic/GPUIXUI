# 625 — The dialog and drawer shells hold their close control

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 556
(dialog/calendar/mark dimensions), 598 (the notification panel), 620 (the fixed
surfaces hold their own chrome), 624 (the field's query row) ·
**Number block:** 500–699 (`tokens-theme` overflow; 625 is the next free number
in every worktree) ·
**Status:** done

## 1. The gap

Plan 620 held the fixed surfaces whose horizontal chrome never wraps — the
toast, the notification inbox and the overlay minimum — and deliberately left
the dialog and drawer ladders alone on the reasoning that *"a card and a dialog
are reflow containers, so one glyph is not the minimum"*.

That reasoning is true of the **title**, which wraps, and false of the
**padding and the close control**, which do not. A dialog's surface paints
`spacing["2xl"]` on both sides, reserves the same step again in its header for
the close button, and the button itself is a `sm` `IconButton`
(`controlHeight.sm`) placed at `spacing.lg` from the right edge. A drawer has
the identical header. A bottom drawer paints the same vertical chrome plus one
row of content. Below those bounds the shell is narrower (or shorter) than its
own always-painted close control, and nothing reports it:

```ts
extendTheme(getTheme("light"), {
  dimensions: {
    dialogWidthSm: 40, dialogWidthMd: 48, dialogWidthLg: 56,
    drawerWidthSm: 40, drawerWidthMd: 48, drawerWidthLg: 56,
    drawerHeightSm: 50, drawerHeightMd: 60, drawerHeightLg: 70,
  },
});
themeMetricFailures(/* the theme */); // [] on this tree
```

The ladders pass (each step grows) and every dimension is positive, so both
checks return `[]` while `DialogContent` paints a 28px close control and 24px
of padding into a 40px surface. The failure mode is the copy-and-own path: a
brand that compacts its dialogs is exactly the theme the package promises to
check.

A preview card is deliberately **not** in this plan. It has no close control,
paints no header reserve, and its only non-reflow chrome is its padding, which a
reflowing card can absorb; plan 620's exclusion stands for it.

## 2. Decision

Add three `at-least` rules to the `dimensions` group, each derived from the
theme's own spacing, control and type metrics:

1. **Dialog width, small (`dialogWidthSm`).** The surface paints `spacing["2xl"]`
   on both sides and the header reserves the same step on the right for the
   close control, then one `h3` title glyph:
   `3 * spacing["2xl"] + typography.h3.fontSize`. The larger sizes inherit the
   bound through the existing `sm` → `md` → `lg` ladder, so one rule covers the
   three.
2. **Drawer width, small (`drawerWidthSm`).** The same header and padding:
   `3 * spacing["2xl"] + typography.h3.fontSize`. The width ladder carries it to
   `md` and `lg`.
3. **Bottom-drawer height, small (`drawerHeightSm`).** The close control's zone
   from the top edge is `spacing.lg + controlHeight.sm` (wider than the padding
   at the shipped metrics), then one `density.rowHeight` row of content, then
   the bottom `spacing["2xl"]`:
   `Math.max(spacing["2xl"], spacing.lg + controlHeight.sm) +
   density.rowHeight + spacing["2xl"]`. The height ladder carries it to `md`
   and `lg`.

At the shipped identity: `88` for both widths (`3*24 + 16`) and `96` for the
height (`max(24, 12+28) + 32 + 24`). The shipped `360 / 320 / 240` clear them
at `4.09× / 3.64× / 2.50×`, so **no shipped value, colour, pair, floor or other
metric moves**. The `overlay`-style rule for a title that wraps is not added:
the bound is the shell's non-reflow chrome, not its content.

Why one rule per ladder's first step rather than one per member: the ladders
already require `sm < md < lg`, so a first step at or above the bound makes
every larger member pass; a second rule on `md`/`lg` would only repeat the same
diagnostic.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | add the three rules after the field rule, before the date-field rule |
| `packages/tokens/src/shell-chrome-fit.test.ts` | create |
| `packages/tokens/src/docs.test.ts` | add one guard for the catalogue's figures |
| `docs/tokens.md` | the five dimension table cells and the drawer/dialog paragraph |
| `docs/design-system.md` | one clause in §6 (component dimensions) and one in §9 (the metric paragraph) |
| `packages/tokens/README.md` | one clause in "Checking the numbers" |
| `COMPONENTS.md` | one clause in the `Theme metric check` row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. Do **not** edit `packages/components` in this worktree.

## 4. `packages/tokens/src/metrics.ts`

Insert after the `fieldMinWidth` rule and before the date-field rule:

```ts
    // A dialog's shell holds its own close control: `spacing["2xl"]` padding on
    // both sides, the same step reserved in the header for the control, and one
    // `h3` title glyph. The title wraps; the padding and the control do not, so
    // a narrower surface clips the chrome it always paints (plan 625).
    ...atLeast(
      "dimensions",
      "dialogWidthSm",
      dimensions.dialogWidthSm,
      3 * spacing["2xl"] + typography.h3.fontSize,
    ),
    // A drawer's header is the dialog's: same padding, same reserved step, same
    // `sm` close control and `h3` title. The width ladder carries the bound to
    // `md` and `lg`.
    ...atLeast(
      "dimensions",
      "drawerWidthSm",
      dimensions.drawerWidthSm,
      3 * spacing["2xl"] + typography.h3.fontSize,
    ),
    // A bottom drawer is a column: the close control's zone from the top edge
    // (`spacing.lg` plus the control, which is wider than the padding), one
    // `density.rowHeight` row and the bottom `spacing["2xl"]`. A shorter sheet
    // is only its chrome (plan 625).
    ...atLeast(
      "dimensions",
      "drawerHeightSm",
      dimensions.drawerHeightSm,
      Math.max(
        spacing["2xl"],
        spacing.lg + density.controlHeight.sm,
      ) +
        density.rowHeight +
        spacing["2xl"],
    ),
```

Guard each with `usableBound(...)` only if a zero first step would otherwise
report twice; the `positive` rule already owns zero and the `at-least` helper
stays silent for a non-finite bound, so no guard is needed. The `at-least` rule
already exists in `metricRules`.

Update the `dimensions` bullet in the `themeMetricFailures` JSDoc: after the
carousel sentence, add

> a dialog's and a drawer's smallest shell holds its padding, the header's
> reserved step for the close control and one `h3` title glyph, and a bottom
> drawer's smallest height holds the close zone, one row and its bottom padding,

and extend the shipped-figure clause with `88 / 88 / 96`.

## 5. `packages/tokens/src/shell-chrome-fit.test.ts`

Header comment: the guarded bug — plan 620 excluded the dialog and drawer as
reflow containers, but their padding and close control do not reflow, so a
copied style with `dialogWidthSm: 40`, `drawerWidthSm: 40` and
`drawerHeightSm: 50` returned `[]` from both checks. State the shipped bounds
(88 / 88 / 96) and that no shipped value moves.

Cases:

1. **Every shipped set passes.** For each `shippedThemes` entry compute the
   three bounds from that theme's own metrics, assert the member is at least
   its bound, and expect no `dimensions` failure. Report the tightest ratios:
   `360/88`, `320/88`, `240/96`.
2. **States the shipped bounds.** At `getTheme("light")`: the width bound is 88,
   the height bound 96, the shipped `dialogWidthSm`/`drawerWidthSm` 360/320 and
   `drawerHeightSm` 240.
3. **Reports a dialog narrower than its chrome.** Dialog widths `40/48/56`
   (still an increasing ladder) → exactly one
   `{group: "dimensions", member: "dialogWidthSm", rule: "at-least",
   actual: 40, bound: 88}`.
4. **Reports a drawer narrower than its chrome.** Drawer widths `40/48/56` →
   exactly one failure on `drawerWidthSm`, bound 88.
5. **Reports a bottom drawer shorter than its chrome.** Heights `50/60/70` →
   exactly one failure on `drawerHeightSm`, bound 96.
6. **Reads the theme's own metrics, not 88/96.** A theme with `spacing:
   { "2xl": 40, "3xl": 48, "4xl": 64, "5xl": 80 }` and dialog widths
   `120/160/200` reports `dialogWidthSm` at `bound: 136` (`3*40 + 16`); the
   drawer widths stay shipped. A second theme with the same spacing and drawer
   heights `100/110/120` reports `drawerHeightSm` at `bound: 112`
   (`max(40, 40) + 32 + 40`). Keep the other members shipped so each case has
   one diagnostic.
7. **Carries through the total check.** `themeFailures` on the case-3 theme has
   a `kind: "metric"` entry with `member: "dialogWidthSm"`.

Add a `docs.test.ts` case beside the field's figure guard that builds the
catalogue's sentence from `spacing["2xl"]`, `typography.h3.fontSize`,
`typography.h3.lineHeight`, `density.rowHeight`, `dimensions.dialogWidthSm`,
`dimensions.drawerWidthSm` and `dimensions.drawerHeightSm` and requires it.

### Proving both directions

1. Revert the three rules and run the suite: cases 3, 4, 5, 6 and 7 fail
   (`[]` observed); cases 1 and 2 pass.
2. Restore them: all cases pass.

Record both outcomes in the commit message.

## 6. Documentation

### `docs/tokens.md`

- Table rows:
  - `dialogWidthSm`: `small dialog's maximum surface width; holds its padding, the header's reserve for the close control and one h3 title glyph`.
  - `dialogWidthMd` / `dialogWidthLg`: append `; holds the same chrome as sm through the ladder`.
  - `drawerWidthSm`: `narrowest drawer; holds its padding, the header's reserve for the close control and one h3 title glyph`.
  - `drawerHeightSm`: `shortest bottom drawer; holds the close zone, one density.rowHeight row and its bottom padding`.
- In the paragraph that currently states *"A drawer's width and height are ladders"*,
  add the shell bounds and the figures:

  > A dialog's and a drawer's smallest shell hold their own close control — `3 *
  > spacing["2xl"] + typography.h3.fontSize`, the two paddings, the header's
  > reserved step for the control and one title glyph — and a bottom drawer's
  > smallest height holds `max(spacing["2xl"], spacing.lg + controlHeight.sm) +
  > density.rowHeight + spacing["2xl"]`: the close zone, one row and the bottom
  > padding. At the shipped metrics the widths need 88px and the height 96px,
  > and the shipped `360 / 320 / 240` clear them at `4.09× / 3.64× / 2.50×`; a
  > dialog's title still wraps, so this is the shell's non-reflow chrome, not a
  > minimum content width (plan `625`).

- Pair/role counts do not change.

### `docs/design-system.md`

- §6 dimensions: after the preview-card/drawer sentence, add *"a dialog's and a
  drawer's smallest shell hold the close control and one title glyph, and a
  bottom drawer's smallest height one row — the title wraps, the control does
  not."*
- §9 metric paragraph: add *"clip a dialog or drawer below its close control"*
  to the list of things `themeMetricFailures` catches.

### `packages/tokens/README.md`

In "Checking the numbers", after *"or choose a field minimum too small for the
query row it documents"*, add *"or a dialog or drawer narrower than its close
control"*.

### `COMPONENTS.md`

`Theme metric check` row: after the field sentence, add *"and the dialog and
drawer shells hold their padding, the header's reserve for the close control and
one title glyph (a bottom drawer one row too), because the title wraps and the
control does not; the shipped 360/320/240 clear them at 4.09×/3.64×/2.50×
(plan 625)."*

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Hold the dialog and drawer shells to their close control — plan 620 left
the two ladders alone as reflow containers, but their padding and close control
do not reflow, so a copied style with `dialogWidthSm: 40`, `drawerWidthSm: 40`
and `drawerHeightSm: 50` returned `[]` while the shell painted a 28px control
into a 40px surface; three `at-least` rules now read the theme's own spacing,
control and type metrics, every shipped set clears them (360/320/240 against
88/88/96) and no value moves (plan 625)
```

Bump the section count and bar by one (`267/340` → `268/341`).

### `.agents/slop/plans/README.md`

Add the table row after 624 and the summary paragraph before "How to use a
plan". Status `done` once the gates pass.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/shell-chrome-fit.test.ts
   src/docs.test.ts` → all new cases pass.
3. `nub run --filter @gpuixui/tokens test` → every suite green; file count grows
   by one.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme fails one of the three bounds — the 88/88/96 figures are
  wrong for a platform's own spacing or control metrics, which is a design
  decision;
- a narrowed-theme case reports a ladder failure from a sibling (for example a
  dialog `sm` that is no longer below `md`) — the fixture is wrong, not the
  rule;
- a case reports more than one `dimensions` failure — keep the other members
  shipped so each case isolates one rule;
- the bound needs a literal instead of `spacing`, `controlHeight.sm`,
  `density.rowHeight` and `h3` — the component's paint must be re-checked;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit.

## 9. Acceptance

- The three rules are in `themeMetricFailures`, each derived from the theme's
  own metrics; the ladders carry them to `md` and `lg`.
- Every shipped identity theme, platform variant and recipe passes; no value
  moves.
- The new test fails on the pre-fix tree (cases 3–7) and passes after it.
- The catalogue, design system, README and ledger name the invariants; the plan
  is indexed.
- `nub run check`, `nub run lint` and `nub run test` pass.
