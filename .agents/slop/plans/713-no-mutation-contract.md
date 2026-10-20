# 713 — The extension mechanism's no-mutation contract

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (extension mechanism / docs truth).
**Depends on:** 011 (the package), 016 (source exports), 063/311 (platform
styles), 321 (total merges), 389 (platform structure), 685 (`themeOverrides`).

## 1. The defect

Three consumer-facing documents promise that building a theme never writes into
the base:

- `docs/tokens.md` § Theme API: “nothing is mutated. The returned theme may share
  untouched token objects. The contract is no mutation, not deep cloning.”
- `docs/tokens.md` § Platform styles: “`getPlatformTheme` never mutates its base”.
- `docs/design-system.md` § 11: “Nothing mutates the base, so a theme can be
  created once at startup and shared.”
- `packages/tokens/README.md`: “Neither mutates its base.”

The guarantee is what makes the provider cheap and a module-level theme safe:
every screen reads the same object graph. Only **one** path is guarded today —
`theme-merge.test.ts` runs `extendTheme` with `undefined` overrides and compares
`lightTheme` to a clone. Nothing holds `applyPlatformStyle` (the documented
copy-and-own path), `createTheme`, `getPlatformTheme`,
`getPlatformRecipeTheme`, `themeOverrides` or any read helper to it, and no test
freezes a theme, so a merge that wrote into its base would not throw anywhere:
`Object.assign(base, …)` on a plain object succeeds silently and every screen
sharing that theme changes at once.

This is a drift guard, not a repair. The current implementation passes (probed on
2026-10-20 by deep-freezing `lightTheme`/`darkTheme` and calling every builder
and resolver: no throw, and the base deep-equals its clone). The plan does not
pretend there is a wrong value to fix; it closes the gap between a documented
guarantee and the suite that claims it.

## 2. Exact changes

### 2.1 `packages/tokens/src/theme-immutability.test.ts` (new)

```ts
/**
 * Guards the promise the catalogue, the design system and the README make: a
 * builder never mutates its base, so a theme can be created once at startup and
 * shared by every screen.
 *
 * `theme-merge.test.ts` holds one `extendTheme` path; this file holds every
 * public builder and resolver to a deep-frozen theme and a deep-frozen style.
 * A merge that wrote into its base — `Object.assign(base, …)` succeeds silently
 * on a plain object — would corrupt every screen sharing that theme, and this
 * file is where that defect throws instead.
 */

import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  contrastRing,
  createTheme,
  disabledControl,
  elevationLevels,
  elevationShadow,
  extendTheme,
  filledControl,
  filledControlFamilies,
  focusRing,
  invalidFocusRing,
  insetFocusRing,
  nativeHighlight,
  nativeTextTheme,
  platformRecipes,
  platformStyles,
  selectionStyle,
  shippedThemes,
  softAction,
  statusTone,
  statusTones,
  themeContrasts,
  themeFailures,
  themeOverrides,
  type Theme,
} from "./index.js";

/** Freeze a value and every object below it, so a write throws in strict mode. */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

/** A frozen copy: the shipped singletons stay writable for other suites. */
const frozen = <T>(value: T): T => deepFreeze(structuredClone(value));

const bases: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) =>
  frozen(theme),
);

const styles = [
  ...Object.entries(platformStyles),
  ...Object.entries(platformRecipes),
].map(([name, style]) => [name, frozen(style)] as const);

describe("a theme is a value the builders leave alone", () => {
  it("extendTheme and createTheme do not write to a frozen base", () => {
    bases.forEach((base) => {
      const before = structuredClone(base);
      expect(() =>
        extendTheme(base, {
          name: "Edited",
          colors: { primary: "#123456" },
          typography: { sans: "Inter" },
          spacing: { md: 21 },
          radius: { md: 9 },
          density: "compact",
          dimensions: { toastWidth: 400 },
          elevation: { md: base.elevation.md },
          motion: { fast: 90 },
          borderWidth: { thin: 2 },
          iconSize: { md: 18 },
          avatarSize: { md: 30 },
        }),
      ).not.toThrow();
      expect(() =>
        createTheme({
          mode: base.mode,
          contrast: base.contrast,
          colors: { primary: "#123456" },
        }),
      ).not.toThrow();
      expect(base).toEqual(before);
    });
  });

  it("applies every shipped style to a frozen base without writing to it", () => {
    bases.forEach((base) => {
      const before = structuredClone(base);
      styles.forEach(([name, style]) => {
        themeContrasts.forEach((level) => {
          expect(
            () => applyPlatformStyle(base, style, level),
            `${name} @${level}`,
          ).not.toThrow();
        });
      });
      expect(base).toEqual(before);
    });
  });

  it("round-trips an edit through themeOverrides without writing to either side", () => {
    bases.forEach((base) => {
      const edited = extendTheme(base, { radius: { md: 9 } });
      const beforeBase = structuredClone(base);
      const beforeEdited = structuredClone(edited);

      const overrides = themeOverrides(base, edited);
      expect(overrides).toBeDefined();
      expect(() => extendTheme(base, overrides ?? {})).not.toThrow();
      expect(base).toEqual(beforeBase);
      expect(edited).toEqual(beforeEdited);
    });
  });

  it("reads a frozen theme through every resolver", () => {
    bases.forEach((theme) => {
      expect(() => {
        focusRing(theme);
        invalidFocusRing(theme);
        contrastRing(theme);
        softAction(theme);
        disabledControl(theme);
        selectionStyle(theme);
        selectionStyle(theme, "fill");
        nativeTextTheme(theme);
        nativeHighlight(theme);
        themeFailures(theme);
        filledControlFamilies.forEach((family) => {
          filledControl(theme, family);
          insetFocusRing(theme, family);
        });
        statusTones.forEach((tone) => statusTone(theme, tone));
        elevationLevels.forEach((level) => elevationShadow(theme, level));
      }).not.toThrow();
    });
  });
});
```

Line width and import order must satisfy `nub run fmt`; run `nub run fmt:fix`
after writing rather than hand-wrapping imports.

### 2.2 `docs/tokens.md`

In the Theme API bullet list, the “nothing is mutated” sentence gains the guard
beside it (keep the sentence itself verbatim — plan 355/356 hold documented
snippets, not prose):

```
- nothing is mutated. The returned theme may share untouched token objects. The
  contract is no mutation, not deep cloning. `theme-immutability.test.ts` holds
  every builder and resolver to a deep-frozen base.
```

Also in the platform-styles paragraph (“`getPlatformTheme` never mutates its
base”), append the same file name in parentheses. No value, table or figure
changes.

### 2.3 `docs/design-system.md`

§ 11's last paragraph, “Nothing mutates the base, so a theme can be created once
at startup and shared.”, gains:

```
Nothing mutates the base, so a theme can be created once at startup and shared
([`theme-immutability.test.ts`](../packages/tokens/src/theme-immutability.test.ts)
holds every builder and resolver to a frozen theme).
```

### 2.4 `packages/tokens/README.md`

Line 143 (“Neither mutates its base.”) gains a parenthetical naming the suite:

```
Neither mutates its base (`theme-immutability.test.ts`).
```

### 2.5 `TODO.md`

Add under **Design tokens and theming (`tokens-theme`)** as a ticked row after
the plan-711 row, and move the fraction 322/399 → 323/400:

```
`[x]` Hold the extension mechanism to its no-mutation guarantee — three
documents promise a builder never writes into its base ("Nothing mutates the
base, so a theme can be created once at startup and shared"), but only one
`extendTheme` path was guarded and no test froze a theme, so an
`Object.assign(base, …)` merge would silently corrupt every screen sharing it.
`theme-immutability.test.ts` deep-freezes every shipped theme and every
platform style/recipe and runs every public builder, resolver and read helper;
the docs name the guard. No token value, pair, floor, metric or shipped theme
moves, and the implementation already passes (plan 713)
```

### 2.6 `.agents/slop/plans/README.md`

Add after row `711`:

```
| [713](./713-no-mutation-contract.md) | The extension mechanism's no-mutation contract | F | 011, 016, 063, 311, 321, 389, 685 | done |
```

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, documents untouched:**

   ```sh
   nub run --filter @gpuixui/tokens test -- theme-immutability
   ```

   Expected: green — this is a drift guard, and the implementation already
   satisfies it. Record the case count (4).

2. **Both directions — plant a write into the base.** In
   `packages/tokens/src/theme.ts`, change `mergeDefined`'s copy to an alias:

   ```ts
   const merged = base; // was: { ...base }
   ```

   Then run the same command. Expected: `TypeError: Cannot assign to read only
   property …` from the freeze in the first case, for the first shipped base.
   Restore the line and re-run: green.

3. **Full package suite:**

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: 194 files, **6831** cases (6827 at the branch point + 4 in the new
   file), all passing.

4. **Gates:**

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run check
   nub run lint
   nub run fmt
   ```

   Expected: clean. `docs-links.test.ts` resolves the new relative link in the
   design system against the document's directory.

5. **No scenario runs.** The change adds one test file and names it in three
   documents: no token value, pair, floor, metric, platform style, recipe,
   provider or runtime path. The commit says so instead of implying a native
   check.

## 4. STOP conditions

Stop and report instead of improvising if:

- The new file fails on the current implementation. That is a real mutation bug,
  not a missing guard: capture the helper and the property, report it, and do not
  weaken the test.
- `structuredClone` cannot clone a `PlatformStyle` or a `Theme` in this runtime
  (for example a non-cloneable member): replace `frozen`'s clone with a manual
  deep copy, and record why in §7. Do not freeze the shipped singletons — other
  suites in the same worker do not share this file's isolation assumptions.
- `themeOverrides` returns `undefined` for a shipped base and its same-mode edit;
  that is a real round-trip defect captured by plan 685's suite as well — stop
  and report.
- The total case count is not 6831 after §2.1. Derive it from the run.
- Another worktree owns `713`. At the time of writing `712` is `components`'
  (`712-tabs-focus-continuity.md`) and `713`/`714` are free:

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/71[2-4]-*"
```

## 5. Test plan

**The bug the file protects.** A merge helper writes into its base instead of a
copy. Plain objects accept the write, so no assertion notices; the theme object
the provider hands every screen changes underneath them, and a component that
reads it mid-render sees a mix of two themes. The documented promise (“created
once at startup and shared”) is exactly what makes the failure global. Freezing
the input converts the silent write into a throw at the write site.

**Both directions.**

- The freeze: planting `const merged = base;` in `mergeDefined` makes the first
  case throw `TypeError: Cannot assign to read only property '…' of object`.
  Restoring the spread passes. This is the same class plan 321 proved for
  `undefined` values, one layer lower.
- The base comparison: `expect(base).toEqual(before)` after every builder catches
  a write that a `try`/freeze compromise missed (for example a helper that
  replaced an array element after cloning).
- The resolver case is not presence-only: it calls each helper the package
  documents (rings, state families, status tones, selection styles, native text,
  elevation) on every shipped theme, so a helper that lazily decorates its input
  is caught.

## 6. Acceptance

- `theme-immutability.test.ts` freezes every shipped theme and every shipped
  style, runs every public builder and each documented read helper, and asserts
  each base deep-equals its clone afterwards.
- The pre-fix plant and the post-fix green runs are recorded verbatim in §7.
- `docs/tokens.md` (two places), `docs/design-system.md` and the package README
  name the guard; `docs-links.test.ts` passes.
- `nub run check`, `nub run lint`, `nub run fmt` and the tokens suite are green.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

Ran from this worktree on `agent/tokens-theme`.

1. **Guard first, documents untouched** — `theme-immutability.test.ts` passed
   on the branch point: 1 file, 4 cases. As §1 says, this is a drift guard, not
   a repair: the shipped builders already copy.

2. **Both directions** — replacing `mergeDefined`'s `const merged = { ...base };`
   with `const merged = base;` failed **three** of the four cases, each at the
   freeze:

   ```
   TypeError: Cannot assign to read only property 'primary' of object '#<Object>'
   TypeError: Cannot assign to read only property 'sm' of object '#<Object>'   (darwin @default)
   FAIL  round-trips an edit through themeOverrides without writing to either side
   ```

   Restoring the spread passed all four. `src/theme.ts` is untouched in the
   commit.

3. **Full suite** — 194 files, **6831 cases**, all green in 18.26 s. The new
   file is the 194th; the count is 6827 + 4.

4. **Gates** — `nub run --filter @gpuixui/tokens check-types`, `nub run check`
   (`check:tests`, lint, fmt, types) and `nub run fmt` are clean. The suite's
   `docs-links.test.ts` resolves the new relative link in the design system, and
   the README/docs guards pass with the new sentences.

5. **No scenario ran, deliberately.** The change adds one test file and names it
   in three documents and the ledger: no token value, pair, floor, metric,
   platform style, recipe, provider or runtime path.

### Divergences from the plan

- `712` was `components`' `712-tabs-focus-continuity.md`, so this plan took
  `713`, as §4 anticipated.
- The `themeOverrides` case guards the `undefined` return with an early `return`
  instead of the draft's `overrides ?? {}`; both satisfy the type and the guard
  reads better. The case still asserts `toBeDefined()` first, so an
  `undefined` from a same-mode edit fails rather than silently skipping.
