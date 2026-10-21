# 838 — The stored edit the package can write but not read back

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `071`, `321`,
`380`, `383`, `727`, `744`, `758`, `794`, `834` and `835`.

## 1. The defect

Plan `727` made the theme edit an artifact: `themeEdit(choice, edited)` returns
`{ base: ThemeChoice, overrides: ThemeOverrides }` and `applyThemeEdit(edit)`
replays it. Plan `834` made every value form the artifact can carry round-trip.
Plans `835` and `836` closed the boundary around the *choice*: a stored row is
`unknown`, and `themeChoiceFromRow(value)` narrows its five axes through the
package's guards.

The artifact the documents tell a consumer to **store** has no such decoder. The
catalogue says "a stored edit is a `ThemeEdit`: `themeEdit(choice, edited)`
records the base's `ThemeChoice` and `applyThemeEdit(edit)` resolves it back"
(`docs/tokens.md`), the design system repeats it, and the README repeats it —
but every load path is a cast:

```ts
const stored = JSON.parse(readPreference("theme")) as ThemeEdit;
applyThemeEdit(stored);
```

A cast is not a check, and `extendTheme` is forgiving in the one way that
matters: **an override group it cannot merge is silently dropped.** `mergeDefined`
spreads `Object.fromEntries(Object.entries(override))`, so

- `{ spacing: "8" }` — a stringified group — contributes no entries and the
  theme keeps the base's spacing;
- `{ colour: { primary: "#000000" } }` — a typo'd group — is not read at all;
- `{ colors: { primary: 42 } }` — a wrong-typed member — spreads `42` into the
  role, and the ten checks cannot see it: `isHexColor(42)` is a failure only by
  luck of the walk, but `{ spacing: { md: "8" } }` reports nothing at all,
  because `numericMembers` (plan `368`) reports numbers and treats a string as
  "not a metric", while `positive`/`nonNegative` read `Math.fround("8") === NaN`
  and stay silent. `themeFailures(applyThemeEdit(stored))` returns `[]` for a
  theme whose spacing is a string.

So a settings screen restores a theme missing the user's edit, and the one
guarantee the package teaches — "run `themeFailures` and accept `[]`" — blesses
it. This is the same class as plan `727`'s wrong-base replay: a silent look
regression, not a contract failure.

The package already owns both halves of the answer: `narrowChoice` for the base
and `ThemeOverrides`' declared groups for the overrides. What is missing is the
decoder that composes them at the boundary the documents name.

## 2. Decisions

1. **`themeEditFromRow(value: unknown): ThemeEdit | undefined`**, the exact
   sibling of `themeChoiceFromRow`. `undefined` means "not this artifact, keep
   your theme object" — the failure mode `themeEdit` already documents.
2. **Shape at the boundary, values at the checks.** The decoder holds every
   group and member to the *kind* `ThemeOverrides` declares, and to the ordered
   index that owns it (`spacingSteps`, `colorRoles`, `textRoles`,
   `elevationLevels`, `motionLevels`, `motionPhases`, `controlSizes`, …), so an
   unknown group or member is refused rather than silently dropped. A
   well-formed value that misses a floor (`borderWidth.strong: 0`,
   `colors.primary: "#12345"`) still decodes and is reported by
   `themeFailures`, which stays the value authority. This is the split that
   keeps the decoder small and the contract single.
3. **An unknown top-level key is refused; an unknown *artifact* key is
   ignored.** `overrides` is a closed set of named groups, so a typo is a
   broken edit and must not be dropped. A key beside `base`/`overrides` is a
   future field, so it is ignored the way `themeChoiceFromRow` ignores an
   unknown row key.
4. **A missing artifact is the identity, a non-row is `undefined`.** `{}` has
   no base (the empty choice resolves to the identity) and no overrides (`{}`
   changes nothing), mirroring plan `835`'s "a missing storage key opens the
   identity". `null`, a string, a number and an array are `undefined`.
5. **`elevationShapeFields` gets one owner.** The decoder must know the five
   fields an elevation entry carries; `metrics.ts` already derives them at
   runtime (`Object.keys(lightElevation.sm[0] ?? {})`). The list moves to
   `elevation.ts` as a typed index and `metrics.ts` reads it, so a sixth field
   cannot leave the decoder checking five.
6. **No value moves.** Every colour, pair, floor, metric, role, shipped theme
   and existing function is untouched; `extendTheme`, `themeOverrides`,
   `themeEdit` and `applyThemeEdit` do not change.

## 3. Files to change

1. `packages/tokens/src/elevation.ts` — export `elevationShapeFields` (§4.1).
2. `packages/tokens/src/metrics.ts` — `shadowFields` reads the new index (§4.1).
3. `packages/tokens/src/theme-edit-row.ts` — **new**: `themeEditFromRow` and the
   group guards (§4.2).
4. `packages/tokens/src/index.ts` — `export * from "./theme-edit-row.js";`.
5. `packages/tokens/src/theme-edit-row.test.ts` — **new**: six cases (§5).
6. `docs/tokens.md` — the edit-artifact paragraph (§6.1).
7. `docs/design-system.md` — the persistence paragraph (§6.2).
8. `packages/tokens/README.md` — the storage sentence (§6.3).
9. `COMPONENTS.md` — the **Theme extension** row (§6.4).
10. `TODO.md` — one ticked row, counter `384/459` → `385/460` (§7).
11. `.agents/slop/plans/README.md` — the row and one closing paragraph (§8).

## 4. The code

### 4.1 One owner for the elevation fields

`elevation.ts`, after `ElevationShape`:

```ts
/** The fields one elevation entry carries, in documentation order. */
export const elevationShapeFields = [
  "offsetX",
  "offsetY",
  "blurRadius",
  "spreadRadius",
  "alpha",
] as const satisfies ReadonlyArray<keyof ElevationShape>;
```

`metrics.ts`: replace

```ts
/** The numeric fields of one elevation shape, taken from the shipped level. */
const shadowFields = Object.keys(lightElevation.sm[0] ?? {});
```

with

```ts
/** The numeric fields of one elevation shape, from the interface's one index. */
const shadowFields = elevationShapeFields;
```

and drop `lightElevation` from the `./elevation.js` import if it is then unused
(it has exactly one other use, line 79). Keep the `type Elevation` import.

### 4.2 `theme-edit-row.ts`

```ts
import { colorRoles } from "./color.js";
import { elevationLevels, elevationShapeFields } from "./elevation.js";
import {
  isMotionEasingName,
  motionLevels,
  motionPhases,
} from "./motion.js";
import {
  avatarSizeSteps,
  borderWidthSteps,
  controlSizes,
  dimensionNames,
  iconSizeSteps,
  isDensityName,
  radiusSteps,
  spacingSteps,
  type DensityOverrides,
} from "./scale.js";
import { isThemeContrast } from "./theme.js";
import { themeChoiceFromRow } from "./theme-choice.js";
import type { ThemeEdit } from "./theme-diff.js";
import { textRoles, type TextStyle } from "./typography.js";

/** One kind test a stored override member is held to. */
type MemberGuard = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber: MemberGuard = (value) => typeof value === "number";
const isString: MemberGuard = (value) => typeof value === "string";

const named = <Key extends string>(
  index: ReadonlyArray<Key>,
  key: string,
): key is Key => index.some((member) => member === key);

/** A record over an ordered index whose every value is a number. */
const isNumberRecord = (
  index: ReadonlyArray<string>,
  value: unknown,
): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([key, entry]) => named(index, key) && isNumber(entry),
  );

/** The three fields one type role carries. */
const textStyleFields = [
  "fontSize",
  "lineHeight",
  "fontWeight",
] as const satisfies ReadonlyArray<keyof TextStyle>;

const isTextStyle: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([field, entry]) => named(textStyleFields, field) && isNumber(entry),
  );

/**
 * Whether every named entry of a record passes the guard its member owns. An
 * unknown member is refused: `extendTheme` spreads only what it is given, so a
 * typo'd group or role is a stored edit that would silently lose its change.
 */
const isRecordOf = (
  guards: Readonly<Record<string, MemberGuard>>,
  value: unknown,
): boolean =>
  isRecord(value) &&
  Object.entries(value).every(([key, entry]) => {
    const guard = guards[key];
    return guard !== undefined && guard(entry);
  });

const isColors: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([role, ink]) => named(colorRoles, role) && isString(ink),
  );

const isTypography: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(([role, style]) =>
    role === "sans" || role === "mono"
      ? isString(style)
      : named(textRoles, role) && isTextStyle(style),
  );

const isEasing: MemberGuard = (value) =>
  isMotionEasingName(value) ||
  (Array.isArray(value) && value.length === 4 && value.every(isNumber));

const isEasings: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([phase, easing]) => named(motionPhases, phase) && isEasing(easing),
  );

/** Timings by level, and the four easings inside `ease`. */
const isMotion: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(([member, entry]) =>
    member === "ease"
      ? isEasings(entry)
      : named(motionLevels, member) && isNumber(entry),
  );

/** One entry of an elevation level: all five fields, and nothing else. */
const isElevationShape: MemberGuard = (value) =>
  isRecord(value) &&
  Object.keys(value).length === elevationShapeFields.length &&
  elevationShapeFields.every((field) => isNumber(value[field]));

const isElevation: MemberGuard = (value) =>
  isRecord(value) &&
  Object.entries(value).every(
    ([level, shapes]) =>
      named(elevationLevels, level) &&
      Array.isArray(shapes) &&
      shapes.every(isElevationShape),
  );

/** A preset name, or metrics that merge size by size over the preset. */
const densityGuards = {
  preset: isDensityName,
  controlHeight: (value: unknown) => isNumberRecord(controlSizes, value),
  controlPaddingX: (value: unknown) => isNumberRecord(controlSizes, value),
  rowHeight: isNumber,
} as const satisfies Readonly<Record<keyof DensityOverrides, MemberGuard>>;

const isDensity: MemberGuard = (value) =>
  isDensityName(value) || isRecordOf(densityGuards, value);

/**
 * The guard each override group owns. `satisfies` is the completeness check: a
 * group added to `ThemeOverrides` does not compile until it has one, so the
 * decoder cannot fall behind the type it decodes.
 */
const overrideGuards = {
  name: isString,
  contrast: isThemeContrast,
  colors: isColors,
  typography: isTypography,
  spacing: (value: unknown) => isNumberRecord(spacingSteps, value),
  radius: (value: unknown) => isNumberRecord(radiusSteps, value),
  density: isDensity,
  dimensions: (value: unknown) => isNumberRecord(dimensionNames, value),
  elevation: isElevation,
  motion: isMotion,
  borderWidth: (value: unknown) => isNumberRecord(borderWidthSteps, value),
  iconSize: (value: unknown) => isNumberRecord(iconSizeSteps, value),
  avatarSize: (value: unknown) => isNumberRecord(avatarSizeSteps, value),
} as const satisfies Readonly<Record<keyof ThemeOverrides, MemberGuard>>;

const isOverrides = (value: unknown): value is ThemeOverrides =>
  isRecordOf(overrideGuards, value);

/** …public JSDoc here (§4.3)… */
export function themeEditFromRow(value: unknown): ThemeEdit | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const overrides = value.overrides === undefined ? {} : value.overrides;
  return isOverrides(overrides)
    ? { base: themeChoiceFromRow(value.base), overrides }
    : undefined;
}
```

Imports to include beyond the sketch: `type ThemeOverrides` from `./theme.js`.

### 4.3 The public JSDoc

```ts
/**
 * Decode a stored edit — the `{ base, overrides }` pair `themeEdit` wrote —
 * without trusting its shape.
 *
 * The base goes through {@link themeChoiceFromRow}, so a missing or unknown
 * axis resolves to the identity exactly as it does for a stored choice. Every
 * override group and member is held to the kind {@link ThemeOverrides} declares
 * and to the ordered index that owns it, because `extendTheme` spreads only what
 * it is given: a group it cannot merge — a typo'd `colour`, a stringified
 * `spacing` — is silently dropped, and `themeFailures` cannot see the result
 * (its numeric walk reports numbers, and a string is not a metric). Such an
 * artifact is refused with `undefined`, so a settings screen keeps the theme it
 * has instead of restoring one that lost the edit.
 *
 * Values stay the checks' job: an override that is well formed but misses a
 * floor — `borderWidth: { strong: 0 }`, `colors: { primary: "#12345" }` —
 * decodes, and `themeFailures(applyThemeEdit(edit))` reports it. A key beside
 * `base` and `overrides` is ignored, so a newer artifact still opens; a value
 * that is not a row at all is `undefined`.
 *
 * @example
 * ```ts
 * import {
 *   applyThemeEdit,
 *   getTheme,
 *   themeEdit,
 *   themeEditFromRow,
 * } from "@gpuixui/tokens";
 *
 * const stored = themeEdit({ mode: "dark" }, getTheme("dark"));
 * const loaded = themeEditFromRow(stored);
 * const theme = loaded === undefined ? getTheme("dark") : applyThemeEdit(loaded);
 * ```
 */
```

## 5. Tests — `theme-edit-row.test.ts`

Header comment: state the bug — the artifact is written by `themeEdit` and
persisted by the documents, but its only load path was a cast; `extendTheme`
drops an override group it cannot merge and the ten checks cannot see a
non-numeric member, so a corrupt stored edit restored a theme missing the edit
while `themeFailures` returned `[]`.

1. **Every stored artifact decodes and replays.** For every entry of
   `shippedThemes` (`expect(...).toHaveLength(24)`), `edited =
   extendTheme(theme, { radius: { md: 8 } })`, `stored = themeEdit(choice, edited)`
   (fail the test if `undefined`), then
   `decoded = themeEditFromRow(JSON.parse(JSON.stringify(stored)))`;
   `expect(decoded).toEqual(stored)` and `applyThemeEdit(decoded)` equals
   `edited`. The JSON round trip is the storage boundary the defect names.
2. **Every group the artifact carries survives.** One edit naming each of the
   thirteen `ThemeOverrides` groups (name, contrast, colors, typography with one
   role field, spacing, radius, density as `{ preset, controlHeight: { md }, rowHeight }`,
   dimensions, elevation `{ overlay: [...] }`, motion with a bezier tuple,
   borderWidth, iconSize, avatarSize) → decodes, equals the stored pair, and
   replays the edit. This is the false-negative guard: every legal group must be
   accepted.
3. **A group the merge would drop is refused.** A planted table over
   `{ base: { mode: "light" }, overrides: plant }`, each `undefined`:
   `{ spacing: "8" }`, `{ spacing: 42 }`, `{ colour: { primary: "#000000" } }`,
   `{ spacing: { huge: 8 } }`, `{ colors: { primary: 42 } }`,
   `{ colors: { nope: "#000000" } }`, `{ typography: { body: { fontSize: "14px" } } }`,
   `{ typography: { sans: 42 } }`, `{ typography: { body: 14 } }`,
   `{ density: "tiny" }`, `{ density: { controlHeight: { xl: 40 } } }`,
   `{ elevation: { sm: 42 } }`,
   `{ elevation: { sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0 }] } }`,
   `{ elevation: { huge: [] } }`, `{ motion: { fast: "120ms" } }`,
   `{ motion: { ease: { enter: [0.4, 0, 0.2] } } }`,
   `{ motion: { ease: { enter: 42 } } }`, `{ motion: { ease: { swoosh: "ease" } } }`,
   `{ name: 42 }`, `{ contrast: "max" }`, `{ iconSize: { md: "16px" } }`.
4. **Shape is the boundary, values are the checks.** `{ borderWidth: { strong: 0 } }`
   and `{ colors: { primary: "#12345" } }` both decode, and
   `themeFailures(applyThemeEdit(decoded))` names a `metric` and a `color`
   failure respectively — pinning the documented split, and proving the decoder
   does not re-implement the ten checks.
5. **A missing artifact is the identity; a non-row is not an artifact.**
   `themeEditFromRow({})` equals `{ base: themeChoiceFromRow({}), overrides: {} }`
   and `applyThemeEdit` of it equals `getTheme("light")`; `null`, `undefined`,
   `"null"`, `42`, `[]` and `() => {}` are `undefined`. An unknown key beside the
   pair (`{ base: {}, overrides: {}, version: 2 }`) still decodes.
6. **The documents name the decoder and its rule.** `docs/tokens.md`,
   `docs/design-system.md`, `packages/tokens/README.md` and `COMPONENTS.md`
   contain `themeEditFromRow`; the catalogue contains the refusal sentence
   "refused with `undefined`" and names `themeChoiceFromRow`; and
   `elevationShapeFields` equals `Object.keys(lightElevation.sm[0])`, so the
   decoder's five fields are the interface's.

Read the four documents with `readFileSync` (the precedent in
`theme-edit.test.ts` and `docs.test.ts`).

## 6. Documents

1. `docs/tokens.md`, in §*The edit artifact* immediately after the paragraph
   beginning "`ThemeEdit` is the artifact that avoids it", add:

   ```
   A stored pair comes back as `unknown`, so the package decodes it:
   `themeEditFromRow(value)` narrows the base through `themeChoiceFromRow` and
   holds every override group and member to the kind `ThemeOverrides` declares
   and to the index that owns it. A group the merge cannot read — a typo'd
   `colour`, a stringified `spacing` — is refused with `undefined`, because
   `extendTheme` drops it silently and no check reports the result: the numeric
   walk measures numbers, so a string spacing is not a metric. Values stay the
   checks' job, so a well-formed override that misses a floor still decodes and
   `themeFailures(applyThemeEdit(edit))` names it. An absent artifact is the
   identity; a non-row is `undefined`.
   ```

2. `docs/design-system.md`, after the `ThemeEdit` sentence (~line 1055), add:

   ```
   A stored pair is decoded, never cast: `themeEditFromRow(value)` narrows the
   base with `themeChoiceFromRow` and refuses an override group or member the
   merge would drop, so the settings screen keeps the theme it has instead of
   restoring one that lost the edit.
   ```

3. `packages/tokens/README.md`, at the end of the `ThemeEdit` sentence, add:
   "and a stored pair is decoded by `themeEditFromRow(value)`, which narrows the
   base through `themeChoiceFromRow` and refuses a group the merge would drop
   rather than restoring a theme that lost the edit."

4. `COMPONENTS.md`, the **Theme extension** row: after the `ThemeEdit` clause
   add "— and a stored pair is decoded by `themeEditFromRow(value)`, which holds
   each group and member to the kind and index `ThemeOverrides` declares, so an
   override the merge would silently drop is refused instead of restoring a
   theme missing the edit while `themeFailures` returns `[]` (plan 838)".

## 7. `TODO.md`

Add above the plan-836 row:

```
`[x]` Decode the artifact the documents tell a consumer to store — the catalogue,
design system and README all call a stored edit a `ThemeEdit`, but its only load
path was a cast, and `extendTheme` drops an override group it cannot merge: a
typo'd `colour` or a stringified `spacing` restored the base while
`themeFailures` returned `[]` (the numeric walk measures numbers, so a string is
not a metric); `themeEditFromRow(value)` narrows the base through
`themeChoiceFromRow`, holds every group and member to the kind `ThemeOverrides`
declares and the index that owns it, and refuses the pair rather than restoring
an edit that vanished, while a well-formed value that misses a floor still
decodes and the ten checks name it (plan 838)
```

and bump the counter `384/459` → `385/460`.

## 8. The index

```
| [838](./838-stored-edit-decoder.md) | The stored edit the package can write but not read back | F | 071, 321, 380, 383, 727, 744, 758, 794, 834, 835 | done |
```

and one closing paragraph: the choice row learned to decode in plan `835` while
the artifact the documents actually store kept a cast for a load path; the pair
now decodes through the same guard for its base and one completeness-checked
table for its groups, with the elevation fields moving to one owner so the
decoder and the numeric contract count the same five.

## 9. Commands, expected results and both directions

```sh
cd packages/tokens
nub run --filter @gpuixui/tokens test theme-edit-row
nub run --filter @gpuixui/tokens test theme-edit docs metrics
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
cd ../..
nub run check
nub run lint
```

Expected: `theme-edit-row.test.ts` green; the package moves 227 → 228 files and
7213 → 7219 tests (six cases); `docs.test.ts`'s public-value walk passes with
`themeEditFromRow` named in the catalogue; `metrics` and `elevation` suites
untouched by the `shadowFields` move; the root gates green.

Both directions:

1. **Fails before the fix.** `theme-edit-row.test.ts` cannot import
   `themeEditFromRow` before it exists — the import-level proof. Then, with the
   decoder written but `isOverrides` reduced to `isRecord` (the accept-anything
   shortcut), case 3 fails on every plant, and case 4's `metric`/`color`
   expectations still pass, which is the point: shape was never the checks' job.
2. **Passes after.** The package suite and `nub run check` green.
3. **Nothing moved.** `theme-diff.test.ts`, `theme-edit.test.ts`,
   `theme-choice.test.ts`, `metrics.test.ts`, `elevation-shape-count.test.ts`
   must pass untouched; `elevationShapeFields` is the same five strings
   `shadowFields` already derived from `lightElevation.sm[0]`.

**Native scenarios.** None; a pure decoder. Record "no scenario ran".

## 10. STOP conditions

- Stop if a shipped `themeEdit` artifact fails case 1. That means the guards
  reject something `extendTheme` legitimately carries — fix the guard, never the
  test, and report which group.
- Stop if accepting a group requires adding a member to an interface, a scale
  index or `ThemeOverrides`. This plan adds none; a missing member is another
  plan.
- Stop if `elevationShapeFields` changes what `metricMembers.elevation` lists —
  the strings are the same five, and `metric-members.test.ts` must stay green.
- Stop if `themeEditFromRow` needs a cast, or if a document needs a value
  invented for it (the value walks are the authority).

## 11. Not changed

- Every `Theme` value, colour, pair, floor, metric, role and shipped theme;
  `extendTheme`, `themeOverrides`, `themeEdit`, `applyThemeEdit`,
  `themeChoiceFromRow`, `themeChoiceParams`.
- The ten checks: shape lives at the boundary, values stay theirs.
- `packages/components`, `packages/primitives`, `apps/*`.
