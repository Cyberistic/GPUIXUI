# 328 — A recipe is an edition of Windows in dark too

**Phase:** F (truth pass) · **Workstream:** `tokens-theme` · **Depends on:** 311
(recipes), 063 (platform variants), 071 (contrast contract)

## The defect

`docs/tokens.md` promises that the two platform recipes, Windows XP (Luna) and
Windows 7 (Aero), keep the **Windows dark surfaces** because neither Windows
version shipped a dark mode:

> **Dark is an interpretation.** Neither Windows XP nor Windows 7 shipped a dark
> mode. Their dark themes keep the Windows dark surfaces and motion and carry the
> era's accent and shape …

The recipe file comment says the same, and `.agents/slop/plans/311` lists
`#202020` / `#2B2B2B` / `#4CC2FF` as the dark values.

The implementation does not do that. Both recipes declare `dark: {}`, and
`getPlatformRecipeTheme` resolves them over `getTheme(mode)` — the **identity**
theme, not `getPlatformTheme("win32", mode)`. So in dark mode a recipe silently
becomes the identity graphite canvas and iris accent:

| Role (dark) | Documented | Shipped today | Identity | Windows |
| ----------- | ---------- | ------------- | -------- | ------- |
| `background` | Windows | `#11141A` | `#11141A` | `#202020` |
| `card` | Windows | `#191D25` | `#191D25` | `#2B2B2B` |
| `primary` | Windows | `#A7A9FF` | `#A7A9FF` | `#4CC2FF` |
| `accent` | Windows | identity accent | identity | `#0F3554` |

That breaks three promises at once: the docs are false, a copied recipe file
does not reproduce the theme the docs describe, and the XP/Aero dark halves are
not editions of the Windows variant they import their elevation from.

## Decision

Make the recipe data own its dark skin. Each recipe's `colors.dark` is the
Windows dark palette (`windowsPlatformStyle.colors.dark`), not `{}`. The
resolver, the public shape and the light halves do not change.

Why the data, not the resolver: the documented copy-and-own path is
`applyPlatformStyle(getTheme("dark"), platformRecipes.aero)`; a recipe that
relies on a resolver-specific base cannot be copied honestly. The file already
imports `windowsPlatformStyle` for its elevation, so the same import now names
the dark palette too. Because it is a spread, a Windows dark edit moves both
recipes in one place — no duplicated literals.

The era still owns its structure, type and light palette. The dark accent is the
Windows dark step, not a re-invented XP/Aero dark accent; the docs will say
"keep the Windows dark palette and carry the era's shape" instead of claiming an
era accent that the runtime never had.

## Exact files

Change:

- `packages/tokens/src/platform-styles/recipes/xp.ts` — `colors.dark:
  windowsPlatformStyle.colors.dark`.
- `packages/tokens/src/platform-styles/recipes/aero.ts` — the same.
- `packages/tokens/src/platform-recipes.test.ts` — the inheritance case now
  reads the Windows base; add the two dark regressions (canvas and primary
  family). This test must fail before the recipe fix.
- `packages/tokens/src/accent-states.test.ts` — the dark half of a recipe now
  names the Windows dark accent family; assert that instead of expecting
  `undefined`.
- `docs/tokens.md` — the "Dark is an interpretation" paragraph: keep the Windows
  dark palette, drop the "era's accent" claim.
- `.agents/slop/plans/README.md` — index this plan; correct the 311 summary
  sentence.
- `.agents/slop/plans/311-platform-recipe-styles.md` — correct decision 4 to
  match what ships.
- `TODO.md` — add and tick the task under the tokens block.

Do **not** change:

- `packages/tokens/src/platform-recipes.ts` (the resolver stays identity-based,
  so the light path and its tests are untouched).
- `packages/tokens/src/platform-styles/windows.ts`, the identity palettes, the
  contrast pairs or the floors.

## Commands and expected results

Run from the worktree root:

1. After adding the regression test but **before** the recipe edit:

   ```sh
   nub run --filter @gpuixui/tokens test -- platform-recipes
   ```

   Expected: 2 failures — `xp`/`aero` dark `background` is the identity value,
   not `#202020`. This is the proof the test can fail.

2. After the recipe edit:

   ```sh
   nub run --filter @gpuixui/tokens test -- platform-recipes
   ```

   Expected: pass.

3. `nub run --filter @gpuixui/tokens test`
   Expected: every suite passes, including `accent-states`, `filled-states` and
   the contrast contract.

4. `nub run --filter @gpuixui/tokens check-types`
   Expected: `Done`, no output.

5. `nub run check`
   Expected: test-lint, oxlint, format and package type-checks all clean.

6. `nub run test`
   Expected: the workspace suite passes.

7. `git status --short`
   Expected: only the files listed above (plus `references`, the known symlink).

## Test plan

`platform-recipes.test.ts`:

- **Regression (the reason for this plan).** For each recipe and `mode: "dark"`,
  `getPlatformRecipeTheme(recipe, "dark").colors.background` equals
  `getPlatformTheme("win32", "dark").colors.background` and is `#202020`; the
  same for `card`, `popover`, `primary`, `primaryHover`, `accent` and `ring`
  against the Windows dark theme. Fails today, passes after.
- **Inheritance.** Change the existing "inherits every role the recipe does not
  name" case to compare against `getPlatformTheme("win32", mode)` rather than
  `getTheme(mode)`; Windows inherits the identity for `destructive`, `success`,
  `warningSoft`, `overlay` and `scrollbar`, so the assertion still holds and now
  names the base the docs describe.
- **Light is untouched.** Keep the existing light assertions; the recipes still
  name their own Luna/glass values.
- **Contrast.** The existing `themeContrastFailures` loop stays: the recipe dark
  half is now exactly the Windows dark colours, which already clear every floor.

`accent-states.test.ts`:

- The recipe dark half now defines `accentHover`/`accentActive`; assert they
  equal the Windows dark values (and are defined), so a future `dark: {}`
  regression fails here too.

## Acceptance

- Both recipes return the Windows dark canvas, surfaces and accent family in
  dark mode; light mode is byte-identical to today.
- `docs/tokens.md` describes what the code does, with no "era accent" claim.
- The regression test fails without the recipe change and passes with it.
- All gates above are green.
