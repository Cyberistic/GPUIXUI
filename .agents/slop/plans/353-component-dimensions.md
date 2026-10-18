# 353 — Component dimensions: the surface metrics components still hardcode

**Workstream:** `tokens-theme`
**Phase:** B (design-system completeness)
**Depends on:** 010 (token architecture), 011 (package), 056/058/062 (docs truth
guards), 089 (`DensityOverrides`), 096 (`ControlSize`), 321 (`mergeDefined`)
**Consumers:** `packages/components` (overlay surfaces, toast, preview card,
field adornments), `packages/primitives` (field chrome), `apps/docs` (token
tables)
**Status:** done

---

## 1. The gap

`MISSION.md` names **“spacing; component dimensions; radii”** as design-system
deliverables. The package ships spacing, radii, control density, elevation,
borders, icons and avatars — but **no component-dimension group**. Every fixed
surface metric is still a literal in a consumer:

| Consumer (current worktree) | Literal | Meaning |
| --------------------------- | ------- | ------- |
| `packages/components/src/menu/surface.tsx:42` | `minWidth: 180` | narrowest menu |
| `packages/components/src/combobox.tsx:483` | `minWidth: 220` | overlay/list width |
| `packages/components/src/navigation-menu.tsx:479` | `minWidth: 220` | overlay width |
| `packages/components/src/date-picker.tsx:273` | `width: 220` | calendar overlay width |
| `packages/components/src/menu/sub.tsx:347` | `maxHeight: 320` | scrolling overlay height |
| `packages/components/src/command-menu.tsx:332` | `maxHeight: 320` | scrolling overlay height |
| `packages/components/src/mention-input.tsx:300` | `minWidth: 200` | field minimum |
| `packages/components/src/tag-input.tsx:211` | `minWidth: 80` | chip minimum |
| `packages/components/src/tag-input.tsx:279-280` | `width/height: 16` | field adornment |
| `packages/components/src/hotkey-recorder.tsx:220-221` | `16` | field adornment |
| `packages/components/src/search-input.tsx:164-165` | `18` | field adornment |
| `packages/components/src/time-picker.tsx:410-411` | `18` | field adornment |
| `packages/components/src/toast/viewport.tsx:90` | `width: 380` | toast card |
| `packages/components/src/preview-card.tsx:229-230` | `240 / 360` | preview card range |

Two consequences:

1. A consumer editing a copied platform style cannot change an overlay width,
   a toast width or a field adornment; they are outside the theme.
2. The same concept has two values: a field adornment is 16px in three
   components and 18px in two, with no token to decide which is right.

Density already owns what **changes with control size** (`controlHeight`,
`controlPaddingX`, `rowHeight`). It does not own the **fixed** surface metrics a
component needs at any density. Those are the component dimensions.

## 2. Decision

Add one theme group, `dimensions`, beside `density`, with nine flat pixel
metrics. Flat, not nested, for the same reason `spacing`, `radius`, `iconSize`
and `avatarSize` are flat: one merge rule, one documentation table, one guard.

```ts
export interface Dimensions {
  /** 180px — the narrowest menu surface. */
  readonly overlayMinWidth: number;
  /** 220px — default popover, combobox and calendar width. */
  readonly overlayWidth: number;
  /** 320px — the height at which a long overlay list starts to scroll. */
  readonly overlayMaxHeight: number;
  /** 200px — the narrowest field that still shows a query and an action. */
  readonly fieldMinWidth: number;
  /** 16px — an icon or clear control inside a field. */
  readonly fieldAdornmentSize: number;
  /** 80px — the minimum content width of a token-input chip. */
  readonly chipMinWidth: number;
  /** 380px — the fixed width of a toast card. */
  readonly toastWidth: number;
  /** 240px — the narrowest preview card. */
  readonly previewCardMinWidth: number;
  /** 360px — the widest preview card. */
  readonly previewCardMaxWidth: number;
}

export const dimensions: Dimensions = {
  overlayMinWidth: 180,
  overlayWidth: 220,
  overlayMaxHeight: 320,
  fieldMinWidth: 200,
  fieldAdornmentSize: 16,
  chipMinWidth: 80,
  toastWidth: 380,
  previewCardMinWidth: 240,
  previewCardMaxWidth: 360,
};
```

**Why `fieldAdornmentSize` is 16, not 18.** `iconSize.md` is 16 and three
components already use 16; the two 18px call sites are the outliers. The token
fixes the decision; the consumer migration is recorded cross-team rather than
edited in another workstream's tree.

**Why these are not density metrics.** Changing density must not resize a
dialog, a toast or a field's clear control. Density stays control-height,
control-padding and row-height only; the docs already state that rule and this
plan keeps it.

**Platform styles.** The four shipped variants and the XP/Aero recipes inherit
the identity dimensions. Overlay widths and toast widths are shared surface
metrics, not platform conventions; a consumer who wants a narrower Windows menu
edits `dimensions` through `extendTheme` like any other group. Do **not** add a
`dimensions` field to `PlatformStyle` in this plan.

## 3. Files to change

### 3.1 `packages/tokens/src/scale.ts`

- Add the `Dimensions` interface and `dimensions` constant after `avatarSize`,
  with the JSDoc above. Every field carries its value and use.
- No other change. `density` helpers stay untouched.

### 3.2 `packages/tokens/src/theme.ts`

- Import `dimensions` and `type Dimensions` from `./scale.js`.
- Add `readonly dimensions: Dimensions;` to `Theme` **immediately after**
  `density` (object key order is documentation order; `docs.test.ts` compares
  the Theme API block to `Object.keys(themes.light)`).
- Add `readonly dimensions?: Partial<Dimensions>;` to `ThemeOverrides` after
  `density`.
- Add `dimensions,` to all four literals: `lightTheme`, `darkTheme`,
  `highContrastLightTheme`, `highContrastDarkTheme`, after `density`.
- Add `dimensions: mergeDefined(base.dimensions, overrides.dimensions),` to
  `extendTheme`, after `density`.

No change to `platformOverrides`: platform variants inherit the group.
`createTheme` picks it up through `extendTheme`.

### 3.3 `packages/tokens/src/dimensions.test.ts` (new)

See §5.

### 3.4 `packages/tokens/src/docs.test.ts`

- Import `dimensions` from `./scale.js` (extend the existing import block).
- In `docs/tokens.md numeric tables`, add:
  `it("lists every component dimension", ...)` building
  `` `| \`dimensions.${token}\` | ${pixels} |` `` from `Object.entries(dimensions)`.
- Add a design-system guard that builds the §6 sentence from the values:
  ```
  `overlay surfaces take a ${dimensions.overlayMinWidth}px minimum and a ${dimensions.overlayWidth}px default width, and a long list scrolls at ${dimensions.overlayMaxHeight}px; a toast is ${dimensions.toastWidth}px wide, a preview card runs ${dimensions.previewCardMinWidth}–${dimensions.previewCardMaxWidth}px, and an icon or clear control inside a field is ${dimensions.fieldAdornmentSize}px.`
  ```
- Update the file-header comment's numeric-table list to include component
  dimensions.
- No change to the Theme-block guard: it starts passing once
  `docs/tokens.md`'s Theme API block gains the field in the same position.

### 3.5 `docs/tokens.md`

- New `## Component dimensions` section **between Density and Elevation**:
  explain the density split, then the table
  `| Token | Pixels | Use |` with one row per `dimensions.*` key, then a merge
  example:
  ```ts
  import { extendTheme, lightTheme } from "@gpuixui/tokens";

  const wider = extendTheme(lightTheme, {
    dimensions: { toastWidth: 420 },
  });
  ```
  and the statement that dimensions merge field by field and are inherited by
  every platform variant.
- Add `dimensions;` to the `## Theme API` code block after `density;`.
- Add a `Dimensions` row to the `## Types` index (alphabetical; between
  `DensityOverrides` and `Elevation` or wherever alphabetical order places it —
  the guard compares the table to the module walk in both orderings).
- Add a bullet under `## Limitations and future work`? Not needed: dimensions
  are supported data. Do not claim a runtime feature.
- `## Verification` prose: mention that the dimension table is built from
  `dimensions` the same way the other numeric tables are.

### 3.6 `docs/design-system.md`

- In §6 after the density and icon/avatar paragraphs, add one paragraph:
  ```
  Component dimensions are **fixed**, not density metrics: overlay surfaces take
  a 180px minimum and a 220px default width, and a long list scrolls at 320px; a
  toast is 380px wide, a preview card runs 240–360px, and an icon or clear
  control inside a field is 16px. They live in `theme.dimensions` so a brand can
  widen a dialog or a toast without touching component source.
  ```
  The values in that paragraph are derived in `docs.test.ts`.

### 3.7 `packages/tokens/README.md`

- Intro sentence: add “component dimensions” to the list.
- The merge sentence becomes: “Typography merges field by field, density metrics
  size by size, component dimensions field by field, elevation levels replace
  whole arrays, and the mode is not overridable.” Update the matching assertion
  in `readme.test.ts` verbatim.

### 3.8 `COMPONENTS.md`

- In the **Design tokens** row, add the dimensions group to the list of what
  ships (surface metrics for overlays, fields, toasts and preview cards, merged
  by `extendTheme`). Keep the numeric role count untouched: this plan adds no
  colour role.

### 3.9 `TODO.md`

- Add and tick:
  `[x]` Ship component dimensions for the surface metrics components still
  hardcode — overlay widths and scroll height, field minimum and adornment,
  chip minimum, toast width and the preview-card range — as `theme.dimensions`,
  documented and guarded (plan 353)
- Add cross-team rows (do not edit those packages):
  - `components` reads `theme.dimensions` for the overlay widths, scroll
    height, toast width, preview-card range, field minimum, chip minimum and
    field adornment instead of the literals listed in §1; it also settles the
    16px/18px adornment split on the token (owner: `components`; plan 353).
  - `primitives` reads `theme.dimensions.fieldAdornmentSize` for a field's
    clear/search glyph where it paints one (owner: `primitives`; plan 353).

### 3.10 `.agents/slop/plans/README.md`

- Add `| [353](./353-component-dimensions.md) | Component dimensions: the surface metrics components still hardcode | B | 010, 011, 056–062, 089, 096, 321 | done |`
  to the `tokens-theme` table and add a paragraph after 352 describing the gap
  and the decision.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/tokens check-types` | exit 0, no output |
| `nub run --filter @gpuixui/tokens test` | exit 0; 70 files, all tests pass (was 69 / 4221 before this plan) |
| `nub run lint` | exit 0 |
| `nub run fmt` | exit 0 (run `nub run fmt:fix` first if it reports formatting) |
| `nub run check` | exit 0 |
| `nub run test` | exit 0 |

## 5. Test plan

### `packages/tokens/src/dimensions.test.ts`

Header comment states the defect guarded: the token set has no component
dimensions, so overlay widths, toast widths and field adornments live as
literals in consumers and cannot be themed.

1. **Every metric is a positive integer.** `Object.values(dimensions)` all
   `Number.isInteger` and `> 0`. Fails if a `0`, a fraction or `NaN` lands.
2. **The ranges are coherent.** `overlayMinWidth < overlayWidth`,
   `previewCardMinWidth < previewCardMaxWidth`, `overlayMaxHeight >=
   controlHeight(lightTheme, "lg")` (an overlay must fit one control row).
3. **Every shipped theme carries the group.** Iterate `themeModes` and
   `themeContrasts` through `getTheme`; each `dimensions` equals the exported
   constant. Fails if a literal forgets the field (type-check also catches
   this, but the test states the guarantee for all four).
4. **Platform variants and recipes inherit it.** For every `platformNames`
   entry except `"default"` and every shipped recipe, both modes:
   `getPlatformTheme(...).dimensions` and `getPlatformRecipeTheme(...)`
   `.dimensions` equal `dimensions`. Fails if a structural override ever drops
   or rewrites the group.
5. **One metric merges without losing the rest.**
   `extendTheme(lightTheme, { dimensions: { toastWidth: 420 } })`: `toastWidth`
   is 420 and the other eight equal the base.
6. **An explicit `undefined` inherits** (plan 321): `{ dimensions: { toastWidth:
   undefined } }` keeps 380.
7. **The base is not mutated.** `lightTheme.dimensions.toastWidth` is still 380
   after the override.

### Documentation guards

- `docs.test.ts`: every `dimensions.*` row exists at its real value; the
  design-system sentence is built from the values; the Theme API block lists
  `dimensions` in interface order; `Dimensions` is named in the Types index
  (`public-types.test.ts`) and `dimensions` in the value coverage.
- `readme.test.ts`: the updated merge sentence.

### Proving the guards can fail (run once, then restore)

1. Change `toastWidth` in `docs/tokens.md` from 380 to 381 →
   `nub run --filter @gpuixui/tokens test` fails on “lists every component
   dimension”. Restore.
2. Delete `dimensions: mergeDefined(...)` from `extendTheme` → type-check fails
   and `dimensions.test.ts` case 5 fails. Restore.
3. Change the design-system sentence's overlay width to 200 →
   the design-system guard fails. Restore.

Record the three runs in the commit message body (`docs guard fails without the
row; merge test fails without the merge`).

## 6. Acceptance criteria

- `theme.dimensions` exists on every shipped theme and every platform variant,
  with all nine metrics.
- `extendTheme` merges it field by field, `undefined` inherits, the base is not
  mutated.
- `docs/tokens.md` documents every metric and the extension example,
  `docs/design-system.md` states the fixed-vs-density rule, and both are
  guarded.
- The package README and the `COMPONENTS.md` Design tokens row name the group.
- All gates in §4 pass, and the three failure probes in §5 are recorded.

## 7. STOP conditions

- **A change is needed outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md`, `TODO.md`.** Stop and record a
  cross-team `TODO.md` row instead. This plan does not migrate consumers.
- **`nub run check` fails on a file outside this workstream's paths.** Stop and
  report the file and error; do not edit another agent's tree.
- **A shipped consumer's value has no single sensible token.** Stop and report
  the values instead of inventing a per-component table; the decision in §2 is
  the authoritative mapping.
- **The docs guards require a new public type not named here.** Stop and
  report; the Types index update is part of the plan, but a second type means
  the design changed.
