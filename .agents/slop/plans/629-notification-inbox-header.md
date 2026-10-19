# 629 — The notification inbox holds its header

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 598 (the
inbox's fixed metrics), 620 (the fixed-surface bounds), 625 and 627 (the shells'
chrome and content-box rules) ·
**Number block:** 500–699 (`tokens-theme` overflow; 628 is in use by
`components`, so 629 is the next free number in every worktree) ·
**Status:** done

## 1. The defect

Plan 598 shipped the notification inbox's four fixed metrics, and plan 627 gave
the panel height the one bound it had:

```ts
// metrics.ts, as of plan 627
notificationPanelMaxHeight ≥ notificationListMaxHeight + 2 * borderWidth.thin
```

The inbox paints a **header above the list**, and the bound does not count it.
`packages/components/src/notification-centre.tsx`:

- `panelStyle` — `maxHeight: 380`, `overflow: "hidden"`, `borderWidth:
  theme.borderWidth.thin`, `padding: 0`;
- `NotificationCentreHeader` — `padding: theme.spacing.lg`, a bottom rule of
  `theme.borderWidth.thin`, a `NotificationCentreTitle` in the `label` role and
  two ghost `Button size="sm"` actions (`Mark all read`, `Clear`), each
  `controlHeight(theme, "sm")` tall;
- `NotificationCentreList` — a `maxHeight: 280` scroll viewport.

So the panel's content box must hold the header **and** the list:

```
header = 2 * spacing.lg + max(label.lineHeight, controlHeight.sm) + borderWidth.thin
       = 2 * spacing.lg + controlHeight.sm + borderWidth.thin
```

(the density contract already holds `controlHeight.sm ≥ label.lineHeight +
2 * borderWidth.thin`, so the `sm` action is the taller line; a header with only
the title is shorter and is covered).

At the shipped identity: `2 * 12 + 28 + 1 = 53`, and the panel needs
`280 + 53 + 2 = 335`, not 282.

### The probe

A coherent theme whose panel cannot reach its own documented composition:

```ts
const plant = extendTheme(getTheme("light"), {
  dimensions: {
    notificationListMaxHeight: 280,
    notificationPanelMaxHeight: 300,
  },
});
```

`themeMetricFailures(plant)` and `themeFailures(plant)` both return **`[]`**,
while the panel's `overflow: "hidden"` gives the header and list only
`300 - 2 = 298` for a 53 + 280 = 333 composition: the header is squeezed or the
list's documented 280px viewport is unreachable. A second probe with a lifted
`sm` control (40) and `panelMaxHeight: 300` also returns `[]` while the need is
347.

The shipped identity (`380`) clears the corrected 335 at `1.13×`, so **no colour,
pair, floor, metric or shipped theme moves**. The defect is in the guarantee an
edited theme is told to rely on.

## 2. Decision

Replace the one-term bound with the header + list + the panel's two borders:

```ts
notificationPanelMaxHeight ≥
  notificationListMaxHeight +
  2 * spacing.lg +                     // the header's padding
  density.controlHeight.sm +           // the header's `sm` action (≥ one label line)
  borderWidth.thin +                   // the header's bottom rule
  2 * borderWidth.thin                 // the panel's own two borders
```

Identity bound: `280 + 24 + 28 + 1 + 2 = 335`.

Not changed:

- `notificationPanelWidth` — already holds the row chrome plus both borders
  (plans 620 and 627).
- `notificationListMaxHeight` — still held to one `density.rowHeight` (plan 598).
- The header's *width* — its title and actions are consumer content that wraps
  or is optional; this unit is the height the panel always spends on the header
  it always paints.

### The rule's one exactness check

Is `controlHeight.sm` always at least `label.lineHeight`? Yes:
`themeMetricFailures` holds `controlHeight.sm ≥ max(label.lineHeight,
body.lineHeight) + 2 * borderWidth.thin`. The bound therefore does not need a
`Math.max`, and a header with only the title is shorter than the bound — the
documented example always renders both actions.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | replace the panel-height bound; update the **dimensions** bullet of `themeMetricFailures`' JSDoc |
| `packages/tokens/src/notification-header-fit.test.ts` | create |
| `packages/tokens/src/surface-border-fit.test.ts` | `panelHeightBound`, the bordered fixture and its three figures |
| `packages/tokens/src/notification-panel-metrics.test.ts` | the panel-height case's bound |
| `packages/tokens/src/docs.test.ts` | the design-system inbox sentence and a derived catalogue sentence |
| `docs/tokens.md` | the `notificationPanelMaxHeight` row and the inbox paragraph |
| `docs/design-system.md` | the inbox sentence in §6 |
| `COMPONENTS.md` | the inbox clause in the `Theme metric check` row |
| `TODO.md` | add and tick the row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-629.md` | the audit note |

No other file. Do **not** edit `packages/components` in this worktree; its
migration to the tokens metrics is already a cross-team row.

## 4. `packages/tokens/src/metrics.ts`

Replace the last rule in the dimensions block (after the
`notificationListMaxHeight` rule) with:

```ts
// The inbox clips its contents, so its maximum height holds the header it
// always paints — `spacing.lg` padding on both sides, a `sm` header action
// (which the density rule already holds at least one `label` line tall) and
// the header's own bottom rule — plus the list and the panel's two borders.
// A panel capped at the list and its borders alone squeezes the header or
// makes the documented list viewport unreachable (plan 629).
...atLeast(
  "dimensions",
  "notificationPanelMaxHeight",
  dimensions.notificationPanelMaxHeight,
  dimensions.notificationListMaxHeight +
    2 * spacing.lg +
    density.controlHeight.sm +
    3 * borderWidth.thin,
),
```

Update the `themeMetricFailures` JSDoc's **dimensions** bullet:

- after "the inbox's maximum height contains the list it wraps plus those
  borders" write "**and the header above it** — its two `spacing.lg` insets, one
  `sm` action and its own rule — because a panel capped at the list alone
  squeezes the header the inbox always paints (plan 629)."
- adjust "the shipped widths need 90 and the height 98" only if a figure moved —
  it does not.

## 5. `packages/tokens/src/notification-header-fit.test.ts`

Header comment: the guarded defect — plan 598 shipped the inbox literals and
plan 627 added the panel's two borders, but the header the component always
paints was never counted, so `notificationPanelMaxHeight: 300` returned `[]`
from every check while the header (53px) plus the documented list (280px) need
335 inside the panel's borders. State that no shipped value moves.

Cases:

1. **Every shipped set passes.** `shippedThemes.forEach` →
   `themeMetricFailures(theme)` is `[]`, and the derived bound is at most the
   shipped `notificationPanelMaxHeight`.
2. **States the shipped bound.** `headerBound(getTheme("light"))` is exactly
   `335`; the shipped panel is 380 and the identity header is 53
   (`2 * 12 + 28 + 1`).
3. **Reports the plan-627 bound.** A theme with
   `notificationPanelMaxHeight: 282` (the old `list + 2 * thin`) fails with
   `{ member: "notificationPanelMaxHeight", rule: "at-least", actual: 282,
   bound: 335 }`. This is the case that fails on the pre-fix tree with `[]`.
4. **The bound is a minimum, not a maximum.** `335` passes; `334` fails at the
   same bound.
5. **The header's action sets the height.** A coherent lifted density
   (`controlHeight` 40/44/48, `rowHeight: 44`, `calendarCellSize: 44`) with
   `panelMaxHeight: 346` fails at bound `347` (`280 + 24 + 40 + 3`).
6. **Reads the theme's own border.** `borderWidth: { thin: 4, strong: 4 }`,
   `keycapSize: 24`, `calendarCellSize: 28` with panel `343` fails at `344`.
7. **Carries through the total check.** Case 3's theme has a `kind: "metric"`
   entry with `member: "notificationPanelMaxHeight"` in `themeFailures`.

The helper:

```ts
const headerBound = (theme: Theme): number =>
  theme.dimensions.notificationListMaxHeight +
  2 * theme.spacing.lg +
  theme.density.controlHeight.sm +
  3 * theme.borderWidth.thin;
```

### Proving both directions

1. On the pre-fix tree (restore the one-term bound), run the new suite: cases 3,
   4, 5, 6 and 7 fail (each returns `[]` or the smaller bound); cases 1 and 2
   fail only on the stated bound (they read the new helper, so they pass).
   Record the observed split.
2. With the fix: all seven pass.
3. `git stash push -- packages/tokens/src/metrics.ts` is the mechanism used by
   plan 627; use the same and restore.

## 6. Existing suites

### `surface-border-fit.test.ts`

- `panelHeightBound` becomes the header + list + three borders expression above.
- The `bordered` fixture gains `notificationPanelMaxHeight: 400`, because with
  `borderWidth.thin: 12`, `controlHeight.sm: 48` and `spacing.lg: 12` its bound
  is `280 + 24 + 48 + 36 = 388`, above the shipped 380; without the override
  every other case would carry a second failure.
- Its height expectations move: `380 / 282` → `380 / 335` for the shipped
  clearance, `panelHeightBound(base)` → `335`, the inbox plant's bound
  `304` → `388`.

### `notification-panel-metrics.test.ts`

The panel-shorter-than-list case's expected bound becomes the header bound
(`335`); the case keeps its `actual: 240`.

### `docs.test.ts`

- The design-system inbox sentence becomes: *"… — the panel contains its header
  and the list, and the list holds one row."*
- Add a case near "states that a fixed surface fits its own border" that builds
  the catalogue sentence from `spacing.lg`, `defaultDensity.controlHeight.sm`
  and `borderWidth.thin`:

  > At the shipped metrics the header is **53**px and the panel needs **335**px,
  > and the shipped `380` clears it at `1.13×`.

  Require it in `markdownProse`.

## 7. Documentation

### `docs/tokens.md`

- `dimensions.notificationPanelMaxHeight` row:
  *"inbox maximum height; at least the list maximum plus its header (its
  padding, one `sm` action and its own rule) and the panel's two borders"*.
- Replace the inbox paragraph:

  > A notification inbox clips its contents, so its panel maximum contains its
  > header — `spacing.lg` padding on both sides, one `sm` action and the
  > header's own `borderWidth.thin` rule — and its list maximum, plus the
  > panel's two borders. At the shipped metrics the header is 53px and the panel
  > needs 335px, which the shipped 380 clears at `1.13×`; the list is held to one
  > `density.rowHeight` like every other scroll viewport, and the unread marker
  > is a mark a brand can size (plan `629`).

### `docs/design-system.md`

§6: replace "the panel contains the list, and the list holds one row" with
"the panel contains its header and the list, and the list holds one row."

### `COMPONENTS.md`

`Theme metric check` row: replace "the inbox's maximum height contains its list
plus those borders" with "the inbox's maximum height contains its header and
list plus those borders" (one occurrence in the row's prose).

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Hold the notification inbox's header inside its panel — the panel maximum
was held only to the list plus its two borders, but the inbox always paints a
header (two `spacing.lg` insets, a `sm` action, a bottom rule), so a theme with
`notificationPanelMaxHeight: 300` and a 280px list returned `[]` while the
header and list needed 335; the bound now counts the header, every shipped set
clears it (380 against 335) and no value moves (plan 629)
```

Bump `269/342` → `270/343`.

### `.agents/slop/plans/README.md`

Add the table row after 627 and the summary paragraph beside the other
`tokens-theme` summaries.

## 8. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/notification-header-fit.test.ts src/surface-border-fit.test.ts src/notification-panel-metrics.test.ts src/docs.test.ts`
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
- a plant reports more than one `dimensions` failure — keep the fixture coherent
  (raise `rowHeight`, `calendarCellSize` and the dialog ladder with a lifted
  control) so each case isolates one rule;
- the header in `packages/components` has changed shape (no `sm` actions, a
  different padding, no bottom rule) — the evidence must be re-read from that
  worktree before changing the bound;
- the derived docs sentence cannot be built from the shipped metrics — the
  document's wording and the rule have drifted, so report instead of guessing;
- `docs.test.ts` fails on an unrelated guarded sentence — that is a baseline
  problem, not this unit.

## 10. Acceptance

- The panel-height rule counts the header, the list and the panel's two borders,
  all from the theme's own metrics.
- Every shipped identity theme, platform variant and recipe passes; no colour,
  pair, floor, metric or shipped theme value moves.
- The new suite fails on the pre-fix tree (cases 3–7) and passes after it.
- The catalogue, design system and ledger name the invariant and the figures;
  the plan, audit note and README index are current.
- `nub run check`, `nub run lint` and `nub run test` pass.
