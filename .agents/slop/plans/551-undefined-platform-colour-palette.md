# Plan 551 — An `undefined` platform colour inherits the palette it asked for

**Workstream:** `tokens-theme`
**Phase:** F (extension-mechanism correctness)
**Depends on:** 301 (an applied style declares the palette it carries), 321 (an
explicit `undefined` inherits), 323 (`undefined` is not a colour override), 373
(a forced default palette is whole), 545 (re-applying a style is a no-op)
**Status:** ready

## 1. Why

Plan `373` made a forced level replace the palette **as a set**:

```ts
colors: appliesColors ? { ...appliedPalette(base), ...colors } : colors,
```

`appliedPalette(base)` is the default-level identity when the base is AAA, so
every role the style does not name comes from the default palette. But the
spread copies a key whose value is `undefined` too. `extendTheme`'s
`mergeDefined` then treats that key as omitted **relative to the base**, not
relative to the palette, so the role silently falls back to the base's AAA
value:

```ts
const style: PlatformStyle = {
  ...platformStyles.default,
  colors: { light: { primary: undefined, background: "#FAFAFA" }, dark: {} },
};
const themed = applyPlatformStyle(getTheme("light", "high"), style, "default");

themed.colors.primary; // "#3B2C8F" — the AAA primary
getTheme("light").colors.primary; // "#5F4BDB" — the default identity
themeFailures(themed); // one `direction` failure: primary → primaryHover
```

The last line is the proof that this is a defect, not a preference: the mixed
palette crosses two primary families (`primary` from AAA, `primaryHover` from
the default identity) and the package's own total check rejects the theme it
just built. Plan `323` says an `undefined` colour is not an override; plan `373`
says an unnamed role comes from the requested level's palette. The two rules
meet here, and the code applies neither to this key.

## 2. What changes

### 2.1 `packages/tokens/src/theme.ts` — filter the undefined entry

In `platformOverrides`, the final `return` currently reads:

```ts
    colors:
      level === "high"
        ? palette === base
          ? undefined
          : palette.colors
        : { ...palette.colors, ...styleColors },
```

Replace the default-level branch with the module's existing merge helper, which
drops `undefined` entries and keeps every defined role:

```ts
    colors:
      level === "high"
        ? palette === base
          ? undefined
          : palette.colors
        : mergeDefined(palette.colors, styleColors),
```

`mergeDefined` is declared in the same module above `platformOverrides`; no
import changes. Extend the comment above the `return` (or the `colors` field)
by one sentence: an undefined colour key inherits from `palette`, not from
`base`, because the requested level replaced the palette as a set.

Do not touch the `level === "high"` branch: at high contrast the palette *is*
the base (or the AAA identity), and a style's colours never repaint it.

### 2.2 New test — `packages/tokens/src/applied-palette-undefined.test.ts`

Header comment states the bug being guarded: a copied style with one defined
colour and one `undefined` colour applied to an AAA base at `"default"` kept
the base's role for the undefined key, so the result mixed two palettes and
`themeFailures` reported a direction failure.

Three cases:

1. **The undefined role comes from the requested palette.**
   ```ts
   const base = getTheme("light", "high");
   const style: PlatformStyle = {
     ...platformStyles.default,
     types: { ...platformStyles.default.types, label: "Mixed colours" },
     colors: { light: { primary: undefined, background: "#FAFAFA" }, dark: {} },
   };

   const themed = applyPlatformStyle(base, style, "default");

   expect(themed.colors.primary).toBe(getTheme("light").colors.primary);
   expect(themed.colors.primary).not.toBe(base.colors.primary);
   expect(themeFailures(themed)).toEqual([]);
   ```
   Without §2.1 the first assertion fails with the AAA value and the last
   reports the direction failure. Prove both directions before calling it done.
2. **The defined role still wins.**
   ```ts
   expect(themed.colors.background).toBe("#FAFAFA");
   expect(themed.contrast).toBe("default");
   ```
   (One test may assert both 1 and 2; keep the failure message specific.)
3. **A same-level base still keeps its own edits.**
   ```ts
   const brand = extendTheme(getTheme("light"), { colors: { secondary: "#123456" } });
   const branded = applyPlatformStyle(brand, style);
   expect(branded.colors.secondary).toBe("#123456");
   expect(branded.colors.primary).toBe(getTheme("light").colors.primary);
   ```
   This guards the other half: filtering `undefined` must not rebase a
   default-level base onto the identity.

Use the imports the file needs from `./index.js`:
`applyPlatformStyle`, `extendTheme`, `getTheme`, `platformStyles`,
`themeFailures`, `type PlatformStyle`. No `console.*`.

### 2.3 `docs/tokens.md` — one clause in the applied-style paragraph

In the paragraph beginning “A `"default"` request builds the default palette”
(around line 713), after “taking the roles it does not name from the
default-level identity of the same mode”, add:

> A role the style sets to `undefined` is unnamed too: it inherits from that
> palette, never from the AAA base the request is leaving.

Keep the sentence within the existing paragraph. No count changes.

### 2.4 `packages/tokens/README.md` — the same clause, one phrase

In the platform paragraph (search “A colour key set to `undefined` is not an
override either”), extend it to say the role inherits **from the requested
level's palette**, not from the base. One short clause.

### 2.5 `COMPONENTS.md` — the `Theme extension` row

After “the roles it does not name coming from the identity at that level
(plan 373)”, add “, an `undefined` key included — it inherits from that
palette, not the AAA base (plan 551)”. Do not repeat any count.

### 2.6 `TODO.md` and the plan index

- Add and tick under “Design tokens and theming”:
  “Make an `undefined` platform colour inherit the palette it asked for — a
  copied style with one defined colour and one `undefined` colour applied to an
  AAA base at `"default"` spread the `undefined` key over the default palette
  and then let `extendTheme` fall back to the AAA base, so the result mixed two
  primary families and `themeFailures` reported a direction failure; the
  palette merge now drops the key before the base sees it (plan 551).”
- Update the progress line from `215/282` to `216/282` (re-count first; the bar
  must equal the number of done rows over total rows).
- Add plan 551 to `.agents/slop/plans/README.md` after 550 with status `done`,
  and append one commentary paragraph in the same voice as 546–550.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 134 files / 5660 tests. Stop if red.

2. Add §2.2 **before** §2.1 and run only the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/applied-palette-undefined.test.ts
   ```
   Expected: FAIL on the first assertion (`expected '#3B2C8F' to be '#5F4BDB'`
   or equivalent) and/or the `themeFailures` case reporting one `direction`
   failure. Record the output.

3. Implement §2.1, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/applied-palette-undefined.test.ts
   ```
   Expected: PASS, 3 tests.

4. Whole package:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 135 files / 5663 tests (adjust to the actual new count; do
   not fabricate a figure).

5. Gates:
   ```sh
   nub run check
   nub run lint
   nub run test
   ```
   Expected: all green.

6. Prove no shipped value moved:
   ```sh
   git diff --stat packages/tokens/src/platform-styles packages/tokens/src/platform-recipes.ts packages/tokens/src/color.ts
   ```
   Expected: empty. This plan changes no colour, pair, floor, metric, theme,
   platform style or recipe value.

7. Commit and push:
   ```sh
   git add -A
   git commit -m "fix(tokens): keep an undefined platform colour on its palette"
   git push origin agent/tokens-theme
   ```

## 4. STOP conditions

Stop and report instead of improvising if:

- `mergeDefined(palette.colors, styleColors)` does not type-check (both are the
  same `ThemeColors` shape; a cast is not acceptable);
- any existing `applied-palette`, `platform-claim`, `platform-composition` or
  `platforms` case changes result — plan 373's set-level replacement and plan
  323's all-undefined case must both keep their current behaviour;
- a shipped theme, platform style, recipe, colour, pair or floor changes;
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- A style with one defined and one `undefined` colour applied to an AAA base at
  `"default"` returns the default-level palette for the undefined role, and
  `themeFailures(themed)` is `[]`.
- A defined style colour still overrides, and the result declares `default`.
- A same-level base keeps its own edits for roles the style does not name.
- The new test fails without §2.1 and passes with it (both directions verified).
- `docs/tokens.md`, the README, `COMPONENTS.md`, `TODO.md` and the plan index are
  current.
- `nub run check`, `nub run lint`, `nub run test` pass.
