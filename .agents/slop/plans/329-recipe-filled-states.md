# 329 — The filled-state matrix must include the shipped recipes

**Phase:** F (truth pass) · **Workstream:** `tokens-theme` · **Depends on:** 097
(filled states), 311 and 328 (recipes)

## The defect

Plan 097's `filled-states.test.ts` states that a filled control steps through
`x` → `xHover` → `xActive` in **every shipped theme**, and it builds that list
from the identity variants and the three real platform variants. It never adds
the two shipped recipes (Windows XP and Aero), even though plan 311 makes them
first-class resolved themes and every other audit that iterates shipped themes —
`accent-states`, `placeholder-surfaces`, `row-surface-text`, `soft-body-text`,
`invalid-field-edge`, `neutral-press-edge` — already includes them.

So a recipe could ship a primary/neutral family whose hover or press is the same
fill, or moves toward the canvas, while this suite stayed green. The accent
family is already covered by `accent-states.test.ts`; the other three families
are not.

This is a coverage gap, not a shipped colour defect: the current recipes pass
the matrix in both modes. After plan 328 their dark halves carry the Windows dark
palette, so the dark cases are Windows' designed steps.

## Exact files

Change:

- `packages/tokens/src/filled-states.test.ts` — add the two recipes to the
  shipped-theme list and add a presence case for each family's three roles.
- `TODO.md` — add and tick the task under the tokens block.
- `.agents/slop/plans/README.md` — index this plan.

No token value, pair, floor or document changes.

## Exact change

In the imported set add `getPlatformRecipeTheme` and `platformRecipeNames`.
Extend the `themes` list after the real-platform block:

```ts
...platformRecipeNames.flatMap((recipe) =>
  modes.map((mode) => ({
    label: `${recipe} ${mode}`,
    theme: getPlatformRecipeTheme(recipe, mode),
  })),
),
```

Add one case beside the existing platform-presence case:

```ts
it("gives every recipe its filled-state roles", () => {
  platformRecipeNames.forEach((recipe) => {
    themeModes.forEach((mode) => {
      families.forEach((family) => {
        (["", "Hover", "Active"] as const).forEach((suffix) => {
          const role = `${family}${suffix}` as const;
          expect(
            getPlatformRecipeTheme(recipe, mode).colors[role],
            `${recipe} ${mode} ${role}`,
          ).toBeDefined();
        });
      });
    });
  });
});
```

The roles resolve through the base when a recipe does not name them, so this
asserts the resolved theme, not the recipe object.

## Commands and expected results

1. `nub run --filter @gpuixui/tokens test`
   Expected: pass; the new labels appear in the `filled control states` cases.
2. `nub run --filter @gpuixui/tokens check-types`
   Expected: `Done`.
3. `nub run check`
   Expected: test-lint, lint, format and type-check clean.
4. `nub run test`
   Expected: the workspace suite passes.

To prove the case can fail without editing a shipped theme: in a scratch copy,
set `platformRecipes.xp.colors.light.primaryHover` to `primary`; the loop's
`new Set(...).size` and 1.05:1 step assertion fail. Revert the scratch edit
before committing.

## Acceptance

- The filled-state loop runs for `xp` and `aero` in both modes.
- A recipe that collapses a family's step fails the suite.
- Every gate above is green, and no token value moves.
