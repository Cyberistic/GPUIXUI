# 620 — The fixed surfaces hold their own chrome

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 358 (the metric contract), 384 (a
size that must fit must fit the content box), 531 (member completeness), 556
(dialog/calendar/mark dimensions), 598 (the notification panel), 601 (the date
field), 604 (the timeline marker), 619 (the last landing plan) ·
**Number block:** 500–699 (`tokens-theme` overflow; 620 is the next free number
in every worktree) ·
**Status:** done

## 1. The gap

`themeMetricFailures` governs every consumed card, field, control and marker
surface, but three fixed surfaces it never measures beyond `positive` can be
edited to a width smaller than the chrome the component paints inside them:

| Token | Rule today | A theme that passes | What the component paints inside it |
| ----- | ---------- | ------------------- | ----------------------------------- |
| `dimensions.toastWidth` | `positive` | `toastWidth: 20` | `spacing.lg` padding on both sides, the `md` tone icon, the `lg` gap after it, then the `bodyStrong` title |
| `dimensions.notificationPanelWidth` | `positive` | `notificationPanelWidth: 20` | each row's `spacing.lg` padding on both sides, the unread dot, the `sm` gap, then the `bodyStrong` title |
| `dimensions.overlayMinWidth` | ordered below `overlayWidth` | both `20` | a menu/combobox row's `spacing.md` padding, the `md` leading icon or the `sm` trailing check, the `md` gap, then the `label` text |

All three are **documented fixed surfaces** (`docs/tokens.md` §Component
dimensions) and all three are scheduled for consumption:

- `TODO.md` — *"`components` reads `theme.dimensions` for its overlay widths and
  scroll height, toast width, preview-card range, field minimum, chip minimum
  and field adornment instead of the literals in plan 353 §1"*;
- `TODO.md` — *"`components` reads `theme.dimensions.notificationPanelWidth`,
  `notificationPanelMaxHeight` and `notificationListMaxHeight`"*.

Today each component paints the old literal (380 / 320 / 220), so no shipped
composition breaks. The defect is in the **guarantee**: a brand that copies a
platform style and edits one of these three values gets `themeFailures(theme)`
returning `[]` for a card whose own padding overflows it. That is the same
class plan 384 fixed for chips and keycaps and plan 556 for calendar cells —
a size that must fit must fit its content box — left open on the three surfaces
whose consumer migration is already scheduled.

## 2. Decision

Add three `at-least` rules to the `dimensions` group. Each bound is built from
the theme's **own** type, spacing, icon and dimension metrics, so a brand that
widens its icon tier or its padding moves the bound with it:

1. **Toast.** The content row is `padding lg` on both sides, the `md` tone icon,
   the `lg` gap after it, then one `bodyStrong` glyph of title:
   `2 * spacing.lg + iconSize.md + spacing.lg + typography.bodyStrong.fontSize`.
   The 3px tone bar is consumer chrome (a literal recorded for the `components`
   migration), not a theme metric, so the token leaves it out; the shipped
   `toastWidth` of 380 leaves many times the bound as slack.
2. **Notification panel.** Each row is `padding lg` on both sides, the unread
   dot, the `sm` gap, then one `bodyStrong` glyph of title:
   `2 * spacing.lg + notificationUnreadDotSize + spacing.sm +
   typography.bodyStrong.fontSize`.
3. **Overlay minimum width.** A menu or combobox row is `spacing.md` padding on
   both sides, an `md` leading icon (or an `sm` trailing check, which is
   narrower), the `md` gap, then one `label` glyph:
   `2 * spacing.md + iconSize.md + spacing.md + typography.label.fontSize`.
   The highlight bar is paid for out of the row's left padding, not added to it.

The shipped values clear every bound by a wide margin, so **no colour, pair,
floor, type, spacing, radius, density, elevation, motion or dimension value
moves**; the change is three rules and their documentation.

**Why not `previewCardMinWidth`, `dialogWidthSm`, the drawer ladders or the
markers:** those either wrap their content (a card and a dialog are reflow
containers, so one glyph is not the minimum), already have a shape rule
(`keycapSize`, `dateFieldWidth`, `fieldMinWidth`, `chipMinWidth`,
`calendarCellSize`, `timeSegmentWidth`, `overlayMaxHeight`), or their minimum is
a design choice rather than a breakage (a 1px carousel dot still paints). The
three above are the fixed surfaces whose horizontal chrome is **non-wrapping**
and currently ungoverned.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/metrics.ts` | add the three rules after the notification-list rules, before `finiteGroup("elevation", …)` |
| `packages/tokens/src/fixed-surface-fit.test.ts` | create |
| `packages/tokens/src/docs.test.ts` | add one guard for the new catalogue paragraph |
| `docs/tokens.md` | the three "Use" cells and a paragraph under the keycap one |
| `COMPONENTS.md` | one clause in the `Theme metric check` row |
| `TODO.md` | tick the new row; bump the section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |

No other file. Do **not** edit `packages/components` in this worktree.

## 4. `packages/tokens/src/metrics.ts`

Insert after the `notificationPanelMaxHeight` rule and before
`...finiteGroup("elevation", elevation)`:

```ts
// A Toast's fixed card holds its own chrome: the content row is `spacing.lg`
// padding on both sides, the `md` tone icon, the `lg` gap beside it and one
// `bodyStrong` title glyph. The 3px tone bar is consumer chrome, not a metric,
// so the bound leaves it out; a card narrower than this clips its own title.
...atLeast(
  "dimensions",
  "toastWidth",
  dimensions.toastWidth,
  2 * spacing.lg +
    iconSize.md +
    spacing.lg +
    typography.bodyStrong.fontSize,
),
// A notification row is `spacing.lg` padding on both sides, the unread dot,
// the `sm` gap and one `bodyStrong` title glyph. The panel is anchored at
// `notificationPanelWidth`, so a narrower panel clips the title of every
// unread notification it exists to show.
...atLeast(
  "dimensions",
  "notificationPanelWidth",
  dimensions.notificationPanelWidth,
  2 * spacing.lg +
    dimensions.notificationUnreadDotSize +
    spacing.sm +
    typography.bodyStrong.fontSize,
),
// The narrowest overlay row: `spacing.md` padding on both sides, one `md`
// leading icon (the `sm` trailing check and its gap are narrower), the `md`
// gap and one `label` glyph. The 2px highlight bar is paid for out of the
// row's left padding, so it does not widen the bound.
...atLeast(
  "dimensions",
  "overlayMinWidth",
  dimensions.overlayMinWidth,
  2 * spacing.md + iconSize.md + spacing.md + typography.label.fontSize,
),
```

The `at-least` rule is already indexed in `metricRules`, so no index changes.

## 5. `packages/tokens/src/fixed-surface-fit.test.ts`

Header comment states the guarded bug: `toastWidth`, `notificationPanelWidth`
and `overlayMinWidth` were only positive (or only ordered against their
sibling), so `themeFailures` returned `[]` for a toast card narrower than its
own padding and icon — the three fixed surfaces whose `components` migration is
already scheduled in `TODO.md`.

Cases:

1. **Every shipped set passes.** For each `shippedThemes` entry, compute the
   three bounds from that theme's own metrics and assert the dimension is at
   least the bound; collect failures and expect `[]`. Report the tightest ratio.
2. **The shipped ratios.** Assert the toast bound is `66` at the shipped
   identity light (`2*12 + 16 + 12 + 14`), the notification bound is `50`
   (`2*12 + 6 + 6 + 14`) and the overlay bound is `53` (`2*8 + 16 + 8 + 13`),
   and that the shipped `380 / 320 / 180` clear them at `5.76 / 6.40 / 3.40`.
   Every shipped set carries the same denominators, so the ratio is the same
   for all 24; the assertion collects the minimum and states it.
3. **A narrow toast is reported.** `extendTheme(getTheme("light"), { dimensions:
   { toastWidth: 40 } })` → `themeMetricFailures` contains exactly one
   `{group: "dimensions", member: "toastWidth", rule: "at-least", actual: 40,
   bound: 66}`.
4. **A narrow notification panel is reported.** `notificationPanelWidth: 40`
   → one `at-least` failure with `bound: 50`.
5. **A narrow overlay is reported.** `overlayMinWidth: 40` (still below the
   `overlayWidth` sibling, so no ladder failure) → one `at-least` failure with
   `bound: 53`.
6. **The bound reads the theme's own metrics.** A theme with `toastWidth: 100`
   passes at the shipped spacing; the same theme with `spacing: { lg: 24 }`
   reports the toast, because `100 < 2*24 + 16 + 24 + 14 = 102`. This proves the
   rule is not a hardcoded number.
7. **The total check carries it.** `themeFailures` on each narrowed theme
   contains a `kind: "metric"` entry for the same member (not only the metric
   subset).

## 6. Documentation

### `docs/tokens.md`

- Table rows: append the invariant to the `Use` cell of the three tokens —
  `fixed toast card width; holds its padding, tone icon, gap and one title glyph`,
  `anchored notification inbox width; holds a row's padding, unread dot, gap and one title glyph`,
  `narrowest menu surface; holds a row's padding, icon, gap and one label glyph`.
- After the keycap paragraph, add:

> Three fixed surfaces hold the chrome painted inside them, not only a positive
> size. A toast card is `2 * spacing.lg + iconSize.md + spacing.lg +
> typography.bodyStrong.fontSize` at least — its padding, tone icon, the gap
> beside it and one title glyph — and a notification inbox is
> `2 * spacing.lg + notificationUnreadDotSize + spacing.sm +
> typography.bodyStrong.fontSize`, the row's padding, unread dot, gap and title.
> The narrowest overlay holds `2 * spacing.md + iconSize.md + spacing.md +
> typography.label.fontSize`: a menu row's two insets, its leading icon, gap and
> one label glyph. Each bound reads the theme's own metrics, so widening a type
> role or a spacing step moves it. The shipped `380 / 320 / 180` clear the three
> by `5.76× / 6.40× / 3.40×`, so the rules guard an edited theme rather than a
> shipped value, and no value moves (plan `620`).

- Pair/role counts do not change.

### `docs/design-system.md`

In §11 under the metric paragraph, after the overlay-scroll-height clause, add:
*"a fixed toast, notification inbox and overlay minimum hold their own chrome —
padding, icon, gap and one title or label glyph — so a brand that shrinks a
surface below the content it wraps is reported before a component migrates to
it (plan `620`)."*

### `COMPONENTS.md`

`Theme metric check` row, after the fixed-surface sentence: *"and the three
fixed surfaces whose chrome never wraps — `toastWidth`, `notificationPanelWidth`
and `overlayMinWidth` — hold their padding, icon, gap and one glyph (shipped
380/320/180 clear them at 5.76×/6.40×/3.40×, plan 620)."*

### `TODO.md`

Add under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Hold the fixed surfaces to their own chrome — `toastWidth`,
`notificationPanelWidth` and `overlayMinWidth` were only positive (or only
ordered against their sibling), so a theme could set a toast narrower than its
padding, tone icon and title or an overlay narrower than a menu row's insets,
icon and label while `themeFailures` returned `[]`; three `at-least` rules now
read the theme's own spacing, icon and type metrics, every shipped set clears
them (380/320/180 against 66/50/53) and no value moves (plan 620)
```

Bump the section count and bar by one (`262/334` → `263/335`).

### `.agents/slop/plans/README.md`

Add the table row after 619 and the summary paragraph before "How to use a
plan". Status `done`.

## 7. Commands and expected results

Run from the worktree root:

1. `nub run --filter @gpuixui/tokens check-types` → exit 0.
2. `cd packages/tokens && nub x vitest run src/fixed-surface-fit.test.ts` → all
   cases pass.
3. `nub run --filter @gpuixui/tokens test` → every suite green; file count grows
   by one.
4. `nub run check` → exit 0 (test checks, lint, format, types).
5. `nub run lint` → exit 0.
6. `nub run test` → exit 0.

## 8. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme fails one of the three bounds — the bounds in §2 are wrong
  for a platform's own spacing/type metrics, which is a design decision;
- a documented rule table or count in `docs.test.ts` fails for an unrelated
  sentence — that is a baseline problem, not this unit;
- a narrowed-theme case reports a second failure from a different rule (for
  example a ladder failure from `overlayWidth`) — the test fixture is wrong;
  keep `overlayMinWidth` below `overlayWidth` so only the new rule fires;
- the `at-least` rule needs a new index entry — it does not; `metricRules`
  already owns it.

## 9. Acceptance

- The three rules are in `themeMetricFailures`, each derived from the theme's
  own metrics.
- Every shipped identity theme, platform variant and recipe passes; no value
  moves.
- The new test fails on the pre-fix tree (cases 3–7) and passes after it.
- The catalogue, design system and ledger name the three invariants; the plan
  is indexed.
- `nub run check`, `nub run lint` and `nub run test` pass.
