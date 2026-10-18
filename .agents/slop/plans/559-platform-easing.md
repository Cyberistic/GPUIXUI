# 559 — Let a copied platform style own its easings

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | B/F (theme extension) |
| Owner | `tokens-theme` |
| Paths | `packages/tokens/src`, `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md` |
| Depends on | 019 (motion tokens), 321 (total merges), 364 (motion contract), 389 (numeric platform groups) |

## 1. The defect

`MISSION.md` requires a platform style to be a real, editable theme: "a consumer
can take one platform theme file, edit it, and ship their own look". Plan 389
made `structure` carry the type scale, spacing, border widths, icon and avatar
sizes, and component dimensions, so the copy-and-own file owns the whole
**shape**. Motion is the one group it only half owns.

`PlatformStyleStructure.motion` is typed

```ts
readonly motion?: Partial<Omit<Motion, "ease">>;
```

(docs/tokens.md line 750), so a copied style can change a timing but **cannot
name an easing**. `extendTheme` can: `ThemeOverrides.motion` is
`Partial<Omit<Motion, "ease">> & { ease?: Partial<MotionEasings> }`, and
`mergeMotion` merges the curves phase by phase. A style that carries a platform
curve therefore fails `check-types` (TS2353: `ease` does not exist in type
`Partial<Omit<Motion, "ease">>`) even though the resolver already forwards
`structure.motion` to `extendTheme` and would apply it.

The docs already promise the whole look ("A style owns its **whole look**, not
only its colours", docs/tokens.md) and the motion section teaches a bezier
override through `extendTheme`. The copy-and-own path the reference teaches is
the one path that cannot express it. No shipped value is wrong; the extension
mechanism is incomplete.

## 2. The shape of the fix

Give the partial-motion shape one owner and reuse it in both places:

- `packages/tokens/src/motion.ts` — add and export

  ```ts
  /**
   * Partial motion overrides: any timing, or the easings inside `ease`.
   * Timings merge level by level and easings merge phase by phase.
   */
  export type MotionOverrides = Partial<Omit<Motion, "ease">> & {
    readonly ease?: Partial<MotionEasings>;
  };
  ```

  Place it immediately after the `Motion` interface (both `Motion` and
  `MotionEasings` are already declared above it).

- `packages/tokens/src/theme.ts` — import `type MotionOverrides` instead of
  `type MotionEasings`, type `ThemeOverrides.motion` as `MotionOverrides`, and
  type `mergeMotion`'s `override` parameter as `MotionOverrides | undefined`.
  No behaviour change: `mergeMotion` already merges nested `ease` through
  `mergeDefined`.

- `packages/tokens/src/platform-types.ts` — import `type MotionOverrides`
  instead of `type Motion` and change the field to

  ```ts
  /** Transition timings and easings; omitted values inherit the identity. */
  readonly motion?: MotionOverrides;
  ```

  The JSDoc's "easings are shared" sentence is deleted.

`platformOverrides` in `theme.ts` already passes `motion: style.structure.motion`
into `extendTheme`, so the resolver needs no change. `index.ts` already has
`export * from "./motion.js"`, so `MotionOverrides` is public.

## 3. Example

`packages/tokens/src/platform-extension.example.ts` is the complete
copy-and-own file ("owns **every** part of its look"). Add motion to its
`structure`, so the capability is executed rather than sketched:

```ts
motion: { fast: 150, ease: { enter: [0.2, 0, 0, 1] } },
```

The bezier is valid: four finite points, x values `0.2` and `0` inside `0…1`.
Update the file header to say the style also names a motion timing and easing.
Every other field stays as it is.

## 4. Documentation

- `docs/tokens.md`, `## Types`: add one row in alphabetical order (between
  `MotionLevel` and `MotionPhase`):

  ```md
  | `MotionOverrides` | Partial timings and easings for `extendTheme` or a platform style's `structure.motion`. |
  ```

  `public-types.test.ts` requires every exported type to appear exactly once.

- `docs/tokens.md`, `### Authoring a platform style`: change the block's
  `motion?: Partial<Omit<Motion, "ease">>;` to `motion?: MotionOverrides;`, and
  extend the "A style owns its **whole look**" paragraph: "…travel with radii,
  density and motion — timings and the easings inside `ease` merge value by
  value, exactly like `extendTheme`."

- `docs/tokens.md`, `## Motion`: after the `extendTheme(… ease …)` sentence, add
  "A copied platform style may name the same curves in `structure.motion`; each
  omitted phase inherits the identity's." Keep the existing runtime rules
  (finite control points, x inside `0…1`) as the sentence that follows.

- `docs/tokens.md`, `PlatformStyleStructure` row in `## Types`: replace "motion"
  with "motion timings and easings".

- `packages/tokens/README.md`: in the copy-and-own paragraph, say the
  `structure` group owns motion "timings and easings" beside radii, density and
  the numeric scales.

- `COMPONENTS.md`: in the **Platform style variants** row, add that a copied
  style owns motion timings and easings through `structure.motion` (plan 559);
  in the **Theme extension** row, add that `MotionOverrides` is the one shape
  behind `extendTheme` and a platform style. Do not restate any count.

## 5. Test plan

New file `packages/tokens/src/platform-motion.test.ts`, with a header comment
stating the bug:

> `PlatformStyleStructure.motion` excluded `ease`, so a copied style could own
> its timings but not its curves while `extendTheme` merged them phase by phase;
> the copy-and-own file the reference teaches could not express a platform's
> easing, and naming one failed `check-types`.

Cases:

1. **Applies the motion a style names.** Build a `PlatformStyle` whose
   `structure.motion` is `{ fast: 150, ease: { enter: [0.2, 0, 0, 1] } }` and
   `applyPlatformStyle(getTheme("dark"), style)`. Assert `theme.motion.fast` is
   `150`, `theme.motion.ease.enter` deep-equals the tuple, and
   `theme.motion.ease.standard` / `exit` / `linear` still equal the base's.
2. **Inherits every value a style omits.** A style with
   `motion: { normal: 240 }` changes only `normal`; all four easings equal the
   base and every other timing is unchanged.
3. **Holds an easing to the runtime's curve.** Apply a style with
   `ease: { enter: [2, 0, 0, 1] }` and assert `themeMetricFailures` contains
   `{ group: "motion", member: "ease.enter[0]", rule: "within" }` (follow the
   shape in `motion-contract.test.ts`), proving a copied curve goes through the
   same contract as an `extendTheme` curve.
4. **Moves no shipped value.** For every `platformStyles` entry and both modes,
   assert the resolved theme's `motion.ease` equals the identity's and
   `themeFailures` returns `[]`.
5. **Executes the copied example.** For both modes,
   `applyPlatformStyle(getTheme(mode), contosoDensityPlatformStyle)` has
   `motion.fast === 150`, `motion.ease.enter` equal to the tuple, and
   `themeFailures(theme)` `[]`.

Exported-type proof: importing `type MotionOverrides` and using it in a
`satisfies`/annotated constant is enough for the type-level half; the behaviour
cases guard the wiring.

Add one case to `packages/tokens/src/docs.test.ts`:

```ts
it("offers a platform style the whole motion scale", () => {
  expect(markdown).toContain("motion?: MotionOverrides;");
  expect(markdown).toContain(
    "A copied platform style may name the same curves in `structure.motion`",
  );
});
```

### Both-directions proof

Before implementing, add the test file and the example change, then run:

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: FAIL with TS2353 on the `ease` member of the style's
`structure.motion`. That is the regression the plan fixes. After the type change
the same command passes. Record both outputs in the commit message body (one
line each).

The runtime direction is proven by temporarily removing
`motion: style.structure.motion` from `platformOverrides`; case 1 must fail.
Restore immediately.

## 6. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/tokens test
```

Expected: all files pass, including the new suite.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0.

```sh
nub run check
nub run lint
nub run test
```

Expected: all three exit 0 (the completion gate).

## 7. STOP conditions

- The type change forces a shipped style to change a value. Stop: no shipped
  easing should move; only the capability changes.
- `mergeMotion` does not merge the easing phase by phase. Stop and report the
  current merge before touching it.
- The docs snippet guard rejects `MotionOverrides` in a block that has no
  package import. If so, keep the block import-free (it is a shape sketch) and
  report; do not add an import to satisfy a guard that should not apply.
- Any existing exact-string docs guard fails for a reason other than the edited
  sentences. Stop and list the failing expectation; do not loosen the guard.

## 8. Acceptance

- A `PlatformStyle` literal can name a timing and a partial easing map and
  `check-types` accepts it.
- The resolved theme carries the style's easings and inherits the omitted ones.
- An invalid curve in a style is reported by `themeMetricFailures`.
- Every shipped theme, platform variant and recipe resolves to the same motion
  values as before.
- The authored example exercises the capability; the docs name the type, the
  block and the motion section.
- `nub run check`, `nub run lint`, `nub run test` pass.
- `TODO.md` has the new row ticked; the progress bar reads `224/291`.
- `COMPONENTS.md` mentions the capability in both rows.

## 9. Verification (2026-10-19)

- Before the type change, `nub run --filter @gpuixui/tokens check-types` failed
  with `src/platform-extension.example.ts(26,26): error TS2353 ... 'ease' does
  not exist in type 'Partial<Omit<Motion, "ease">>'` and the same error in
  `platform-motion.test.ts`.
- With the types in place but `motion: style.structure.motion` removed from
  `platformOverrides`, 4 of the 5 new cases failed; restored, all pass.
- `nub run --filter @gpuixui/tokens test`: 140 files / 5,719 tests pass.
- `nub run check`, `nub run lint`, `nub run test`: exit 0.
