# 645 — The fixed surfaces count every inset they paint

**Phase:** F (the numeric half of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 353 (component dimensions), 365 (overlay row), 384 (content
box fit), 523 (control padding), 625/627 (dialog and drawer shells), 629 (inbox
header), 634 (field query icon), 636 (Toast tone bar) ·
**Number block:** 500–699 (`tokens-theme` overflow; `644` is taken by
`components`, so this is the next free) ·
**Status:** pending

## 1. The defect

Plans 384, 625, 627, 629, 634 and 636 established the rule: a fixed surface's
published minimum is the **outer** metric, so it must charge every border,
padding and fixed control painted inside it. Five surface bounds still omit one
of those insets. Each was probed against the shipped light theme; every theme
below returns `[]` from `themeMetricFailures` and `themeFailures` today.

| Bound | Rule today | Chrome it omits | Theme that passes today |
| ----- | ---------- | --------------- | ----------------------- |
| `dimensions.chatViewportMinHeight` | `>= density.rowHeight` only | the viewport's `spacing.md` padding on both sides and its two `borderWidth.thin` edges | `chatViewportMinHeight: 32` — content box becomes `32 - 2*8 - 2 = 14`, shorter than the row it must hold |
| `dimensions.previewCardMinWidth` | positive, below `previewCardMaxWidth` | the card's `spacing.lg` padding on both sides and its two `borderWidth.thin` edges | `previewCardMinWidth: 10` — narrower than the padding alone |
| `dimensions.overlayMinWidth` | `2*spacing.md + iconSize.md + spacing.md + label.fontSize + 2*thin` | the menu surface's `spacing.xs` padding on both sides (`menu/surface.tsx`, `combobox.tsx`) | `overlayMinWidth: 57, overlayWidth: 58` — the row bound only, with no surface padding |
| `dimensions.fieldMinWidth` | the query branch is `2*spacing.md + iconSize.md + 2*spacing.md + body.fontSize + fieldAdornmentSize` | the field's own two `borderWidth.thin` edges — the chip branch already charges them | `chipMinWidth: 10, fieldMinWidth: 79` — the query branch exactly, without the field's border |
| `dimensions.dialogWidthSm`, `dimensions.drawerWidthSm` | `3*spacing["2xl"] + h3.fontSize + 2*thin` | the close control when it reaches further than the header's reserved step: the control is square `controlHeight.sm` at `spacing.lg` from the right edge, so the title needs a `spacing.lg + controlHeight.sm` reserve from that edge | `spacing: { "2xl": 16 }`, `dialogWidthSm: 70` — the old bound with `2*2xl = 32` reserved, where the close control reaches `12 + 28 = 40` |

The dialog and drawer case is the one a reader sees: the close control is
absolutely positioned at `spacing.lg` and is `controlHeight.sm` wide
(`components/src/dialog.tsx`, `drawer.tsx`). The header reserves
`spacing["2xl"]`. When `spacing.lg + controlHeight.sm` is larger than
`2 * spacing["2xl"]`, a one-glyph title can sit under the close control even
though the shell's width check passes.

The other four are the same omission one surface over: a bound that counts
content and some chrome, but not the surface's own padding or border. They are
exactly the rule plans 384/627 state, not a new house style.

No shipped value is near any new bound (see §5), so no colour, pair, floor,
figure or shipped metric moves.

## 2. Decision

Replace the five under-counted bounds with bounds that charge the full painted
chrome. All formulas read the theme's own metrics and keep the existing
`usableBound` guard where the value or its bound can be zero/non-finite.

### 2.1 Chat transcript

```ts
// A message viewport is one row inside its own padding and borders; a theme
// that shrinks it to the row alone leaves no content box for that row.
...atLeast(
  "dimensions",
  "chatViewportMinHeight",
  dimensions.chatViewportMinHeight,
  density.rowHeight +
    2 * spacing.md +
    2 * borderWidth.thin,
),
```

### 2.2 Preview card

```ts
// The preview card paints `spacing.lg` padding inside its own border. Its
// minimum width has to leave a content box; `spacing["2xs"]` is the hairline
// step a content box may not fall below.
...atLeast(
  "dimensions",
  "previewCardMinWidth",
  dimensions.previewCardMinWidth,
  2 * spacing.lg +
    spacing["2xs"] +
    2 * borderWidth.thin,
),
```

### 2.3 Overlay menu

Add the surface padding to the existing row bound:

```ts
...atLeast(
  "dimensions",
  "overlayMinWidth",
  dimensions.overlayMinWidth,
  2 * spacing.xs +              // the menu surface's own padding
    2 * spacing.md +
    iconSize.md +
    spacing.md +
    typography.label.fontSize +
    2 * borderWidth.thin,
),
```

The `2 * spacing.md` row padding stays: the menu row paints its own horizontal
padding inside the surface, and the 2px highlight bar is paid for out of its
left padding.

### 2.4 Field query row

Add the field's two borders to the query branch, matching the chip branch:

```ts
Math.max(
  dimensions.chipMinWidth +
    2 * density.controlPaddingX.md +
    2 * borderWidth.thin,
  2 * spacing.md +
    iconSize.md +
    2 * spacing.md +
    typography.body.fontSize +
    dimensions.fieldAdornmentSize +
    2 * borderWidth.thin,
)
```

### 2.5 Dialog and drawer shells

The title's right limit is the nearer of the header's content edge and the
close control's left edge. Reserve the larger of the two:

```ts
const shellCloseReserve = Math.max(
  2 * spacing["2xl"],
  spacing.lg + density.controlHeight.sm,
);
```

Then both width bounds become:

```ts
...atLeast(
  "dimensions",
  "dialogWidthSm",
  dimensions.dialogWidthSm,
  2 * borderWidth.thin +
    spacing["2xl"] +
    typography.h3.fontSize +
    shellCloseReserve,
),
...atLeast(
  "dimensions",
  "drawerWidthSm",
  dimensions.drawerWidthSm,
  2 * borderWidth.thin +
    spacing["2xl"] +
    typography.h3.fontSize +
    shellCloseReserve,
),
```

`shellCloseReserve` is the right-hand reserve measured from the surface's inner
edge: the header's right padding (`spacing["2xl"]`) or the close control's
reach (`spacing.lg + controlHeight.sm`), whichever is larger. The left inset is
the surface's own `spacing["2xl"]`, and both borders are charged. At the
shipped metrics the two reserves are `48` and `40`, so `2*2xl` wins and the
existing `90px` figure is unchanged; a theme whose close control reaches
further is now reported.

Keep the dialog and drawer width **ladders** as they are (`sm` → `md` → `lg`);
the new bound is on `sm` and therefore carries to the larger sizes through the
ladder.

Not changed:

- any shipped colour, pair, floor, figure, platform style, recipe or theme;
- `dimensions`, `Dimensions`, `metricMembers`, `metricGroups` or `metricRules`;
- the positive rule or the `usableBound` guard;
- `previewCardMaxWidth`, the drawer height bound, or the notification bounds;
- a component or primitive source file. The contract reads the geometry the
  consumer paints; it does not change it.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/645-fixed-surface-insets.md` | this plan |
| `packages/tokens/src/metrics.ts` | replace the five bounds; add `shellCloseReserve` beside the other local helpers; extend the dimensions bullet and the `themeMetricFailures` JSDoc |
| `packages/tokens/src/fixed-surface-insets.test.ts` | new regression suite |
| `docs/tokens.md` | update the five table rows and the component-dimensions prose |
| `docs/design-system.md` | update §6 (dimensions) and §11's metric sentence |
| `packages/tokens/README.md` | name the rule under *Checking the numbers* |
| `COMPONENTS.md` | add the clause to the **Theme metric check** row |
| `TODO.md` | add and tick the row; bump the tokens section count and bar |
| `.agents/slop/plans/README.md` | index this plan and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-645.md` | the audit note |

No other file. **Do not** edit `packages/components`, `packages/primitives`,
`apps/docs`, a platform style, a shipped value, a colour, a pair or a floor.

## 4. `packages/tokens/src/metrics.ts`

Keep the rules in the existing order:

1. **Chat** — replace the current `chatViewportMinHeight` rule (the one that
   reads `density.rowHeight` alone).
2. **Preview card** — add the rule after the `previewCardMinWidth` /
   `previewCardMaxWidth` increasing ladder.
3. **Overlay** — extend the existing `overlayMinWidth` rule with
   `2 * spacing.xs`.
4. **Field** — add `2 * borderWidth.thin` to the query branch of the existing
   `Math.max` in the `fieldMinWidth` rule. Do not add a second rule.
5. **Shells** — define `shellCloseReserve` once beside `digitAdvanceEm` (or just
   above `themeMetricFailures`) and use it in both width rules.

Extend the dimensions bullet of the `themeMetricFailures` JSDoc so it says:

> A dialog's and a drawer's smallest shell reserve the greater of the header's
> `spacing["2xl"]` step and the close control's reach
> (`spacing.lg + controlHeight.sm`); a message viewport holds one row inside its
> own `spacing.md` padding and two borders; a preview card leaves a content box
> inside its `spacing.lg` padding and two borders; the menu minimum charges the
> surface's `spacing.xs` padding beside the row; and the field's query row
> charges the field's two borders exactly as the chip rule does.

## 5. `packages/tokens/src/fixed-surface-insets.test.ts`

Header:

```ts
/**
 * Guards the defect plan 645 fixes: five fixed-surface bounds counted some of
 * the chrome painted inside them but not all of it. A chat viewport at one
 * `density.rowHeight` had no content box for that row once its `spacing.md`
 * padding and two borders were painted; a `previewCardMinWidth` of 10 was
 * narrower than its own padding; an overlay minimum omitted the menu surface's
 * `spacing.xs`; the field's query row omitted the field's two borders while
 * the chip row charged them; and a dialog or drawer reserved
 * `2 * spacing["2xl"]` for the close control even when the control reached
 * `spacing.lg + controlHeight.sm` further. Every case below passes the checks
 * on the pre-fix tree and fails after the rule lands.
 */
```

Imports: `describe`, `expect`, `it` from `vitest`; `shippedThemes` from
`./shipped-themes.js`; `themeFailures`, `themeMetricFailures` from `./index.js`;
`extendTheme`, `getTheme` from `./theme.js`.

Cases:

1. **Every shipped theme clears every new bound** — iterate `shippedThemes` and
   assert `themeMetricFailures(theme)` is `[]`. This is the "no shipped value
   moves" proof; do not hardcode a shipped value in the expectation.
2. **The chat viewport charges its padding and borders** — theme:
   `extendTheme(getTheme("light"), { dimensions: {
   chatViewportMinHeight: <the theme's own density.rowHeight> } })`. Compute the
   value from the base theme, not a literal. Assert one `at-least` failure with
   `bound = density.rowHeight + 2 * spacing.md + 2 * borderWidth.thin`.
   Also assert the pre-fix tree would have passed by showing the value is at
   least `rowHeight` (the old rule) — do not assert `[]`; the point is the new
   diagnostic.
3. **The preview card charges its padding and borders** — theme with
   `previewCardMinWidth: 10`; assert one `at-least` failure with
   `bound = 2 * spacing.lg + spacing["2xs"] + 2 * borderWidth.thin`.
4. **The overlay charges the surface padding** — theme with
   `overlayMinWidth` equal to the old row bound and `overlayWidth` one pixel
   larger. Build the old row bound from the theme's metrics. Assert the new
   failure's `bound` is the old row bound plus `2 * spacing.xs`.
5. **The field's query row charges its borders** — theme with `chipMinWidth: 10`
   and `fieldMinWidth` equal to the old query bound (without borders). Assert
   one `at-least` failure with the new query bound.
6. **The dialog reserves the close control's reach** — theme with
   `spacing: { "2xl": 16 }` (keep the rest of the scale) and `dialogWidthSm`
   equal to the old bound (`3 * 16 + h3.fontSize + 2 * thin`). Assert one
   `at-least` failure. Compute the new bound as
   `2 * thin + 16 + h3.fontSize + max(2 * 16, spacing.lg + controlHeight.sm)`.
7. **The drawer reserves the same reach** — the same theme, but
   `drawerWidthSm` at the old bound; assert one failure on `drawerWidthSm`.
8. **The reserve follows the larger of the two** — two themes:
   - `controlHeight.sm` large enough that `spacing.lg + controlHeight.sm` wins;
     assert the new bound is that reach, not `2 * 2xl`;
   - `spacing["2xl"]` large enough that `2 * 2xl` wins; assert the same theme
     passes at `2 * 2xl + ...` and fails one pixel below it.
9. **`themeFailures` carries the finding** — the chat case also yields a
   `kind: "metric"` entry with `group: "dimensions"`.

Do not assert back a value the test itself stubbed: every expectation computes
its bound from the theme's own spacing, type, density and border metrics. The
literal shipped values (32, 160, 240, 180, 200, 360) belong in the plan prose,
not in the assertions.

## 6. Documents

- `docs/tokens.md`, **Component dimensions** table:
  - `overlayMinWidth`: "…holds the menu surface's two `spacing.xs` insets, a
    row's padding, icon, gap and one `label` glyph inside its two borders".
  - `fieldMinWidth`: "…and their two gaps, plus the field's two borders, or a
    token-input chip".
  - `previewCardMinWidth`: "narrowest preview card; leaves a content box inside
    its `spacing.lg` padding and its two borders".
  - `chatViewportMinHeight`: "…held to one `density.rowHeight` inside its
    `spacing.md` padding and its two borders".
  - `dialogWidthSm` / `drawerWidthSm`: "…the header's reserved step or the close
    control's reach, whichever is larger, and one `h3` title glyph inside its
    two borders".
- `docs/tokens.md`, the **fixed surfaces** prose: replace the overlay sentence
  and the dialog/drawer sentence with the derived formulas; add the chat and
  preview sentences. Keep the shipped figure sentence factual: the existing
  `380 / 320 / 180` figures and the dialog/drawer `90px` figure do not move.
- `docs/design-system.md` §6: one paragraph naming the five surfaces and the
  omitted insets, and that a theme must pay them. §11: extend the fixed-surface
  sentence to include the chat viewport, preview card, overlay surface padding
  and the close control's reach.
- `packages/tokens/README.md`, **Checking the numbers**: one sentence naming the
  five bounds and the rule that a fixed surface charges every padding, border
  and fixed control painted inside it.
- `COMPONENTS.md`, **Theme metric check** row: add "hold a message viewport,
  preview card, overlay minimum, field query row and dialog/drawer shell to the
  insets they paint (`chatViewportMinHeight`, `previewCardMinWidth`,
  `overlayMinWidth`, `fieldMinWidth`, `dialogWidthSm`/`drawerWidthSm`)".
- `TODO.md`: add the row under *Design tokens and theming* and tick it; change
  the section counter from `279/353` to `280/354` and keep the bar at eight
  filled cells.
- `.agents/slop/plans/README.md`: add the table row after `643` and a summary
  paragraph after the `643` summary.
- `.agents/slop/rd/2026-10-19-tokens-next-645.md`: the audit note (see §8).

## 7. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run --filter @gpuixui/tokens test -- fixed-surface-insets
```

Expected: the new file runs and passes after the implementation. Before the
implementation, the same command fails at the first new-bound case — record
that as the both-directions proof.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: no errors.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: all token suites pass, including `shipped-themes`, `contrast`,
`metrics`, `theme-check`, `docs`, `figures`, `snippets` and the new file.

```sh
nub run check:tests
nub run lint
nub run fmt
```

Expected: clean. `check:tests` must not reject the new file — every case asserts
a computed value.

```sh
nub run check
```

Expected: clean (it runs `check:tests`, lint, fmt and workspace type checks).

```sh
nub run test
```

Expected: the workspace suite is green. If another workstream's package fails
for its own reason, record the exact failure and do not claim this plan's gate
passed.

## 8. Audit note

`.agents/slop/rd/2026-10-19-tokens-next-645.md` records:

- what was probed (the five themes in §1, each returning `[]` from
  `themeMetricFailures` and `themeFailures` on the pre-fix tree);
- why each omission is a real clip, with the consumer file that paints the
  chrome (`chat.tsx`, `preview-card.tsx`, `menu/surface.tsx`/`combobox.tsx`,
  `search-input.tsx`, `dialog.tsx`/`drawer.tsx`);
- the decision that no consumer change is needed: the contract follows the
  geometry the components already paint;
- what was not changed (colours, pairs, floors, figures, shipped metrics).

## 9. STOP conditions

Stop and report with the evidence if:

- any shipped theme gains a metric failure — do not move a shipped value to
  satisfy the contract; the rule or its formula is wrong;
- a formula needs a value the `Theme` does not carry, or demands a change to a
  component/primitive file;
- the new test cannot be made to fail on the pre-fix tree for a reason other
  than the intended rule (for example, another rule also fires);
- `nub run check` or `nub run test` fails in a file this plan did not touch and
  the failure is not clearly another workstream's;
- the close-control geometry in `dialog.tsx`/`drawer.tsx` differs from
  `spacing.lg` + `controlHeight.sm` (re-read it before implementing; if it has
  changed, record the new geometry and stop).

## 10. Acceptance

- [ ] The five bounds charge the full chrome listed in §1.
- [ ] `themeMetricFailures` and `themeFailures` report each constructed theme in
      §1 with exactly the new `at-least` failure.
- [ ] Every shipped theme, platform variant and recipe still returns `[]` from
      all checks; no shipped value moves.
- [ ] `fixed-surface-insets.test.ts` states the regression and fails on the
      pre-fix tree.
- [ ] `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`
      and the `COMPONENTS.md` metric row describe the rules the code enforces.
- [ ] The plan is indexed; the TODO row is ticked; the counter is current.
- [ ] The commands in §7 were run and their results recorded in the commit
      message.
