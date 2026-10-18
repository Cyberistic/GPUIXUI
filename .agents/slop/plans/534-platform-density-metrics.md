# 534 — A platform style owns the metrics inside its density preset

Status: ready. Depends on 011 (the package), 089 (`DensityOverrides`), 353/389
(the numeric groups a style owns) and 380/529 (the density axis applied last).

## The bug

`PlatformStyleStructure` accepts every numeric group as a partial — `radius`,
`motion`, `typography`, `spacing`, `borderWidth`, `iconSize`, `avatarSize`,
`dimensions` — except one:

```ts
export interface PlatformStyleStructure {
  readonly density?: DensityName; // a preset name, nothing else
  // …
}
```

`DensityOverrides` exists (plan 089) and merges size by size, but it has no way
to name the preset its metrics belong to, so a platform style cannot express
"compact, with a taller row". MISSION.md's platform-style acceptance is that a
consumer "can take one platform theme file, edit it, and ship their own look",
and `docs/tokens.md` says "a style owns its **whole look**". The macOS file — the
one the copy-and-own story uses as its example — ships
`density: "compact"`, and the only edit the file permits is deleting it.

Two failures, probed on this tree before the plan was written:

- **A copied file cannot be edited.** `{ ...macos.structure, density: { rowHeight:
  30 } }` does not type-check: `Type '{ rowHeight: number; }' is not assignable
  to type 'DensityName'`.
- **An override silently changes the preset's identity.** A JavaScript caller who
  writes the override anyway gets the *base* theme's preset with one metric
  moved. At runtime:

  ```ts
  const themed = extendTheme(getTheme("light"), {
    density: { preset: "compact", rowHeight: 30 },
  });
  // themed.density.name           === "comfortable"   (asked for "compact")
  // themed.density.controlHeight  === { sm: 28, md: 32, lg: 36 }
  // themed.density.rowHeight      === 30
  ```

  `mergeDensity` reads `controlHeight`, `controlPaddingX` and `rowHeight` and
  ignores every other key, so `preset` is dropped without a diagnostic. Applying
  that record as a platform style loses macOS's compact height ladder entirely:
  the resolved theme is comfortable-sized with a 30px row and still reads as a
  macOS variant. No check reports it — the metrics it produces are valid.

So the one group a component reads on every row is the one group a copied style
cannot own, and the escape hatch changes the meaning of the preset.

## The decision

One shape, one new field, no new public type.

1. `DensityOverrides` gains an optional `preset?: DensityName` — the preset the
   metrics are merged over. Omitted, they merge over the base theme's density,
   which is today's behaviour.
2. `mergeDensity` resolves the starting preset first:
   `from = override.preset === undefined ? base : densityPresets[override.preset]`,
   then merges each record and carries `from.name`.
3. `PlatformStyleStructure.density` widens to `DensityName | DensityOverrides`.

A copied style then reads:

```ts
structure: {
  density: { preset: "compact", rowHeight: 30 },
},
```

Rejected alternatives:

- **A nested `{ preset, overrides }` shape.** It keeps the preset and the edits
  apart, but it is a *third* public density shape beside `DensityName` and
  `DensityOverrides`, and the same data would be written differently in a
  `ThemeOverrides` and in a `PlatformStyleStructure`. The field achieves the same
  result inside the shape plan 089 already publishes.
- **Letting a bare override merge over the base theme in a style file.** That is
  exactly the silent preset swap above: the file says "row height 30" and the
  style stops being macOS.
- **A separate `PlatformDensity` type.** It would duplicate the merge for the
  style path while `extendTheme` kept the gap; a consumer extending a theme
  directly has the same need.

The rules stay total and unchanged elsewhere:

- A style that names no `density` inherits the base theme's density, metric
  overrides included.
- A named preset still replaces the base wholesale (`{ density: "compact" }`).
- `resolveThemeChoice` still applies a stored density *last*, so a persisted
  axis wins over the platform's preset and its edits (plan 529).
- `themeMetricFailures` reads the resolved metrics, so a preseted override is
  checked like any other density.

No colour, pair, floor, type role, spacing, radius, elevation, motion, dimension
or shipped metric moves.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/scale.ts` | `DensityOverrides.preset`; interface JSDoc says what `preset` means |
| `packages/tokens/src/theme.ts` | `mergeDensity` resolves `override.preset` before merging; `ThemeOverrides.density` JSDoc |
| `packages/tokens/src/platform-types.ts` | `PlatformStyleStructure.density?: DensityName \| DensityOverrides`; JSDoc |
| `packages/tokens/src/density-preset.test.ts` | **new** regression suite (header names the bug) |
| `packages/tokens/src/platform-extension.example.ts` | the copied style names `density: { preset: "compact", rowHeight: 30 }`; docstring says seven groups |
| `packages/tokens/src/platform-extension.test.ts` | the local `extended` style and `resolved()` cover density; the example case asserts its preset |
| `packages/tokens/src/docs.test.ts` | the merge-rule sentence; a case holds the density snippet to the example |
| `packages/tokens/src/readme.test.ts` | the merge sentence in "Extending a theme"; the platform paragraph naming `preset` |
| `packages/tokens/README.md` | "Extending a theme" merge sentence; the platform-extension paragraph |
| `docs/tokens.md` | type index row; `PlatformStyleStructure` block; authoring prose; Density section; merge rules |
| `COMPONENTS.md` | **Theme extension** and **Platform style variants** rows |
| `TODO.md` | tick the new row in the tokens workstream |
| `.agents/slop/plans/README.md` | index this plan |

## Steps

1. `packages/tokens/src/scale.ts` — inside `DensityOverrides`, before
   `controlHeight`:

   ```ts
   /** The preset the metrics merge over; omitted, the base theme's preset. */
   readonly preset?: DensityName;
   ```

   Replace "The preset's name is never overridable — a metric override is still
   the base preset with edits." with the new rule: `preset` names where the
   metrics start, so an override can tune a preset it did not ship in.

2. `packages/tokens/src/theme.ts` — in `mergeDensity`, after the
   `isDensityName` arm:

   ```ts
   const from =
     override.preset === undefined ? base : densityPresets[override.preset];
   return {
     name: from.name,
     controlHeight: mergeDefined(from.controlHeight, override.controlHeight),
     controlPaddingX: mergeDefined(
       from.controlPaddingX,
       override.controlPaddingX,
     ),
     rowHeight: override.rowHeight ?? from.rowHeight,
   };
   ```

   Update `ThemeOverrides.density` JSDoc: "`preset` names the preset the metrics
   start from; omitted, the base preset's name is kept."

3. `packages/tokens/src/platform-types.ts` — import `type DensityOverrides`
   beside `DensityName`; widen the field and document it:

   ```ts
   /**
    * Control density: a preset, or a preset with the metrics tuned inside it.
    * Omitted, the base theme's density is kept.
    */
   readonly density?: DensityName | DensityOverrides;
   ```

4. Write `packages/tokens/src/density-preset.test.ts` (see the test plan) and
   **run it before step 5**: it must fail on the pre-fix source.

5. `packages/tokens/src/platform-extension.example.ts` — add
   `density: { preset: "compact", rowHeight: 30 }` to `structure` and say "the
   seven numeric groups" in the docstring. The values are the shipped compact
   preset with one row-height step, so the metric contract holds unchanged.

6. `packages/tokens/src/platform-extension.test.ts` —
   - `extended` gains `density: { preset: "compact", rowHeight: 30 }`;
   - `resolved()` gains `densityName: theme.density.name` and
     `rowHeight: theme.density.rowHeight`, and the "applies every group" case
     expects `compact` / `30`;
   - the "inherits a group the style omits" case also asserts
     `themed.density` equals `base.density`;
   - rename "holds the copied example on every density preset" to "resolves the
     copied example's density over every base preset" and assert `compact`,
     `30` and the compact height ladder for each base.

7. `docs/tokens.md`:
   - type index: `` `DensityOverrides` `` — "Partial density metrics and the
     preset they start from; they merge size by size.";
   - the `PlatformStyle` block: `density?: DensityName | DensityOverrides;`;
   - after "every omitted role or level inherits the identity", add: "A style
     owns its density too: a preset name replaces the base's metrics, and
     `{ preset, …metrics }` tunes the named preset instead of the base's.";
   - Density section, after the size-by-size paragraph, add:

     ```ts
     import { extendTheme, lightTheme } from "@gpuixui/tokens";

     const roomyCompact = extendTheme(lightTheme, {
       density: { preset: "compact", rowHeight: 30 },
     });
     ```

     and prose: "`preset` names the preset the metrics start from, so
     `roomyCompact` keeps compact's 24 / 28 / 32 control heights and 6 / 8 / 10
     padding while raising the row height, and the theme names `compact`. Without
     `preset` the metrics merge over the base theme's density, which is why a
     copied platform style names the preset it tunes."
   - merge rules bullet: "`density` accepts a preset name, or partial metrics
     with the `preset` they start from; metrics merge by size, so changing the
     medium control height keeps the small and large ones, and a partial override
     without a `preset` keeps the base preset's name;".

8. `packages/tokens/README.md`:
   - "Typography merges field by field, density metrics size by size over the
     preset the override names or the base's, component dimensions field by
     field, …";
   - the platform paragraph: "The `platform-extension.example.ts` example names
     every numeric group — its density names `compact` and raises the row height
     inside it — and is applied in both modes …".

9. `packages/tokens/src/docs.test.ts`:
   - update the merge-rule sentence at the "states the density merge rule" case
     to the new bullet verbatim;
   - add a case "states the preset a density override starts from": read
     `contosoDensityPlatformStyle.structure.density` from the example, assert it
     is an object with `preset` and `rowHeight`, and require the Density section
     to contain the same two values in the documented snippet.

10. `packages/tokens/src/readme.test.ts` — update the "Extending a theme"
    sentence and add a case that the platform paragraph names `preset`.

11. `COMPONENTS.md`:
    - **Theme extension** row: density "accepts a preset name or metrics with the
      `preset` they start from (plans 089, 534)";
    - **Platform style variants** row: `structure` owns the numeric scales "with
      `density` a preset plus the metrics tuned inside it (plan 534)".

12. `TODO.md` — add and tick the row under Design tokens and theming; bump the
    progress count 195/257 → 196/258.

13. Index this plan in `.agents/slop/plans/README.md` (table row after 533).

## Commands and expected results

```sh
cd packages/tokens && nub exec vitest run src/density-preset.test.ts
```

Before step 5 (pre-fix source): **fails** — case 1 reports `comfortable` where it
expects `compact`; case 4 reports the base preset. After the change: passes.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 124 files pass (123 today plus `density-preset.test.ts`); every shipped
platform, recipe and AAA set still passes `themeFailures`.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: clean — in particular the example file's
`density: { preset: "compact", rowHeight: 30 }` type-checks only after step 3.

```sh
nub run check && nub run lint && nub run test
```

Expected: all green.

## Test plan

Write `packages/tokens/src/density-preset.test.ts` with this header:

> Bug guarded: `PlatformStyleStructure.density` accepted only a `DensityName`, so
> the style file a consumer is told to copy could not tune a control height, and
> `DensityOverrides` could not name the preset it belongs to — a
> `{ preset, rowHeight }` override silently merged over the **base** theme's
> preset (`comfortable`), turning a copied macOS style into comfortable-sized
> controls with no diagnostic. Plan 534 makes the preset part of the override and
> lets a platform style carry it.

Cases:

1. **a preset with an override starts from that preset** —
   `extendTheme(getTheme("light"), { density: { preset: "compact", rowHeight: 30 } })`
   names `compact`, keeps compact's `controlHeight` and `controlPaddingX`, and
   reports `rowHeight` 30. Pre-fix this returns `comfortable` and comfortable
   heights: the regression.
2. **a preset alone selects the whole preset** — `{ preset: "spacious" }` deep
   equals `densityPresets.spacious` (metrics and name).
3. **overrides merge over the named preset, not the base** — base spacious,
   `{ preset: "compact", controlHeight: { sm: 26 } }` keeps `compact.md`/`lg`
   and compact padding, with `sm` 26.
4. **a platform style carries its preset and its edits** —
   `applyPlatformStyle(getTheme("light"), { ...platformStyles.darwin, structure: { density: { preset: "compact", rowHeight: 30 } } })`
   names `compact`, keeps the compact height ladder and reports 30. Pre-fix it
   names `comfortable`.
5. **a style that names no density inherits the base, overrides included** — base
   `{ preset: "spacious", rowHeight: 40 }`, style `structure: {}` resolves to
   `spacious` at 40.
6. **the authored example resolves its preset over every base** —
   `contosoDensityPlatformStyle` applied to comfortable, compact and spacious
   bases all resolve to `compact` with `rowHeight` 30, and `themeFailures` is
   `[]` for each.
7. **the metric contract still sees the edited values** —
   `{ preset: "compact", rowHeight: 8 }` is reported by `themeMetricFailures` for
   `density.rowHeight` (below the body line), so the new field is not an escape
   hatch.
8. **no shipped metric moves** — for every `platformNames` entry and both modes,
   `getPlatformTheme(platform, mode).density` deep equals the preset the style
   names (`macOS` compact, the rest comfortable), and `themeFailures` is `[]`.

Two directions: run the suite against the pre-fix `scale.ts`/`theme.ts`/
`platform-types.ts` (case 1 fails on the preset name) and then against the fix.
`scripts/verify-two-directions.sh` uses `jj`, which this repo does not use
(PLAN.md D1), so prove it with `git stash push packages/tokens/src/scale.ts
packages/tokens/src/theme.ts packages/tokens/src/platform-types.ts`, run the
suite, then `git stash pop`.

## STOP conditions

- A shipped platform, recipe or high-contrast set gains a metric or contrast
  failure. The shipped styles keep their name-only density; if one changes, the
  merge is over-broad — stop.
- `{ preset: "compact" }` with no metrics does **not** equal
  `densityPresets.compact`. Stop: an empty override is still the preset.
- A metric override without `preset` starts from anything but the base theme's
  density. Stop: that is the documented inheritance and plan 089's behaviour.
- `themeChoice`'s stored-density path stops winning over a platform's preset.
  Plan 529's ordering is unchanged; if it regresses, stop.
- The docs guard needs a retyped preset table to pass. Fix the document, not the
  guard: the table is derived from `densityPresets`.

## Acceptance

- `DensityOverrides` accepts the `preset` its metrics start from; `mergeDensity`
  resolves it before merging.
- `PlatformStyleStructure.density` accepts `DensityName | DensityOverrides`, and
  the copied example names both a preset and a metric.
- A `{ preset, rowHeight }` override resolves to the named preset, not the base's.
- No shipped theme, platform variant or recipe changes a value.
- `docs/tokens.md`, the package README, `COMPONENTS.md` and `TODO.md` describe
  the shape the package ships, and every gate is green.
