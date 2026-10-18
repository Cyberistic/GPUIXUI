# 535 — The platform story tells the truth about the values it ships

Status: ready. Depends on 389 (a platform style owns every numeric scale), 534
(a style's density is a preset plus its metrics), 526/528 (the shipped platform
palettes and their faces) and 506 (the Linux dark selected step).

## The bug

Two consequences of the same mistake — reading a platform style's **override
record** instead of the **theme it resolves to**.

1. **The documented platform table cannot print a style the contract allows.**
   `PlatformStyleStructure.radius` is `Partial<Radius>` (plan 389) and
   `density` is `DensityName | DensityOverrides` (plan 534). `docs.test.ts` and
   `readme.test.ts` still build the row from the style record:

   ```ts
   const variantRadius = style.structure.radius ?? radius;
   const density = style.structure.density ?? defaultDensity.name;
   ```

   A style that names one radius — the shape `PlatformStyleStructure` invites —
   prints `undefined / 10 / undefined / undefined`, and a density override
   prints `[object Object]`:

   ```ts
   const style = { ...platformStyles.darwin, structure: {
     radius: { md: 10 },
     density: { preset: "compact", rowHeight: 30 },
   } };
   const variantRadius = style.structure.radius ?? radius; // { md: 10 }
   variantRadius.sm;                                       // undefined
   String(style.structure.density ?? defaultDensity.name); // "[object Object]"
   ```

   `applyPlatformStyle` resolves both correctly (`sm` inherits the identity,
   `density.name` is `compact`), so the table says the library ships something
   it does not. The guard would even *accept* the false row — it compares its
   own wrong string with the document.

2. **A quoted ratio in a platform file is stale.** `platform-styles/macos.ts`
   justifies the dark focus ring with "`#0A84FF` is 2.50:1 on the pressed-row
   wash". The shipped macOS dark `active` is `#404042`, so the value is
   **2.836:1** today. The argument still holds (it is under the 3:1 boundary
   floor), but a reader copying the file is told a number the theme does not
   produce. The other figures in those files are currently true but unguarded:
   Linux `#1C71D8` 3.51:1, Windows `#0067C0` 4.30:1, macOS `#0071E3` 4.21:1 and
   `#0A84FF` 3.82:1, macOS' 1.083:1 face and the Windows palette's 1.006:1
   border-over-scrim.

## The decision

**A platform table row states the resolved theme.** Both documents already print
a row for the same six facts; hoist the derivation into one test-shaped module
beside the suites (the `full-set-claims.ts` precedent) so the two guards cannot
drift apart, and derive from `applyPlatformStyle(getTheme(mode), style)`:

- the radius cells from the resolved `theme.radius`;
- the density cell from the resolved `theme.density.name`;
- the accent cells from the resolved `theme.colors.primary` in each mode.

A style that names one radius inherits the rest, and a density override prints
the preset it starts from — the values a consumer actually gets.

**A platform file's current figures are guarded.** `platform-claims.test.ts`
normalises each file's whitespace, derives each quoted ratio from the resolved
theme (and `compositeOver` for the scrimmed face and border), and requires the
exact sentence. The macOS 2.50 figure is corrected; the rest are pinned so the
next palette edit must take them with it. Historical and counterfactual figures
(the Linux "at the alpha the title needs it measures 1.052:1" alternative,
plan 506's pre-move values, the "2.96:1 / 2.12:1" example costs already held by
`platforms.test.ts`) are not current claims and are not pinned.

No colour, pair, floor, type role, metric, dimension or shipped table row moves:
every shipped style already resolves to the row the documents print.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/platform-table.ts` | **new** shared row derivation over the resolved theme |
| `packages/tokens/src/platform-table.test.ts` | **new** regression suite (header names the bug) |
| `packages/tokens/src/platform-claims.test.ts` | **new** guard for the platform files' quoted figures |
| `packages/tokens/src/platform-styles/macos.ts` | `2.50:1` → `2.836:1` |
| `packages/tokens/src/docs.test.ts` | platform and recipe rows use `platformTableCells`; a case names the resolution rule |
| `packages/tokens/src/readme.test.ts` | `platformRow` uses `platformTableCells`; a case names the rule |
| `packages/tokens/tsconfig.build.json` | exclude `src/platform-table.ts` from `dist` |
| `packages/tokens/tsconfig.consumer.json` | exclude the same file from the consumer check |
| `docs/tokens.md` | the platform table states its resolved values |
| `packages/tokens/README.md` | the same sentence beside its platform table |
| `COMPONENTS.md` | **Platform style variants** row |
| `TODO.md` | new row under Design tokens and theming, ticked |
| `.agents/slop/plans/README.md` | index this plan |

## Steps

1. **Refactor first, behaviour unchanged.** Create
   `packages/tokens/src/platform-table.ts` with the *current* derivation, so the
   regression suite has something to fail against:

   ```ts
   import { defaultDensity, radius, type DensityName, type Radius } from "./scale.js";
   import type { PlatformStyle } from "./platform-types.js";

   export interface PlatformTableCells {
     readonly radius: Radius;
     readonly density: DensityName;
     readonly light: string;
     readonly dark: string;
   }

   export const platformTableCells = (style: PlatformStyle): PlatformTableCells => {
     const light = style.colors.light.primary ?? themes.light.colors.primary;
     const dark = style.colors.dark.primary ?? themes.dark.colors.primary;
     return {
       radius: style.structure.radius ?? radius,
       density: (style.structure.density ?? defaultDensity.name) as DensityName,
       light,
       dark,
     };
   };
   ```

   Point `docs.test.ts` (both tables) and `readme.test.ts` at
   `radius.sm / .md / .lg / .xl`, `density` and the two accents. Drop the imports
   the two suites no longer use. Run every gate: green, no document edit.

2. Write `packages/tokens/src/platform-table.test.ts` (see the test plan) and
   **run it before step 3**: cases 1–3 fail (`undefined` radius cells,
   `[object Object]` density).

3. Replace the body of `platformTableCells` with the resolved derivation:

   ```ts
   const light = applyPlatformStyle(getTheme("light"), style);
   const dark = applyPlatformStyle(getTheme("dark"), style);
   return {
     radius: light.radius,
     density: light.density.name,
     light: light.colors.primary,
     dark: dark.colors.primary,
   };
   ```

   The module's JSDoc states why: a style may name one radius or tune a preset,
   and the table describes the theme, not the override record. Run the suite:
   green, and every shipped document row is unchanged because every shipped style
   names all four radii and a preset.

4. `docs/tokens.md` — after the platform table's intro, add: "A row states the
   **resolved** theme: a style that names one radius inherits the rest, and a
   density override prints the preset it starts from." Add the same sentence,
   reworded for the README, beside its table in `packages/tokens/README.md`.

5. `docs.test.ts` — add a case in the platform-table describe that requires that
   sentence. `readme.test.ts` — the same for its own sentence.

6. `platform-styles/macos.ts` — `2.50:1` → `2.836:1` in the focus-ring
   justification.

7. Write `packages/tokens/src/platform-claims.test.ts` (see the test plan) and
   **run it before step 6** to prove it fails on the stale figure.

8. Exclude `src/platform-table.ts` from `tsconfig.build.json` and
   `tsconfig.consumer.json`; it is test-shaped source and must not ship.

9. `COMPONENTS.md` — in **Platform style variants**, append: the catalogue's
   platform and recipe tables print the **resolved** theme, so a partial radius
   and a `{ preset, … }` density print what a consumer gets (plan 535), and the
   per-platform files' quoted ratios are held to the palette.

10. `TODO.md` — add and tick under Design tokens and theming; move
    `196/258` → `197/259`.

11. Index this plan in `.agents/slop/plans/README.md` after 534.

## Commands and expected results

```sh
cd packages/tokens && nub exec vitest run src/platform-table.test.ts
```

At step 1 (current derivation) cases 1–3 **fail**: the radius cells are
`undefined / 10 / undefined / undefined`, the density cell is `[object Object]`,
and the authored example's cell is not `compact`. At step 3: pass.

```sh
cd packages/tokens && nub exec vitest run src/platform-claims.test.ts
```

Before step 6 the macOS case **fails** with `2.50` against `2.836`. After: pass.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 126 files pass (124 today plus the two new suites), 5551 tests plus the
new cases; every shipped theme, variant and recipe still passes `themeFailures`.

```sh
nub run --filter @gpuixui/tokens check-types
nub run check && nub run lint && nub run test
```

Expected: clean and green.

## Test plan

### `packages/tokens/src/platform-table.test.ts`

Header:

> Bug guarded: the platform and recipe tables were built from a
> `PlatformStyle`'s **override record**, but `structure.radius` is partial
> (plan 389) and `structure.density` may be `{ preset, … }` (plan 534), so a
> style the type contract allows printed `undefined` radius cells and
> `[object Object]` for its density — and the doc guard compared its own wrong
> string with the document. Plan 535 derives the row from
> `applyPlatformStyle(getTheme(mode), style)`.

Cases:

1. **an unnamed radius inherits the identity** — a macOS copy with
   `radius: { md: 10 }` resolves `sm`/`lg`/`xl` to the identity's 4/8/12 and
   `md` to 10; the cells are `4 / 10 / 8 / 12`.
2. **a density override prints its preset** — the same copy with
   `density: { preset: "compact", rowHeight: 30 }` gives the cell `compact`
   (not `[object Object]`), and the resolved row height is 30. The case also
   asserts the old record is an object, documenting what the guard used to
   interpolate.
3. **the executed platform example resolves** — `contosoDensityPlatformStyle`
   gives `compact`, and its cells equal a full compact radius row.
4. **an accent named in one mode inherits the other** — a style with only
   `colors.light.primary` set resolves the dark accent from the identity's dark
   primary, and the light cell is the edited value.
5. **every shipped style's documented row is what the theme resolves to** — for
   every `platformNames` entry and `platformRecipeNames` entry, the cells equal
   the values read from `getPlatformTheme` / `getPlatformRecipeTheme`, so the
   hoist did not change a published row.

Two directions: step 1 ships the old derivation, the suite fails; step 3 ships
the resolved one, it passes.

### `packages/tokens/src/platform-claims.test.ts`

Header:

> Bug guarded: `platform-styles/macos.ts` justified its dark focus ring with
> "`#0A84FF` is 2.50:1 on the pressed-row wash", but the shipped dark `active`
> is `#404042` and the ratio is 2.836:1 — a copied-style rationale quoting a
> value the theme no longer produces while every gate stayed green. The other
> figures in the platform files were true but unguarded. Plan 535 derives each
> from the resolved theme and pins the sentence.

Cases (whitespace-normalised source, `node:fs`):

1. macOS focus-ring figure: `contrastRatio(dark.primary, dark.active)` formatted
   to three decimals equals the quoted `2.836`, and the sentence names the 3:1
   boundary floor it argues.
2. macOS accent figures: the light `primary` on the canvas is `4.21:1` and the
   dark `primary` on the card is `3.82:1`.
3. macOS face: the tightest `dialogSurfacePairs` value for macOS dark is
   `1.083:1` on `warning`, and the quoted sentence names it.
4. Windows border over the scrim: the tightest `border` contrast over a
   scrimmed solid status chip in the Windows dark palette is `1.006:1`, and the
   macOS file's sentence names it.
5. Linux accent figure: `#1C71D8` on the light `active` is `3.51:1`.
6. Linux selected step: `selected` against `accent` is `1.216:1` (the same figure
   `selected-title-selection.test.ts` measures on the theme).

Two directions: step 7's suite fails on the stale `2.50`; step 6 passes.

## STOP conditions

- A shipped document row changes after step 3. Every shipped style names all
  four radii and a preset, so the resolved row must equal today's; a diff means
  the derivation reads the wrong mode or role — stop.
- `platformTableCells` needs a cast to stay typed. The resolved theme returns a
  `Radius` and a `DensityName`; a cast means the old record is being read — stop.
- `themeFailures` reports anything on a shipped style. No colour or metric is
  meant to move; stop.
- The macOS figure is not 2.836 at three decimals. The derivation, not the
  sentence, is suspect — re-read the role before editing the document.
- A quoted figure turns out to be historical or counterfactual rather than
  current. Do not pin it; leave it and say so in the plan's outcome, rather than
  rewriting history into a false present-tense claim.

## Acceptance

- The platform and recipe tables are built from the resolved theme; a partial
  radius and a density override print the inherited cells and the preset name.
- Both documents say a row states the resolved theme, and both guards require
  that sentence.
- Every current ratio quoted in `platform-styles/*.ts` is derived and guarded;
  the stale macOS figure is corrected.
- No shipped theme, document row, colour, pair or metric moves.
- `packages/tokens` gains two suites; `nub run check`, `nub run lint` and
  `nub run test` are green.
