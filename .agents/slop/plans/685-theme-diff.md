# 685 — The inverse of `extendTheme`: express an edited theme as overrides

**Workstream:** `tokens-theme` · **Phase:** F (extension mechanism) · **Block:** `500–699`
**Depends on:** 011 (theme shape), 051/063 (platform styles), 085 (elevation shape),
089/534 (density merge), 321 (undefined is omitted), 353 (dimensions), 389
(platform numeric groups), 529 (theme choice)

## 1. The gap

`extendTheme(base, overrides)` is one-way. A consumer that edits a theme at
runtime — a theme editor, a settings screen, a "Copy theme" button — holds a
complete `Theme` and has no supported way to turn it back into the small
`ThemeOverrides` set that produced it:

```ts
const base = getTheme("dark");
const edited = extendTheme(base, { radius: { md: 8 }, density: "compact" });

// There is no API for this:
const overrides = /* ? */; // { radius: { md: 8 }, density: "compact" }
```

The docs deliberately leave a whole-theme JSON object to the application's
`Schema` (`docs/tokens.md` § *Theme API*, `docs/design-system.md` § 11), so the
copy-and-own story stops at runtime editing. `apps/docs`'s shipped Theme Editor
(`63ef4ad8`, plan 436) can only serialise the twelve roles it edits; an editor
that moves a density, an elevation level or a type role cannot emit the
`createTheme` module the page teaches. The extension mechanism is missing its
inverse, not another token.

**This is additive.** No colour, pair, floor, metric, shipped theme or existing
signature changes.

## 2. The decision

Ship one total function and no new type:

```ts
themeOverrides(base: Theme, theme: Theme): ThemeOverrides | undefined
```

- It returns the **minimal** override set that reproduces `theme` when applied
  with `extendTheme(base, overrides)`.
- It returns `undefined` when `base.mode !== theme.mode`, because
  `extendTheme` cannot change the mode: the caller must pick a base of the
  theme's mode. This is the package's existing absence convention (the core
  entry is dependency-free; `themeChoiceFromParams` returns `undefined` for an
  absent axis).
- It is pure data over the public `Theme` and the documented ordered indexes
  (`colorRoles`, `textRoles`, `spacingSteps`, `radiusSteps`,
  `borderWidthSteps`, `iconSizeSteps`, `avatarSizeSteps`, `dimensionNames`,
  `motionLevels`, `motionPhases`, `elevationLevels`, `controlSizes`), so a new
  step joins the diff from the same index a table iterates.

Why not alternatives:

- **A whole-theme serialiser.** Out of scope by the documented boundary: a
  whole theme is decoded by the application's `Schema`. Overrides of a known
  base are the package's own data shape.
- **A deep-equality helper in the public API.** Not a token concept, and a
  second way to compare themes; the diff owns its comparisons.
- **A `Result` union with named variants.** Three public types and a
  documentation row for a mode mismatch that a typed caller resolves by
  choosing the right base. `undefined` is the package's existing shape for an
  axis that cannot be applied.
- **A second `extendTheme` argument.** It would change the established merge
  semantics and confuse "declare a level" with "derive a level".

## 3. Semantics (the executor must follow exactly)

Groups are diffed field by field; a group with no change is omitted.

| Group | Comparison | Value emitted |
| ----- | ---------- | ------------- |
| `name` | `!==` | `theme.name` |
| `contrast` | `!==` | `theme.contrast` |
| `colors` | per `colorRoles` member | changed roles only |
| `typography` | `sans`/`mono` by `!==`; each role's `fontSize`, `lineHeight`, `fontWeight` | changed fields only |
| `spacing` | per `spacingSteps` | changed steps only |
| `radius` | per `radiusSteps` | changed steps only |
| `dimensions` | per `dimensionNames` | changed members only |
| `borderWidth` | per `borderWidthSteps` | changed members only |
| `iconSize` | per `iconSizeSteps` | changed members only |
| `avatarSize` | per `avatarSizeSteps` | changed members only |
| `density` | deep (name, three heights, three paddings, row height) | see below |
| `elevation` | each level as a list of `ElevationShape` compared field by field | changed levels only |
| `motion` | timings per `motionLevels`; easings per `motionPhases` (tuple compared element by element) | changed timings, and `ease` only when an easing changed |

**Density.** If the target density equals the base's, omit it. Otherwise compare
against `densityPresets[theme.density.name]`:

- metrics equal the named preset → emit the preset name (a string);
- otherwise emit `{ preset: theme.density.name, controlHeight: { …changed
  sizes }, controlPaddingX: { …changed sizes }, rowHeight?: number }`, with an
  empty size record omitted.

Comparing against the *preset* (not the base) is what makes the result
reproducible even when the base itself carries a tuned preset: `mergeDensity`
starts from `densityPresets[preset]`, never from the base's tuned metrics, when a
preset is named.

**Modes.** `base.mode !== theme.mode` → `undefined`.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/tokens/src/theme-diff.ts` | **new** — the function and its private helpers |
| `packages/tokens/src/index.ts` | add `export * from "./theme-diff.js";` after `theme-choice.js` |
| `packages/tokens/src/theme-diff.test.ts` | **new** — regression + round-trip suite (§6) |
| `packages/tokens/src/theme-diff.example.ts` | **new** — executed copy-and-own example |
| `docs/tokens.md` | § *Theme API*: a "Deriving a theme back to overrides" subsection, the value in the import block or the section, and a link to the example; no new type row |
| `docs/design-system.md` | § 11 *Extension*: one bullet for the inverse |
| `packages/tokens/README.md` | § *Extending a theme*: one paragraph and the example link |
| `COMPONENTS.md` | *Theme extension* row: name `themeOverrides` and the round-trip guarantee |
| `TODO.md` | add and tick the task; update the tokens progress bar to the true count |
| `TODO.md` | correct the stale role count in the `primitives` fixture row (66 → 71) |
| `.agents/slop/plans/README.md` | table row `685` and a summary paragraph |

`docs/tokens.md`'s value-coverage guard (`docs.test.ts`, "names every value the
package exports") requires the name somewhere in the page; the type index needs
no row because no type is added.

## 5. Implementation steps

1. Create `packages/tokens/src/theme-diff.ts` with:
   - imports of the typed groups and the ordered indexes listed in §2;
   - `changedSteps<K extends string>(keys, base, theme)` returning
     `Partial<Record<K, number>>` via a `reduce` (no mutation of inputs);
   - `changedColors`, `changedTextStyle`, `changedTypography`,
     `densityEquals`, `changedDensity`, `levelEquals`, `changedElevation`,
     `easingEquals`, `changedMotion`;
   - `themeOverrides(base, theme)` composing the groups with conditional spreads
     and returning `undefined` for a mode mismatch.
   - JSDoc: purpose, the minimality promise, the mode contract, and one
     copyable `@example` that imports everything it calls and does not reference
     an undeclared `theme`.
2. Add the entry to `index.ts`.
3. Add `theme-diff.example.ts`:
   ```ts
   const base = getTheme("light");
   export const exportedTheme = extendTheme(base, {
     name: "Exported",
     density: "compact",
     radius: { md: 8 },
     typography: { body: { lineHeight: 22 } },
   });
   export const exportedOverrides = themeOverrides(base, exportedTheme);
   ```
   and export the base for assertions.
4. Add `theme-diff.test.ts`.
5. Write the docs sections and link the example.
6. Update the ledger and plan index last.

## 6. Test plan (must be able to fail)

`packages/tokens/src/theme-diff.test.ts`:

1. **Header** states the gap guarded: an edited theme could only be exported as a
   whole object, so the copy-and-own path lost the override set.
2. **Every shipped theme round-trips over the identity of its mode.** For each
   `shippedThemes` entry: `overrides = themeOverrides(getTheme(mode), theme)`,
   assert defined, then `extendTheme(getTheme(mode), overrides)` deep-equals
   `theme`. This covers platform styles, recipes, both contrasts and both modes.
3. **A platform theme over another platform's theme round-trips** (darwin base,
   win32 target; and the reverse).
4. **A high base to an explicit default target round-trips** (the
   `applyPlatformStyle(high, style, "default")` path).
5. **An edited theme touching every group round-trips** — name, contrast (a
   declaration), one colour, one type field, one spacing step, one radius, a
   tuned density, one dimension, one elevation level, one timing, one easing,
   a border width, an icon size and an avatar size.
6. **The diff is minimal**: identity → identity is `{}`; a tuned compact density
   yields exactly `{ preset: "compact", controlHeight: { md: 30 }, rowHeight: 30 }`;
   changing one spacing step yields only that step.
7. **A mode mismatch returns `undefined`.**
8. **The example's overrides are exact** and round-trip.

Reverting the fix: delete `theme-diff.ts` (or make `themeOverrides` return `{}`)
→ the suite fails to compile / every round-trip fails. State this in the plan
execution report; do not claim the two-directions script ran if it cannot (the
repo's `verify-two-directions.sh` is written against `jj`, see `TODO.md`).

## 7. Commands and expected results

Run from the worktree root:

```bash
nub run --filter @gpuixui/tokens test      # 192+ files, 6700+ tests, all pass
nub run --filter @gpuixui/tokens check-types
nub run check                              # check:tests + lint + fmt + types
nub run lint
nub run test
```

The full `nub run test` is the completion gate; run it once before committing the
final code change. `nub run check` must be re-run after the docs edits.

## 8. STOP conditions

Stop and report instead of improvising if:

- `theme-diff.ts` needs a cast, `any`, or a mutation of an input;
- a round-trip fails for a shipped theme — that is a real semantic bug in the
  design, not a licence to widen equality (capture the failing group);
- adding the value breaks the docs value-coverage or snippet guard in a way that
  requires retyping an existing list;
- the ledger counts cannot be derived (report the count, do not guess).

## 9. Acceptance criteria

- `themeOverrides` is exported, documented in all three consumer documents and
  named by the value-coverage guard.
- The round-trip holds for all 24 shipped sets and for an edited theme touching
  every expressible group.
- Minimality cases pass exactly as specified.
- The example is imported by the suite and linked from a consumer document.
- `nub run check`, `nub run lint` and `nub run test` pass.
- `TODO.md` shows the task ticked and the progress bar equals the checked/total
  count of the section; `COMPONENTS.md` names the inverse.

## 10. Execution report

Landed as `9f1378c8` on `agent/tokens-theme` (pushed).

- `packages/tokens/src/theme-diff.test.ts`: 12/12 pass.
- Two-directions check (the repo's `scripts/verify-two-directions.sh` is
  `jj`-based and cannot run here, see `TODO.md`): with `themeOverrides` forced to
  return `{}`, **10 of 12** cases fail (every round-trip and the example
  assertions); the two that still pass are the identity `{}` minimality case and
  the mode-mismatch case, which do not exercise the diff. Restored: 12/12.
- `nub run --filter @gpuixui/tokens test`: 192 files, 6736 tests, all pass.
- `nub run check`: check:tests, lint, format and type-check pass.
- `nub run test`: 192 files, 6736 tests, all pass.

The `ThemeOverrides | undefined` return is an intentional exception to the
enforcer's `prefer-option-over-null` advice: `@gpuixui/tokens` ships zero runtime
dependencies by design (`docs/tokens.md` § *Import*, `theme-choice.ts`'s
`ThemeParamSource` note), so absence is the platform's union here rather than an
`Option` this package would have to pull in. The absence is documented and
tested, not silent.
