# 302 — The removed `platformTheme` and its merged consumer

| Field | Value |
| ----- | ----- |
| Phase | F (integration) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`, its `COMPONENTS.md` rows, `TODO.md` integration rows) |
| Depends on | plans `051` (platform type styles), `063` (platform style variants), the primitives plans merged on `master` after this branch was cut (`021`, `055`) |
| Status | done |

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

Plan `063` replaced `platformTheme(base, platform)` with `applyPlatformStyle`
and `getPlatformTheme`. Its STOP conditions say:

> `platformTheme` turns out to have a consumer in another worktree that this
> change would break — record it as a cross-team migration row and **keep the
> new API additive until they migrate**.

That condition has been hit. `master` is the integration branch and contains the
primitives workstream, whose runtime suite imports the removed function:

```sh
git grep -n "platformTheme" master -- packages apps examples
# master:packages/primitives/runtime/theme-axes.runtime.test.tsx:24:  platformTheme,
# master:packages/primitives/runtime/theme-axes.runtime.test.tsx:166:
#   <ThemeProvider theme={platformTheme(lightTheme, platform)}>
# master:packages/primitives/docs/theme-provider.mdx:59,64,66,115
```

This branch's `packages/tokens/src/theme.ts` does not export it, so a merge of
`master` into this branch cannot type-check `packages/primitives` and its native
theme-axes suite cannot run. Nobody recorded the primitives row that plan `063`
required, so the interlock is invisible in this worktree's `TODO.md`.

The alias alone does **not** make the merge green. `master`'s primitives fixture
is three token generations behind this branch:

- `packages/primitives/src/core/testing/theme.fixture.ts` declares a 47-role
  `ThemeColors` (this branch ships 62);
- the same fixture builds an elevation level as `{ …, color }` (this branch's
  level is `{ …, alpha }`, composed by `elevationShadow`, plan `085`);
- the same fixture has no `contrast`, `motion` or `avatarSize` field on `Theme`.

Those files belong to the primitives workstream. This plan does not edit them.
It keeps the one public API additive, and it records the rest as precise
cross-team rows so the integration owner can act.

## 2. Decisions (do not re-litigate)

- **Restore `platformTheme` with its pre-063 contract, marked deprecated.** It
  changes the two families and the display name only. It must not apply platform
  colours, radii, density or shadows: a consumer that imported the type-only
  helper would otherwise get a different design after a patch upgrade, and the
  old primitive docs promise exactly "re-types the base theme".
- **`getPlatformTheme` remains the recommended API.** The alias exists to keep
  the merged workspace compiling until `primitives` migrates. It is not a second
  way to build a platform theme and must not be taught as one.
- **No tag or version bump.** The package is `private`. The migration row is the
  removal condition.
- **Do not merge `master` in this plan.** The primitives fixture and elevation
  shape need their own workstream's edits; merging now would leave the branch
  with a red type-check outside this workstream's paths. Record the rows instead.
- **Do not edit `packages/primitives`, `apps/*` or any other workstream's path.**

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `packages/tokens/src/theme.ts` | add `platformTheme(base, platform)` with `@deprecated` JSDoc, next to `applyPlatformStyle`; import `platformTypes` |
| `packages/tokens/src/platform-type-bridge.test.ts` | **new** — the regression test |
| `docs/tokens.md` | short subsection under Platform styles: the deprecated bridge, its exact contract, the removal condition |
| `packages/tokens/README.md` | one sentence in the Platform styles section, same facts |
| `.agents/slop/plans/063-platform-style-variants.md` | append a "STOP hit" note pointing at this plan |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | tick this work, add the two cross-team rows |
| `COMPONENTS.md` | one clause in the Platform style row: the deprecated bridge exists |

## 4. Exact change

### 4.1 `packages/tokens/src/theme.ts`

Add `platformTypes` to the existing import from `./platforms.js`:

```diff
 import {
+  platformTypes,
   platformStyles,
   type PlatformName,
   type PlatformStyle,
 } from "./platforms.js";
```

Add the function immediately before `applyPlatformStyle`:

```ts
/**
 * Change only the two font families of a theme for a platform.
 *
 * @deprecated Plan 063 replaced this with {@link applyPlatformStyle} and
 * {@link getPlatformTheme}: a platform variant is a full style (families,
 * radii, density, motion, surfaces, accent, shadows), not a font decision.
 * This alias keeps the pre-063 contract — same colours, scales, mode, density
 * and elevation; only the families and the name change — for the `primitives`
 * workstream, which still imports it. It will be removed when that workstream
 * migrates; do not use it in new code.
 *
 * @example
 * ```tsx
 * <ThemeProvider theme={platformTheme(themes.dark, "win32")} />
 * ```
 */
export function platformTheme(base: Theme, platform: PlatformName): Theme {
  const { label, sans, mono } = platformTypes[platform];
  return extendTheme(base, {
    name: `${base.name} · ${label}`,
    typography: { sans, mono },
  });
}
```

`extendTheme` is declared below in the same module; function declarations hoist,
so no reordering is needed. Do not add it to `index.ts`: that file already
`export *`s `theme.js`.

### 4.2 `packages/tokens/src/platform-type-bridge.test.ts` (new)

Header comment must state the bug guarded:

```
Plan 063 removed `platformTheme`, but the primitives workstream merged on
`master` still imports it in `runtime/theme-axes.runtime.test.tsx`. This file
holds the deprecated bridge to the pre-063 contract, so the merged workspace can
type-check and a later "cleanup" cannot quietly turn the type-only helper into a
full style variant.
```

The cases, all on the shipped themes:

1. **Families and name only.** For `lightTheme` and every `PlatformName`:
   `typography.mono === platformTypes[platform].mono`, `name` contains
   `platformTypes[platform].label`, and `colors`/`spacing`/`radius`/`density`/
   `elevation`/`motion`/`borderWidth`/`iconSize`/`avatarSize`/`mode`/`contrast`
   are structurally equal to the base (`toEqual`).
2. **It resolves through `textStyle`.** `textStyle(platformTheme(lightTheme,
   "linux"), "code").fontFamily` is the Linux mono family, and the Windows one
   differs — the integration a component actually paints.
3. **It is not a style variant.** `platformTheme(lightTheme, "win32")` keeps the
   identity's `colors.primary` and `radius.md`, while
   `getPlatformTheme("win32", "light")` changes both. This is the case that
   fails if someone reimplements the alias as `applyPlatformStyle`.
4. **A high-contrast base keeps its level.** `platformTheme(highContrastDarkTheme,
   "win32")` keeps `mode: "dark"`, `contrast: "high"` and the AAA colours.
5. **No mutation.** A snapshot of `lightTheme.typography` is unchanged after the
   call.

### 4.3 `docs/tokens.md`

After the "To ship your own look" block and before "**High contrast wins over
resemblance**" (or at the end of the Platform styles section, before "### Authoring
a platform style"), add:

```md
### The deprecated `platformTheme` bridge

`platformTheme(base, platform)` is the pre-063 helper: it changes the two font
families and the display name, and nothing else. It stays exported, marked
deprecated, because the `primitives` package still imports it; it applies no
colour, radius, density or shadow, so it is a type choice, not a style variant.
Use `getPlatformTheme(platform, mode, contrast)` for a real variant. The alias is
removed when `primitives` migrates (recorded in `TODO.md`).
```

The public-value guard in `docs.test.ts` requires every exported name to appear
in this file, so the subsection is mandatory, not decorative.

### 4.4 `packages/tokens/README.md`

Add the same fact in the Platform styles section (one sentence, after the
`getPlatformTheme` example):

```md
`platformTheme(base, platform)` is the deprecated pre-063 bridge: families and
name only, kept for the `primitives` package until it migrates. New code uses
`getPlatformTheme`.
```

### 4.5 Plan 063 correction

Append under its §1 (or as a final note before §9):

> **STOP hit (plan 302).** `master`'s `packages/primitives` imports the removed
> `platformTheme` in its runtime theme-axes suite and its theme-provider page.
> Plan 302 restores it as a deprecated type-only alias and records the remaining
> primitives migration rows.

### 4.6 `TODO.md`

Under the tokens block, ticked:

```md
`[x]` Keep the platform-type helper additive for the merged primitives consumer
— `platformTheme(base, platform)` returns as a deprecated families-and-name-only
bridge, held to its pre-063 contract, after plan 063 deleted it while
`master`'s primitives runtime suite still imports it (plan 302)
```

Unticked cross-team rows (near the other `primitives` rows):

```md
`[ ]` Cross-team: `primitives` migrates off the deprecated `platformTheme`
bridge — its `runtime/theme-axes.runtime.test.tsx` imports it and
`docs/theme-provider.mdx` teaches it; both move to `getPlatformTheme(platform,
mode)` and the bridge is then deleted from tokens (owner: `primitives`; plan 302)
`[ ]` Cross-team: `primitives` updates its theme fixture to this branch's token
generation — `src/core/testing/theme.fixture.ts` still declares the 47-role
palette (62 ship now), an elevation level as `{ …, color }` (it is `{ …,
alpha }` since plan 085) and a `Theme` without `contrast`, `motion` or
`avatarSize`, so it cannot type-check against the merged package (owner:
`primitives`; plans 019, 054, 073, 085, 302)
```

Update the section header's done/total counts to the real numbers after the rows
are added.

### 4.7 `COMPONENTS.md`

In the **Platform style variants** row, add one clause:

```md
`platformTheme(base, platform)` remains as the deprecated families-only bridge
for the primitives workstream (plan 302); `getPlatformTheme` is the API new code
uses.
```

## 5. Commands and expected results

Run from the worktree root, in this order:

```sh
# 1. Prove the failure first: comment out / do not yet add the function, then
nub run --filter @gpuixui/tokens test -- platform-type-bridge
# expected: FAIL — `platformTheme` is not a function (or the import is
# undefined). Record the output before implementing.

# 2. Implement §4.1, then
nub run --filter @gpuixui/tokens test
# expected: exit 0; 37 previous files + 1 new file pass

nub run --filter @gpuixui/tokens check-types
# expected: exit 0

nub run --filter @gpuixui/tokens build
# expected: exit 0

nub run check
# expected: exit 0 (check:tests, lint, fmt, type-check)

nub run lint
# expected: exit 0

nub run test
# expected: exit 0 for this worktree's workspaces
```

Evidence commands (read-only):

```sh
git grep -n "platformTheme" master -- packages/primitives
# expected: the runtime test import, its JSX use, and the docs page

git grep -n "platformTheme" HEAD -- packages/tokens/src
# expected after the change: theme.ts (the alias) and the new test only
```

## 6. STOP conditions

Stop and report instead of improvising if:

- `master`'s primitives no longer imports `platformTheme` (re-run the evidence
  grep): then the alias is unnecessary — delete §4.1 and the test, keep the
  cross-team fixture row if it is still accurate, and record why the plan was
  narrowed;
- merging `master` would be required to prove the alias — do **not** merge; the
  primitives fixture is still three token generations behind and would leave
  type-check red in another workstream's path. Record it and stop;
- the docs public-value guard fails because the deprecated name cannot be
  documented without teaching it as current — keep the "deprecated bridge"
  subsection; do not remove the export to make the guard pass;
- `@deprecated` breaks lint or the consumer type check — report the exact
  diagnostic rather than dropping the tag.

## 7. Test plan

**Two-direction proof (mandatory).**

1. Write `platform-type-bridge.test.ts` before the source change and run it:
   it must fail on the missing export. Save the failing output in the commit
   message or the plan's implementation note.
2. Add the function and run the same command: it must pass.
3. Break the implementation deliberately once — make it delegate to
   `applyPlatformStyle(base, platformStyles[platform])` — and confirm case 3
   ("it is not a style variant") fails. Revert.

**What each case can catch.**

| Case | A change that would fail it |
| ---- | --------------------------- |
| families and name only | a family edit that leaks into a text role, or a merge that changes colours/scales |
| `textStyle` resolution | the alias setting `typography.sans` but not `mono`, or `textStyle` reading the wrong field |
| not a style variant | someone "simplifying" the alias to `getPlatformTheme`/`applyPlatformStyle`, which would change pixels for old consumers |
| high-contrast base | the alias resetting `contrast` or `mode` |
| no mutation | an in-place edit of the base theme |

The existing `docs.test.ts`, `exports.test.ts` and `platforms.test.ts` must stay
green; they already guard the catalogue, the entry point and the style variants.

## 8. Acceptance criteria

- `platformTheme(base, platform)` is exported from `@gpuixui/tokens`, marked
  deprecated, and changes only the two families and the name.
- A new test file proves the contract in both directions, including that it is
  **not** a style variant.
- `docs/tokens.md` and `packages/tokens/README.md` name it as the deprecated
  bridge with its removal condition; the public-value guard passes.
- Plan 063 carries the STOP-hit note; this plan is indexed.
- `TODO.md` has the ticked tokens row and both cross-team primitives rows.
- `COMPONENTS.md` records the bridge in the platform-style row.
- `nub run check`, `nub run lint` and `nub run test` pass **in this worktree**.
- No merge of `master` is attempted, and no file outside this workstream's paths
  is edited.

## 9. Implementation note

Delivered on `agent/tokens-theme`. The two-direction proof was run in order:

1. `platform-type-bridge.test.ts` before the source change:
   `6 failed | 6` with `TypeError: platformTheme is not a function`.
2. Correct implementation: `6 passed`.
3. Deliberate break (alias delegating to `applyPlatformStyle`): the
   "is not a style variant" case failed with
   `expected '#0067C0' to be '#5F4BDB'`.
4. Reverted: `6 passed`; the full package suite is `38` files / `1815` tests.

No merge of `master` was attempted; the two cross-team primitives rows carry the
remaining migration.
