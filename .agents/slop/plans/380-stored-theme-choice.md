# Plan 380 — the persisted theme choice, resolved in one place

**Workstream:** `tokens-theme` · **Phase:** F (integration and polish) ·
**Depends on:** 051, 063, 067, 068, 073, 096, 301, 304, 305, 311, 323, 373, 374 ·
**Status:** done when every step below has been run.

Plan number: the free `300–399` block is shared across worktrees and
`workspaces/components` already holds `379`, `433` and `434`; **380** is the next
number unused in any worktree (checked on 2026-10-18 with
`ls ~/GPUIXUI/workspaces/*/.agents/slop/plans`).

## 1. The gap

The package owns every axis a theme is chosen by — `themeModes`,
`themeContrasts`, `platformNames`, `platformRecipeNames`, `densityNames` — and a
narrowing guard for each. It does **not** own the act of composing them into a
theme. Every caller rebuilds that composition:

```ts
const theme = getPlatformTheme(platform, mode, contrast);
const sized = density === undefined ? theme : extendTheme(theme, { density });
```

`packages/tokens/src/persisted-choices.example.ts` already contains half of it as
`themeFromStoredChoice`, but that function resolves only `mode` and `contrast`,
lives in an example rather than the public API, and has no answer for the
platform, recipe or density axes. The docs-site platform toggle (a cross-team
row) and any settings screen persist exactly those five fields.

Two rules are easy to get wrong, and no test states them:

1. **Density precedence.** A platform style carries its own density preset —
   `macOS` is `compact`, Linux and Windows are `comfortable`. A stored density
   is the reader's choice and must win over the platform resemblance. Applying
   it before the platform style silently reverts it to the preset.
2. **Recipe precedence.** A recipe is an edition of Windows offered *beside* the
   platform axis; a malformed stored object can carry both. The recipe is the
   more specific answer and must win, instead of the resolver quietly treating
   the platform as authoritative.

Fallbacks are the third half: an unknown mode/contrast/platform keeps the
readable identity default, an unknown recipe falls back to the platform, and an
**unknown density keeps the resolved theme's preset** — not a hardcoded
`"comfortable"`, which would turn a macOS workspace comfortable because a
settings row was hand-edited.

## 2. Evidence

- `persisted-choices.example.ts`'s `themeFromStoredChoice` resolves
  `mode`/`contrast` only; `themeWithDensity` takes an already-resolved theme and
  falls back to `"comfortable"` for any unknown value. Neither can name a
  platform or a recipe.
- `platform-styles/macos.ts` sets `structure.density: "compact"`; `linux.ts` and
  `windows.ts` set `"comfortable"`. So "apply the platform style, then the stored
  density" is observable as `density.name` and as `controlHeight`.
- The package already ships every guard the resolver needs
  (`isThemeMode`, `isThemeContrast`, `isPlatformName`, `isPlatformRecipeName`,
  `isDensityName`) and every resolver it wraps (`getTheme`,
  `getPlatformTheme`, `getPlatformRecipeTheme`, `extendTheme`). No new token,
  role, pair, floor or metric is required.
- The mission names the docs platform toggle's state as shareable page state and
  "remembered across navigation"; that state is this choice. A single resolver
  is the shared logic the mission's boundary rule asks for instead of each app
  copying it.

## 3. Decision

Add `packages/tokens/src/theme-choice.ts`:

```ts
export interface ThemeChoice {
  readonly mode?: unknown;
  readonly contrast?: unknown;
  readonly platform?: unknown;
  readonly recipe?: unknown;
  readonly density?: unknown;
}

export function resolveThemeChoice(choice: ThemeChoice): Theme;
```

Resolution order, documented in the JSDoc and both reference pages:

1. `mode`: `isThemeMode` → else `"light"`.
2. `contrast`: `isThemeContrast` → else `"default"`.
3. base: `isPlatformRecipeName(recipe)` → `getPlatformRecipeTheme(recipe, mode,
   contrast)`; else `getPlatformTheme(isPlatformName(platform) ? platform :
   "default", mode, contrast)`.
4. `density`: `isDensityName` → `extendTheme(base, { density })`; else `base`.

The input fields are `unknown` because this is the persisted-choice boundary:
the shape is the caller's (its `Schema` decodes the object), while the unions are
the package's, which is the rule plans 067/068/096/305 established. A typed
caller passes known values without a cast; an untyped one passes what it read.

Rejected alternatives:

- **Return the resolved axes beside the theme.** The theme already carries
  `mode`, `contrast` and `density.name`; the platform/recipe label is in `name`.
  A settings UI that needs the axis value narrows its own stored field with the
  guard it already has. Returning a second shape doubles the API for no test.
- **Accept `unknown` for the whole object.** That is shape decoding, which the
  docs deliberately leave to the application's `Schema` (plan 371's last
  paragraph); a package-side `typeof` walk would be a second, weaker decoder.
- **Throw on an unknown axis.** A persisted choice is untrusted input; a
  readable fallback is the documented behaviour of the guards, and a throw would
  make a settings screen fail to open because of a stale URL value.
- **Put it in `theme.ts`.** `platform-recipes.ts` imports `theme.ts`; importing
  it back would create a cycle. A small leaf module keeps the direction
  `theme-choice → {theme, platforms, platform-recipes, scale}`.

## 4. Files to create or change

1. **Create** `packages/tokens/src/theme-choice.ts` — the interface, the
   function, full JSDoc with a runnable `@example` (the snippet guard in
   `snippets.test.ts` reads it and requires every import it names).
2. **Edit** `packages/tokens/src/index.ts` — add
   `export * from "./theme-choice.js";` in alphabetical position (after
   `theme.js`? keep the existing order: `color, contrast, elevation, metrics,
   motion, platform-recipes, platforms, scale, styles, theme, typography`;
   insert `theme-choice` **before** `theme.js` so the list stays alphabetical).
3. **Edit** `packages/tokens/src/persisted-choices.example.ts` — `themeFromStoredChoice`
   now composes `resolveThemeChoice` instead of calling `getTheme` directly, so
   the example teaches the public path; `themeWithDensity` stays as the
   apply-density-to-an-existing-theme example (it is a different question).
4. **Create** `packages/tokens/src/theme-choice.example.ts` — a persisted
   settings object (all five axes present, plus a stale density) resolved in one
   call, with the resolved axes read back.
5. **Create** `packages/tokens/src/theme-choice.test.ts` — see §6. It imports
   the example file so the plan-350 example-coverage guard stays satisfied.
6. **Edit** `docs/tokens.md`:
   - the `## Types` table gains `ThemeChoice` in alphabetical order (between
     `Theme` and `ThemeColors`);
   - the Theme API "persisted choice" paragraph names `resolveThemeChoice`, the
     precedence and the fallbacks, with a copyable snippet (the snippet guard
     checks it);
   - the value index/coverage guard is satisfied by naming the export there.
7. **Edit** `docs/design-system.md` §11 — one bullet for the resolver beside
   the guards, stating the density and recipe precedence.
8. **Edit** `packages/tokens/README.md` — the "Persisted choices" section names
   `resolveThemeChoice` and links the new example.
9. **Edit** `COMPONENTS.md` — the **Theme extension** row names the resolver.
10. **Edit** `TODO.md` — add and tick a `tokens-theme` row; the block bar moves
    from `145/197` to `146/198`.
11. **Edit** `.agents/slop/plans/README.md` — add the table row for 380 after
    377 and a summary paragraph before `### Reference adoption`.

## 5. Exact commands and expected results

Step 0 — prove the precedence tests can fail **before** trusting them. Write
the resolver with the density applied **before** the platform style (the wrong
order), run:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: `theme-choice.test.ts` fails on "keeps a stored density over the
platform preset" — the resolved `density.name` is the platform's `compact`
instead of the stored `spacious`. Restore the documented order.

Then break the recipe branch to fall through to the platform (`isPlatformRecipeName`
check removed) and run the same command. Expected: the recipe-precedence case
fails, naming the XP primary. Restore.

Step 1 — with both restored:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: PASS; 88 test files, and the test count grows by the new file's cases
(4385 → 4385 + N). Report N from the actual output; do not guess.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0, no output.

Step 2 — the completion gate:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. If `check:tests` rejects a case, the case asserts something
it stubbed or a literal against itself — fix the case, not the gate.

Step 3 — commit and push:

```sh
git add .agents/slop/plans/380-stored-theme-choice.md \
        .agents/slop/plans/README.md TODO.md
git commit -m "docs(plans): plan 380 — the persisted theme choice, resolved in one place"

git add packages/tokens/src/theme-choice.ts \
        packages/tokens/src/theme-choice.example.ts \
        packages/tokens/src/theme-choice.test.ts \
        packages/tokens/src/index.ts \
        packages/tokens/src/persisted-choices.example.ts \
        packages/tokens/README.md docs/tokens.md docs/design-system.md \
        COMPONENTS.md
git commit -m "feat(tokens): resolve a persisted theme choice in one call"

git push origin agent/tokens-theme
```

## 6. Test plan

`theme-choice.test.ts` (every case must be able to fail; state the regression it
guards in the file header):

| Test | What it proves | How it fails without the code |
| ---- | -------------- | ----------------------------- |
| every shipped axis combination resolves | the 2 modes × 2 contrasts × (4 platforms + 2 recipes) × 3 densities resolve to a theme that passes `themeContrastFailures`, `themeMetricFailures` and `themeColorFailures`, with `mode`/`contrast`/`density.name` equal to the choice | any wrong base or unmerged density misses a check |
| a stored density beats the platform preset | `{ platform: "darwin", density: "spacious" }` has `density.name === "spacious"`, `rowHeight` 36, and still macOS's `radius.lg` (10, not the identity's 8) | applying density before the platform style reverts to `compact` |
| an unknown density keeps the platform preset | `{ platform: "darwin", density: "dense" }` has `density.name === "compact"` | a hardcoded `"comfortable"` fallback returns comfortable |
| a recipe wins over a platform key | `{ recipe: "xp", platform: "darwin" }` has XP's light `primary`, not macOS's | falling through to `platform` returns `#0071E3` |
| an unknown platform/recipe is the identity | `{ platform: "beos", recipe: "aqua" }` equals `getTheme("light")` field for field where it matters (`name`, `colors.primary`) | accepting an unknown name returns `undefined` or throws |
| unknown mode/contrast fall back | `{ mode: "sepia", contrast: "ultra" }` is the light default theme | a missing guard returns `undefined` and the resolver throws |
| `undefined`/absent fields are the default | `{}` and `{ mode: undefined }` both equal `getTheme("light")` | a truthiness check that treats `undefined` as a value diverges |

The file imports `theme-choice.example.ts` and asserts its resolved theme is the
Windows dark choice, so the example cannot drift from the API (plan 350).

Prove both directions on the two precedence cases (step 0). The other cases are
proven by the wrong-branch technique where cheap; the recipe and density cases
are the two that motivated the plan and are mandatory.

## 7. STOP conditions

- A shipped axis combination **fails** one of the three checks: stop and report
  the combination and the failures. The resolver composes shipped values only;
  a failure is a real token defect outside this plan, not something to paper
  over.
- macOS's density is no longer `compact` or the identity's `radius.lg` is no
  longer 8: stop and re-derive the discriminator; do not weaken the precedence
  test to a value the platform styles do not ship.
- `platform-recipes.ts` or `platforms.ts` would need an edit to break a cycle:
  stop and report. The resolver is a leaf module; the dependency direction is
  not negotiable in this plan.
- A docs guard fails on the new snippet or type row: fix the document to match
  the implementation, not the guard.
- Any token value, colour, pair, floor, metric, platform style or recipe would
  change: stop. This plan adds composition only.

## 8. Acceptance

- `resolveThemeChoice` and `ThemeChoice` are public from `@gpuixui/tokens`,
  documented in the type index, the Theme API, the design-system extension
  section and the README, and covered by a runnable example imported by the
  suite.
- The density and recipe precedence and the three fallbacks are held by tests
  that were proved to fail in the wrong direction.
- No colour, pair, floor, metric, platform style or recipe moves; every shipped
  check still returns `[]`.
- `TODO.md` ticks the row and its bar is current; the plan index lists 380 and
  summarises it; the work is committed on `agent/tokens-theme` and pushed.
