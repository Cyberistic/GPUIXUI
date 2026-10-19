# 627 — The fixed surfaces fit their own border

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 384 (a
size that must fit must fit the content box), 598 (the notification panel), 620
(the toast, inbox and overlay bounds), 625 (the dialog and drawer shells) ·
**Number block:** 500–699 (`tokens-theme` overflow; 627 is the next free number
in every worktree) ·
**Status:** done

## 1. The gap

Plan 384 established the rule this workstream has applied ever since: **a size
that must hold content must be compared with the container's content box, not
its outer metric.** The control, field, keycap and date-trigger rules subtract
`2 * borderWidth.thin` for exactly that reason.

Every fixed surface bound that landed later compares the outer surface:

```ts
// metrics.ts, as of plan 625
overlayMinWidth       ≥ 2*spacing.md + iconSize.md + spacing.md + label.fontSize
toastWidth            ≥ 2*spacing.lg + iconSize.md + spacing.lg + bodyStrong.fontSize
notificationPanelWidth≥ 2*spacing.lg + notificationUnreadDotSize + spacing.sm + bodyStrong.fontSize
dialogWidthSm         ≥ 3*spacing["2xl"] + h3.fontSize
drawerWidthSm         ≥ 3*spacing["2xl"] + h3.fontSize
drawerHeightSm        ≥ max(spacing["2xl"], spacing.lg + controlHeight.sm) + rowHeight + spacing["2xl"]
notificationPanelMaxHeight ≥ notificationListMaxHeight
```

Each of those surfaces paints `borderWidth: theme.borderWidth.thin` **inside its
own width/height**:

- `packages/components/src/dialog.tsx` — the face at line 188;
- `packages/components/src/drawer.tsx` — the sheet at line 195;
- `packages/components/src/toast/viewport.tsx` — the card at line 132;
- `packages/components/src/notification-centre.tsx` — the inbox at line 357;
- `packages/components/src/menu/surface.tsx` — the menu surface at line 61.

So the content box is `bound - 2 * borderWidth.thin`, and a theme whose border is
thicker than the slack between the bound and the chrome clips the close control,
the title, the toast's tone icon or the inbox's unread dot while
`themeMetricFailures` returns `[]`.

The measured probe (`extendTheme(getTheme("light"), …)` with a coherent lifted
density so the other rules pass):

| Member | Value | Current bound | Content box | Chrome it paints |
| ------ | ----- | ------------- | ----------- | ---------------- |
| `dialogWidthSm` | 88 | 88 | 64 | 72 (`3*24 + 16`) |
| `drawerWidthSm` | 88 | 88 | 64 | 72 |
| `drawerHeightSm` | 140 | 140 | 116 | 140 (`max(24, 12+48) + 56 + 24`) |
| `toastWidth` | 80 | 66 | 56 | 66 (`24+16+12+14`) |

with `borderWidth.thin: 12`, `controlHeight` 48/52/56, `rowHeight: 56`,
`keycapSize: 40`, `calendarCellSize: 48`, `timelineMarkerSize: 12`. The probe
returns **`[]`** from `themeMetricFailures` and `themeFailures`.

The same arithmetic applies at the shipped 1px border with no practical loss, so
**no shipped value, colour, pair or floor moves**; the defect is in the guarantee
a brand is told to rely on. It is the plan-384 bug one year of surface work later,
and it includes the dialog/drawer rule plan 625 landed without it.

## 2. Decision

Add the surface's own two borders to every fixed-surface fit bound:

```
overlayMinWidth            ≥ <row chrome>       + 2 * borderWidth.thin
toastWidth                 ≥ <card chrome>      + 2 * borderWidth.thin
notificationPanelWidth     ≥ <row chrome>       + 2 * borderWidth.thin
dialogWidthSm              ≥ <shell chrome>     + 2 * borderWidth.thin
drawerWidthSm              ≥ <shell chrome>     + 2 * borderWidth.thin
drawerHeightSm             ≥ <close zone> + rowHeight + spacing["2xl"] + 2 * borderWidth.thin
notificationPanelMaxHeight ≥ notificationListMaxHeight + 2 * borderWidth.thin
```

The same `2 * borderWidth.thin` is added to the dialog and drawer width rules
plan 625 shipped. The first step of each ladder carries the larger sizes through
the existing `increasing` rule, because the border is the same for every member.

Not changed:

- **`keycapSize`, `fieldMinWidth`, `dateFieldWidth`** — they already include their
  two borders (plans 517, 384 and 556).
- **`overlayMaxHeight`, `chatViewportMinHeight`** — they name a scroll viewport
  inside the surface, not the surface's own height.
- **`carouselIndicator*`, `avatarPresenceDotSize`** — marks, not bordered boxes.
- **the Toast's 3px tone bar** — component chrome with no token, already excluded
  by plan 620; this plan does not invent a metric for it.

At the shipped identity (`borderWidth.thin: 1`), the bounds move:

| Member | Bound before | Bound after | Shipped | Clearance |
| ------ | ------------ | ----------- | ------- | --------- |
| `overlayMinWidth` | 53 | **55** | 180 | 3.27× |
| `toastWidth` | 66 | **68** | 380 | 5.59× |
| `notificationPanelWidth` | 50 | **52** | 320 | 6.15× |
| `dialogWidthSm` | 88 | **90** | 360 | 4.00× |
| `drawerWidthSm` | 88 | **90** | 320 | 3.56× |
| `drawerHeightSm` | 96 | **98** | 240 | 2.45× |
| `notificationPanelMaxHeight` | 280 | **282** | 380 | 1.35× |

Every shipped identity, platform variant, recipe and contrast pair already
clears them, so no value moves.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | add `2 * borderWidth.thin` to the seven bounds |
| `packages/tokens/src/surface-border-fit.test.ts` | create |
| `packages/tokens/src/fixed-surface-fit.test.ts` | update the three bounds, their figures and the own-spacing case |
| `packages/tokens/src/shell-chrome-fit.test.ts` | update the width/height bounds, their figures and the own-spacing cases |
| `packages/tokens/src/notification-panel-metrics.test.ts` | update the panel-height bound |
| `packages/tokens/src/docs.test.ts` | update the two derived figure guards and add the border guard |
| `docs/tokens.md` | seven dimension-table rows and the fixed-surface paragraph |
| `docs/design-system.md` | one clause in §6 (component dimensions) and one in §9 |
| `packages/tokens/README.md` | one clause in "Checking the numbers" |
| `COMPONENTS.md` | one clause in the `Theme metric check` row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. Do **not** edit `packages/components` or `packages/primitives` in
this worktree.

## 4. `packages/tokens/src/metrics.ts`

Add the border term to the existing expressions. Keep the comment style and
name the plan in each changed comment.

1. `overlayMinWidth` (the "narrowest overlay row" rule):
   `2 * spacing.md + iconSize.md + spacing.md + typography.label.fontSize + 2 * borderWidth.thin`
   — append to the comment: *"The menu surface paints its two `borderWidth.thin`
   edges inside that width (plan 627)."*
2. `toastWidth`: `+ 2 * borderWidth.thin`; comment clause *"and the card's two
   borders"*.
3. `notificationPanelWidth`: `+ 2 * borderWidth.thin`; comment clause *"and the
   inbox's two borders"*.
4. `dialogWidthSm`: `3 * spacing["2xl"] + typography.h3.fontSize + 2 * borderWidth.thin`;
   comment clause *"inside its two borders"*.
5. `drawerWidthSm`: same addition.
6. `drawerHeightSm`: wrap the existing sum in `+ 2 * borderWidth.thin`; comment
   clause *"inside its two borders"*.
7. `notificationPanelMaxHeight`:
   `dimensions.notificationListMaxHeight + 2 * borderWidth.thin`; comment clause
   *"its content box is shorter than its height by the two borders"*.

Update the `themeMetricFailures` JSDoc's **dimensions** bullet:

- after *"the shipped widths need 88 and the height 96"* change the figures to
  *"the shipped widths need 90 and the height 98 inside the shell's two
  borders"*;
- after the notification sentence add *"and each fixed surface — the menu's
  minimum width, the toast card, the inbox and the dialog and drawer shells —
  holds its chrome inside its own two `borderWidth.thin` edges, like a control
  or a field."*

## 5. `packages/tokens/src/surface-border-fit.test.ts`

Header comment: the guarded bug — plan 384 established content-box fit, but the
fixed-surface bounds that landed in plans 598–625 compared the outer metric, so
a surface whose border is thicker than the slack between its bound and its chrome
clipped the chrome it always paints while `themeMetricFailures` returned `[]`.
Name the probe values (dialog 88/88 with thin 12, toast 80/66) and state that no
shipped value moves.

A module-local coherent fixture is required because a 12px border trips the
control, keycap, calendar and timeline rules otherwise:

```ts
const bordered = (dimensions: Partial<Dimensions> = {}) =>
  extendTheme(getTheme("light"), {
    borderWidth: { thin: 12, strong: 12 },
    density: {
      controlHeight: { sm: 48, md: 52, lg: 56 },
      rowHeight: 56,
    },
    dimensions: {
      keycapSize: 40,
      calendarCellSize: 48,
      timelineMarkerSize: 12,
      ...dimensions,
    },
  });
```

Cases:

1. **Every shipped set clears the border-adjusted bounds.** Map
   `shippedThemes`; for each, compute the seven bounds from that theme's own
   metrics and assert each member is at least its bound, and that
   `themeMetricFailures(theme)` has no `dimensions` failure. Report the shipped
   identity clearances from §2.
2. **States the shipped identity bounds.** At `getTheme("light")`, assert the
   seven bounds are `55 / 68 / 52 / 90 / 90 / 98 / 282` and the seven values are
   `180 / 380 / 320 / 360 / 320 / 240 / 380`.
3. **Reports a dialog narrower than its chrome plus borders.** `bordered({ dialogWidthSm: 88, dialogWidthMd: 200, dialogWidthLg: 300 })` → exactly one
   `{ group: "dimensions", member: "dialogWidthSm", rule: "at-least", actual: 88, bound: 112 }`.
4. **Reports a drawer narrower than its chrome plus borders.** `bordered({ drawerWidthSm: 88, drawerWidthMd: 200, drawerWidthLg: 300 })` → one
   `drawerWidthSm` failure at bound 112.
5. **Reports a bottom drawer shorter than its chrome plus borders.**
   `bordered({ drawerHeightSm: 140, drawerHeightMd: 200, drawerHeightLg: 300 })`
   → one `drawerHeightSm` failure at bound 164.
6. **Reports a Toast narrower than its chrome plus borders.**
   `bordered({ toastWidth: 80 })` → one `toastWidth` failure at bound 90.
7. **Reports an overlay narrower than its row plus borders.**
   `bordered({ overlayMinWidth: 53 })` → one `overlayMinWidth` failure at bound
   77 (`53 + 24`).
8. **Reports an inbox narrower than its row plus borders.**
   `bordered({ notificationPanelWidth: 50 })` → one
   `notificationPanelWidth` failure at bound 74.
9. **Reports an inbox shorter than the list it wraps plus borders.**
   `bordered({ notificationPanelMaxHeight: 280 })` → one
   `notificationPanelMaxHeight` failure at bound 304.
10. **Reads the theme's own border, not 12.** A theme with
    `borderWidth: { thin: 4, strong: 4 }` and the coherent density, dialog widths
    `88/200/300`, reports `dialogWidthSm` at bound `96` (`88 + 8`); the other
    six members stay shipped.
11. **Carries through the total check.** Case 3's theme has a
    `kind: "metric"` entry with `member: "dialogWidthSm"` in `themeFailures`.

Add a `docs.test.ts` case near the plan-625 figure guard that rebuilds the
catalogue's border sentence from `borderWidth.thin`, the seven members and the
seven bounds and requires it. The sentence may be built from
`getTheme("light")`; the test must fail if a member or a figure drifts.

### Proving both directions

1. Revert the seven border terms and run the suite: cases 3–11 fail with `[]`
   (or the smaller pre-fix bound); cases 1 and 2 pass. Observed: **9 failed /
   2 passed**.
2. Restore them: all eleven cases pass. Observed: **11 passed**.

Record both outcomes in the commit message.

## 6. Documentation

### `docs/tokens.md`

- Dimension table rows, append *"inside the surface's two borders"* where the
  surface paints one:
  - `overlayMinWidth`: *"narrowest menu surface; holds a row's padding, icon, gap
    and one `label` glyph inside the surface's two borders"*.
  - `toastWidth`, `notificationPanelWidth`, `dialogWidthSm` (and the `Md`/`Lg`
    rows via *"the same chrome through the ladder"*), `drawerWidthSm`,
    `drawerHeightSm`.
  - `notificationPanelMaxHeight`: *"contains the list it wraps plus its two
    borders"*.
- In the fixed-surface paragraph that plan 625 ends, add:

  > Every fixed surface paints its two `borderWidth.thin` edges inside its own
  > width or height, so each bound includes `2 * borderWidth.thin`: the menu
  > minimum, the Toast card, the notification inbox, and the dialog and drawer
  > shells. At the shipped metrics the menu needs 55px, the Toast 68px, the inbox
  > 52px wide and 282px high, the dialog and drawer widths 90px and the bottom
  > drawer 98px. The shipped `180 / 380 / 320 / 360 / 320 / 240 / 380` clear them
  > at `3.27× / 5.59× / 6.15× / 4.00× / 3.56× / 2.45× / 1.35×` (plan `627`).

- Pair/role counts do not change.

### `docs/design-system.md`

- §6 dimensions: add *"and each of those surfaces holds its chrome inside its own
  two borders, like a control or a field."*
- §9 metric paragraph: add *"or a fixed surface narrower than its chrome once its
  own border is inside the box"* to the list `themeMetricFailures` catches.

### `packages/tokens/README.md`

In "Checking the numbers", after *"or a dialog or drawer narrower than its close
control"*, add *"or a fixed surface whose own border leaves too little content
box for the chrome it paints"*.

### `COMPONENTS.md`

`Theme metric check` row: after the dialog/drawer sentence, add *"every fixed
surface — the menu minimum, Toast card, notification inbox and the dialog and
drawer shells — holds its chrome inside its own two borders; the shipped bounds
are 55/68/52/90/90/98 and the inbox's 282 (plan 627)."*

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Hold the fixed surfaces to their own border — plan 384 made a size fit its
content box, but the menu minimum, Toast card, inbox and the dialog/drawer shells
compared the outer metric, so a theme with `borderWidth.thin: 12` and
`dialogWidthSm: 88` painted a 72px chrome into a 64px content box while
`themeFailures` returned `[]`; seven bounds now include `2 * borderWidth.thin`,
every shipped set clears them (90/90/98/68/52/55 and 282) and no value moves
(plan 627)
```

Bump the section count and bar by one (`268/341` → `269/342`).

### `.agents/slop/plans/README.md`

Add the table row after 625 and the summary paragraph before "How to use a
plan". Status `done` once the gates pass.

### `.agents/slop/rd/`

Write `.agents/slop/rd/2026-10-19-tokens-next-627.md` with the audit scope, the
probe, the decision and the verification, in the shape of the 623 note.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/surface-border-fit.test.ts src/docs.test.ts`
   → all new cases pass.
3. `nub run --filter @gpuixui/tokens test` → every suite green; file count grows
   by one.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- a shipped theme fails one of the new bounds — the shipped clearance figures are
  wrong for that platform's spacing, density or border, which is a design
  decision;
- a narrowed case reports more than one `dimensions` failure — keep the other
  members shipped and the coherent fixture intact so each case isolates one rule;
- a ladder failure appears from a sibling (for example `dialogWidthSm` no longer
  below `md`) — the fixture is wrong, not the rule;
- the border term must be a literal instead of `borderWidth.thin` — the
  component's paint must be re-checked;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit.

## 9. Acceptance

- The seven rules include the surface's own two borders, derived from
  `borderWidth.thin`; the ladders carry them to `md`/`lg`.
- Every shipped identity theme, platform variant and recipe passes; no value
  moves.
- The new test fails on the pre-fix tree (cases 3–11) and passes after it.
- The catalogue, design system, README and ledger name the invariant and the
  figures; the plan and audit note are indexed.
- `nub run check`, `nub run lint` and `nub run test` pass.
