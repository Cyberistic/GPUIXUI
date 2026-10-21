# 836 — The easing names every union owns an index for, except this one

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `019`, `064`,
`067`, `068`, `096`, `305`, `364`, `519` and `834`.

## 1. The defect

Every domain union in the package ships an ordered index and a narrowing guard,
because a settings row, a URL or a payload arrives as `unknown` and the union's
owner is the package:

| Union | Index | Guard |
| ----- | ----- | ----- |
| platform | `platformNames` | `isPlatformName` |
| mode | `themeModes` | `isThemeMode` |
| contrast | `themeContrasts` | `isThemeContrast` |
| density | `densityNames` | `isDensityName` |
| status tone | `statusTones` | `isStatusTone` |
| control size | `controlSizes` | `isControlSize` |
| recipe | `platformRecipeNames` | `isPlatformRecipeName` |
| motion level | `motionLevels` | — (a number) |
| motion phase | `motionPhases` | — (a key) |
| **named easing** | **none** | **none** |

`MotionEasing` is `"linear" | "ease" | "easeIn" | "easeOut" | "easeInOut" | [number, number, number, number]`.
`motionPhases` indexes the *phase* (`standard`, `enter`, `exit`, `linear`), not
the easing names, so a consumer persisting a curve — the "pick an easing" row of
a theme editor — must retype the five names, which is exactly what plans `067`,
`068`, `096` and `305` removed for every other union. Plan `834` just made an
edited easing storable, so the round trip now has a hole at its boundary: the
edit saves a name and nothing in the package narrows the name back.

The catalogue states the opposite of the boundary fact: "a named easing is
constrained by `MotionEasing` itself" — true for authored TypeScript, false for
a value read from storage, where a type is not a check.

## 2. Decisions

1. **`motionEasings` is the runtime's name set, not the shipped set.** All five
   names are accepted by the runtime even though the identity uses four; the
   index is "what a theme may name", like `platformNames` including `default`.
2. **The guard narrows a *name*, not an `MotionEasing`.** A cubic-bezier tuple is
   an easing but not a name, so `isMotionEasingName` rejects it; the tuple stays
   governed by `themeMetricFailures` (plan `364`). The two functions are named so
   the split cannot be mistaken.
3. **No behaviour changes.** `MotionEasing` keeps the same value set; the type is
   now derived from the index instead of written out, so a sixth name is one
   edit. `motionTransition`, `mergeMotion`, `easingEquals` and every shipped
   theme are untouched.
4. **The documents name the index and the split.** The motion section, the type
   index, the README and the ledger's Motion row say what the guard does and
   does not narrow.

## 3. Files to change

1. `packages/tokens/src/motion.ts` — `motionEasings`, `MotionEasingName`,
   `isMotionEasingName`, and `MotionEasing` derived from the index (§4).
2. `packages/tokens/src/motion-index.test.ts` — five cases (§5).
3. `docs/tokens.md` — the motion easing paragraph, the value sentence and the
   `Types` table (§6).
4. `packages/tokens/README.md` — the motion paragraph (§6).
5. `COMPONENTS.md` — the **Motion tokens** row (§6).
6. `TODO.md` — one ticked row, counter `383/458` → `384/459` (§7).
7. `.agents/slop/plans/README.md` — the row and one closing paragraph (§8).

## 4. The code

In `motion.ts`, replace

```ts
/** An easing the runtime accepts, as the runtime names it. */
export type MotionEasing =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | [number, number, number, number];
```

with

```ts
/**
 * The easing names the runtime accepts, in documentation order. This is the set
 * a theme may name, not the shipped set — the identity uses four and `ease` is
 * available to a brand — so a settings row iterates it instead of retyping the
 * union, the way `motionLevels` and `motionPhases` index the scale around it.
 */
export const motionEasings = [
  "linear",
  "ease",
  "easeIn",
  "easeOut",
  "easeInOut",
] as const;

/** A named easing the runtime accepts. */
export type MotionEasingName = (typeof motionEasings)[number];

/**
 * An easing the runtime accepts: a name, or a cubic-bezier control-point tuple.
 * A tuple is a value, not a name, so {@link isMotionEasingName} rejects it and
 * `themeMetricFailures` is what governs its four control points.
 */
export type MotionEasing =
  | MotionEasingName
  | [number, number, number, number];

/** Narrow unknown input to a runtime easing name. A tuple is not a name. */
export const isMotionEasingName = (
  value: unknown,
): value is MotionEasingName =>
  motionEasings.some((easing) => easing === value);
```

`motionPhases` and the rest of the file keep their positions; the index and the
type sit where the type was, so the module still reads top to bottom.

## 5. Tests

Add to `motion-index.test.ts` (it already owns the motion indexes and reads the
three documents):

1. **The index is the name set, in documentation order** —
   `expect([...motionEasings]).toEqual(["linear", "ease", "easeIn", "easeOut", "easeInOut"])`.
2. **Every shipped phase value is a member** — for every `shippedThemes` entry,
   `motionPhases.forEach((phase) => expect(motionEasings).toContain(theme.motion.ease[phase]))`;
   also assert at least one shipped theme is covered (`shippedThemes.length`).
3. **The guard narrows every member and rejects what is not a name** —
   `motionEasings.forEach((name) => expect(isMotionEasingName(name)).toBe(true))`;
   then `["ease-out", "EaseInOut", "easein", 42, null, undefined, [], {}, [0.4, 0, 0.2, 1]]`
   are all `false`. The tuple in the reject list is the split decision 2 names.
4. **A tuple is still an easing the theme accepts** — `extendTheme(lightTheme, {
   motion: { ease: { enter: [0.4, 0, 0.2, 1] } } })` keeps the tuple and
   `themeMetricFailures` returns `[]`; `isMotionEasingName` on that same value is
   `false`, so the two halves cannot be confused.
5. **The documents name the index and the guard** — the catalogue contains the
   sentence `` `motionEasings` lists the five names `` (derived count word, the
   way the existing case derives the level and phase counts) and
   `isMotionEasingName`; the README and the ledger contain both names.

Imports to add: `motionEasings`, `isMotionEasingName`, `extendTheme`,
`themeMetricFailures`, `shippedThemes`.

## 6. Documents

1. `docs/tokens.md`, motion paragraph — after the `motionLevels` / `motionPhases`
   sentence, add:

   ```
   `motionEasings` lists the five names the runtime accepts — `linear`, `ease`,
   `easeIn`, `easeOut` and `easeInOut` — and `isMotionEasingName(value)` narrows
   a stored one, so a theme editor's easing row iterates the index and reads its
   value back without retyping the union. The guard narrows a **name**: a
   cubic-bezier tuple is an easing too, and its four control points are
   `themeMetricFailures`' rule.
   ```

   and replace "a named easing is constrained by `MotionEasing` itself" with
   "a named easing is narrowed by `isMotionEasingName` at a boundary and by
   `MotionEasing` in authored code".

2. `docs/tokens.md`, `## Types` table — add, in the existing order, the row

   ```
   | `MotionEasingName` | A named easing from `motionEasings`. |
   ```

3. `packages/tokens/README.md`, motion paragraph — after "`standard`, `enter`,
   `exit` and `linear` are the easings", add: "the five names a theme may give a
   phase are `motionEasings`, narrowed from a stored value by
   `isMotionEasingName`; a tuple is an easing but not a name."

4. `COMPONENTS.md`, **Motion tokens** row — add: "`motionEasings` and
   `isMotionEasingName` own the five names a phase may carry, so a stored easing
   narrows like every other persisted union while a bezier tuple stays a value
   `themeMetricFailures` governs (plan 836)".

The value-coverage walk needs `motionEasings` and `isMotionEasingName` in the
catalogue (§6.1 provides both); the type-coverage walk needs
`MotionEasingName` in the table (§6.2).

## 7. `TODO.md`

Add above the plan-835 row:

```
`[x]` Give the named easings the index and guard every other union has —
`MotionEasing` was five literal names with no index and no boundary guard while
`motionLevels`/`motionPhases` indexed the scale around it, so a stored easing had
to be retyped; `motionEasings` is the runtime's name set, `MotionEasingName` and
`isMotionEasingName` derive from it, the type is now derived rather than written
out, and the guard narrows a name while a bezier tuple stays a governed value
(plan 836)
```

and bump the counter `383/458` → `384/459`.

## 8. The index

```
| [836](./836-motion-easing-index.md) | The easing names every union owns an index for, except this one | F | 019, 064, 067, 068, 096, 305, 364, 519, 834 | done |
```

and one closing paragraph: the motion scale owned its levels and phases but not
the names a phase may carry; the five names are now one index with one guard, the
type derives from it, and the split between a name and a tuple is stated in the
documents and executed in a case.

## 9. Commands, expected results and both directions

```sh
cd packages/tokens
nub run --filter @gpuixui/tokens test motion-index
nub run --filter @gpuixui/tokens test motion docs
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
cd ../..
nub run check
```

Expected: five new cases in `motion-index.test.ts`; the package stays at 227
files and moves 7208 → 7213 tests; the type index and value-coverage walks pass;
the root gates green.

Both directions:

1. **Fails before the fix.** Add case 3 first: it cannot import
   `isMotionEasingName`/`motionEasings` before they exist, which is the
   import-level proof. Then, with the names added but the guard written as
   `typeof value === "string"` (the accept-anything shortcut plan `068` removed),
   case 3 fails on `"ease-out"`; restore the index scan.
2. **Passes after.** The package and `nub run check` green.
3. **The set did not move.** `motion.test.ts`, `motion-contract.test.ts` and
   `platform-motion.test.ts` must pass untouched — the type derives from the same
   five names it listed.

**Native scenarios.** None; a pure index and guard. Record "no scenario ran".

## 10. STOP conditions

- Stop if `MotionEasing`'s value set changes. A sixth name may be *added* to
  `motionEasings` only when the runtime accepts it; this plan adds none.
- Stop if a shipped phase value is not in `motionEasings`. That means the index
  and the shipped data disagree — report the theme and the phase rather than
  widening the index silently.
- Stop if `docs.test.ts` or `public-types.test.ts` reports a missing name after
  §6; fix the document, never the walk.
- Stop if `motion-index.test.ts` needs a cast to read a phase, or if the tuple
  case cannot be written without one.

## 11. Not changed

- Every `Theme` value, colour, pair, floor, metric, role and shipped set;
  `motion`, the phase curves, `motionTransition`, `mergeMotion`.
- `MotionEasing`'s tuple form: plan `834`'s storage path and plan `364`'s metric
  rule stand as they are.
- `packages/components`, `packages/primitives`, `apps/*`.
