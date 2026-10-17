# Plan 311: Platform recipe styles — Windows XP (Luna) and Windows 7 (Aero)

## Why

MISSION.md promises that a consumer can "take one platform theme file, edit it,
and ship their own look". Plan 063 shipped the four platform variants; plans 098
and 310 made the copy-and-own *examples* pass the contrast contract. What is
still missing is proof that a shipped variant can be **reshaped into a different
era of the same platform** — the strongest evidence that a variant is real
tokens and not a skin.

Plan 433 (the reference-adoption block) describes two recipes. This plan owns
**Recipe A only**:

- Windows XP (Luna) as an editable `PlatformStyle`;
- Windows 7 (Aero) as an editable `PlatformStyle`.

Recipe B (follow Omarchy's live system theme) is **not** in this plan. Its own
STOP condition requires the on-disk palette contract to be verified on a real
Linux/Omarchy machine before any code is written; this workstream runs on macOS
x86_64 and has no such host. The mapper must not be invented from guesses.
Plan 433 keeps Recipe B open.

## Scope decisions

1. A recipe is a `PlatformStyle`, exactly like a shipped variant. It is **not**
   a fifth platform: it does not enter `platformNames`, `platformStyles` or the
   docs platform toggle. It resolves through the **same**
   `applyPlatformStyle(getTheme(mode, contrast), style)` path the shipped
   variants use, so a recipe cannot take an untested route.
2. The recipe files are complete enough to copy: types, structure (radius,
   density, motion) and the colour families the era defines. Elevation is the
   Windows shadow geometry (a recipe changes the look, not the light physics).
3. Status, disabled, scrollbar, overlay, selection-wash alpha and every
   non-colour scale inherit the identity and are **not** overridden. A recipe
   that had to restyle the whole system would be a second identity, not an
   edition of one.
4. Windows XP never shipped a dark mode, and neither did Windows 7. Their dark
   variants are **interpretations**, documented as such: they keep the Windows
   dark palette (which already clears every floor) and carry the era's shape.
   The dark accent is the Windows dark step, not a rebuilt era accent. Do not
   invent an "authentic" dark palette. Plan 328 makes the recipe data carry the
   Windows dark colours; the first cut left `dark: {}` and inherited identity.
5. Aero's glass is an approximation. GPUix 0.10.0 has no backdrop blur, no inset
   shadows, no conic/radial gradients and no clip-path (capability map, plan
   203). The recipe uses solid layered surfaces; the documentation says so.

## Exact files

Create:

- `packages/tokens/src/platform-styles/recipes/xp.ts`
- `packages/tokens/src/platform-styles/recipes/aero.ts`
- `packages/tokens/src/platform-recipes.ts`
- `packages/tokens/src/platform-recipes.test.ts`

Change:

- `packages/tokens/src/index.ts` — add `export * from "./platform-recipes.js";`
- `docs/tokens.md` — a `### Platform recipes` section after `### Authoring a
  platform style`, plus the values table and the Aero limitation.
- `packages/tokens/src/docs.test.ts` — guard the recipe table and the
  "recipe is not a platform" sentence against the implementation.
- `COMPONENTS.md` — extend the `Platform style variants` row.
- `TODO.md` — add and tick the task under the tokens block.
- `.agents/slop/plans/README.md` — index this plan as done.
- `.agents/slop/plans/433-platform-theme-recipes.md` — mark Recipe A as done
  here, Recipe B still blocked on host verification.

## `platform-recipes.ts` — exact API

```ts
import { aeroPlatformRecipe } from "./platform-styles/recipes/aero.js";
import { xpPlatformRecipe } from "./platform-styles/recipes/xp.js";
import type { PlatformStyle } from "./platform-types.js";
import { applyPlatformStyle, getTheme, type Theme, type ThemeContrast, type ThemeMode } from "./theme.js";

export const platformRecipeNames = ["xp", "aero"] as const;
export type PlatformRecipeName = (typeof platformRecipeNames)[number];
export const isPlatformRecipeName = (value: unknown): value is PlatformRecipeName =>
  platformRecipeNames.some((name) => name === value);

export const platformRecipes: Readonly<Record<PlatformRecipeName, PlatformStyle>> = {
  xp: xpPlatformRecipe,
  aero: aeroPlatformRecipe,
};

export function getPlatformRecipeTheme(
  recipe: PlatformRecipeName,
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  return applyPlatformStyle(getTheme(mode, contrast), platformRecipes[recipe]);
}
```

JSDoc on every export, matching the package's voice: recipes are editions of a
platform, not a platform axis; `getPlatformRecipeTheme` composes the same path
as `getPlatformTheme`; the guard narrows a persisted/URL choice.

## The recipe values

Both files start from `windowsPlatformStyle` for `types.mono` and `elevation`,
and declare their own `types.label`, `structure` and `colors`. Exact starting
values (the contrast loop below is authoritative — every value that moves is
recorded in the file's JSDoc and this plan on completion):

### XP (Luna)

| Token | light | dark (interpretation) | Why |
| --- | --- | --- | --- |
| `types.label` | `Windows XP` | — | docs/toggle label |
| `types.mono` | `Consolas` | — | Windows family |
| `structure.density` | `compact` | — | XP chrome was dense |
| `structure.radius` | sm 2 / md 3 / lg 6 / xl 8 | — | 3px controls, 8px window |
| `structure.motion` | fast 120 / normal 160 / slow 240 | — | Windows motion |
| `background` | `#ECE9D8` | `#202020` | Luna beige / Windows dark |
| `card` | `#FFFDF4` | `#2B2B2B` | warm window body |
| `popover` | `#FFFDF4` | `#2B2B2B` | menus are windows |
| `muted` | `#F6F3E6` | `#2B2B2B` | quiet beige panel |
| `foreground` | `#1A1A1A` | inherited dark `#F5F6F8` | near-black XP text |
| `mutedForeground` | `#4F4A3C` | inherited | warm secondary grey |
| `border` | `#C9C4B0` | `#3D3D3D` | bevel divider |
| `borderStrong` | `#6E6957` | `#9A9A9A` | field edge |
| `input` / `inputForeground` | `#FFFFFF` / `#1A1A1A` | inherited | XP text fields were white |
| `hover` | `#E2DDC8` | `#383838` | pointer wash |
| `active` | `#D5CFB5` | `#454545` | pressed wash |
| `secondary` | `#E8E3D0` | `#383838` | neutral button face |
| `secondaryForeground` | `#1A1A1A` | inherited | |
| `secondaryHover` / `secondaryActive` | `#DAD4BC` / `#CCC5A9` | inherited | |
| `primary` | `#0054E3` | `#4CC2FF` | Luna blue |
| `primaryForeground` | `#FFFFFF` | `#000000` | |
| `primaryHover` / `primaryActive` | `#0046BD` / `#003A9C` | inherited Windows steps | |
| `primaryText` | `#0046BD` | `#76D0FF` | readable link step |
| `accent` / `accentForeground` | `#DCE7FA` / `#003C74` | inherited | toggle-on wash |
| `ring` | `#0054E3` | `#4CC2FF` | focus |
| `selected` / `selectedForeground` | `#316AC5` / `#FFFFFF` | inherited | Explorer selection blue |
| `placeholder` | `#6B6555` | inherited | |
| `skeleton` | `#DDD7C2` | inherited Windows dark | loading row |
| `shadow` | `#000000` | `#000000` | |

### Aero

| Token | light | dark (interpretation) | Why |
| --- | --- | --- | --- |
| `types.label` | `Windows 7` | — | |
| `structure.density` | `comfortable` | — | |
| `structure.radius` | sm 3 / md 5 / lg 8 / xl 10 | — | soft Aero corners |
| `background` | `#F0F4F9` | `#202020` | glass-blue canvas |
| `card` / `popover` | `#FFFFFF` | `#2B2B2B` | |
| `muted` | `#E8F1FB` | `#2B2B2B` | blue quiet panel (glass stand-in) |
| `foreground` | `#101828` | inherited | |
| `mutedForeground` | `#475467` | inherited | |
| `border` / `borderStrong` | `#BCC9DA` / `#66758C` | inherited | glass edge |
| `input` / `inputForeground` | `#FFFFFF` / `#101828` | inherited | |
| `hover` / `active` | `#E3ECF7` / `#D5E3F4` | inherited | |
| `secondary` | `#E9F0F9` | inherited | |
| `secondaryForeground` | `#101828` | inherited | |
| `secondaryHover` / `secondaryActive` | `#DBE7F5` / `#CBDCEE` | inherited | |
| `primary` | `#1565C0` | `#4CC2FF` | Aero blue, dark step inherited |
| `primaryForeground` | `#FFFFFF` | `#000000` | |
| `primaryHover` / `primaryActive` | `#0F55A3` / `#0B478A` | inherited | |
| `primaryText` | `#0F55A3` | inherited | |
| `accent` / `accentForeground` | `#D8EAFB` / `#0B478A` | inherited | |
| `ring` | `#1565C0` | `#4CC2FF` | |
| `selected` / `selectedForeground` | `#CCE4FA` / `#0B3A6B` | inherited | |
| `placeholder` | `#5B6B80` | inherited | |
| `skeleton` | `#D9E4F1` | inherited | |
| `shadow` | `#0B1F33` | `#000000` | cool glass shadow |

`inherit` means "omit the role from the file". The JSDoc in each file records
which values moved during the contrast loop and why, like the shipped styles do.

## Result — what the contrast loop changed

The implementation followed the plan except where the contract forced a design
decision; these are the recorded deviations:

- **A selected row is a tint, not the shell's filled bar.** XP's authentic
  selection is a strong `#316AC5` fill with white text. In this role model
  `selected` is a measured surface: status text, secondary text, a disabled
  label, a control edge and the focus ring all paint on it. The strong fill
  measured `infoText` at 1.60:1 and `ring` at 1.18:1, so it cannot be a role.
  `selected` is the light Luna tint `#C9DDFF` with `#003C74` text, the wash is
  the blue `selection`, and the filled bar is documented as an application
  composition over these roles.
- **XP surfaces are a ladder, not one beige.** `muted` is lighter than the
  canvas (`#F6F3E6`), and `hover` `#E4DFC9`, `active` `#DDD7BE`, `secondary`
  `#E2DCC7`, `secondaryHover` `#D6CFB4`, `secondaryActive` `#BDB590`, `border`
  `#C9C4B0`, `accent` `#C6DAFA` and `skeleton` `#CFC8AE` are each at least
  1.05:1 from the surface they paint on. The naive values (secondary equal to
  the canvas, accent a pale blue) measured 1.006–1.039:1.
- **XP secondary text darkened to `#474130`** so it keeps 4.5:1 through the
  28% selection wash on `hover`, `active` and `selected`, and the wash itself
  is `#5B8DE647` (28%) so it is 1.05:1 on the selected tint.
- **Aero keeps its glass family but moves the ladder:** `muted` `#EBF3FC`,
  `hover` `#E0EAF6`, `secondary` `#DAE6F4`, `secondaryHover` `#CFDFF0`,
  `secondaryActive` `#C2D4E9`, `skeleton` `#BDCFE4`, `mutedForeground`
  `#3D4C5F`. The first values measured 1.006–1.045:1 between a fill and the
  panel, and secondary text fell to 4.32:1 through the wash.
- **Both dark halves are empty overrides.** Neither XP nor Windows 7 shipped a
  dark mode, so the dark theme is the Windows dark palette with the recipe's
  family, radius, density and motion — documented as an interpretation rather
  than invented.

## Commands and expected results

Run from the worktree root, in order:

1. `nub run --filter @gpuixui/tokens test`
   Expected after the new test file lands: every suite passes, including the
   recipe cases.
2. `nub run --filter @gpuixui/tokens check-types`
   Expected: `Done`, no output.
3. `nub run check`
   Expected: `tests: every test asserts something…`, lint clean, format clean,
   `packages/tokens check-types: Done`.
4. `nub run test`
   Expected: the same suite set as (1) passes.
5. `git status --short`
   Expected: only the files listed above.

The contrast loop: build a scratch vitest case (or run the new suite) with
`themeContrastFailures(getPlatformRecipeTheme(name, mode))` and adjust the
smallest number of recipe values until it returns `[]` in both modes. Do not
touch identity roles, floors, `contrastPairs` or the Windows style to make a
recipe pass. Move the recipe's own value instead.

## Test plan — `platform-recipes.test.ts`

Header comment: the contract being guarded — a recipe is editable token data,
not a fifth platform; it reaches the runtime through the shipped
`applyPlatformStyle` path; and every recipe is held to the same contrast floors
as the identity, because a copy-and-own story the library's own checker rejects
is not a story.

1. **Index regularity.** `platformRecipeNames` is `["xp", "aero"]`, unique, and
   `Object.keys(platformRecipes)` matches it as a set.
2. **Guard.** `isPlatformRecipeName` accepts both names and rejects `"win32"`,
   `"default"`, `""`, `null`, `42`. (A recipe is not a platform.)
3. **Resolver.** `getPlatformRecipeTheme(name, mode)` keeps `mode`, returns a
   theme whose name contains the recipe's label, and picks the same base as
   `getTheme(mode)` for roles the recipe does not name (e.g. `destructive`).
4. **Contrast contract.** For `platformRecipeNames × themeModes`,
   `themeContrastFailures(...)` equals `[]`. This is the test that can fail if a
   value moves; it is the suite's reason to exist.
5. **Each recipe really reshapes.** For each recipe and light mode, at least
   three roles differ from `getPlatformTheme("win32", mode)`, and the radius
   differs; `xp` light `background` is the Luna beige and `aero` light
   `background` is the glass blue (values read from the recipe object, not
   retyped in the test).
6. **Recipes do not join the platform axis.**
   `platformNames` does not contain `"xp"` or `"aero"`; `platformStyles` has no
   such keys.
7. **High contrast wins.** `getPlatformRecipeTheme(name, mode, "high")` keeps the
   AAA palette (`contrast: "high"`, `themeContrastFailures` empty) and applies
   the recipe's family/shape, mirroring plan 063's rule for platforms.

Both-directions proof: change one recipe value to a low-contrast one (e.g.
`primaryForeground` equal to `primary`) and (4) fails; remove the guard and (2)
fails; add `"xp"` to `platformNames` and (6) fails. Restore the values after the
check.

## Documentation

`docs/tokens.md`, new `### Platform recipes` section:

- What a recipe is (an edition of a platform, not a platform variant).
- The XP and Aero tables above, **built from `platformRecipes` by a guard in
  `docs.test.ts`** — no hand-written hex may drift from the file.
- The copy-and-own snippet:

  ```ts
  import { getPlatformRecipeTheme, platformRecipes } from "@gpuixui/tokens";

  const luna = getPlatformRecipeTheme("xp", "light");
  const mine = applyPlatformStyle(getTheme("light"), {
    ...platformRecipes.xp,
    colors: { ...platformRecipes.xp.colors, light: { ...platformRecipes.xp.colors.light, primary: "#1F5FBF" } },
  });
  ```

- The honest limits: XP's bevel is a light/dark border pair, not an inset
  shadow; Aero's glass is layered solid surfaces because the runtime has no
  blur/gradient; dark variants are interpretations, not historical.
- The recipes are held to `themeContrastFailures` in both modes.

`COMPONENTS.md`: the `Platform style variants` row gains one sentence — two
editable recipes (XP/Aero) prove the copy-and-own path, tested in both modes;
Recipe B (Omarchy) remains open on plan 433.

`TODO.md`: one line under the tokens block:

`[x]` Ship Windows XP and Aero platform recipes as editable `PlatformStyle`
values with a resolver and guard, held to the contrast contract in both modes
(plan 311); Recipe B (Omarchy) remains blocked on host verification (plan 433).

## STOP conditions

- A recipe cannot clear the contrast floors without abandoning its identity
  (e.g. Luna beige forces `mutedForeground` to identity grey and the result no
  longer reads as XP). Stop, report the failing pairs, and propose either a
  narrower recipe (surfaces + accent only) or a documented exclusions list. Do
  not ship a theme that fails the library's own checker.
- Meeting the floors requires editing identity roles, `contrastPairs`, the
  Windows style or any consumer package. Stop: those are out of scope.
- The docs site or playground needs a new platform axis entry to show the
  recipes. Stop: a recipe resolves through `getPlatformRecipeTheme`; record the
  consumer change as a cross-team TODO row instead.
- GPUix docs contradict the capability claims for Aero (blur/gradient). Stop and
  attach the evidence; do not claim support the runtime lacks.

## Acceptance

- [ ] `packages/tokens` exports `platformRecipes`, `platformRecipeNames`,
      `PlatformRecipeName`, `isPlatformRecipeName` and `getPlatformRecipeTheme`.
- [ ] XP and Aero are copyable `PlatformStyle` files with their own JSDoc and
      limits.
- [ ] `platform-recipes.test.ts` covers index, guard, resolver, contrast in both
      modes, distinctness, the platform axis and high contrast, and proves both
      directions of at least one failure.
- [ ] `docs/tokens.md` documents the recipes, the table is guarded by
      `docs.test.ts`, and the Aero/XP limitations are stated.
- [ ] `COMPONENTS.md` and `TODO.md` are updated; the plan index marks 311 done.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass in this worktree.
