# 091 — Selection inside a soft status surface

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth and the contrast contract) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `014` (soft pairs), `063` (platform styles), `071` (contrast contract), `081` (selection surfaces), `087` (selected secondary text), `090` (soft status edge) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

The selection contract names nine surfaces — `background`, `card`, `muted`,
`hover`, `active`, `accent`, `popover`, `input` and `selected`. It does **not**
name the four soft status surfaces (`infoSoft`, `successSoft`, `warningSoft`,
`destructiveSoft`), which is where an Alert, Badge or Toast paints the text a
reader copies. Selecting an error message is an everyday action; the wash is
painted over those fills today.

Measuring the existing pairs with the current palette and the current selection
wash produces two defects:

**Text loses the body floor through the wash.** `xSoftForeground` is held to 7:1
on its soft fill. Through the composited wash it falls below 7:1 in 16 shipped
pairs; the worst is the identity light `successSoftForeground` at **5.83:1**
(7.66:1 unselected). The platform light styles inherit the same foreground and
their own washes, and remain under the floor (macOS 5.97, Linux 6.01, Windows
5.85). The identity dark set fails all four tones through its 24% wash
(6.23–6.91).

**The wash is invisible on two dark soft fills.** The wash-visibility floor is
1.05:1. Windows dark's blue wash over the inherited dark-red `destructiveSoft`
measures **1.005:1**, and Linux dark's **1.044:1** — a selection highlight the
reader cannot see. The other dark platform sets clear it (macOS 1.235), and every
light set clears it (1.28+).

Both are the same class of omission plans `081` and `087` closed for the plain
surfaces and the state washes: the contract named the surfaces a component
*paints*, not the ones a *composition* produces.

## 2. Design decisions (do not re-litigate)

1. **The four soft surfaces join the selection contract** as their own lists,
   not by widening `selectionSurfaces`. That list maps each surface to a body
   role and assumes `mutedForeground` is the secondary text on it; a soft surface
   has neither (`xSoftForeground` carries its text, and a row description is not
   painted on an alert). So:
   - `selectionSoftPairs`: `xSoftForeground` over `selection` composited on
     `xSoft`, body floor (4 pairs).
   - `selectionSoftWashPairs`: the wash's own perceivability on `xSoft`, surface
     floor (4 pairs).
   `selectionPairs` (18) and `selectionWashPairs` (9) are unchanged.
2. **Light soft foregrounds move one ramp step darker** so the body floor holds
   through the wash in every light set. Identity light is edited; the platform
   light styles inherit the values and are covered by their own washes.

   | Role | Before | After | Washed before | Washed after |
   | ---- | ------ | ----- | ------------- | ------------ |
   | `infoSoftForeground` | blue 800 `#173A88` | blue 900 `#152F6B` | 6.62 (identity) / 6.56–6.70 (platforms) | ≥ 7.9 |
   | `successSoftForeground` | green 800 `#0E5135` | green 900 `#0A3A26` | 5.83 / 5.85–6.01 | ≥ 7.9 |
   | `warningSoftForeground` | amber 900 `#4B3100` | amber 950 `#2A1B00` | 7.34 (already passing) | ≥ 8.3 |
   | `destructiveSoftForeground` | red 800 `#7E1D21` | red 900 `#5C1619` | 6.25 / 6.16–6.35 | ≥ 8.1 |

3. **Identity dark lightens its soft foregrounds one step and weakens its wash
   to 20%.** At 24% the wash drags the four tones to 6.23–6.91 even with the
   lightest sensible family step; at 20% — the alpha every platform dark style
   already uses — the four clear 7:1 with margin. The four values become blue
   50 `#EFF4FF`, green 50 `#ECFDF3`, amber 50 `#FFF8E8`, red 50 `#FFF1F1`, and
   `darkColors.selection` becomes `#A7A9FF33`. The 20% wash on the dark surfaces
   stays visible (its own floor still passes on all nine + four surfaces).
4. **Windows dark strengthens its wash to 40%** (`#0067C040` → `#0067C066`). The
   20% blue wash is invisible on the dark-red soft fill; 40% keeps every
   selection text pair and every wash pair above its floor, including the four
   soft pairs, because the base stays the platform's own blue. 30% still failed
   the soft destructive wash at 1.03:1.
5. **Linux dark gives `destructiveSoft` its own darker fill** (`palette.red[950]`,
   `#3A0B0D`). Its wash base stays the light accent `#1C71D8` at 20% — the choice
   plan `081` made so white text keeps the body floor on the washes — and a
   lighter base at 15–40% broke `foreground` on `active` (5.74–6.98). The darker
   red makes the existing wash visible (1.13:1) and keeps the surface
   perceivable on `background`/`card`/`popover`, the border above the divider
   floor and the text above the body floor.
6. **High contrast does not move.** Its soft foregrounds already clear 7:1
   through the 30% wash (8.47+ at the lowest) and its wash is visible on all four
   soft fills (1.051+), so the AAA palette is untouched. The new lists are
   enforced there too, and the 1.051 figure is the gate's tightest margin.
7. **Pair counts.** `themeContrastFailures` reports 8 more failures when a theme
   breaks them; the documented counts become 18 selection text pairs + 4 soft
   text pairs, and 9 wash pairs + 4 soft wash pairs. `contrastPairs` stays 109.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/091-selection-in-soft-surfaces.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `091` row and paragraph |
| `packages/tokens/src/color.ts` | the eight soft foreground values, the two selection alphas |
| `packages/tokens/src/platform-styles/linux.ts` | dark `destructiveSoft: palette.red[950]` |
| `packages/tokens/src/contrast.ts` | `selectionSoftPairs`, `selectionSoftWashPairs`; report both |
| `packages/tokens/src/selection-soft.test.ts` | **new** — floors, both regressions, value wiring |
| `packages/tokens/src/contrast.test.ts` | the checker reports both new lists |
| `packages/tokens/src/docs.test.ts` | the wash percentage sentence, the soft-selection claims |
| `packages/tokens/src/readme.test.ts` | the soft-selection sentence |
| `packages/tokens/README.md` | the selection paragraph |
| `docs/tokens.md` | selection section, wash percentage, surface lists, verification |
| `docs/design-system.md` | §8 text selection row, §9 selection row |
| `COMPONENTS.md` | the three design-system rows' counts |
| `TODO.md` | tick the new row; bump the bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/color.ts`

In `lightColors` (the platform light styles inherit these):

```
infoSoftForeground: palette.blue[900]        // was blue[800]
successSoftForeground: palette.green[900]    // was green[800]
warningSoftForeground: palette.amber[950]    // was amber[900]
destructiveSoftForeground: palette.red[900]  // was red[800]
```

In `darkColors`:

```
infoSoftForeground: palette.blue[50]         // was blue[100]
successSoftForeground: palette.green[50]     // was green[100]
warningSoftForeground: palette.amber[50]     // was amber[100]
destructiveSoftForeground: palette.red[50]   // was red[100]
selection: "#A7A9FF33"                       // was #A7A9FF3D (20%, was 24%)
```

Update the `darkColors` comment: the 20% wash is what keeps the soft status text
at the body floor while staying visible on every painted surface.

In `highContrastLightColors` and `highContrastDarkColors`: no value changes.

### 4.2 `packages/tokens/src/platform-styles/linux.ts`

In `colors.dark`, add `destructiveSoft: palette.red[950],` and import `palette`
from `../color.js`. Extend the file comment: the darker soft destructive fill
keeps the light-accent selection wash visible on it (plan 091).

### 4.3 `packages/tokens/src/platform-styles/windows.ts`

Change the dark `selection` from `#0067C033` to `#0067C066` and extend the
comment: a 20% wash is invisible on the dark-red soft destructive fill; 40%
clears the wash floor without moving any text pair.

### 4.4 `packages/tokens/src/contrast.ts`

After `selectionWashPairs`, add:

```ts
/**
 * The soft status surfaces a selected glyph is painted on. An Alert, Badge or
 * Toast is text a reader copies, and the wash composites over its fill, so the
 * hint that carries the text is held to the body floor like the plain surfaces.
 */
export const selectionSoftPairs: readonly ContrastPair[] =
  softSurfaceRoles.map(
    (role): ContrastPair => [
      `${role}Foreground` as keyof ThemeColors,
      role,
      "body",
    ],
  );

/**
 * The surfaces the selection wash must stay visible on inside a soft status
 * surface. A highlight that disappears on a dark destructive tint is still a
 * failed selection, so each fill is compared with the composited wash.
 */
export const selectionSoftWashPairs: readonly ContrastPair[] =
  softSurfaceRoles.map(
    (role): ContrastPair => ["selection", role, "surface"],
  );
```

The template literal is typed `keyof ThemeColors` only after the compiler sees
the literal union; if TypeScript rejects the assertion, replace the map with an
explicit tuple list (no cast):

```ts
const selectionSoftPairs: readonly ContrastPair[] = [
  ["infoSoftForeground", "infoSoft", "body"],
  ["successSoftForeground", "successSoft", "body"],
  ["warningSoftForeground", "warningSoft", "body"],
  ["destructiveSoftForeground", "destructiveSoft", "body"],
];
```

Extend `themeContrastFailures` with both lists, using the same composite
arithmetic as `selectionPairs`/`selectionWashPairs` and reporting
`wash: "selection"`. Return them after the existing three groups. Extend the JSDoc
sentence to name the soft surfaces.

### 4.5 `packages/tokens/src/selection-soft.test.ts` (new)

Header must state the defect:

```ts
/**
 * Guards the defect plan 091 fixed: the selection contract named nine surfaces
 * but not the four soft status surfaces an Alert, Badge or Toast paints, and
 * selecting their text was not measured. Identity light `successSoftForeground`
 * through the wash measured 5.83:1, under the body floor, and Windows dark's
 * wash over `destructiveSoft` measured 1.005:1 — an invisible highlight.
 */
```

Tests:

1. **Every shipped set clears the floors on all four soft surfaces.** Build the
   theme list as `status-soft-border.test.ts` does (identity four + platform
   variants), then for each tone assert
   `contrastRatio(xSoftForeground, compositeOver(selection, xSoft)) >=
   contrastFloors[theme.contrast].body` and
   `contrastRatio(compositeOver(selection, xSoft), xSoft) >= floor.surface`.
2. **Exact regression, text.** On identity light:
   `compositeOver(selection, successSoft)` with the *old* foreground
   `palette.green[800]` measures < 7 while the shipped value measures >= 7.
3. **Exact regression, wash.** On Windows dark, the *old* wash
   `#0067C033` over `destructiveSoft` measures < 1.05 while the shipped role
   measures >= 1.05. Assert the shipped wash is `#0067C066`.
4. **Linux dark keeps the body floor on the pressed wash** with its own dark
   `destructiveSoft` and its unchanged wash: `foreground`/`mutedForeground` on
   `active`/`selected` at the floors (the failure a lighter wash base produced).
5. **The public checker reports both.** Set
   `successSoftForeground` to the old value and `selection` to the old alpha in
   an extended theme; `themeContrastFailures` contains the text pair and the
   Windows-dark-shaped wash pair. Keep this test to the identity theme for text
   and construct the wash failure with a theme extended from
   `getPlatformTheme("win32", "dark")`.

Keep the file under ~110 lines.

### 4.6 `packages/tokens/src/contrast.test.ts`

- The "passes every shipped theme" test now also covers the two new lists —
  extend `themeContrastFailures` and the test will catch it.
- Any assertion on the number of reported failures for a deliberately broken
  theme must be recomputed (run the suite and adjust only the expected count and
  the named pairs; do not delete assertions).

### 4.7 `packages/tokens/src/docs.test.ts`

- The selection-wash percentage test currently asserts dark equals light; it
  becomes light 24%, dark 20%, high contrast 30%, built from the alpha bytes.
  Replace the sentence assertion with the new wording in §4.8.
- Add: the soft surfaces are named in the selection prose and their pairs are
  built from `selectionSoftPairs`/`selectionSoftWashPairs`, the same way the
  `xText` surfaces are built from `contrastPairs`.
- The regression figures (5.83 and 1.005) are quoted in `docs/tokens.md`; derive
  them with `contrastRatio`, `compositeOver` and the old values written as the
  documented "before" literals in the sentence builder.

### 4.8 `docs/tokens.md`

- §Selection: the surface lists become nine plain + four soft, the text-pair
  list gains `xSoftForeground` over each soft fill, and the wash list gains the
  four soft fills. State the two regressions and the fixes:
  > The audit found two: identity light `successSoftForeground` measured 5.83:1
  > through the wash, under the 7:1 body floor, and Windows dark's wash over
  > `destructiveSoft` measured 1.005:1, an invisible highlight. The four light
  > soft foregrounds moved one family step darker, the dark ones one step
  > lighter with a 20% identity wash, Windows dark's wash moved to 40%, and
  > Linux dark's soft destructive fill moved to `#3A0B0D` so its light-accent
  > wash stays visible.
- The wash percentage sentence: "24% in the light default theme, 20% in dark and
  30% at high contrast" (exact wording must match the updated `docs.test.ts`
  builder).
- §Verification: the selection paragraph gains the soft surfaces and the two
  figures; the count sentences mention 18 + 4 text pairs and 9 + 4 wash pairs.
- §Platform styles: the Linux and Windows rows/notes mention their wash values
  only if the page lists them (it lists primary, not selection; do not add a
  column).

### 4.9 `docs/design-system.md`

- §8 text selection row: add "and the four soft status fills" to the surfaces.
- §9 table: the selection rows already say `background`/`card`/…; add the soft
  fills to the text row and the wash row.
- §4: no change (role count unchanged).

### 4.10 `packages/tokens/README.md`, `readme.test.ts`, `COMPONENTS.md`, `TODO.md`

- README selection paragraph: name the four soft surfaces and one sentence with
  the two regressions; `readme.test.ts` asserts that sentence.
- `COMPONENTS.md` *Theme contrast check* row: "18 selection pairs and 9 wash
  pairs" → "18 + 4 selection pairs and 9 + 4 wash pairs", add the plan-091
  sentence with the two figures. *High-contrast theme* and *Design tokens* rows:
  no role count change (58 stays).
- `TODO.md`: add and tick the row, bump `58/76` → `59/77`.
- `.agents/slop/plans/README.md`: add the `091` row after `090` and a paragraph.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 29 files, `check`/`lint`/root `test`
clean.

**Two-direction proof:**

1. Restore the light `successSoftForeground` to `palette.green[800]` and run the
   suite: `selection-soft.test.ts` must fail on the identity-light body pair
   (5.83 < 7) and on the exact-regression test. Restore.
2. Restore Windows dark `selection` to `#0067C033`: the wash pair must fail at
   1.005 < 1.05. Restore.
3. Confirm the final suite is green.

## 6. STOP conditions

- If moving a soft foreground one step changes an *unwashed* floor failure, stop
  and report: the values above were checked against the plain pairs, so a
  failure means a platform style overrides a soft role unexpectedly.
- If the identity dark 20% wash drops any of the existing 9 wash pairs below
  1.05, stop: the wash is still meant to be visible; do not lower the floor.
- If Windows dark at 40% pushes `foreground` on `active` below 7:1, stop and
  report the measured value — do not darken other Windows surfaces to force it.
- If Linux dark's `#3A0B0D` soft destructive fill fails the 1.05 surface floor on
  its own card or popover, stop and report; the measured values pass, so a
  failure means the platform's surfaces moved.
- Do not widen `selectionSurfaces`; the two soft lists exist because the surface
  roles differ.
- Do not use `as` casts to build the pair lists; use explicit tuples if the
  template literal does not type-check.

## 7. Acceptance

- [ ] `selectionSoftPairs` and `selectionSoftWashPairs` are public and reported
      by `themeContrastFailures`.
- [ ] Every shipped theme clears the body floor through the wash and the 1.05
      wash floor on all four soft fills.
- [ ] Both exact regressions are guarded in both directions (5.83:1 text,
      1.005:1 wash).
- [ ] The light and dark soft foreground values, identity dark 20% wash, Windows
      dark 40% wash and Linux dark soft destructive fill are shipped and
      documented.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` state the surfaces, the counts and the two figures, all
      built from the implementation.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.
