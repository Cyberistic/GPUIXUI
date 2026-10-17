# Plan 321 — Total theme merges: an explicit `undefined` must inherit, not erase

**Workstream:** `tokens-theme`
**Phase:** F (extension-mechanism correctness)
**Depends on:** 011 (theme and `extendTheme`), 085 (elevation shape), 089 (density merge),
097 (designed state roles), 304 (createTheme), 310/311 (editable platform styles)
**Status:** ready

## 1. Why

`extendTheme(base, overrides)` documents one merge rule: **groups are partial;
omitted values inherit from the base** (`docs/tokens.md` “Merge rules”,
`docs/design-system.md` §11, `packages/tokens/README.md` “Extending a theme”).
The implementation spreads the override over the base with `{ ...base, ...override }`
(and equivalents for typography, motion and density), so an **explicitly
`undefined`** value is not omitted — it overwrites the base value.

TypeScript does not prevent this: the repository does not enable
`exactOptionalPropertyTypes`, so every optional override accepts `undefined`.
The common consumer pattern makes it likely:

```ts
const stored = readBrandConfig(); // { primary?: string; … }
const theme = extendTheme(base, { colors: { primary: stored.primary } });
```

`stored.primary` may be `undefined`, and the theme silently loses its primary
role. The runtime ignores an invalid colour, so the control paints black or the
previous property value — no error, no warning. The same erasure happens in
every group:

- `colors` — a role becomes `undefined`;
- `typography` text roles — `fontSize`/`lineHeight`/`fontWeight` become `undefined`;
- `motion` timings and easings — a duration or easing becomes `undefined`;
- `density` — `rowHeight` becomes `undefined`, and a size-keyed metric becomes
  `undefined` for that size (the plan-089 test covers omitted sizes, not explicit
  `undefined`);
- `elevation` — a whole level becomes `undefined`, and **`elevationShadow`
  throws** `TypeError: undefined is not iterable` when it destructures the level;
- `spacing`, `radius`, `borderWidth`, `iconSize`, `avatarSize` — a step becomes
  `undefined`.

Probe on this branch (2026-10-18), with the shipped light theme:

```ts
extendTheme(getTheme("light"), { colors: { primary: undefined } })
  .colors.primary; // undefined (was "#5F4BDB")

extendTheme(getTheme("light"), { typography: { body: { fontSize: undefined } } })
  .typography.body.fontSize; // undefined (was 14)

elevationShadow(
  extendTheme(getTheme("light"), { elevation: { md: undefined } }),
  "md",
); // TypeError: undefined is not iterable
```

The last one is a hard crash reachable from a type-legal call. This is the same
class of silent-failure defect plan 077 closed for `alpha(NaN)`: a computed value
with no value must not erase a designed one.

## 2. What changes

### 2.1 `packages/tokens/src/theme.ts`

Add one small helper beside the existing merge functions and route every flat
group through it:

```ts
/**
 * Merge the defined entries of `override` over `base`. An explicit `undefined`
 * is treated as omitted, so a partial config spread cannot erase a role, a
 * metric or an elevation level.
 */
const mergeDefined = <T extends object>(
  base: T,
  override: Partial<T> | undefined,
): T => {
  if (override === undefined) {
    return base;
  }
  const merged = { ...base };
  Object.assign(
    merged,
    Object.fromEntries(
      Object.entries(override).filter(([, value]) => value !== undefined),
    ),
  );
  return merged;
};
```

No type assertions: `Object.assign` mutates the typed copy, and the filtered
entries are only spread over it. Keep it local (not exported); the public
contract is the merge rule, not the helper.

Replace the group merges in `extendTheme`:

```ts
colors: mergeDefined(base.colors, overrides.colors),
spacing: mergeDefined(base.spacing, overrides.spacing),
radius: mergeDefined(base.radius, overrides.radius),
elevation: mergeDefined(base.elevation, overrides.elevation),
borderWidth: mergeDefined(base.borderWidth, overrides.borderWidth),
iconSize: mergeDefined(base.iconSize, overrides.iconSize),
avatarSize: mergeDefined(base.avatarSize, overrides.avatarSize),
```

Elevation keeps its documented replace-a-level semantics: a **defined** level
array replaces the whole entry; an `undefined` level inherits.

Replace `mergeTextStyle` with `mergeDefined` (its only job is a field-by-field
merge), and keep `sans`/`mono` on `override.sans ?? base.sans` — `??` already
ignores `undefined`:

```ts
const mergeTypography = (
  base: Typography,
  override: TypographyOverrides | undefined,
): Typography => {
  if (override === undefined) {
    return base;
  }
  return {
    sans: override.sans ?? base.sans,
    mono: override.mono ?? base.mono,
    display: mergeDefined(base.display, override.display),
    // … one line per role, as today
  };
};
```

Rewrite `mergeMotion` so the nested `ease` group uses the same rule:

```ts
const mergeMotion = (
  base: Motion,
  override:
    | (Partial<Omit<Motion, "ease">> & {
        readonly ease?: Partial<MotionEasings>;
      })
    | undefined,
): Motion => {
  if (override === undefined) {
    return base;
  }
  const { ease, ...timings } = override;
  return { ...mergeDefined(base, timings), ease: mergeDefined(base.ease, ease) };
};
```

Rewrite `mergeDensity` to build the record explicitly so an explicit
`undefined` cannot leak into a metric:

```ts
return {
  name: base.name,
  controlHeight: mergeDefined(base.controlHeight, override.controlHeight),
  controlPaddingX: mergeDefined(base.controlPaddingX, override.controlPaddingX),
  rowHeight: override.rowHeight ?? base.rowHeight,
};
```

A preset name still returns the preset directly (`isDensityName` branch), and
the base preset's name is still never overridable.

Do **not** change `createTheme`, `applyPlatformStyle`, `platformOverrides`,
`platformTheme`, or any token value. This plan changes merge semantics only.

### 2.2 `packages/tokens/src/theme-merge.test.ts` (new)

Header comment states the bug: an explicitly `undefined` value in a partial
override erased a role, a type field, a motion timing, a density metric or an
elevation level — the last one crashed `elevationShadow` — even though the
documented rule says omitted values inherit. The test must fail without §2.1.

Tests:

1. **A colour role.** `extendTheme(lightTheme, { colors: { primary: undefined, background: "#FDFDFD" } })`
   keeps `primary` and applies `background`. Assert both. Do the same for a
   dark theme with `card`.
2. **A type field.** Override `typography.body` with
   `{ fontSize: undefined, fontWeight: 700 }`; assert `fontSize` is the base 14
   and `fontWeight` is 700; `lineHeight` stays at the base value.
3. **Font families.** `typography: { sans: undefined, mono: "Iosevka" }` keeps
   the base sans and applies mono (guards the `??` path).
4. **Motion.** `motion: { fast: undefined, slow: 400, ease: { enter: undefined, exit: "linear" } }`
   keeps `fast`/`enter`, applies `slow`/`exit`; the other timings and easings are
   unchanged.
5. **Density.** `density: { rowHeight: undefined, controlHeight: { md: undefined, lg: 38 } }`
   keeps `rowHeight`, the small and medium heights, applies `lg: 38`, and keeps
   the base preset name. Assert through `controlHeight(themed, "md")`, not only
   the raw record.
6. **Elevation.** `elevation: { md: undefined }` keeps `elevation.md` **by
   identity** (the shipped array), and `elevationShadow(themed, "md")` is defined
   and equal to the base shadow. Add `overlay: undefined` and assert it stays the
   reserved empty level.
7. **Flat scales.** One override object setting an `undefined` member of each of
   `spacing`, `radius`, `borderWidth`, `iconSize` and `avatarSize` leaves every
   group equal to the base.
8. **Name and contrast.** `{ name: undefined, contrast: undefined }` keeps both
   base values.
9. **No mutation.** Snapshot `JSON.stringify(lightTheme)` before a mixed override
   with `undefined` values and assert it is unchanged afterwards. (Existing
   `theme.test.ts` covers mutation without `undefined`; this keeps the new path
   honest.)
10. **A defined override still wins.** A control case with `colors: { primary: "#123456" }`
    proves the helper does not ignore real values. This is the “both directions”
    half: without the fix the first tests fail; with a helper that ignores every
    override, this one fails.

Use `describe`/`it` from vitest, import only from `./index.js`.

### 2.3 `packages/tokens/src/theme.test.ts`

No change required if `theme-merge.test.ts` owns the new cases. Do not weaken or
duplicate the existing merge tests. If a helper rewrite changes an existing
assertion (for example the `extendTheme(darkTheme, {})` equality test), fix the
implementation, not the test.

### 2.4 `docs/tokens.md`

In “Merge rules”, extend the first bullet:

> - groups are partial: omitted values inherit from the base; an explicit
>   `undefined` is treated as omitted, so a partial config spread cannot erase a
>   role, a metric or an elevation level;

No count elsewhere changes. The docs guard (`docs.test.ts`) has no assertion on
this sentence; the new test file is the executable guard.

### 2.5 `packages/tokens/README.md`

In “Extending a theme”, after the merge sentence, add one short clause: an
explicitly `undefined` value inherits, so a partial config spread cannot erase a
token. Keep the README's line count small; do not add a section.

### 2.6 `docs/design-system.md`

§11 already says “Overrides merge by group…”. Append the same clause there, so
the rationale and the API agree. Keep the section's structure.

### 2.7 `COMPONENTS.md`

Only the `Theme extension` row:

- append one sentence: “A partial config spread cannot erase a token: an explicit
  `undefined` is treated as omitted in every group, including nested typography,
  motion, density and elevation (plan 321).”
- Do not touch the role count or any other row.

### 2.8 `TODO.md` and the plan index

- Add and tick a task under “Design tokens and theming”:
  “Make every theme merge total — an explicit `undefined` in a partial override
  erased a colour role, a type field, a motion timing, a density metric or an
  elevation level, and the last one crashed `elevationShadow`; every group now
  treats it as omitted (plan 321).”
- Update the progress line from `88/114` to `89/115` (one task added, one
  completed). **Re-count the bars first** if the section changed since this plan
  was written; the counts must equal the number of `[x]`/total rows in the
  subsection, not be copied blindly.
- Add plan 321 to `.agents/slop/plans/README.md` after 320, status `done`, and
  append one commentary paragraph describing the defect and the probe.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline before any edit:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 50 files / 3192 tests (the exact total is not a gate; the
   absence of failures is). Stop if it is red.

2. Write `theme-merge.test.ts` **before** the implementation and run only it:
   ```sh
   cd packages/tokens && nub exec vitest run src/theme-merge.test.ts
   ```
   Expected: FAIL on the first colour assertion (`undefined` vs the base hex),
   the typography assertion, the motion/density assertions, and a `TypeError`
   from `elevationShadow`. Record the output; this is the “fails without the fix”
   evidence.

3. Implement §2.1, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/theme-merge.test.ts
   ```
   Expected: PASS, 10 tests.

4. Whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 51 files (50 + the new one). No existing test changes
   behaviour.

5. Type check:
   ```sh
   nub run --filter @gpuixui/tokens check-types
   ```
   Expected: no diagnostics. If `mergeDefined` does not type-check without an
   assertion, STOP and report rather than adding a cast.

6. Repository gates:
   ```sh
   nub run check
   nub run lint
   nub run fmt
   ```
   Expected: `check:tests` passes (the new tests assert), lint silent, formatting
   clean (run `nub run fmt:fix` if only formatting changed).

7. Read the four changed prose passages; each must say the same rule in one
   sentence. The docs guard must still pass.

## 4. STOP conditions

Stop and report instead of improvising if:

- `mergeDefined` cannot be written without a type assertion, `any`, or a
  consumer-visible generic API;
- any existing package test changes behaviour (for example a test expects an
  explicit `undefined` to erase a value) — that would be a documented decision
  to reverse, not a test to edit;
- the elevation identity assertion cannot be expressed because a merge now
  copies arrays — a defined level must still replace the array by reference;
- a shipped theme or platform style changes after the fix (it must not: no token
  value moves);
- the repository gates were already red before this change for reasons outside
  `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md` or the plan index.

## 5. Acceptance

- An explicit `undefined` in `colors`, `typography` (roles and families),
  `motion` (timings and easings), `density` (row height and size-keyed metrics),
  `elevation`, `spacing`, `radius`, `borderWidth`, `iconSize`, `avatarSize`,
  `name` and `contrast` inherits the base value.
- `elevationShadow` cannot be crashed by a type-legal override.
- A defined override still applies; a preset density name still selects the
  preset.
- The new test file fails without §2.1 and passes with it.
- The four documents state the rule; `COMPONENTS.md`, `TODO.md` and the plan
  index are current.
- `nub run check`, `nub run lint`, `nub run test` pass, or any pre-existing
  failure outside this workstream is recorded with its exact command and output.
