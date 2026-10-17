# 099 — The modal scrim must be perceivable on every surface it covers

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
013, 071, 073, 076, 086, 087, 094 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`

## 1. The defect

`colors.overlay` is the modal scrim — the translucent wash a Dialog paints across
the window behind its panel (`packages/components/src/dialog.tsx:302` reads
`backgroundColor: theme.colors.overlay`). It is one of the five roles the
contrast contract declares exempt:

```ts
[
  "overlay",
  "a modal scrim; its job is to obscure, and the content beneath it is the measured surface",
],
```

That reason confuses the content behind the scrim with the scrim itself. The
scrim's own job is to **change** the surface beneath it; a scrim that paints the
surface's own value is invisible, and a modal then looks like an ordinary panel.
This is exactly the failure class plans 076–095 closed for the soft status
surfaces, the skeleton and the selection wash — all measured as "a painted value
must stay perceivable on the surface it sits on".

Measured over the base surfaces the scrim covers
(`background`, `card`, `muted`, `popover`), the ten shipped colour sets are:

| Set | `overlay` | `background` | `card` | `muted` | `popover` |
| --- | --------- | ------------ | ------ | ------- | --------- |
| light | `#00000073` | 3.336 | 3.363 | 3.301 | 3.363 |
| dark | `#000000A6` | 1.093 | 1.172 | 1.289 | 1.289 |
| high-contrast light | `#000000A6` | 7.005 | 7.005 | 6.764 | 7.005 |
| **high-contrast dark** | `#000000CC` | **1.000** | 1.061 | 1.171 | 1.113 |
| macOS light | `#00000073` | 3.297 | 3.363 | 3.255 | 3.363 |
| macOS dark | `#000000A6` | 1.164 | 1.375 | 1.375 | 1.375 |
| Linux light | `#00000073` | 3.302 | 3.363 | 3.269 | 3.363 |
| Linux dark | `#000000A6` | 1.252 | 1.431 | 1.431 | 1.431 |
| Windows light | `#00000073` | 3.325 | 3.363 | 3.283 | 3.363 |
| Windows dark | `#000000A6` | 1.208 | 1.354 | 1.354 | 1.354 |

The AAA dark theme's scrim is **1.000:1 on its own canvas**: on a pure black
background an 80% black veil is still pure black, so the accessibility theme
ships an invisible modal backdrop while every suite stays green. The near misses
on `card`/`popover` (1.061/1.113) are the same mechanism on a slightly lighter
surface.

## 2. Decision (do not re-litigate)

- The scrim is a **wash**, measured like the selection wash: composite `overlay`
  over the surface and hold the result to the `surface` floor (1.05:1 at both
  contrast levels), the floor the library already uses for a painted value that
  must be visible on a surface.
- The measured surfaces are the app's **base layout**: `background`, `card`,
  `muted` (a quiet sidebar/settings panel) and `popover` (a modal opened from a
  menu). Row washes are deliberately not included: the pointer leaves the row to
  reach the dialog, so a scrim over a transient hover is not a composition the
  design system supports.
- A dark scrim **cannot darken a pure black canvas**. The high-contrast dark
  theme therefore veils with light: `overlay` becomes `#FFFFFF26` (15% white),
  which paints `#262626` on the canvas — 1.388:1, visibly a veil, still dark, and
  leaving the dialog's `#0D0D0D` panel separated by both its edge and the
  elevation shadow. The alternative — keeping the black scrim and documenting an
  invisible backdrop — would be a decorative placeholder presented as a working
  state, which the mission forbids.
- No other theme changes: every other shipped scrim already clears the floor, so
  their pixels stay byte-for-byte.
- `overlay` stops being exempt; `scrollbar`, `shadow`, `disabled` and
  `disabledForeground` stay exempt for the reasons already recorded.

## 3. Exact values

| Theme | Role | Before | After | Ratio on the theme's canvas |
| ----- | ---- | ------ | ----- | --------------------------- |
| high-contrast dark | `overlay` | `#000000CC` | `#FFFFFF26` | 1.000 → 1.388 |

New pairs (all `surface`, floor 1.05 default and high):
`overlay` over `background`, `overlay` over `card`, `overlay` over `muted`,
`overlay` over `popover`. Post-fix AAA dark ratios: 1.388 / 1.494 / 1.578 / 1.548.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

1. After `selectionSoftWashPairs`, add:

   ```ts
   /**
    * The surfaces a modal scrim covers. A dialog's scrim is painted across the
    * window, so the app's base layout is behind it: the canvas, a card, the quiet
    * panel and the floating surface. A scrim that composites to its own surface
    * is an invisible modal backdrop, so each is held to the `surface` floor.
    */
   export const overlaySurfaces = [
     "background",
     "card",
     "muted",
     "popover",
   ] as const;

   export const overlayWashPairs: readonly ContrastPair[] = overlaySurfaces.map(
     (surface): ContrastPair => ["overlay", surface, "surface"],
   );
   ```

2. Collapse the five copy-pasted composite loops in `themeContrastFailures` into
   two local helpers — the same shapes, no behaviour change except the new pair
   list:

   ```ts
   const textOverWashFailures = (
     pairs: readonly ContrastPair[],
     wash: keyof ThemeColors,
     theme: Theme,
     floors: Readonly<Record<ContrastPairClass, number>>,
   ): ReadonlyArray<ContrastFailure> =>
     pairs.flatMap(([foreground, background, pairClass]) => {
       const ratio = contrastRatio(
         theme.colors[foreground],
         compositeOver(theme.colors[wash], theme.colors[background]),
       );
       const floor = floors[pairClass];
       return ratio >= floor
         ? []
         : [{ foreground, background, wash, pairClass, floor, ratio }];
     });

   const washVisibilityFailures = (
     pairs: readonly ContrastPair[],
     wash: keyof ThemeColors,
     theme: Theme,
     floors: Readonly<Record<ContrastPairClass, number>>,
   ): ReadonlyArray<ContrastFailure> =>
     pairs.flatMap(([foreground, background, pairClass]) => {
       const painted = compositeOver(
         theme.colors[wash],
         theme.colors[background],
       );
       const ratio = contrastRatio(painted, theme.colors[background]);
       const floor = floors[pairClass];
       return ratio >= floor
         ? []
         : [{ foreground, background, wash, pairClass, floor, ratio }];
     });
   ```

   The returned array keeps the existing order and appends the scrim last:

   ```ts
   return [
     ...pairFailures,
     ...textOverWashFailures(selectionPairs, "selection", theme, floors),
     ...washVisibilityFailures(selectionWashPairs, "selection", theme, floors),
     ...textOverWashFailures(selectionSoftPairs, "selection", theme, floors),
     ...washVisibilityFailures(selectionSoftWashPairs, "selection", theme, floors),
     ...washVisibilityFailures(overlayWashPairs, "overlay", theme, floors),
   ];
   ```

3. Extend `themeContrastFailures`'s JSDoc: the scrim is composited over the base
   surfaces and reported with `wash: "overlay"`; high-contrast dark used to
   measure 1.000:1 on its own canvas.

### 4.2 `packages/tokens/src/color.ts`

Change `highContrastDarkColors.overlay` from `#000000CC` to `#FFFFFF26`, and
widen the `ThemeColors.overlay` JSDoc: *modal scrim; translucent, because the
surfaces beneath it must stay recognisable. A pure black canvas cannot be
darkened, so the AAA dark theme veils with light.* No other value moves.

### 4.3 `packages/tokens/src/contrast.test.ts`

- Remove the `overlay` entry from `exempt` (its reason is no longer true).
- Add `...overlayWashPairs` to `measuredRoles`.
- In `covers every documented pair`, add
  `expect(overlayWashPairs.length).toBe(4)` and a uniqueness assertion, matching
  the neighbouring lists.
- Keep every existing exact-equality test untouched: no other shipped value
  moves, and the scrim pairs only add failures when a theme's scrim is invisible.

### 4.4 `packages/tokens/src/overlay-scrim.test.ts` (new)

Header comment: *Guards the defect plan 099 fixed: `colors.overlay` was exempt
from the contract, so high-contrast dark's `#000000CC` scrim composited to
`#000000` on its own canvas — a 1.000:1 modal backdrop — while every suite stayed
green.*

Tests:

1. **Every shipped set clears the floor** — identity `lightTheme`/`darkTheme`,
   both high-contrast themes, and `getPlatformTheme(platform, mode)` for
   `darwin`/`linux`/`win32` × `light`/`dark`, over each of `overlaySurfaces`,
   asserting `contrastRatio(compositeOver(overlay, surface), surface) >= 1.05`.
2. **The old value is reported by the public checker** — build
   `extendTheme(highContrastDarkTheme, { colors: { overlay: "#000000CC" } })` and
   assert `themeContrastFailures(regressed)` equals exactly one failure:
   `{ foreground: "overlay", background: "background", wash: "overlay",
   pairClass: "surface", floor: 1.05, ratio: 1 }`.
3. **The AAA dark scrim is a light veil** — assert
   `compositeOver(regressedFix.colors.overlay, "#000000")` is not `"#000000"`, so
   the fix cannot be "make the scrim black and lower the floor".
4. **The pair list is the documented one** — `overlayWashPairs` is
   `[["overlay","background","surface"], …]` for the four surfaces.

The header comment names the bug and the file fails without the fix (test 2 and
the high-contrast loops fail on the old value).

### 4.5 `docs/tokens.md`

1. The high-contrast colour table's `overlay` row becomes
   `#000000A6` / `#FFFFFF26` (the docs test derives this from the implementation).
2. In *Checking a theme*, add a paragraph after the selection-wash description:
   `overlayWashPairs` holds the modal scrim — `overlay` composited over
   `background`, `card`, `muted` and `popover` — to 1.05:1, reported with
   `wash: "overlay"`; the audit found high-contrast dark's `#000000CC` measured
   1.000:1 on the pure black canvas, so the AAA theme veils with a 15% white
   wash instead (a dark veil cannot darken black).
3. In the *Verification* section, add the same demonstration to the list of
   regressions the suite caught, and mention the scrim in the paragraph that
   enumerates what the suite enforces.
4. In the completeness paragraph, change “five that are not pairs” to “four”,
   drop `overlay` from the exemption list and name `overlayWashPairs` among the
   measured lists.
5. Keep the `overlay` row's short description “modal scrim”; no new role is
   introduced.

### 4.6 `docs/design-system.md`

1. §7 (radii, borders and elevation): replace the one-line scrim sentence with a
   short paragraph: the scrim is a translucent wash held to 1.05:1 on the four
   base surfaces; it is how a modal separates itself from the app; the AAA dark
   canvas cannot be darkened, so that theme veils with light. Keep the
   `elevation.overlay` sentence — it is a different concept (a reserved shadow
   level) and must not be conflated with the scrim.
2. §9 table: add a row — `modal scrim (overlay composited over background/card/
   muted/popover) | 1.05:1 | 1.05:1`.
3. §9 narrative: the contract now covers the scrim too; mention that the AAA
   dark backdrop was invisible until plan 099.

### 4.7 `packages/tokens/README.md`

After the selection-wash sentence in the contrast paragraph, add one sentence:
the modal scrim is measured the same way — composited over the four base
surfaces and held to 1.05:1, which caught the AAA dark theme's invisible black
veil on its pure black canvas (plan 099).

### 4.8 `COMPONENTS.md`

- *Theme contrast check* row: append the plan 099 clause — `overlayWashPairs`
  adds four scrim pairs; high-contrast dark's `#000000CC` measured 1.000:1 on the
  canvas and became `#FFFFFF26`; `overlay` leaves the exemption list.
- *High-contrast theme* row: one clause that the AAA dark scrim veils with light
  because black cannot darken a black canvas.

### 4.9 `TODO.md`

Under **Design tokens and theming (`tokens-theme`)** add and tick:

```
`[x]` Hold the modal scrim to the perceivability floor — `overlay` was exempt,
so high-contrast dark's `#000000CC` scrim composited to 1.000:1 on its pure black
canvas and the AAA dialog shipped an invisible backdrop; the scrim is now
measured over the four base surfaces and the AAA dark theme veils with 15% white
(plan 099)
```

Update the progress bar `66/85` → `67/86`. No cross-team row: the fix is inside
the package and its documents.

### 4.10 Plan index

Add 099 to the `tokens-theme` table with status `done`, plus a closing narrative
paragraph recording the 1.000:1 figure and the light-veil decision.

## 5. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test -- src/overlay-scrim.test.ts` | the new file fails before §4.2 on the AAA dark pair at **1.000:1** |
| 2 | `nub run --filter @gpuixui/tokens test` | 35 files green, 1757 + the new tests |
| 3 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run fmt` | exit 0 |
| 6 | `nub run check` | exit 0 |
| 7 | `nub run test` | exit 0 |

## 6. Test plan — proof in both directions

1. Add the contract plumbing and the new suite **before** changing the colour,
   and run it: it fails on high-contrast dark's `overlay`/`background` at
   **1.000:1**, proving the AAA scrim was invisible. Also observe
   `contrast.test.ts`'s “passes every shipped theme” fail for the same pair —
   that is the same guard through the public checker.
2. Change `overlay` to `#FFFFFF26`; the same tests pass, and the new file proves
   the post-fix ratios (1.388 / 1.494 / 1.578 / 1.548) in AAA dark.
3. Temporarily drop the `...washVisibilityFailures(overlayWashPairs, …)` line and
   observe the regression test fail because the checker returns no failure for
   the old scrim; restore.
4. Temporarily put `overlay` back in the `exempt` list with the new pairs still
   measured and observe `no stale exemption` fail; restore.
5. Temporarily set the AAA dark scrim back to `#000000CC` and observe both the
   new suite and `contrast.test.ts` fail; restore.

## 7. STOP conditions

Stop and report, do not improvise, if:

- a shipped set other than the AAA dark scrim misses the 1.05:1 floor — that is a
  second defect, and the plan's values are not the fix;
- the light veil needs a value that fails the `surface` floor or makes the AAA
  dialog panel unreadable — the floor and the panel are fixed, the veil is the
  variable;
- a change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md` or `TODO.md`;
- a step needs `any`, a cast, a retyped role or surface list, or a lower floor.

## 8. Acceptance

- [x] `overlayWashPairs` is public and part of `themeContrastFailures`.
- [x] All ten shipped colour sets clear 1.05:1 on the four base surfaces.
- [x] High-contrast dark's scrim veils with light and is proven by the checker.
- [x] `overlay` is measured, not exempt; the completeness guard still passes.
- [x] `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md`,
      `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint` and `nub run test` pass — run, not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 9. Outcome (executed on this host, 2026-10-17)

- The defect was real and the new suite caught it before the colour changed:
  `high-contrast dark: overlay on background: expected 1 to be >= 1.05`, and
  `contrast.test.ts`'s “passes every shipped theme” failed with an `overlay`
  failure for the same set. The catalogue's high-contrast table also disagreed
  with the implementation, because the docs test derives every value.
- `highContrastDarkColors.overlay` is `#FFFFFF26`; the other nine scrims are
  byte-for-byte unchanged. Post-fix AAA dark ratios: 1.388 on `background`,
  1.494 on `card`, 1.578 on `muted`, 1.548 on `popover`.
- `overlaySurfaces` and `overlayWashPairs` are public; `themeContrastFailures`
  reports them with `wash: "overlay"`. The five copy-pasted composite loops
  collapsed into `textOverWashFailures` and `washVisibilityFailures`, so the new
  contract added one call instead of a fourth block. `overlay` left the
  exemption list; `scrollbar`, `shadow`, `disabled` and `disabledForeground`
  remain argued exemptions.
- Two-direction evidence, run and reverted:
  - **old value**: the new suite and `contrast.test.ts` fail at **1.000:1**, and
    the light-veil test fails with `expected '#000000' not to be '#000000'`;
    restored, both pass;
  - **no scrim check**: dropping the `overlayWashPairs` call fails the
    regression test with `expected [] to deeply equal [ { foreground: 'overlay',
    … } ]`; restored;
  - **stale exemption**: re-adding `overlay` to the exempt list fails
    `overlay: expected true to be false`; restored.
- Green: **35 test files, 1761 tests** (1757 before the four new ones).
  `nub run check` and `nub run test` were run and passed.
- The scrim story is documented in `docs/tokens.md` (role table, checker and
  verification sections, completeness list), `docs/design-system.md` (§7 and
  §9), the package README, `COMPONENTS.md` and `TODO.md`.
