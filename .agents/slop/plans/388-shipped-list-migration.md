# Plan 388: every "every shipped set" suite enumerates the one shipped set

> **Status (2026-10-18).** Done. Sixty-five suites now map `shippedThemes`
> instead of building their own matrix, and `shipped-themes.test.ts` guards the
> rule with a real-tree scan plus two synthetic sources. The guard failed on the
> pre-migration tree (listing every claiming suite) and passes now. The only
> semantic edits are the three the plan names: `motion.test.ts` claims the level
> shape rather than identity equality, `ring-soft.test.ts` filters on
> `theme.contrast`, and the `filled-control` alpha figures keep their values
> under the 24-set matrix. The full tokens suite is 94 files / 4603 tests green;
> `check-types`, `lint` and `fmt` pass. No colour, role, pair, floor, metric,
> platform style, recipe or theme value moves.

## Why

Plan 387 proved that the package's own suites disagreed about what "every shipped
set" means. The audit for this plan finds the disagreement is wider than the
three lists 387 moved:

- **identity only (4 sets):** `focus`, `motion`.
- **identity + platform variants (10):** `body-text-surfaces`, `control-boundary`,
  `control-boundary-soft`, `control-edge`, `inactive-soft`, `inactive-state`,
  `primary-text`, `ring-soft`, `selection-secondary`, `selection-text`,
  `skeleton-washes`, `soft-divider`, `soft-edge-surfaces`, `selection-soft`,
  `soft-quiet-panel`, `state-fill-surfaces`, `state-text`, `status-soft-border`,
  `status-text`, `wash-text`.
- **identity + variants + recipes at the default contrast only (14):**
  `accent-states`, `filled-state-steps`, `filled-states`, `invalid-field-edge`,
  `selection-states`, `typeface`.
- **identity + `platformNames` (which includes `default`) + recipes at the
  default contrast (16, the identity counted twice):** `body-line-fit`,
  `content-box-fit`, `finite-metrics`, `font-weight`, `overlay-elevation`,
  `type-scale`.
- **all 24, but rebuilt locally:** `canvas-input-text`, `color-format`,
  `combobox-check-mark`, `field-adornment-text`, `field-pressed-edge`,
  `invalid-ring`, `mark-contrast`, `neutral-press-edge`, `overlay-scrim`,
  `placeholder-surfaces`, `row-surface-text`, `secondary-wash-text`,
  `selected-row-edge`, `selection-on-fill`, `selection-status`,
  `selection-status-panel`, `soft-panel-text`, `selection-card-foreground`,
  `toast-tone`, `track-contrast`, `wash-steps`, `platform-contrast-elevation`.
- **28 with the identity counted twice:** `motion-contract`, `overlay-height`.
- **20 with the identity counted twice and no AAA variant or recipe:**
  `ring-surfaces`.
- **12 with the identity counted twice and no AAA variant or recipe:**
  `elevation-tint`.

The missing half is almost always the **AAA recipe** (`xp`/`aero` at
`contrast: "high"`): eight shipped sets. A recipe's high-contrast palette is a
real editable theme the docs toggle offers, so a suite that skips it claims a
guarantee it does not test. `ring-surfaces` additionally misses every AAA
platform variant. The duplicated identity is not a false negative, but it means
"28 sets" in a failure message is not a set count.

Every one of those lists is a second edit site for a future platform, recipe or
contrast. Plan 387 made the owner; this plan makes the suites read it.

## Decision

1. **One source.** A suite that claims the full set imports
   `shippedThemes` from `./shipped-themes.js` and maps it. No suite retypes
   `["darwin", "linux", "win32"]`, `themeContrasts.map` or a recipe loop for a
   full-set claim. `platformVariants` is the only platform exclusion, and it is
   already derived.
2. **The label is the theme's own name.** Plan 387 guarantees one unique
   `theme.name` per set, so a migrated suite uses `theme.name` as its diagnostic
   label; it does not rebuild `identity light default`-style strings. A case
   that filtered on a hand-built label (only `ring-soft`) filters on
   `theme.contrast === "high"` instead.
3. **Only full-set claims move.** A suite that deliberately measures an axis, a
   subset quoted in the docs, or a composition keeps its list. The three suites
   with a `quoted` subset (`selection-card-foreground`, `selection-status-panel`,
   `soft-panel-text`) migrate their full list and keep `quoted` unchanged,
   because its figures are the ones the catalogue quotes.
4. **Guard the rule.** `shipped-themes.test.ts` gains a case that reads every
   `*.test.ts` beside it and fails when a case title claims "every shipped set"
   or "every shipped theme" and the file does not import the enumeration. The
   guard is proven in both directions with synthetic sources and the real tree.

### Canonical replacements

Unlabelled:

```ts
import { shippedThemes } from "./shipped-themes.js";

const themes: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) => theme);
```

Labelled tuple:

```ts
const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);
```

Labelled object:

```ts
const shipped: ReadonlyArray<{ readonly label: string; readonly theme: Theme }> =
  shippedThemes.map(({ theme }) => ({ label: theme.name, theme }));
```

A local `const shippedThemes = (): ReadonlyArray<Theme> => [...]` (five suites)
is renamed to `const shipped: ReadonlyArray<Theme> = shippedThemes.map(...)` and
its call sites lose the `()`. Do not alias the import to keep the old name.

## Files

Every file is under `packages/tokens/src/`. "Shape today" is the matrix the
suite builds before this plan; "replace" always means the canonical form above.

| File | Shape today | Change |
| ---- | ----------- | ------ |
| `accent-states.test.ts` | identity + variants + recipes@default, labelled object | replace with labelled object |
| `body-line-fit.test.ts` | identity + `platformNames` + recipes@default, labelled tuple | replace with labelled tuple |
| `body-text-surfaces.test.ts` | identity + variants, labelled tuple | replace |
| `canvas-input-text.test.ts` | full 24, labelled tuple | replace |
| `color-format.test.ts` | full 24, local `shippedThemes()` function | rename to `shipped`, replace, update call sites |
| `combobox-check-mark.test.ts` | full 24, labelled tuple | replace |
| `content-box-fit.test.ts` | identity + `platformNames` + recipes@default | replace |
| `control-boundary.test.ts` | identity + variants | replace |
| `control-boundary-soft.test.ts` | identity + variants | replace |
| `control-edge.test.ts` | identity + variants | replace |
| `elevation-tint.test.ts` | 12, identity twice, no AAA variant or recipe | replace with labelled tuple |
| `field-adornment-text.test.ts` | full 24 | replace |
| `field-pressed-edge.test.ts` | full 24 | replace |
| `filled-control.test.ts` | identity + variants + recipes@default, labelled tuple | replace; **re-run the quoted alpha figures** (STOP condition) |
| `filled-state-steps.test.ts` | identity + variants + recipes@default, plain | replace with plain |
| `filled-states.test.ts` | identity + variants + recipes@default, labelled object | replace with labelled object |
| `finite-metrics.test.ts` | identity + `platformNames` + recipes@default | replace |
| `focus.test.ts` | identity only | replace with labelled tuple |
| `font-weight.test.ts` | identity + `platformNames` + recipes@default | replace |
| `inactive-soft.test.ts` | identity + variants, labelled object | replace |
| `inactive-state.test.ts` | identity + variants, labelled object | replace |
| `invalid-field-edge.test.ts` | identity + variants + recipes@default | replace |
| `invalid-ring.test.ts` | full 24 | replace |
| `mark-contrast.test.ts` | full 24, labelled tuple | replace |
| `motion-contract.test.ts` | 28, identity twice | replace |
| `motion.test.ts` | identity only; asserts `theme.motion === lightTheme.motion` | replace; the claim must become "carries every level" because Windows ships `fast === step` |
| `neutral-press-edge.test.ts` | full 24 | replace |
| `overlay-elevation.test.ts` | identity + `platformNames` + recipes@default | replace |
| `overlay-height.test.ts` | 28, identity twice | replace |
| `overlay-scrim.test.ts` | full 24 | replace |
| `placeholder-surfaces.test.ts` | full 24 | replace |
| `platform-contrast-elevation.test.ts` | full 24, labelled tuple | replace (its `realVariants` cases stay) |
| `primary-text.test.ts` | identity + variants | replace |
| `ring-soft.test.ts` | identity + variants | replace; filter `theme.contrast === "high"`, not `label.includes(" high")` |
| `ring-surfaces.test.ts` | 20, identity twice, no AAA variant | replace |
| `row-surface-text.test.ts` | full 24 | replace |
| `secondary-wash-text.test.ts` | full 24 | replace |
| `selected-row-edge.test.ts` | full 24 | replace |
| `selection-card-foreground.test.ts` | full 24, labelled `Case` | replace `shipped`; keep `quoted` |
| `selection-on-fill.test.ts` | full 24 | replace |
| `selection-secondary.test.ts` | identity + variants | replace |
| `selection-soft.test.ts` | identity + variants, local `shippedThemes()` | rename to `shipped`, replace, update call sites |
| `selection-states.test.ts` | identity + variants + recipes@default, labelled object | replace |
| `selection-status.test.ts` | full 24, labelled `Case` | replace |
| `selection-status-panel.test.ts` | full 24, labelled `Case` | replace `shipped`; keep `quoted` |
| `selection-text.test.ts` | identity + variants | replace |
| `skeleton-washes.test.ts` | identity + variants | replace |
| `soft-body-text.test.ts` | identity + `platformNames` + recipes@default, labelled tuple | replace |
| `soft-divider.test.ts` | identity + variants | replace |
| `soft-edge-surfaces.test.ts` | identity + variants, local `shippedThemes()` | rename to `shipped`, replace, update call sites |
| `soft-panel-text.test.ts` | full 24, labelled `Case` | replace `shipped`; keep `quoted` |
| `soft-quiet-panel.test.ts` | identity + variants | replace |
| `state-fill-surfaces.test.ts` | identity + variants, local `shippedThemes()` | rename to `shipped`, replace, update call sites |
| `state-text.test.ts` | identity + variants | replace |
| `status-soft-border.test.ts` | identity + variants, local `shippedThemes()` | rename to `shipped`, replace, update call sites |
| `status-text.test.ts` | identity + variants | replace |
| `toast-tone.test.ts` | full 24 | replace |
| `track-contrast.test.ts` | full 24 | replace |
| `type-scale.test.ts` | identity + `platformNames` + recipes@default | replace |
| `typeface.test.ts` | identity + variants + recipes@default, labelled object | replace |
| `wash-steps.test.ts` | full 24, plain | replace with plain |
| `wash-text.test.ts` | identity + variants | replace |
| `shipped-themes.test.ts` | enumeration suite | add the full-set-claim guard |

Each file also loses the imports its old matrix needed (`getPlatformTheme`,
`getPlatformRecipeTheme`, `platformNames`, `platformRecipeNames`, `themeModes`,
`themeContrasts`, `realPlatforms`, `platformLabels`, `recipeLabels` — whichever
becomes unused) and gains `shippedThemes`. `nub run --filter @gpuixui/tokens
check-types` fails on an unused import, so this is not optional.

## Deliberately not migrated

| File | Why |
| ---- | --- |
| `color.test.ts` | asserts the four identity palettes as data, not a guarantee over shipped sets |
| `dimensions.test.ts` | walks each axis nested and asserts inheritance; not a shipped-set claim |
| `elevation.test.ts` | asserts the shape of the identity levels |
| `guards.test.ts`, `theme-choice.test.ts` | walk the axes they guard |
| `platforms.test.ts` | the platform axis is the subject |
| `platform-recipes.test.ts` | the recipe axis is the subject |
| `platform-composition.test.ts` | base × applied style, intentionally a product |
| `theme.test.ts` | rebuilds the four identity variants through their own `mode`/`contrast` |
| `typography.test.ts`, `scale.test.ts`, `styles.test.ts` | constants, not themes |
| `applied-palette.test.ts` | axis-edge cases ("every shipped style") |
| `docs.test.ts`, `readme.test.ts`, `inventory.test.ts`, `public-types.test.ts`, `snippets.test.ts`, `examples.test.ts`, `exports.test.ts` | text/export guards |
| `contrast.test.ts`, `theme-check.test.ts`, `metrics.test.ts` | already on `shippedThemes` (plan 387) |
| the `quoted` lists in `selection-card-foreground`, `selection-status-panel`, `soft-panel-text` | they are the subsets the catalogue quotes, and their tightest-figure assertions depend on the subset |

## Command sequence

Run from the worktree root, in order.

```sh
# 1. Write the guard first and run it red on the pre-migration tree.
#    Expected: FAIL, listing every suite that claims a full set and does not
#    import ./shipped-themes.js. Record the count in the commit message.
nub run --filter @gpuixui/tokens test src/shipped-themes.test.ts

# 2. Migrate one batch, then its focused suites.
#    Expected: green; each case now measures 24 sets instead of 4/10/14/16/20/28.
nub run --filter @gpuixui/tokens test src/<batch>.test.ts

# 3. After every file is migrated, the guard is green and the whole suite runs.
nub run --filter @gpuixui/tokens test

# 4. The package gates.
nub run --filter @gpuixui/tokens check-types
nub run lint
nub run fmt

# 5. The repository gates.
nub run check
nub run test
```

## Test plan

The regression proof is the guard, because the migration itself must not change
an assertion. `shipped-themes.test.ts` gains:

- **real tree:** `fullSetClaimOffenders(sources)` is `[]`, where `sources` is
  every `*.test.ts` beside the suite, a claim is a line whose case title matches
  `every shipped (set|theme)`, and an offender is a claiming file without
  `from "./shipped-themes.js"`. **Fails before this plan** (the pre-migration
  tree lists ~50 files) and passes after.
- **synthetic source without the import** is reported, proving the case can
  fail.
- **synthetic source with the import** is not reported.

The migrated suites keep their existing assertions; the only intentional
semantic edits are:

- `motion.test.ts`: "is shared by every shipped theme" asserted equality with
  the identity `motion`, which is false for Windows (`fast === step`). The case
  becomes "carries every level on every shipped theme" and asserts the six level
  keys; `motion-contract.test.ts` still owns the ladder.
- `ring-soft.test.ts`: the high-contrast filter reads `theme.contrast`, not the
  old hand-built label.
- `filled-control.test.ts`: if the quoted alpha worst case changes when the AAA
  recipes join the matrix, STOP (see below).

Every migrated suite's guard case must still be able to fail: the pair lists and
floors it reads are unchanged, and `shippedThemes` passes `themeFailures` today,
so a green run means the wider set is genuinely clean. The guard case is the one
that fails on the pre-fix tree.

Verify both directions:

```sh
# Red: the guard case on the pre-migration tree.
nub run --filter @gpuixui/tokens test src/shipped-themes.test.ts

# Green: after the migration, the guard and every focused suite.
nub run --filter @gpuixui/tokens test src/shipped-themes.test.ts
nub run --filter @gpuixui/tokens test
```

## STOP conditions

- **A migrated suite fails on a set the old list omitted.** Stop and report the
  set, the role pair and the ratio. The enumeration is the set `themeFailures`
  covers, and every shipped set passes all four checks, so a failure here is a
  suite measuring a composition the public contract does not (or a real token
  defect). Do not widen a floor or delete the set to go green.
- **`filled-control.test.ts`'s quoted alpha figures change.** The catalogue
  quotes `2.06 / 3.40 / 2.24 / 3.75`. If the 24-set matrix produces a different
  worst case, stop: either the quotes and `docs.test.ts` move with it in this
  plan (and the plan record says so) or the figure's subset is named explicitly.
  Do not silently keep a 20-set list under a 24-set claim.
- **A suite's claim is only true of a subset.** Do not migrate it and leave the
  claim; rename the case to the axis it measures. Report it in the commit.
- **The guard reports a file with a legitimate subset claim.** Narrow the guard
  regex to the case titles that mean the full set; do not add an allowlist.
- **`check-types` reports an unused import that is still needed by another
  case.** Keep the import and re-check: the matrix was not the only consumer.

## Acceptance

- Every suite in the Files table imports `shippedThemes` and builds its matrix
  from it; no full-set claim retypes the platform, recipe or contrast axes.
- The guard fails on the pre-migration tree, passes after, and its synthetic
  cases prove both directions.
- The only semantic edits are the three named above; every other case asserts
  the same pair list and floor on a strictly larger set.
- `packages/tokens` is green, `check-types` is clean, and `nub run check`,
  `nub run lint`, `nub run fmt` and `nub run test` pass.
- `TODO.md` ticks the migration row, `.agents/slop/plans/README.md` indexes 388,
  and the work is committed on `agent/tokens-theme` and pushed.

## Cross-team

None. This is test-only code in `packages/tokens`; no token, colour, pair,
floor, metric, platform style, recipe, theme value or public export changes.
