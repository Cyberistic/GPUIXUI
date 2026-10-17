# Plan 323 — An `undefined` platform colour is not a colour override

**Workstream:** `tokens-theme`
**Phase:** F (extension-mechanism correctness)
**Depends on:** 301 (applied style declares the palette it carries), 310/311
(copy-and-own platform styles), 321 (an explicit `undefined` inherits)
**Status:** ready

## 1. Why

Plan 321 made every `extendTheme` group treat an explicitly `undefined` value as
omitted, so a copied `PlatformStyle` may now carry `{ primary: undefined }`
without erasing the base role. But `platformOverrides` in
`packages/tokens/src/theme.ts` decides whether a style carries platform colours
with a **key count**:

```ts
const colors = style.colors[base.mode];
…
contrast: Object.keys(colors).length === 0 ? base.contrast : "default",
```

A style whose only colour key is `undefined` therefore has one key, no applied
colour, and still downgrades the declaration:

```ts
const style = {
  ...platformStyles.win32,
  colors: { light: { primary: undefined }, dark: {} },
};
const applied = applyPlatformStyle(getTheme("light", "high"), style, "default");

applied.contrast; // "default" — but the theme still carries the AAA palette
```

This contradicts the documented rule (plan 301, `docs/tokens.md`): “a style with
no colour overrides keeps the base's level”. It also makes the declaration
depend on the shape of a partial object rather than on the palette it produces,
which is exactly the truth gap plan 301 closed in the opposite direction.
Plan 321's own probe is the reason the case is now reachable: before it, an
`undefined` key erased a role, so the theme visibly broke; now it inherits
silently and only the declaration lies.

The fix is a predicate over values, not keys: **a defined colour value is an
override; an `undefined` one is not.**

## 2. What changes

### 2.1 `packages/tokens/src/theme.ts`

In `platformOverrides`, replace the key-count predicate:

```ts
const colors = style.colors[base.mode];
return {
  ...structural,
  colors,
  contrast:
    Object.values(colors).some((color) => color !== undefined)
      ? "default"
      : base.contrast,
  elevation: style.elevation[base.mode],
};
```

Keep the existing `if (contrast === "high") return structural;` branch: an
explicit `"high"` call still applies only families and shape.

Update the comment above the declaration to say a defined colour is an override
and an `undefined` one inherits, so the predicate and plan 321's merge rule are
one story.

### 2.2 `packages/tokens/src/platform-claim.test.ts`

Header: add plan 323 and the undefined-key case.

Add two tests after “keeps the base's declaration for a shape-only style”:

1. **An undefined colour keeps the base's declaration.**
   ```ts
   const style: PlatformStyle = {
     ...platformStyles.default,
     types: { ...platformStyles.default.types, label: "Undefined colour" },
     colors: { light: { primary: undefined }, dark: {} },
   };
   const themed = applyPlatformStyle(
     highContrastLightTheme,
     style,
     "default",
   );

   expect(themed.contrast).toBe("high");
   expect(themed.colors).toEqual(highContrastLightTheme.colors);
   expect(themeContrastFailures(themed)).toEqual([]);
   ```
   Before §2.1 the first assertion receives `"default"` and fails. The palette
   assertion proves the undefined value inherited (plan 321) rather than erased.
2. **One defined colour still declares default.** The control direction:
   ```ts
   colors: {
     light: { primary: undefined, background: highContrastLightTheme.colors.background },
     dark: {},
   }
   ```
   applied to the AAA base at `"default"` must declare `"default"` — the style
   *does* apply a colour, so the palette is no longer the shipped AAA one. This
   fails if the predicate ignores all colours instead of only `undefined` ones.

### 2.3 `docs/tokens.md`

In the paragraph that explains the declaration (search “a style with no colour
overrides keeps the base's level”), add one clause: a colour key set to
`undefined` is not an override, so it keeps both the inherited role and the
base's declared level.

### 2.4 `packages/tokens/README.md`

In `## Platform styles`, the sentence “a style with no colour overrides keeps the
base's level” gains the same clause, in one short phrase. No count changes.

### 2.5 `COMPONENTS.md`

`Theme extension` row: in the plan-301 sentence, after “a shape-only style keeps
the base's level”, add “and a colour key set to `undefined` is not an override
(plan 323)”. Do not repeat any count.

### 2.6 `TODO.md` and the plan index

- Add and tick a task under “Design tokens and theming”:
  “Make an `undefined` platform colour not count as an override —
  `applyPlatformStyle(highBase, style, "default")` keyed its contrast
  declaration off `Object.keys`, so an all-undefined colour object inherited the
  AAA palette but declared `default`; the predicate reads defined values now
  (plan 323).”
- Update the progress line from `90/119` to `91/120` (re-count the subsection
  first; the bar must equal the number of `[x]`/total rows).
- Add plan 323 to `.agents/slop/plans/README.md` after 322, status `done`, and
  append one commentary sentence.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. Baseline:
   ```sh
   nub run --filter @gpuixui/tokens test
   ```
   Expected: PASS, 51 files / 3213 tests. Stop if red.

2. Add the two tests **before** §2.1 and run only the file:
   ```sh
   cd packages/tokens && nub exec vitest run src/platform-claim.test.ts
   ```
   Expected: the first new test FAILS with `expected 'default' to be 'high'`.
   Record the output. The control test passes before and after.

3. Implement §2.1, then:
   ```sh
   cd packages/tokens && nub exec vitest run src/platform-claim.test.ts
   ```
   Expected: PASS, 6 tests.

4. Whole package and gates:
   ```sh
   nub run --filter @gpuixui/tokens test
   nub run check
   nub run lint
   nub run fmt
   ```
   Expected: all green, 51 files.

5. Confirm the docs clause appears in `docs/tokens.md` and the README and that
   no pair count changed (this plan moves no colour and adds no pair).

## 4. STOP conditions

Stop and report instead of improvising if:

- `Object.values` on `Partial<ThemeColors>` does not type-check (the package
  targets ESNext; a cast is not an acceptable workaround);
- an existing plan-301 test changes result — the three existing cases must keep
  their declarations;
- a shipped theme or platform style changes (this plan moves no value);
- the package was already red before the change for reasons outside this
  workstream.

## 5. Acceptance

- A colour object whose values are all `undefined` keeps the base's `contrast`
  declaration and its palette.
- A style with at least one defined colour still declares `default` when applied
  at `"default"`.
- The new test fails without §2.1 and passes with it.
- `docs/tokens.md`, the README, `COMPONENTS.md`, `TODO.md` and the plan index are
  current.
- `nub run check`, `nub run lint`, `nub run test` pass.
