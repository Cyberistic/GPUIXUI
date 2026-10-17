# 013 — High-contrast accessibility themes

**Workstream:** `tokens-theme`
**Phase:** B (working foundation)
**Depends on:** plan 011 (the implemented `@gpuixui/tokens`).
**Files owned:** `packages/tokens/**`, `docs/tokens.md`, `docs/design-system.md`,
this plan, `.agents/slop/plans/README.md` (index row only), `TODO.md` (this
workstream only), `COMPONENTS.md` (design-system section only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order. Where a value is given, use it exactly.

---

## 1. Why

`MISSION.md` requires "high-contrast considerations" in the design system. Plan
011 §10 deferred it: the shipped floors are WCAG AA. This plan adds a
**high-contrast variant of each mode** that raises the floors to AAA where it
matters and makes essential boundaries and focus rings meet non-text contrast
with room to spare.

The variant reuses the **same 37 semantic roles**. No new role is introduced —
that is the point of the semantic model: a brand or an accessibility variant
changes values, never the role set, so no component changes.

## 2. Design decision (do not re-litigate)

A high-contrast theme is an ordinary `Theme`. It is **not** a third
`ThemeMode`: the canvas is still light or dark. `ThemeMode` stays
`"light" | "dark"`; the contrast dimension is a separate lookup.

```ts
export type ThemeContrast = "default" | "high";
```

API additions, all additive and backward compatible:

```ts
// color.ts
export const highContrastLightColors: ThemeColors;
export const highContrastDarkColors: ThemeColors;

// theme.ts
export const highContrastLightTheme: Theme; // name "High contrast light", mode "light"
export const highContrastDarkTheme: Theme;  // name "High contrast dark",  mode "dark"
export const highContrastThemes: Readonly<Record<ThemeMode, Theme>>;
export function getTheme(mode: ThemeMode, contrast?: ThemeContrast): Theme;
```

`getTheme(mode)` keeps returning the default theme (existing callers are
unaffected). `getTheme(mode, "high")` returns the high-contrast theme.

High-contrast themes reuse the existing default elevation (`lightElevation`,
`darkElevation`) and the existing typography, spacing, radius, density, border
width and icon sizes. Only colour values change; shadows are decorative and do
not affect WCAG contrast, and high contrast earns separation from the stronger
`border`/`borderStrong`/`ring` values instead. This keeps the variant small and
honest.

## 3. Exact values

Add to `packages/tokens/src/color.ts`, using `satisfies ThemeColors`, after
`darkColors`.

### 3.1 `highContrastLightColors`

| Role | Value |
| ---- | ----- |
| `background` | `#FFFFFF` |
| `foreground` | `#000000` |
| `card` | `#FFFFFF` |
| `cardForeground` | `#000000` |
| `popover` | `#FFFFFF` |
| `popoverForeground` | `#000000` |
| `primary` | `#3B2C8F` |
| `primaryForeground` | `#FFFFFF` |
| `secondary` | `#E8E8E8` |
| `secondaryForeground` | `#000000` |
| `muted` | `#F2F2F2` |
| `mutedForeground` | `#1F1F1F` |
| `accent` | `#E0E3FF` |
| `accentForeground` | `#2E2370` |
| `destructive` | `#7E1D21` |
| `destructiveForeground` | `#FFFFFF` |
| `success` | `#0E5135` |
| `successForeground` | `#FFFFFF` |
| `warning` | `#F5B01F` |
| `warningForeground` | `#000000` |
| `border` | `#6E7683` |
| `borderStrong` | `#4A4F58` |
| `input` | `#FFFFFF` |
| `inputForeground` | `#000000` |
| `placeholder` | `#4A4F58` |
| `ring` | `#4C39B5` |
| `selection` | `#7567F24D` |
| `overlay` | `#000000A6` |
| `hover` | `#E8E8E8` |
| `active` | `#D6D6D6` |
| `selected` | `#E0E3FF` |
| `selectedForeground` | `#2E2370` |
| `disabled` | `#E8E8E8` |
| `disabledForeground` | `#5A5A5A` |
| `skeleton` | `#D6D6D6` |
| `scrollbar` | `#9A9A9A` |
| `shadow` | `#00000040` |

### 3.2 `highContrastDarkColors`

| Role | Value |
| ---- | ----- |
| `background` | `#000000` |
| `foreground` | `#FFFFFF` |
| `card` | `#0D0D0D` |
| `cardForeground` | `#FFFFFF` |
| `popover` | `#141414` |
| `popoverForeground` | `#FFFFFF` |
| `primary` | `#C7CBFF` |
| `primaryForeground` | `#000000` |
| `secondary` | `#2E2E2E` |
| `secondaryForeground` | `#FFFFFF` |
| `muted` | `#1A1A1A` |
| `mutedForeground` | `#E0E0E0` |
| `accent` | `#1C1547` |
| `accentForeground` | `#E0E3FF` |
| `destructive` | `#FF9E9E` |
| `destructiveForeground` | `#000000` |
| `success` | `#6FE0A3` |
| `successForeground` | `#000000` |
| `warning` | `#FFC94D` |
| `warningForeground` | `#000000` |
| `border` | `#7A7A7A` |
| `borderStrong` | `#A0A0A0` |
| `input` | `#0D0D0D` |
| `inputForeground` | `#FFFFFF` |
| `placeholder` | `#B0B0B0` |
| `ring` | `#C7CBFF` |
| `selection` | `#C7CBFF4D` |
| `overlay` | `#000000CC` |
| `hover` | `#2E2E2E` |
| `active` | `#3D3D3D` |
| `selected` | `#1C1547` |
| `selectedForeground` | `#E0E3FF` |
| `disabled` | `#2E2E2E` |
| `disabledForeground` | `#8A8A8A` |
| `skeleton` | `#3D3D3D` |
| `scrollbar` | `#8A8A8A` |
| `shadow` | `#000000B3` |

## 4. Floors (the reason these values were chosen)

| Pair class | Default floors | High-contrast floors |
| ---------- | -------------- | -------------------- |
| body text on background/card/popover | 7:1 | 7:1 |
| secondary text, on-colour text, placeholder | 4.5:1 | **7:1** |
| focus ring, essential boundary (`borderStrong`) | 3:1 | **4.5:1** |
| decorative `border` on background | not asserted | 3:1 |

Every value in §3 meets its floor with the ratios below (computed with the WCAG
2 relative-luminance formula; the executor must reproduce these from the test,
not trust the table blindly).

## 5. Files to change

All paths relative to the worktree root.

```
packages/tokens/src/color.ts          add the two colour sets + JSDoc
packages/tokens/src/theme.ts          add the two themes, highContrastThemes, getTheme contrast arg
packages/tokens/src/theme.test.ts     assert the new exports and the contrast lookup
packages/tokens/src/color.test.ts     add the two sets to the contrast matrix with stricter floors
packages/tokens/src/high-contrast.example.ts   new, runnable selection example
docs/tokens.md                        high-contrast section + role table + limitation update
docs/design-system.md                 accessibility + extension + non-goals update
COMPONENTS.md                         one design-system row
TODO.md                               one task, ticked
.agents/slop/plans/README.md          index row for this plan
```

`packages/tokens/src/index.ts` needs no change: `color.js` and `theme.js` are
already re-exported with `export *`.

## 6. Code changes

### 6.1 `color.ts`

Add JSDoc stating the set raises the contrast floors to AAA for text and 4.5:1
for essential boundaries, and that it is a *value* variant of the same 37 roles.
Then the two objects from §3.

### 6.2 `theme.ts`

```ts
import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  type ThemeColors,
} from "./color.js";

/** Contrast variants the library ships. */
export type ThemeContrast = "default" | "high";

/** The high-contrast light theme. */
export const highContrastLightTheme: Theme = {
  name: "High contrast light",
  mode: "light",
  colors: highContrastLightColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: lightElevation,
  borderWidth,
  iconSize,
};

/** The high-contrast dark theme. */
export const highContrastDarkTheme: Theme = {
  name: "High contrast dark",
  mode: "dark",
  colors: highContrastDarkColors,
  typography,
  spacing,
  radius,
  density: defaultDensity,
  elevation: darkElevation,
  borderWidth,
  iconSize,
};

/** High-contrast themes by mode. */
export const highContrastThemes: Readonly<Record<ThemeMode, Theme>> = {
  light: highContrastLightTheme,
  dark: highContrastDarkTheme,
};
```

Change `getTheme` to:

```ts
/**
 * Return a built-in theme for a mode and contrast level.
 *
 * @example
 * ```ts
 * const accessible = getTheme("dark", "high");
 * ```
 */
export function getTheme(
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  return contrast === "high" ? highContrastThemes[mode] : themes[mode];
}
```

### 6.3 `high-contrast.example.ts`

```ts
import {
  highContrastThemes,
  themes,
  type Theme,
  type ThemeMode,
} from "./index.js";

/**
 * Resolve the built-in theme for a mode and an accessibility preference.
 * A real application stores the preference and calls this once per render.
 */
export const resolveTheme = (mode: ThemeMode, highContrast: boolean): Theme =>
  highContrast ? highContrastThemes[mode] : themes[mode];
```

## 7. Test plan

Every test must be able to fail. No test asserts a literal against itself.

### 7.1 `color.test.ts` (the load-bearing change)

Refactor the matrix so each colour set carries its own floors. Keep the existing
lists of pairs; drive them with a per-set threshold:

```ts
type ThemeEntry = {
  readonly label: string;
  readonly colors: ThemeColors;
  readonly body: number;        // foreground-on-surface floor
  readonly secondary: number;   // muted/secondary/on-colour/placeholder floor
  readonly boundary: number;    // borderStrong and ring floor
};

const entries: readonly ThemeEntry[] = [
  { label: "light", colors: lightColors, body: 7, secondary: 4.5, boundary: 3 },
  { label: "dark", colors: darkColors, body: 7, secondary: 4.5, boundary: 3 },
  { label: "high-contrast light", colors: highContrastLightColors, body: 7, secondary: 7, boundary: 4.5 },
  { label: "high-contrast dark", colors: highContrastDarkColors, body: 7, secondary: 7, boundary: 4.5 },
];
```

Then generate one `it` per (set, pair) using the pair's class to pick the floor.
Add the `border`-on-`background` pair at floor `boundary === 4.5 ? 3 : 0`…
**do not** add a 0-floor assertion: instead assert `border` on `background` only
for the high-contrast entries at 3.

Extend the "same roles" and grammar checks to iterate over all four sets, and
add a smoke check that the high-contrast set is different from its default
counterpart (`expect(highContrastLightColors.foreground).not.toBe(lightColors.foreground)`).

Header comment stays: *"Guards the WCAG contrast floors of every semantic
text/surface pair in every shipped theme."*

**Two-direction proof (required).** The contrast test is the regression guard.
Prove it can fail:
1. Temporarily set `highContrastLightColors.mutedForeground` to `#6E7683` in
   `color.ts` (fails the 7:1 floor).
2. `nub run --filter @gpuixui/tokens test` — capture the failure.
3. Restore the value; run again — capture the pass.
Record both outputs in the commit body or the agent status log. Do not claim the
proof without running both directions.

### 7.2 `theme.test.ts`

- `highContrastThemes.light === highContrastLightTheme`, `.dark === highContrastDarkTheme`.
- `getTheme("light") === lightTheme` and `getTheme("dark", "default") === darkTheme` (unchanged default behaviour).
- `getTheme("light", "high") === highContrastLightTheme`, `getTheme("dark", "high") === highContrastDarkTheme`.
- `highContrastLightTheme.mode === "light"`, `highContrastDarkTheme.mode === "dark"`.
- `highContrastLightTheme.name === "High contrast light"` (guards the label a preview shows).
- `extendTheme(highContrastLightTheme, { colors: { primary: "#123456" } }).mode === "light"` and the primary changed — proves HC themes compose through the normal mechanism.
- `resolveTheme("dark", true) === highContrastDarkTheme` and `resolveTheme("dark", false) === darkTheme`.

### 7.3 Existing tests

`typography.test.ts`, `scale.test.ts`, `styles.test.ts`, `react.test.tsx` need
no change; they do not enumerate themes. If any existing assertion compares
`Object.keys` of `lightColors`/`darkColors` only, extend it to the HC sets.

## 8. Documentation

### 8.1 `docs/tokens.md`

- Update **Import** to mention `getTheme(mode, "high")`, `highContrastThemes`,
  `highContrastLightTheme`, `highContrastDarkTheme`, `type ThemeContrast`.
- Add a **High contrast** section after the colour roles table: the full
  high-contrast light/dark role table from §3, the selection snippet, and the
  note that it reuses the same roles, type, spacing, radius and density and only
  changes colour values.
- Update **Limitations and future work**: remove "No high-contrast (AAA) theme
  yet"; keep the others.

### 8.2 `docs/design-system.md`

- §4 (Light and dark): add a sentence that each mode has a high-contrast
  variant that raises secondary text to 7:1 and boundaries to 4.5:1.
- §9 (Accessibility): add the high-contrast floors to the floor table and say
  the test enforces them; remove high-contrast from "Not covered".
- §11 (Extension): note the variant is an ordinary theme and can be extended.
- §12 (Non-goals): drop "No high-contrast theme yet".

### 8.3 `COMPONENTS.md`

Add to the Design system table:

| High-contrast theme | done | yes (values in a Theme) | AAA text floors and 4.5:1 boundaries; same 37 roles; `getTheme(mode, "high")`. |

(If the executor cannot run the playground, `done` is still correct: this row
is pure values with no runtime interaction, matching the existing "Density, type
and spacing scales" row. Do **not** put native-proof claims on it.)

### 8.4 `TODO.md`

Under "Design tokens and theming (`tokens-theme`)": add
`[x] Add high-contrast (AAA) light and dark themes`, bump the progress bar to
7/8, and leave the cross-team item pending.

## 9. Execution steps

1. Write `packages/tokens/src/` changes: `color.ts`, `theme.ts`,
   `high-contrast.example.ts`.
2. `nub run --filter @gpuixui/tokens check-types` — expect exit 0.
3. Update `color.test.ts` and `theme.test.ts`.
4. `nub run --filter @gpuixui/tokens test` — expect all pass.
5. Run the two-direction proof (§7.1) and record both outputs.
6. Update `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`.
7. `nub run check`, `nub run lint`, `nub run test` — expect exit 0.
8. Commit: `feat(tokens): high-contrast accessibility themes`.
9. Tick the index row status in `.agents/slop/plans/README.md`.

## 10. STOP conditions

- If any §3 value fails its §4 floor, stop **and fix the value** (recompute with
  the test's own formula); do not lower a floor below the §4 table.
- If `getTheme`'s new optional parameter breaks an existing caller outside
  `packages/tokens`, stop and report; do not change the other workstream's code.
- If a documented value in §3 cannot be reproduced from `color.ts`, stop and
  reconcile — never ship a document that disagrees with the code.
- If `nub run check` fails for a reason outside `packages/tokens` and `docs`,
  report it and leave it alone.

## 11. Acceptance criteria

- [ ] `highContrastLightColors` / `highContrastDarkColors` exist, `satisfies ThemeColors`, JSDoc'd.
- [ ] `highContrastLightTheme` / `highContrastDarkTheme` / `highContrastThemes` / `getTheme(mode, "high")` exist and are JSDoc'd.
- [ ] The contrast test covers all four colour sets with the §4 floors and has been shown to fail on a regressed value.
- [ ] `high-contrast.example.ts` exists and is asserted by `theme.test.ts`.
- [ ] `docs/tokens.md` and `docs/design-system.md` document the variant; no stale "no high-contrast theme" claim remains.
- [ ] `COMPONENTS.md` and `TODO.md` updated.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.
