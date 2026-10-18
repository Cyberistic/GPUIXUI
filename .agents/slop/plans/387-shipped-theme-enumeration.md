# Plan 387: the shipped-theme enumeration the package owns

> **Status (2026-10-18).** Done. `PlatformVariant`, `platformVariants`,
> `ShippedTheme` and `shippedThemes` ship in `src/shipped-themes.ts`;
> `shipped-themes.test.ts` is 7 cases (the 24-set matrix, both directions,
> unique names, the identity objects, the contract and the example); the focused
> suite fails before the module exists and passes after. `theme-check.test.ts`
> (20 → 24 sets), `contrast.test.ts` (4 → 24) and `metrics.test.ts` (16 with the
> identity repeated → 24) enumerate `shippedThemes`. The full tokens suite is
> 94 files / 4509 tests green. No colour, role, pair, floor, metric, platform
> style, recipe or theme value moves.

## Why

Plan 380 fixed one composition gap in the extension story: the package owned the
mode, contrast, platform, recipe and density axes — each with an ordered index
and a narrowing guard — but not their *precedence*, so every settings screen
retyped the resolver. The other half of that gap is still open: the package owns
the axes and the three resolvers (`getTheme`, `getPlatformTheme`,
`getPlatformRecipeTheme`) but not their **enumeration**.

A consumer who wants to hold the library to its own promise — "every shipped
theme passes `themeFailures`" — has to know four things that are not in one
place:

1. identity is `themeModes × themeContrasts` (4 sets);
2. `platformNames` includes `"default"`, whose resolved theme **is** the identity,
   so a naive `platformNames` loop produces four duplicate sets;
3. recipes are a second axis (`platformRecipeNames`), not platform names;
4. a shipped set at both contrast levels is the full matrix (24), not one level.

The package's own suites prove the ambiguity: `contrast.test.ts` calls its list
"every shipped theme" and enumerates **4** (the identity only);
`theme-check.test.ts` enumerates **20** (recipes at the default contrast only);
`color-format.test.ts` enumerates **24** (recipes at both contrasts);
`metrics.test.ts` iterates `platformNames` unfiltered and therefore repeats the
identity four times. The README states "all **20** shipped sets pass" the
typeface check, which is neither the 4 nor the 24 the other surfaces use. Every
one of those lists is hand-built, so a new platform, recipe or contrast axis is
one edit at the owner but four edits in tests — exactly the class of defect plans
305, 329, 335 and 356 already fixed one list at a time.

The docs site's platform/recipe toggles, a visual-regression suite and a QA
harness are the same consumer: they need "every set the library ships", and
today they compose it themselves or copy a list out of a test.

## Decision

1. **Ship the enumeration** in `packages/tokens/src/shipped-themes.ts`:

   ```ts
   /** A platform name that carries its own style: every name except `default`. */
   export type PlatformVariant = Exclude<PlatformName, "default">;

   export const platformVariants: ReadonlyArray<PlatformVariant>;

   export interface IdentityShippedTheme {
     readonly source: "identity";
     readonly theme: Theme;
   }

   export interface PlatformShippedTheme {
     readonly source: "platform";
     readonly platform: PlatformVariant;
     readonly theme: Theme;
   }

   export interface RecipeShippedTheme {
     readonly source: "recipe";
     readonly recipe: PlatformRecipeName;
     readonly theme: Theme;
   }

   export type ShippedTheme =
     | IdentityShippedTheme
     | PlatformShippedTheme
     | RecipeShippedTheme;

   export const shippedThemes: ReadonlyArray<ShippedTheme>;
   ```

   `platformVariants` derives from `platformNames` — the union owner — so a new
   platform joins the enumeration without a second edit. `shippedThemes` derives
   from `themeModes`, `themeContrasts`, `platformVariants` and
   `platformRecipeNames`, and calls the three public resolvers, so it cannot
   drift from the axes or bypass the composition under test.

   Order: identity, then platform variants, then recipes; within each block the
   mode is outer and the contrast inner, matching the documentation order. The
   array has `themeModes.length × themeContrasts.length × (1 +
   platformVariants.length + platformRecipeNames.length)` entries — 24 today.

2. **Do not freeze a second axis list.** `platformVariants` is the one exclusion
   (`default` is the identity, not a fourth look) and it is derived, not typed
   out. No module may retype `["darwin", "linux", "win32"]` after this plan.

3. **Every shipped set is a `Theme`, not a wrapper.** The union carries only the
   provenance (`source` plus the axis member); `mode`, `contrast` and the name
   are already on `theme`, so nothing is duplicated and nothing can disagree.

4. **Publish, document, execute and use it.**
   - `src/index.ts` exports the module between `scale.js` and `styles.js`
     (alphabetical: `shipped-themes` follows `scale` and precedes `styles`).
   - `docs/tokens.md` gains a **`#### Every shipped theme`** subsection under
     Theme API, after the persisted-choice paragraph: the three axes, the 24
     sets, the copyable loop, and both new values in the Types table.
   - `docs/design-system.md` §11 (Extension) names the loop beside `themeFailures`.
   - `packages/tokens/README.md` *Checking a theme* gains the loop; the typeface
     paragraph's "all 20 shipped sets" becomes the derived count (24) and is held
     by `readme.test.ts`.
   - `COMPONENTS.md` **Theme extension** row names `shippedThemes` and
     `platformVariants`.
   - `src/shipped-themes.example.ts` is the copyable loop, imported by the suite
     (plan 350) and linked from the reference (plan 355's rule).
   - `theme-check.test.ts`, `contrast.test.ts` and `metrics.test.ts` keep their
     own cases but their shipped lists move to `shippedThemes` where the case
     claims "every shipped set". (Scope: only the three lists this plan names;
     every other suite follows in its own change, so this plan stays reviewable.)

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/shipped-themes.ts` | New: `PlatformVariant`, `platformVariants`, the three set interfaces, `ShippedTheme`, `shippedThemes`, JSDoc with a runnable `@example`. |
| `packages/tokens/src/index.ts` | Export `./shipped-themes.js`. |
| `packages/tokens/src/shipped-themes.test.ts` | New suite: the count and the axes, both directions; unique names; identity is the built-in; every set passes `themeFailures`; the example runs. |
| `packages/tokens/src/shipped-themes.example.ts` | New executed example: the loop that returns `[]`. |
| `packages/tokens/src/theme-check.test.ts` | Replace the local 20-set list with `shippedThemes` (the case is named "every shipped set"); keep the contract cases. |
| `packages/tokens/src/contrast.test.ts` | Replace the local 4-set `shipped` list with `shippedThemes` at each theme's declared level. |
| `packages/tokens/src/metrics.test.ts` | Replace the unfiltered `platformNames` loop with `shippedThemes`, so the identity is not measured four times and high-contrast recipes are measured. |
| `packages/tokens/src/readme.test.ts` | Hold the README's shipped-set count to `shippedThemes.length`. |
| `packages/tokens/src/docs.test.ts` | Hold the new reference subsection to the enumeration: the count and the three `source` values. |
| `docs/tokens.md` | Types table rows (`IdentityShippedTheme`, `PlatformShippedTheme`, `PlatformVariant`, `RecipeShippedTheme`, `ShippedTheme`) and the `#### Every shipped theme` subsection. |
| `docs/design-system.md` | §11 Extension: the shipped-set loop. |
| `packages/tokens/README.md` | `## Checking a theme`: the loop and the derived count. |
| `COMPONENTS.md` | Theme extension row: name the enumeration. |
| `TODO.md` | New ticked row. |
| `.agents/slop/plans/README.md` | Index 387 and add it to the closing audit paragraph. |

No colour role, palette, pair, floor, metric, platform style, recipe, theme
value or public export of the existing modules changes. The new module only
composes existing public functions.

## Command sequence

Run from the worktree root, in order.

```sh
# 1. Red: the suite exists before the module does.
#    Expected: the import of ./shipped-themes.js fails.
nub run --filter @gpuixui/tokens test src/shipped-themes.test.ts

# 2. Green: add the module and the export, then run the focused suite.
#    Expected: every case passes (24 sets, zero failures).
nub run --filter @gpuixui/tokens test src/shipped-themes.test.ts

# 3. The three suites whose shipped list moves to the enumeration.
#    Expected: green; the cases assert the same contract on more sets.
nub run --filter @gpuixui/tokens test src/theme-check.test.ts src/contrast.test.ts src/metrics.test.ts

# 4. The documentation guards the new public surface touches.
#    Expected: green after the docs/README edits; the value, type, snippet and
#    example guards all see the new names.
nub run --filter @gpuixui/tokens test src/docs.test.ts src/public-types.test.ts src/snippets.test.ts src/examples.test.ts src/readme.test.ts

# 5. The whole tokens suite, then the gates.
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt
nub run check
nub run test
```

The only red step is step 1, which proves the suite can fail.

## Test plan

`packages/tokens/src/shipped-themes.test.ts`. Header comment states the gap
being guarded: five surfaces enumerated a different "every shipped set" (4, 20,
24 and 28 with the identity duplicated) and the README quoted a sixth number,
because the package owned the axes but not their enumeration.

| Case | What it proves | How it fails without the fix |
| ---- | -------------- | ---------------------------- |
| `platformVariants` is `platformNames` without `default` | the one exclusion is derived from the union owner | a hand-typed list would miss a new platform, and `default` would duplicate identity |
| `shippedThemes.length` equals the product of the axes | the enumeration covers every axis member exactly once | a missing recipe, platform or contrast fails the count |
| the expected `(source, axis member, mode, contrast)` keys and the actual keys are equal as sets, in both directions | no set is omitted and none is duplicated | a duplicated identity (`platformNames` unfiltered) or a single-contrast recipe list fails |
| each set's `theme.mode` / `theme.contrast` matches the axis it was built from | a resolver cannot silently swap the mode or level | building every entry from one mode would pass a count but fail here |
| every `theme.name` is unique | a copied style or a mis-resolved recipe is visible in a debug label | two axes resolving to one theme collide |
| the identity entries are the built-in objects | the loop returns the shipped themes, not derived copies | `createTheme`-style rebuilding changes object identity |
| every set returns `[]` from `themeFailures` | the enumeration is the set the library's guarantee covers | a set that misses a check (the 20-set list) shows here |
| the executed example returns `[]` and names every source | the documented loop runs (plan 350) | `examples.test.ts` fails on an unimported example; the assertion fails if the loop is wrong |

Prove both directions before committing:

```sh
# Red: move shipped-themes.test.ts into place before shipped-themes.ts exists.
nub run --filter @gpuixui/tokens test -- shipped-themes

# Green: add the module and the export, restore, run again.
nub run --filter @gpuixui/tokens test -- shipped-themes
```

The whole suite is claimed only after it runs.

## STOP conditions

- A shipped set fails `themeFailures`: stop and report. The four individual
  checks pass on this branch for every set the other suites enumerate, so this
  means the enumeration reaches a set those suites did not (an AAA recipe, for
  example) and its defect is real — a token or a pair would move only in its own
  plan.
- `shippedThemes` needs a fourth source the axes do not express (a per-platform
  identity, a density variant): stop. The enumeration composes the shipped axes;
  a new axis is its own plan.
- A name collides: stop and report which sets share it; do not rename a shipped
  theme to make the test pass.
- `public-types.test.ts` and the Types table disagree: add the rows; do not
  exempt the types.
- `snippets.test.ts` rejects the fenced block: make the block import what it
  uses; do not add a rule to the guard.
- Moving a suite's list onto `shippedThemes` reveals a failure that the old list
  hid: fix nothing in the suite's expectations until the failing set and pair are
  named in the report; that is a token finding, not a refactor.

## Acceptance

- `platformVariants` and `shippedThemes` ship, derived from the union owners, and
  every shipped set is reachable in one loop with its provenance.
- The suite proves the count, both directions of the axis matrix, unique names,
  the identity objects and an empty `themeFailures` for all 24 sets.
- `theme-check.test.ts`, `contrast.test.ts` and `metrics.test.ts` enumerate the
  shipped set from `shippedThemes`; no list retypes the platform variants.
- `docs/tokens.md`, `docs/design-system.md`, the package README and
  `COMPONENTS.md` name the enumeration and derive its count; the Types table and
  the value guard see every new export.
- The focused suite fails before the module exists and passes afterwards; the
  tokens suite, type check, lint, format and the repo gates pass.
- `TODO.md` carries the ticked row, the plan index lists 387, and the work is
  committed on `agent/tokens-theme` and pushed.

## Cross-team

None. The enumeration is read-only data over existing public functions; no
consumer must migrate. It gives `docs-site` and `playground` a package-owned
loop if they want it, but neither is required to change.
