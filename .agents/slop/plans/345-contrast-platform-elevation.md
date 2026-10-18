# Plan 345 — A high-contrast platform variant loses the platform's elevation

**Phase:** F · **Owner:** `tokens-theme` · **Status:** ready
**Depends on:** 051 (`platformTypes`), 063 (the platform variants), 073 (a theme
declares its contrast), 085 (a level is geometry plus an alpha over the `shadow`
tint), 301/323 (the contrast declaration follows the palette), 311 (the recipes).
**Owns:** `packages/tokens/src/theme.ts`,
`packages/tokens/src/platform-recipes.ts`,
`packages/tokens/src/platforms.example.ts`,
`packages/tokens/src/platforms.test.ts`,
`packages/tokens/src/platform-contrast-elevation.test.ts` (new),
`packages/tokens/src/docs.test.ts`, `packages/tokens/README.md`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`applyPlatformStyle` has two branches:

```ts
const structural: ThemeOverrides = {
  name: `${base.name} · ${label}`,
  typography: { sans, mono },
  radius: style.structure.radius,
  density: style.structure.density,
  motion: style.structure.motion,
};
if (contrast === "high") return structural;
return {
  ...structural,
  colors: style.colors[base.mode],
  contrast: appliesColors ? "default" : base.contrast,
  elevation: style.elevation[base.mode],
};
```

At `"high"` the platform's **elevation is dropped**, so
`getPlatformTheme("darwin", mode, "high")`, every other variant and both recipes
paint the identity's shadows. A reader who toggles macOS · Linux · Windows ·
Default at high contrast sees four identical elevations, which is exactly the
`MISSION.md` acceptance ("every preview changes") failing on the one axis that
does not affect colour.

Plan 063 decided to apply "only `structure` and `types`" at high contrast
because an elevation level then carried a **colour per level**, and replacing
the AAA theme's shadow colour would have weakened the palette the level exists
for. Plan 085 changed that representation: an elevation level is now **geometry
plus an alpha over the theme's single `shadow` tint**, and the tint is a colour
role the AAA palette keeps. Applying a platform's levels therefore changes no
colour: the base's `shadow` tint stays, the platform's offsets, blur, spread and
alpha apply. Plan 063's reason no longer holds.

Measured evidence that the levels are distinguishable (light / dark `sm` alpha;
the geometry differs too):

| style | `sm` | `md` | `lg` |
| ----- | ---- | ---- | ---- |
| identity | 0/1/2/0 α0.08 | 0/4/12/−2 α0.12 | 0/16/40/−8 α0.16 |
| macOS | 0/1/3/0 α0.08 | 0/6/18/−2 α0.12 | 0/20/48/−8 α0.16 |
| Linux | 0/1/2/0 α0.10 | 0/5/14/−2 α0.14 | 0/18/44/−8 α0.19 |
| Windows | 0/1/2/0 α0.10 | 0/6/16/−2 α0.16 | 0/22/50/−8 α0.20 |

The AAA palettes set `shadow` to `#000000` in both modes; the identity dark
theme sets `#191D25`. A high-contrast platform variant must therefore keep the
**AAA `shadow` tint** and take only the **platform's geometry and alpha**.

## 2. The decision

Move `elevation: style.elevation[base.mode]` from the colour branch into
`structural`, so it applies at every contrast level. No colour moves: the
`shadow` role comes from the base palette, and a high-contrast base keeps its
AAA tint.

Alternatives rejected:

- **Keep the skip and document it as intent.** The docs already say variants
  "change … shadows"; the toggle acceptance is the stronger requirement, and
  after plan 085 there is no colour reason for the exception.
- **Apply `style.colors[mode].shadow` at high contrast.** That would replace the
  AAA tint with the platform's — colour is what high contrast wins. Elevation is
  applied as levels, never as a tint override.
- **Add a flag on `PlatformStyle` (`elevationAtHighContrast`).** A flag for a
  distinction no consumer needs; the role split from plan 085 already answers
  it.

## 3. Files and exact changes

### 3.1 `packages/tokens/src/theme.ts`

1. In `platformOverrides`, move the elevation into `structural` and delete it
   from the colour branch:

   ```ts
   const structural: ThemeOverrides = {
     name: `${base.name} · ${label}`,
     typography: { sans, mono },
     radius: style.structure.radius,
     density: style.structure.density,
     motion: style.structure.motion,
     // A level is geometry plus an alpha over the base's `shadow` tint (plan
     // 085), so it carries no colour: the platform's depth applies at every
     // contrast level while an AAA base keeps its own tint.
     elevation: style.elevation[base.mode],
   };
   if (contrast === "high") {
     return structural;
   }
   ...
   return { ...structural, colors, contrast: appliesColors ? "default" : base.contrast };
   ```

2. Update `applyPlatformStyle`'s JSDoc: "At `"high"` only the families and shape
   are applied" → "At `"high"` the families and shape are applied — radii,
   density, motion and the platform's elevation levels — while the base keeps its
   colour set, the `shadow` tint included".

### 3.2 `packages/tokens/src/platform-recipes.ts`

`getPlatformRecipeTheme`'s JSDoc says "At `"high"` only families and shape
apply". Reword to "At `"high"` the families, shape and elevation levels apply
while the AAA colour set and its `shadow` tint stay".

### 3.3 `packages/tokens/src/platforms.example.ts`

Add one exported example, used by the new suite:

```ts
/**
 * Resolve a high-contrast platform preview: the AAA palette stays, while the
 * platform's radii, density, motion and elevation levels still apply. The
 * docs platform toggle calls this for its contrast switch.
 */
export const resolveHighContrastPlatformTheme = (
  mode: ThemeMode,
  platform: PlatformName,
): Theme => getPlatformTheme(platform, mode, "high");
```

### 3.4 `packages/tokens/src/platforms.test.ts`

Extend `"still applies the platform's shape and families"` (the high-contrast
describe) with the elevation assertion:

```ts
expect(themed.elevation.md).toEqual(platformStyles.win32.elevation.dark.md);
expect(themed.elevation.sm).toEqual(platformStyles.win32.elevation.dark.sm);
```

and assert the AAA tint is kept:

```ts
expect(elevationShadow(themed, "md")?.color).toBe(
  alpha(highContrastDarkTheme.colors.shadow, platformStyles.win32.elevation.dark.md[0].alpha),
);
```

(Import `alpha` from `./color.js`, `elevationShadow` from `./elevation.js`, and
read the shape with `Option`-free indexing guarded by the existing style data.)

### 3.5 `packages/tokens/src/platform-contrast-elevation.test.ts` (new)

The header states the bug being guarded:

```
/**
 * Guards the defect plan 345 fixes: plan 063 skipped a platform style's
 * elevation at high contrast because a level then carried its own colour.
 * Plan 085 made a level geometry plus an alpha over the theme's `shadow` tint,
 * so skipping it now only removes the platform's depth — every AAA variant
 * painted the identity's shadows while the docs toggle promised a platform
 * preview. This file fails without the fix.
 */
```

Imports: `alpha` from `./color.js`; `elevationShadow` from `./elevation.js`;
`platformRecipeNames`, `platformRecipes`, `platformStyles`, `platformTypes`;
`resolveHighContrastPlatformTheme` from `./platforms.example.js`; and
`applyPlatformStyle`, `getPlatformRecipeTheme`, `getPlatformTheme`, `getTheme`,
`highContrastDarkTheme`, `highContrastLightTheme`, `themeContrastFailures`,
`themeContrasts`, `themeModes`, `type Elevation` from `./index.js`.

Cases:

1. **`"gives every high-contrast variant its platform's elevation"`**
   - for each real variant × mode: `getPlatformTheme(platform, mode, "high").elevation`
     equals `{ ...getTheme(mode, "high").elevation, ...platformStyles[platform].elevation[mode] }`;
   - collect mismatches as `` `${platform} ${mode}` `` and expect `[]`.
2. **`"gives every high-contrast recipe its platform's elevation"`**
   - the same loop over `platformRecipeNames` with `getPlatformRecipeTheme`.
3. **`"keeps the AAA shadow tint while taking the platform geometry"`**
   - `const high = getPlatformTheme("darwin", "dark", "high")`;
   - `const shape = platformStyles.darwin.elevation.dark.md?.[0]` (assert defined);
   - `elevationShadow(high, "md")` deep-equals `{ ...geometry, color: alpha(highContrastDarkTheme.colors.shadow, shape.alpha) }`;
   - `expect(shape.offsetY).not.toBe(highContrastDarkTheme.elevation.md[0].offsetY)` — the
     depth is the platform's, not the identity's;
   - the same for light with `linux`.
4. **`"keeps the high-contrast colour set untouched"`** — `colors` equals
   `highContrastLightTheme`/`highContrastDarkTheme`, and `themeContrastFailures`
   is `[]` for all 24 sets (4 variants × 2 modes × 2 contrasts + 2 recipes × 2 × 2).
5. **`"leaves the Default variant and a shape-only style on the base"`** —
   `getPlatformTheme("default", mode, "high")` is `getTheme(mode, "high")`;
   `applyPlatformStyle(highContrastLightTheme, { ...platformStyles.default, elevation: { light: {}, dark: {} } }, "high").elevation`
   equals `highContrastLightTheme.elevation`.
6. **`"resolves the documented preview helper"`** —
   `resolveHighContrastPlatformTheme("dark", "win32")` deep-equals
   `getPlatformTheme("win32", "dark", "high")`.

### 3.6 `packages/tokens/src/docs.test.ts`

Add one case holding the design-system claim (placed beside the platform-family
case):

```ts
it("states that a high-contrast platform keeps its elevation levels", () => {
  expect(designSystem).toContain(
    "At high contrast the families and shape apply — each platform's radii, density, motion and elevation levels — while the AAA colour set, the `shadow` tint included, wins over platform resemblance.",
  );
});
```

### 3.7 `docs/tokens.md`

1. Platform styles, high-contrast paragraph (line ~500): replace "applies only
   the families and shape to the high-contrast colour set, because a platform
   accent must not drop the AAA floors." with:

   > applies the families, radii, density, motion and each platform's elevation
   > levels to the high-contrast colour set, because a platform accent must not
   > drop the AAA floors. Elevation carries no colour of its own — a level is
   > geometry plus an alpha over the theme's `shadow` tint (plan `085`) — so the
   > AAA tint stays while the platform's depth applies.

2. The `applyPlatformStyle` paragraph (line ~548): "Naming `"high"` on a default
   base applies only families and shape" → "applies only families, shape and
   elevation levels".

### 3.8 `docs/design-system.md`

Line ~153: replace "At high contrast only families and shape are applied: the AAA
colour set wins over platform resemblance." with:

> At high contrast the families and shape apply — each platform's radii, density,
> motion and elevation levels — while the AAA colour set, the `shadow` tint
> included, wins over platform resemblance.

### 3.9 `packages/tokens/README.md`

1. Line ~440: "applies only the families and shape, because a platform accent
   must not drop the AAA floors." → "applies the families and shape — radii,
   density, motion and the platform's elevation levels — while the AAA colour
   set stays, because a platform accent must not drop those floors."
2. Line ~545 (Limitations): "only families and shape are applied" → "the
   families and shape, elevation included, apply while the AAA colour set stays".

### 3.10 `COMPONENTS.md`

In the **Platform style variants** row, after "High contrast keeps the AAA colour
set and applies only families and shape", add: "the platform's elevation levels
apply too — a level is geometry plus an alpha over the base's `shadow` tint, so
the AAA palette keeps its tint while a macOS, Linux or Windows high-contrast
preview keeps that platform's depth (plan 345)".

### 3.11 `TODO.md`

1. Add a ticked row in **Design tokens and theming** after the plan 344 row:

   ```
   `[x]` Keep a platform's elevation at high contrast — plan 063 skipped it
   because a level then carried a colour, but plan 085 made a level geometry plus
   an alpha over the `shadow` tint, so every AAA platform variant painted the
   identity's shadows while the docs toggle promised a platform preview; the
   levels now ride with the structural overrides and the AAA tint stays (plan 345)
   ```

2. Adjust the section's progress bar numerator by one; leave the denominator.

### 3.12 Plan index

1. Table row after 344:

   ```
   | [345](./345-contrast-platform-elevation.md) | A high-contrast platform variant keeps its elevation | F | 063, 073, 085, 301, 311, 323 | done |
   ```

2. A prose paragraph after the plan 344 one: plan 063 predates plan 085, the
   skipped elevation now only removes depth, the AAA tint stays, no colour and no
   contrast pair moves.

## 4. Commands

From the worktree root:

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

New file alone while iterating:

```sh
cd packages/tokens && nubx vitest run src/platform-contrast-elevation.test.ts
```

Expect: the new file passes six cases; the package suite grows by one file; the
gates stay green with no pair-count change.

## 5. STOP conditions

- `platformStyles[platform].elevation[mode]` is empty for a real variant — the
  data changed; re-derive the claim before editing code.
- A shipped theme's `themeContrastFailures` is non-empty after the change — stop;
  elevation must not move a colour, so a failure means the tint leaked.
- `elevationShadow` returns `undefined` for `sm`/`md`/`lg` — a level went empty.
- `docs.test.ts` or `readme.test.ts` fails on a sentence this plan did not name —
  re-read the document and reconcile the expected string.
- `nub run test` fails outside `packages/tokens` for an unrelated reason — record
  it in `TODO.md`, do not edit another workstream's tree.

## 6. Test plan (both directions)

- **Without the fix:** the new file's cases 1–3 and 6 fail (the high-contrast
  theme's `elevation` is the identity's, and `offsetY` matches the identity), the
  suites are otherwise green. Prove it by stashing the `theme.ts` edit and
  running the new file.
- **With the fix:** all six pass, every existing platform test passes, and
  `themeContrastFailures` still returns `[]` for all 24 sets because no colour
  role moved.
- Docs guards fail if the prose is edited without the other, and pass together.

## 7. Acceptance

- `getPlatformTheme(platform, mode, "high")` carries the platform's `sm`/`md`/`lg`
  levels and the AAA `shadow` tint, for every real variant and both recipes.
- The Default variant and a style with no elevation keys keep the base levels.
- No colour, contrast pair or floor changes; the checker stays `[]`.
- Docs, README and the ledger state that elevation applies at high contrast while
  the AAA colour set wins, and `docs.test.ts` holds the design-system sentence.
- `nub run check`, `nub run lint`, `nub run test` pass; the commit is on
  `agent/tokens-theme` and pushed.
