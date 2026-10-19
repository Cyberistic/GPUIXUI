# Plan 668 — The numeric scales' ordered indexes

## Why

`docs/tokens.md` (§*For documentation sites*) tells a docs site that it can build
every table from the package instead of retyping values, and the type roles do
exactly that through `textRoles`. It then says:

> The other groups are already plain data with their own keys: `spacing`,
> `radius`, `densityNames`, `densityPresets`, `borderWidth`, `iconSize` and
> `palette`.

"With their own keys" is true, but it is not enough: `Object.keys(spacing)` is a
`string[]`, so a table has to index the typed object with a cast. `textRoles`'
own JSDoc states the rule the scales break — the index exists *"without an
unsafe cast, the way `colorRoles` indexes the colour roles."*

Today the package's own docs test hits it (`docs.test.ts`):

```ts
const range = (scale: object): string => {
  const keys = Object.keys(scale); // string[] — a consumer must cast to index
  return `\`${keys[0]}\` to \`${keys.at(-1)}\``;
};
```

Two consequences beyond the cast:

1. `avatarSize` and `dimensions` are not even named in that sentence, so the
   paragraph already omits two of the scales a docs table needs.
2. `metricMembers` (`metrics.ts`) enumerates six of those scales with
   `Object.keys`, so the domain is a second, independently typed list. The
   package's dominant pattern is one authored ordered owner per domain
   (`colorRoles`, `textRoles`, `typefaceRoles`, `densityNames`, `controlSizes`,
   `elevationLevels`, `motionLevels`/`motionPhases`, `metricGroups`,
   `metricRules`), and plan 519 chose an authored index over `Object.keys`
   precisely because the latter adopts a member before the documents do.

The fix is the missing half of that pattern: an authored, ordered, typed index
for each numeric scale, named in the docs-site section, and `metricMembers`
derived from it so the shipped domain has one owner.

No colour, pair, floor, check or shipped value moves. The only behaviour change
is that adding a scale member now requires adding it to the index — and
`scale-indexes.test.ts` fails until it is.

## Scope

Package boundary for documentation and diagnostics:

- `spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
  `avatarSizeSteps` and `dimensionNames` in `scale.ts`; `paletteRamps` in
  `color.ts`.
- `metricMembers` derives its six scale lists from those indexes instead of
  `Object.keys`.
- A runnable example that builds a scale table with no cast.
- One regression suite that compares each index with the scale's own keys (so a
  new member fails until it is indexed) and proves `metricMembers` is the same
  array.

Out of scope: `palette`'s ramp values, any shipped value, any check, and the
cross-team docs-site migration (the docs site still owns its own tables; it now
has a typed index to read when it moves).

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/scale.ts` | six ordered indexes beside their scales. |
| `packages/tokens/src/color.ts` | `paletteRamps` beside `palette`. |
| `packages/tokens/src/metrics.ts` | import the six scale indexes; `metricMembers` derives from them; the JSDoc says so. |
| `packages/tokens/src/scale-indexes.example.ts` | new runnable example: scale tables built from the indexes. |
| `packages/tokens/src/scale-indexes.test.ts` | new regression suite (header comment states the gap). |
| `docs/tokens.md` | §*For documentation sites* names every index and shows a cast-free table. |
| `COMPONENTS.md` | **Design tokens** row names the scale indexes beside `colorRoles`/`textRoles`. |

## Exact edits

### 1. `packages/tokens/src/scale.ts`

Immediately after each scale constant, add its index. Element types are
`keyof` the scale, so a typo fails `check-types`, and `as const` keeps the
literal union:

```ts
/**
 * Every spacing step, smallest first — the order the catalogue prints. A table
 * or a diagnostics view iterates this instead of `Object.keys(spacing)`, which
 * is a `string[]`, so the step indexes `spacing` without a cast, the way
 * `textRoles` indexes the type roles.
 *
 * @example
 * ```ts
 * import { spacing, spacingSteps } from "@gpuixui/tokens";
 *
 * const rows = spacingSteps.map((step) => ({ step, value: spacing[step] }));
 * ```
 */
export const spacingSteps = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const satisfies ReadonlyArray<keyof Spacing>;
```

```ts
/** Every radius step, square first. See {@link spacingSteps}. */
export const radiusSteps = [
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "full",
] as const satisfies ReadonlyArray<keyof Radius>;
```

```ts
/** The two border widths: decorative first, emphasis second. */
export const borderWidthSteps = [
  "thin",
  "strong",
] as const satisfies ReadonlyArray<keyof BorderWidth>;
```

```ts
/** Every icon tier, inline first. */
export const iconSizeSteps = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
] as const satisfies ReadonlyArray<keyof IconSize>;
```

```ts
/** Every avatar diameter, smallest first. */
export const avatarSizeSteps = [
  "xs",
  "sm",
  "md",
  "lg",
] as const satisfies ReadonlyArray<keyof AvatarSize>;
```

```ts
/**
 * Every fixed surface metric, in the order {@link Dimensions} declares them. A
 * reference table groups rows by member; the index keeps the member typed.
 */
export const dimensionNames = [
  "overlayMinWidth",
  "overlayWidth",
  "overlayMaxHeight",
  "fieldMinWidth",
  "fieldAdornmentSize",
  "dateFieldWidth",
  "chipMinWidth",
  "toastWidth",
  "toastToneBarWidth",
  "previewCardMinWidth",
  "previewCardMaxWidth",
  "keycapSize",
  "drawerWidthSm",
  "drawerWidthMd",
  "drawerWidthLg",
  "drawerHeightSm",
  "drawerHeightMd",
  "drawerHeightLg",
  "chatViewportMinHeight",
  "carouselIndicatorSize",
  "carouselIndicatorActiveWidth",
  "timelineMarkerSize",
  "timelineMarkerColumnWidth",
  "dialogWidthSm",
  "dialogWidthMd",
  "dialogWidthLg",
  "calendarCellSize",
  "timeSegmentWidth",
  "avatarPresenceDotSize",
  "notificationPanelWidth",
  "notificationPanelMaxHeight",
  "notificationListMaxHeight",
  "notificationUnreadDotSize",
] as const satisfies ReadonlyArray<keyof Dimensions>;
```

### 2. `packages/tokens/src/color.ts`

After the `palette` constant:

```ts
/**
 * Every raw ramp, in documentation order. The palette table is built from this
 * index instead of `Object.keys(palette)`, so a ramp name indexes `palette`
 * without a cast.
 */
export const paletteRamps = [
  "neutral",
  "blue",
  "iris",
  "red",
  "green",
  "amber",
] as const satisfies ReadonlyArray<keyof typeof palette>;
```

### 3. `packages/tokens/src/metrics.ts`

Add the six names to the `./scale.js` import, replace the six `Object.keys`
lines in `metricMembers`:

```ts
  borderWidth: borderWidthSteps,
  dimensions: dimensionNames,
  iconSize: iconSizeSteps,
  avatarSize: avatarSizeSteps,
  radius: radiusSteps,
  spacing: spacingSteps,
```

and correct the JSDoc paragraph. Replace

```
 * Each list derives from the group's own default object or its ordered index
 * (`dimensions`, `controlSizes`, `elevationLevels`, `motionLevels`,
 * `motionPhases`), so a member added to the interface and its default ships in
 * the index.
```

with

```
 * Each list derives from the group's ordered index (`dimensionNames`,
 * `spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
 * `avatarSizeSteps`, `controlSizes`, `elevationLevels`, `motionLevels`,
 * `motionPhases`), so the shipped domain has one owner and a member added to a
 * scale must also join its index — `scale-indexes.test.ts` fails until it does.
```

Leave `shadowFields = Object.keys(lightElevation.sm[0] ?? {})` alone: it reads a
shape, not a named scale.

### 4. `packages/tokens/src/scale-indexes.example.ts` (new)

```ts
import {
  avatarSize,
  avatarSizeSteps,
  borderWidth,
  borderWidthSteps,
  dimensionNames,
  dimensions,
  iconSize,
  iconSizeSteps,
  radius,
  radiusSteps,
  spacing,
  spacingSteps,
} from "./index.js";

/**
 * The numeric scales as documentation tables. Every index is `keyof` its scale,
 * so the lookup is typed and no cast is needed; a member added to a scale but
 * not its index fails `scale-indexes.test.ts`.
 */
export const scaleTables = () => ({
  spacing: spacingSteps.map((step) => ({ step, value: spacing[step] })),
  radius: radiusSteps.map((step) => ({ step, value: radius[step] })),
  borderWidth: borderWidthSteps.map((step) => ({
    step,
    value: borderWidth[step],
  })),
  iconSize: iconSizeSteps.map((step) => ({ step, value: iconSize[step] })),
  avatarSize: avatarSizeSteps.map((step) => ({ step, value: avatarSize[step] })),
  dimensions: dimensionNames.map((name) => ({
    name,
    value: dimensions[name],
  })),
});
```

### 5. `packages/tokens/src/scale-indexes.test.ts` (new)

Header comment states the gap: the numeric scales exposed only `string[]`, so a
docs table cast to index them and `metricMembers` retyped six domains.

```ts
import { describe, expect, it } from "vitest";
import {
  avatarSize,
  avatarSizeSteps,
  borderWidth,
  borderWidthSteps,
  dimensionNames,
  dimensions,
  iconSize,
  iconSizeSteps,
  radius,
  radiusSteps,
  spacing,
  spacingSteps,
} from "./scale.js";
import { palette, paletteRamps } from "./color.js";
import { metricMembers } from "./metrics.js";
import { scaleTables } from "./scale-indexes.example.js";
```

Cases:

1. **Each index is exactly its scale's keys, in order.** Table-drive over
   `[index, scale]` pairs (including `[paletteRamps, palette]`):
   `expect([...index]).toEqual(Object.keys(scale))`. This is the guard that can
   fail: add a member to a scale and forget its index, and this case reports the
   missing key.
2. **One owner for the shipped metric domain.** For each of the six scale
   groups: `expect(metricMembers.spacing).toBe(spacingSteps)` (and the five
   siblings). Identity is the claim — re-hardcoding `Object.keys` in
   `metrics.ts` fails this case.
3. **The example reads the index, not the object.** `scaleTables()` returns a
   row per indexed step; assert `tables.spacing.map(({ step }) => step)` equals
   `[...spacingSteps]` and that every `value` equals `spacing[step]`.
4. **The indexes are non-empty and start where the catalogue starts.** For each
   scale, `expect(index[0]).toBe(Object.keys(scale)[0])` is already case 1;
   instead assert `spacingSteps[0]` is `"2xs"`, `radiusSteps[0]` is `"none"` and
   `borderWidthSteps` is `["thin", "strong"]` literally — the documentation
   order the catalogue prints, so a reordering of the object alone is also
   reported as an index change.

Use `toEqual` / `toBe`, never `toContainEqual` where the claim is exact.

### 6. `docs/tokens.md`

In §*For documentation sites*, replace the paragraph that begins "The other
groups are already plain data with their own keys" with:

```
Every numeric scale owns the same kind of index, so a table reads a member
without a cast: `spacingSteps`, `radiusSteps`, `borderWidthSteps`,
`iconSizeSteps`, `avatarSizeSteps`, `dimensionNames` and `paletteRamps`. Each
is the scale's keys in documentation order, so `spacingSteps` is typed
`keyof Spacing` and `spacing[step]` type-checks:

```ts
import { spacing, spacingSteps } from "@gpuixui/tokens";

const rows = spacingSteps.map((step) => ({ step, value: spacing[step] }));
```

`densityNames` and `densityPresets` are the preset order and its metrics;
`controlSizes`, `elevationLevels`, `motionLevels`, `motionPhases`,
`typefaceRoles` and `metricGroups` index the remaining groups. A scale member
that is not in its index fails `scale-indexes.test.ts`, so a value table cannot
silently omit it.
```

### 7. `COMPONENTS.md`

In the **Design tokens** row's note, after the `colorRoles`/`textRoles`/
`densityNames` clause, add: "the numeric scales own typed ordered indexes too
(`spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
`avatarSizeSteps`, `dimensionNames`, `paletteRamps`), so a generated table reads
a member without a cast (plan 668)". Do not change a count or any value.

## Commands, in order

Prove the guard can fail before relying on it. After writing case 1 and the
indexes:

```sh
cd packages/tokens
nub exec vitest run src/scale-indexes.test.ts
```

Expected: green. Then temporarily delete `"5xl"` from `spacingSteps` and run
again — expected: case 1 fails naming `5xl`. Restore it. A typo such as
`"6xl"` must fail `nub run check-types`. If neither direction fails, STOP.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/scale-indexes.test.ts src/metrics.test.ts src/metric-members.test.ts src/scale.test.ts src/docs.test.ts src/snippets.test.ts src/examples.test.ts src/public-types.test.ts
nub run check-types
```

Expected: all green. `docs.test.ts`'s public-value case passes only because the
new names appear in `docs/tokens.md`; `examples.test.ts` passes because the new
example is imported by the new suite.

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

Expected: green. `nub run test` runs the package's 184+ files; record the file
and test counts in the TODO row.

## STOP conditions

- Case 1 cannot be made to fail by removing an index member: stop. The guard is
  comparing two derived lists and is worthless.
- `metricMembers.spacing` is not `spacingSteps` by identity after the edit:
  stop; another list still owns the domain.
- Any shipped colour, contrast pair, floor or metric value changes: stop. This
  plan authorises none.
- `snippets.test.ts` rejects the docs block: fix the block's imports; do not
  weaken the guard.
- `public-types.test.ts` or `docs.test.ts` demands a type-table row: the new
  exports are values, not types — if a guard disagrees, report rather than
  inventing a type.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | Delete `"5xl"` from `spacingSteps`: case 1 reports it missing. Add `"6xl"` to the index: `check-types` rejects it. Re-hardcode `metricMembers.spacing` as `Object.keys(spacing)`: case 2 fails on identity. |
| Passes with the fix | The suite and `check-types` are green, and `scaleTables()` returns every step. |
| Cannot pass by editing the test only | Case 1 reads the scale's own keys, and case 3 runs the exported example; the shipped domain is the package's, not a literal in the test. |
| No value moves | Every case reads existing constants; no shipped declaration changes except the new indexes. |

## Acceptance

- [x] `spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
      `avatarSizeSteps`, `dimensionNames` and `paletteRamps` ship, typed
      `keyof` their scale.
- [x] `metricMembers` derives its six scale lists from those indexes and its
      JSDoc says one owner.
- [x] `scale-indexes.example.ts` builds every scale table with no cast and runs
      in `scale-indexes.test.ts`.
- [x] `docs/tokens.md` names every index and shows the cast-free table;
      `COMPONENTS.md`'s Design tokens row mentions them.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed in `.agents/slop/plans/README.md`; `TODO.md` row ticked.
