# 021 — `packages/primitives` consumes `@gpuixui/tokens` directly

**Phase:** B. **Owner:** primitives workstream.
**Depends on:** plan `016` (tokens resolvable from source), `017` (`focusRing`),
`018` (`elevationShadow`), `030` (the shipped primitives tree).
**Status:** done (2026-10-17).

This is the primitives half of the cross-team task recorded in `TODO.md`
(“`primitives` and `components` depend on `@gpuixui/tokens` directly and delete
their structural copies”). The components half belongs to the components
workstream and is **not** part of this plan.

---

## 1. Why

`packages/primitives` was written before the tokens package existed. It declared
a **structural port** — `PrimitiveTheme` — and two local helpers that the tokens
package now owns:

| Duplicate in `packages/primitives` | Owner since |
| ---------------------------------- | ----------- |
| `src/core/theme.ts` — 197 lines redeclaring every theme group (`colors`, `typography`, `spacing`, `radius`, `density`, `elevation`, `borderWidth`, `iconSize`) | `@gpuixui/tokens` `src/theme.ts` |
| `src/core/style.ts` — `RING_WIDTH`, `ring()` | `@gpuixui/tokens` `focusRing(theme)` |
| `src/core/style.ts` — `firstShadow()` | `@gpuixui/tokens` `elevationShadow(theme, level)` |

Both copies compile today, so nothing fails — they simply drift. `PLAN.md` D12
recorded the port as a temporary unblock; `packages/tokens` is now on `main`
and its `exports` point at `src/index.ts` (plan 016), so the reason for the copy
is gone. D17 records the replacement.

Measured shape compatibility (2026-10-17, `origin/master`):

- `Theme` in `packages/tokens/src/theme.ts` has exactly the nine groups
  `PrimitiveTheme` declares, with the same field names and types.
- `ThemeColors` in `packages/tokens/src/color.ts` is a **superset** of the roles
  primitives render (it adds `warning*`, `info*`, the four `*Soft` pairs).
- `Density`, `Spacing`, `Radius`, `BorderWidth`, `IconSize`, `Typography`,
  `TextStyle`, `BoxShadow`, `Elevation` are structurally identical.
- `focusRing(theme): { boxShadow: BoxShadow }` uses
  `spreadRadius: theme.borderWidth.strong` and `color: theme.colors.ring`.
- `elevationShadow(theme, level): BoxShadow | undefined` returns the first
  entry or `undefined` for the reserved empty `overlay` level.

Conclusion: the migration is a type re-export plus two helper calls, not an
adapter. If that stops being true, the plan stops (§5).

## 2. Exact files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/package.json` | add `"@gpuixui/tokens": "workspace:*"` to `dependencies` |
| `packages/primitives/src/core/theme.ts` | delete the declarations; re-export the tokens types; keep the local `ColorRef` type (defined in terms of `PrimitiveTheme`) |
| `packages/primitives/src/core/style.ts` | import `focusRing`, `elevationShadow` from `@gpuixui/tokens`; delete `RING_WIDTH`, `ring`, `firstShadow`; keep the destructive-ring behaviour by recolouring the ring's single shadow |
| `packages/primitives/src/core/testing/theme.fixture.ts` | add the ten tokens-only colour roles to the fixture palette so it still satisfies `Theme` |
| `packages/primitives/src/core/style.test.ts` | add the geometry/role regression tests from §4 |
| `packages/primitives/runtime/theme.runtime.test.tsx` | switch the scene to the real `lightTheme` / `darkTheme` from `@gpuixui/tokens`; update the header comment |
| `packages/primitives/runtime/fixture.tsx` | **unchanged** — the other runtime suites keep the deterministic fixture as their default theme |
| `packages/primitives/README.md` | theme section: the port is gone; tokens is the source; link plan 021 |
| `packages/primitives/docs/theme-provider.mdx` | document that `theme` is `@gpuixui/tokens`’ `Theme` |
| `COMPONENTS.md` | update the “Both themes (042)” paragraph: real tokens palettes, not doubles |
| `TODO.md` | tick the cross-team item; record plan 021 under the primitives section |
| `.agents/slop/plans/README.md` | mark 021 `done` with its measured result |

Nothing else. Do **not** edit `packages/tokens`, `packages/components`,
`apps/*` or any other workstream’s path. If a change there is genuinely needed,
add a `TODO.md` row and stop.

## 3. Steps

### Step 0 — get the tokens package into this worktree

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
test -f packages/tokens/src/index.ts && echo "tokens present"
```

Expected: `tokens present`. If it is absent, merge the integration branch and
resolve every conflict in **this** branch:

```sh
git merge --no-ff origin/master
```

Conflict resolution rules used on 2026-10-17 (the tree is already merged when
this plan is executed the first time — keep it that way):

- `TODO.md`: keep `master`’s `tokens-theme` section **and** the primitives
  section; both are true.
- `COMPONENTS.md`: keep the primitives table (it has the implementation status
  and the docs/example column) and append master’s extra Tier 1 rows
  (`Slider`, `Range slider`, `Meter`, `Number Field`, `OTP Field`, `Toggle`,
  `Rating`) with `—` in the docs column.
- `PLAN.md`: keep master’s D6–D8 (infrastructure) and renumber the GPUix
  decisions to D9–D16; D17 is this migration.
- `.agents/slop/plans/README.md`: keep both plan tables (the primitives table
  and master’s tokens/reference-adoption tables).

STOP if a conflict appears in a path this workstream does not own.

Then install so the workspace link exists:

```sh
nub install
ls node_modules/@gpuixui
```

Expected: `tokens` appears in the listing (alongside `config`, `icons`, …).

### Step 1 — depend on tokens

Add to `packages/primitives/package.json`:

```json
"dependencies": {
  "@gpuixui/icons": "workspace:*",
  "@gpuixui/tokens": "workspace:*"
}
```

Expected: `nub run --filter @gpuixui/primitives check-types` still passes
(nothing imports it yet).

### Step 2 — `src/core/theme.ts` becomes a re-export

Replace the file’s contents with a short module that re-exports the token types
under the names the components already import, keeping `ColorRef` local:

```ts
/**
 * The theme a primitive draws with.
 *
 * The values and the shape are owned by `@gpuixui/tokens` (plan 021): this
 * module only names the subset the components import and adds the `ColorRef`
 * resolver type. A second structural copy would drift silently.
 */

export type {
  BoxShadow as ThemeShadow,
  BorderWidth,
  ControlSize,
  Density,
  DensityName,
  Elevation,
  ElevationLevel,
  FontWeight,
  IconSize as ThemeIconSize,
  Radius,
  RadiusStep,
  Spacing,
  SpaceStep,
  TextStyle,
  TextRole,
  Theme as PrimitiveTheme,
  ThemeColors,
  ThemeMode,
  Typography,
} from "@gpuixui/tokens";

import type { Theme as PrimitiveTheme } from "@gpuixui/tokens";

/**
 * How a colour is reached from a theme.
 *
 * A function rather than a dot-path string: a misspelled path is a compile
 * error, and a variant can derive a colour instead of only naming one.
 */
export type ColorRef = (theme: PrimitiveTheme) => string;
```

Notes for the executor:

- `import type` after `export type` is legal TypeScript; if the project’s import
  ordering rule complains, put the import first and the re-export second.
- Do not re-export `Theme` under its own name; the components use
  `PrimitiveTheme` everywhere. One name for one concept.
- `SpaceStep` and `RadiusStep` exist in `@gpuixui/tokens` (`scale.ts`). If a
  name is missing there, STOP (§5) rather than redeclaring it.

Verify:

```sh
nub run --filter @gpuixui/primitives check-types
```

Expected: clean.

### Step 3 — `src/core/style.ts` uses the token helpers

1. Add to the imports:

   ```ts
   import { elevationShadow, focusRing } from "@gpuixui/tokens";
   ```

2. Delete `RING_WIDTH`, `ring()` and `firstShadow()`. Update the file header
   from “the single point where a semantic decision becomes a `StyleDesc`” only
   if the wording still claims it owns ring geometry; the ring is now tokens’.
3. Replace `controlFocusStyle` with:

   ```ts
   /**
    * What a control adds while it holds keyboard focus.
    *
    * The geometry is `@gpuixui/tokens`’ `focusRing` (a zero-offset, zero-blur
    * shadow spread by `borderWidth.strong`); only the colour changes for an
    * invalid control. GPUix 0.10.0 has no `focusVisible`, so a component tracks
    * focus itself (`onFocus`/`onBlur`) and merges this over the resting style.
    */
   export const controlFocusStyle = (
     spec: ControlSpec,
     theme: PrimitiveTheme,
   ): StyleDesc => {
     const ring = focusRing(theme);
     return spec.invalid === true
       ? { boxShadow: { ...ring.boxShadow, color: theme.colors.destructive } }
       : ring;
   };
   ```

4. Replace the elevation branch in `surfaceStyle` with:

   ```ts
   if (spec.elevation !== undefined) {
     Option.map(
       Option.fromNullishOr(elevationShadow(theme, spec.elevation)),
       (shadow) => {
         style.boxShadow = shadow;
       },
     );
   }
   ```

   `Option` is already imported; `ThemeShadow` may no longer be needed in the
   type import list — remove it if the compiler says it is unused.

5. Keep `theme.colors.ring` as the normal ring colour. `ThemeColors` still
   carries it.

Verify:

```sh
nub run --filter @gpuixui/primitives check-types
nub run --filter @gpuixui/primitives test
```

Expected: type-check clean; the existing tests pass except the fixture may now
fail to type-check — Step 4 fixes that first if so.

### Step 4 — extend the test fixture to the full `Theme`

`src/core/testing/theme.fixture.ts`’s `palette()` must now return
`PrimitiveTheme["colors"]`, which includes ten roles the fixture does not list.
Add, each with its own sequential offset so no two roles compare equal:

```ts
warning: shade(offset + 36),
warningForeground: shade(offset + 37),
info: shade(offset + 38),
infoForeground: shade(offset + 39),
infoSoft: shade(offset + 40),
infoSoftForeground: shade(offset + 41),
successSoft: shade(offset + 42),
successSoftForeground: shade(offset + 43),
destructiveSoft: shade(offset + 44),
destructiveSoftForeground: shade(offset + 45),
```

Keep the elevation indices (`wash(36..38)`) unique by moving them past the new
colour offsets if the comment’s “distinct per index” rule would now collide;
the requirement is that no two values in the whole fixture are equal.

Verify:

```sh
nub run --filter @gpuixui/primitives check-types
nub run --filter @gpuixui/primitives test
```

Expected: clean and green.

### Step 5 — the regression tests

Add to `packages/primitives/src/core/style.test.ts` (or a new
`src/core/tokens.test.ts` if the style suite becomes unwieldy — prefer the style
suite; it is the file whose subject is resolution):

1. **The ring geometry comes from tokens, not a local constant.** Build a theme
   with `borderWidth: { thin: 1, strong: 5 }` and assert
   `spreadOf(controlFocusStyle(spec(), widened)) === 5`. This **fails before the
   migration** (the local `RING_WIDTH` is 2).
2. **The invalid ring keeps the geometry and changes only the colour.** For the
   same widened theme, assert the invalid style’s `boxShadow.spreadRadius` is 5
   and its `color` is `theme.colors.destructive`.
3. **The elevated surface is `elevationShadow`’s answer.** Assert
   `surfaceStyle({ tone: "card", elevation: "md" }, testTheme).boxShadow` equals
   `elevationShadow(testTheme, "md")`, and that `elevation: "overlay"` paints
   none (the reserved empty level).
4. **The shipped themes are the shape primitives render.** Import
   `lightTheme` and `darkTheme` from `@gpuixui/tokens` and assert
   `controlStyle(spec(), lightTheme).backgroundColor === lightTheme.colors.primary`
   and the same for `darkTheme`. This is the guard that the real package — not a
   double — satisfies the type the components accept; if tokens renames a role,
   the type-check fails and this test documents why the role is read.

Header comment: state that the tests guard D17 — a reintroduced local ring or
shadow helper must fail, not merely look different.

Run:

```sh
nub run --filter @gpuixui/primitives test -- style
```

Expected: all pass. Prove both directions for test 1 by temporarily changing
Step 3’s `focusRing(theme)` back to a literal spread of 2; the test must fail.
Restore the fix before committing (`scripts/verify-two-directions.sh` if it
accepts this shape; otherwise record the manual probe in the plan index).

### Step 6 — the runtime theme suite uses the real palettes

In `packages/primitives/runtime/theme.runtime.test.tsx`:

- replace the fixture import with

  ```ts
  import { darkTheme, lightTheme } from "@gpuixui/tokens";
  ```

- use `lightTheme` / `darkTheme` in the scene and in the switch assertion —
  keep the existing structural invariant (every painted colour is a role value
  from the active palette), so the test does not hard-code brand colours.
- update the header comment: the palettes are the shipped ones (plan 021), so
  this is the real “both themes” verification, not a double.
- Leave `runtime/fixture.tsx` on the deterministic fixture: the other suites
  assert geometry against theme numbers, and a real system font would make the
  text-paint assertions less stable for no gain. Record that choice in the
  updated comment.

Run:

```sh
nub run --filter @gpuixui/primitives test:runtime
```

Expected: 7 files / 68 tests green (the count may rise by the tests added in
Step 5 only in the offline suite, so runtime stays 68). If one of the real
palette’s colours is reported outside the palette, that is a real role leak —
STOP and record the element and property; do not widen the check.

### Step 7 — documentation and ledgers

- `packages/primitives/README.md`: replace the “theme port” wording with:
  the theme is `Theme` from `@gpuixui/tokens`; primitives re-export the type
  under `PrimitiveTheme`; density is still a value on the theme; tests use a
  deterministic fixture while the runtime theme suite uses the shipped light and
  dark themes; link plan 021.
- `packages/primitives/docs/theme-provider.mdx`: say `theme` accepts
  `Theme` from `@gpuixui/tokens` and show that import in the example.
- `COMPONENTS.md`: update the “Both themes (042)” paragraph to name
  `lightTheme`/`darkTheme` and plan 021, delete “which is not in this tree yet”.
- `TODO.md`: tick “Cross-team: `primitives` and `components` depend on …” for the
  primitives half only if components has not done its half — write “primitives
  half done (021); components still outstanding” and keep the box unticked if
  the components copy remains. Add under the primitives section:
  `[x] packages/primitives: consume @gpuixui/tokens directly … (plan 021)`.
- `PLAN.md`: D17 already records the decision; no further edit.
- `.agents/slop/plans/README.md`: change 021’s status to `done` with the counts
  from the runs in Steps 5–6.

### Step 8 — gates

```sh
nub run check
nub run test
nub run --filter @gpuixui/primitives test:runtime
```

Expected: all green. Then commit:

```sh
git add packages/primitives .agents/slop/plans/021-primitives-consume-tokens.md
git add TODO.md COMPONENTS.md PLAN.md .agents/slop/plans/README.md
git commit -m "refactor(primitives): consume @gpuixui/tokens directly"
git push origin agent/primitives
```

(If the merge commit was not already made, commit it separately as
`merge(primitives): bring origin/master in`.)

## 4. Test plan

| Test | Catches | Fails before the fix? |
| ---- | ------- | --------------------- |
| ring spread follows `borderWidth.strong` (set to 5) | a reintroduced hard-coded `RING_WIDTH` | **yes** — local constant is 2 |
| invalid ring keeps geometry, takes `destructive` | an invalid control that loses the ring, or a recolour that changes the spread | no (behaviour is preserved deliberately) — kept as the contract |
| surface elevation equals `elevationShadow`; `overlay` paints none | a local shadow helper drifting from tokens’ one-shadow rule | no (same result today) — contract |
| `lightTheme`/`darkTheme` resolve a control’s roles | the port diverging from the real package | type-check fails if roles change; runtime assertion fails if resolution stops reading the theme |
| runtime theme switch with shipped palettes | a provider that memoises the first theme, or a role painted outside the active palette | no — the existing test already proves the switch; the migration upgrades the palettes to real ones |

Every new assertion must be able to fail: the first one is the measured
both-direction probe; the others guard contracts whose regression would
otherwise compile.

## 5. STOP conditions

Stop and report — do not improvise an adapter — if:

1. `Theme` is not assignable to the shape the components read (a `tsc` error
   naming a group or field). Record the exact diff; the fix belongs to one of
   the two packages, decided with evidence.
2. `@gpuixui/tokens` cannot be resolved from `packages/primitives` after
   `nub install` (check `node_modules/@gpuixui/tokens`). Do not add a tsconfig
   path shim; that is plan 061’s problem, owned by the tokens workstream.
3. A runtime theme test reports a painted colour outside the shipped palette.
   That is either a component painting a literal or a palette gap — both need a
   decision, not a widened assertion.
4. Resolving the merge requires editing a path this workstream does not own.
5. Any gate in Step 8 fails for a reason not covered by Steps 1–7.

## 6. Acceptance

- `packages/primitives` has no local declaration of the theme shape, no
  `RING_WIDTH`/`ring`, and no `firstShadow`.
- `@gpuixui/tokens` is a declared dependency; components import
  `PrimitiveTheme` from `src/core/theme.ts` unchanged.
- The new regression test fails when the ring geometry is re-hardcoded.
- Offline suite and the 7-file/68-test runtime suite are green.
- `nub run check` and `nub run test` are green.
- README, docs page, COMPONENTS row and TODO/plan index tell the same story.
- Committed on `agent/primitives` and pushed.

## 7. Result (measured 2026-10-17)

- `nub run --filter @gpuixui/primitives check-types` — clean.
- `nub run --filter @gpuixui/primitives test` — **16 files, 165 tests**, green
  (4 new in `style.test.ts`; the rest unchanged).
- `nub run --filter @gpuixui/primitives test:runtime` — **7 files, 68 tests**,
  green against the real `TestRenderer`, with the runtime theme suite now
  mounting the shipped `lightTheme` / `darkTheme`.
- Both-direction probe for the ring geometry: reverting `controlFocusStyle` to a
  local `spreadRadius: 2` failed the two new tokens tests
  (`spreadRadius` expected `5`, received `2`); restoring `focusRing` made them
  pass.
- `packages/primitives/src/core/theme.ts` is now 41 lines (from 197) and contains
  one re-export block plus `SpaceStep`, `RadiusStep` and `ColorRef`;
  `style.ts` has no `RING_WIDTH`, `ring` or `firstShadow`.
