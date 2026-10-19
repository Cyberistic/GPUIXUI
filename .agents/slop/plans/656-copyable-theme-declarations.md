# 656 — Every copyable block declares the theme it paints with

**Phase:** F (the documentation surface of an editable theme) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 355 (the documented snippets), 356 (the source `@example` guard),
655 (every source example imports the package) ·
**Number block:** 500–699 (`tokens-theme` overflow; 656 is the next free number
in every worktree) ·
**Status:** done

## 1. The defect

Plan `655` closed the import half of source-example copyability: every fenced
`ts`/`tsx` block in a non-test module must import `@gpuixui/tokens` (or
`/react`), so the existing "imports every public name it calls" case now covers
it. The plan's audit note also states:

> a theme-painting example declares `getTheme("light")` (or `"dark"`) so it runs
> on its own.

That half is **not enforced and not true**. A probe over the current tree finds
twenty-two copyable blocks that paint with an undeclared `theme`:

| Surface | Blocks |
| ------- | ------ |
| `packages/tokens/src/styles.ts` | `nativeFieldTheme` `@example` |
| `packages/tokens/src/native-text.ts` | `nativeTextTheme` `@example` |
| `docs/tokens.md` | `statusTone` (#4), `textStyle` (#8), `controlHeight`/`controlPaddingX` (#15), `extendTheme` (#21), `elevationShadow`/`elevationShadows` (#22), `motionTransition` (#23), `contrastRing` (#27, #28), `selectionStyle` (#29, #30, #31), `nativeFieldTheme` (#32), `disabledControl` (#52), `filledControl` (#56) |
| `packages/tokens/README.md` | `motionTransition` (#4), `statusTone` (#16), `focusRing` (#17), `selectionStyle` (#20), `nativeTextTheme` (#21), `nativeHighlight`/`nativeTextTheme` (#22) |

Each block presents itself as a module — it begins with a package import — but a
reader who pastes it into a file gets `ReferenceError: theme is not defined`.
The guard cannot see it: `usesWithoutImport` asks whether a **public name** is
imported, and `theme` is a local variable, not an export.

The first pass of the probe looked only for `theme.` property access and found
seven blocks; the scan for a bare `theme` passed as an argument found the rest
(`statusTone(theme, …)`, `focusRing(theme)`, `motionTransition(theme, …)`). The
list above is the complete set after both passes.

The docs page has a legitimate fragment style: a block with **no** package
import is a contextual continuation of the block above it, and stays exempt
(plan 355). The defect is narrower: a block that *is* a copyable module and
paints with `theme` must bring the theme.

## 2. Decision

1. **Declare the theme in every block listed in §1.** A documentation block
   resolves the identity with `const theme = getTheme("light");` and imports
   `getTheme` beside the helper it demonstrates; the source JSDoc does the same.
   `nativeTextTheme`'s source example uses dark, matching the runtime's native
   document default it overrides; `nativeFieldTheme`'s catalogue example shows a
   light field, so it uses light; `controlHeight`, `contrastRing` and
   `selectionStyle` are theme-agnostic, so light is the readable default.
2. **Extend `snippets.test.ts` with one case and one synthetic case**, so the
   rule can fail:
   - every snippet that imports the package and references `theme` declares it
     (`const`/`let`/`var`, a function parameter, or a typed parameter);
   - a synthetic undeclared call is reported, while a declaration, a typed
     parameter, and a JSX `theme={…}` prop are accepted.
3. **Allow a theme received as a parameter.** `docs/tokens.md`'s `focusRing`
   block already writes `const ringStyle = (theme: Theme, focused: boolean) =>
   …`; that is copyable and must stay green. A JSX `theme={…}` prop is not a
   variable use.

Not changed:

- the token values, roles, pairs, floors, metrics, checks, platform styles or
  recipes — this is a documentation-copyability plan;
- docs blocks without a package import (the contextual-fragment rule);
- the executed `*.example.ts` suite and the executed examples;
- `children`, which is the page's ambient slot in a JSX fragment.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `packages/tokens/src/snippets.test.ts` | add `themeUsage`/`declaresTheme`/`usesUndeclaredTheme`, the two cases, and extend the header comment with plan 656 |
| `packages/tokens/src/styles.ts` | `nativeFieldTheme` `@example`: import `getTheme`, declare the theme |
| `packages/tokens/src/native-text.ts` | `nativeTextTheme` `@example`: import `getTheme`, declare a dark theme |
| `docs/tokens.md` | the fourteen blocks in §1: import `getTheme`, declare `theme` |
| `packages/tokens/README.md` | the six blocks in §1: import `getTheme`, declare `theme` |
| `TODO.md` | the new ticked row; section count 285/359 → 286/360 |
| `.agents/slop/plans/README.md` | index 656 and add its summary |
| `.agents/slop/rd/2026-10-19-tokens-next-656.md` | the audit note and probe |

No other file. Do **not** edit `packages/components` or the docs site.

## 4. The guard

Add beside `usesWithoutImport` in `packages/tokens/src/snippets.test.ts`:

```ts
/**
 * A block's use of the ambient `theme` after comments, imports and a JSX
 * `theme={…}` prop are removed. A prop named `theme` is not the variable.
 */
const themeUsage = (code: string): string =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/^import[\s\S]*?;$/gm, "")
    .replace(/\btheme\s*=/g, "");

/**
 * A block that brings its own theme: a local binding, a destructured callback
 * parameter (`shippedThemes.flatMap(({ theme }) => …)`), or a typed function
 * parameter.
 */
const declaresTheme = (code: string): boolean =>
  /(?:const|let|var)\s+theme\b/.test(code) ||
  /(?:const|let|var)\s*\{[^}]*\btheme\b[^}]*\}\s*=/.test(code) ||
  /\btheme\s*:\s*Theme\b/.test(code) ||
  /\bfunction\b[^(]*\([^)]*\btheme\b/.test(code) ||
  /\(\s*\{[^}]*\btheme\b[^}]*\}\s*\)/.test(code);

/**
 * The `theme` identifier used as a value: a member access (`theme.colors`) or
 * an argument (`statusTone(theme, …)`, `focusRing(theme)`). The word "theme" in
 * a JSX label is not a variable.
 */
const usesUndeclaredTheme = (code: string): boolean =>
  /(?<![\w$.])theme\s*[.,)]/.test(themeUsage(code)) && !declaresTheme(code);
```

Case in `describe("documented snippets")`:

```ts
it("declares the theme a copyable block paints with", () => {
  const missing = snippets
    .filter(({ code }) => [...code.matchAll(importPattern)].length > 0)
    .filter(({ code }) => usesUndeclaredTheme(code))
    .map(({ label, index }) => `${label} #${index}`);
  expect(missing).toEqual([]);
});

it("reports a block that paints with an undeclared theme", () => {
  expect(
    usesUndeclaredTheme(
      `import { statusTone } from "@gpuixui/tokens";\nstatusTone(theme, "info");`,
    ),
  ).toBe(true);
  expect(
    usesUndeclaredTheme(
      `import { getTheme, statusTone } from "@gpuixui/tokens";\nconst theme = getTheme("light");\nstatusTone(theme, "info");`,
    ),
  ).toBe(false);
  expect(
    usesUndeclaredTheme(
      `const ringStyle = (theme: Theme) => focusRing(theme);`,
    ),
  ).toBe(false);
  expect(
    usesUndeclaredTheme(`<ThemeProvider theme={getTheme("dark")} />`),
  ).toBe(false);
});
```

Do not use `importPattern.test(code)`: it is a global regex and `test` would
carry `lastIndex` across snippets.

## 5. The snippet edits

Each block gets the same two changes: `getTheme` joins the import, and the
theme is bound before the helper call. The helper call itself does not change.

### `packages/tokens/src/styles.ts` (`nativeFieldTheme`)

```tsx
import { getTheme, nativeFieldTheme } from "@gpuixui/tokens";

const theme = getTheme("light");

<input
  style={{ color: theme.colors.inputForeground }}
  theme={nativeFieldTheme(theme)}
/>;
```

### `docs/tokens.md` — `statusTone`

```ts
import { getTheme, statusTone } from "@gpuixui/tokens";

const theme = getTheme("light");
const tone = statusTone(theme, "info");
```

### `docs/tokens.md` — `textStyle`

```tsx
import { getTheme, textStyle } from "@gpuixui/tokens";

const theme = getTheme("light");

<text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
  Save changes
</text>;
```

### `docs/tokens.md` — `contrastRing`

```tsx
import { contrastRing, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");
const ring = contrastRing(theme);
```

### `docs/tokens.md` — `selectionStyle`

```tsx
import { getTheme, selectionStyle } from "@gpuixui/tokens";

const theme = getTheme("light");

<div
  style={{
    ...selectionStyle(theme, "fill"),
    backgroundColor: theme.colors.primary,
  }}
>
  {children}
</div>;
```

### `docs/tokens.md` — `nativeFieldTheme`

```tsx
import { getTheme, nativeFieldTheme } from "@gpuixui/tokens";

const theme = getTheme("light");

<input
  style={{ color: theme.colors.inputForeground }}
  theme={nativeFieldTheme(theme)}
/>;
```

### `packages/tokens/README.md` — `statusTone`

```ts
import { getTheme, statusTone } from "@gpuixui/tokens";

const theme = getTheme("light");
const tone = statusTone(theme, "info");
```

The README block imports `alpha` today and never calls it. Remove `alpha` from
that import as part of the same edit; the surrounding sentence still introduces
`alpha` separately, and an unused import in a copyable block is a second small
lie.

The remaining blocks in §1 follow the same two-line pattern: `getTheme` joins
the import (alphabetically) and `const theme = getTheme("light");` is bound
before the first use. `nativeTextTheme`'s source example uses
`getTheme("dark")`, matching the dark runtime document it is meant to correct.
`shippedThemes`'s callback (`({ theme }) => …`) and the `focusRing` parameter
(`(theme: Theme)`) already bind the theme and need no edit; the guard must
accept both and is covered by the synthetic case.

## 6. Tests

### `snippets.test.ts`

- the new "declares the theme a copyable block paints with" case fails with the
  seven labels in §1 before the edits;
- the synthetic case proves the predicate reports an undeclared call and accepts
  a declaration, a typed parameter and a JSX prop — so the new case is not a
  vacuous `toEqual([])`.

### Both-directions proof

Add the test first, run it, and record the seven labels the pre-fix tree
produces. Then apply §5 and re-run. Record both outputs in the commit message.

```sh
cd packages/tokens
nub exec vitest run src/snippets.test.ts
```

Expected before the edits: one failing case listing the twenty-two labels in §1.
Expected after: all green.

### Touched-surface checks

```sh
cd packages/tokens
nub exec vitest run src/snippets.test.ts src/docs.test.ts src/readme.test.ts src/examples.test.ts
```

Expected: all green; the docs/readme guards read the same blocks, so a markdown
edit that broke a role or count would fail here.

## 7. Documentation and inventory

- No token value, role, pair, floor, metric, check, platform style, recipe or
  shipped theme changes; `docs/tokens.md`'s prose is untouched except the five
  code blocks, and the README's prose is untouched except its block.
- `TODO.md`: add one ticked row in the design-tokens section and move the
  section count to 286/360.
- `COMPONENTS.md`: no change. The Design tokens row describes values, and no
  value moves; this plan is documentation copyability.
- `.agents/slop/plans/README.md`: add the 656 row and a closing summary that
  names the seven blocks and the guard.
- `docs/tokens.md`'s "runnable examples" links are unaffected.

## 8. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/snippets.test.ts
nub run check-types
```

Expected: the guard green after the edits; no type errors.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 181 files, all green (6541 tests plus the two new cases).

Then in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

```sh
nub run check:tests
nub run check
nub run lint
nub run test
```

Expected: clean. If another workstream's package fails for its own reason, record
the exact failure and do not claim this plan's workspace gate passed.

## 9. STOP conditions

Stop and report with evidence if:

- a block the probe did not name also fails the new case — record its label,
  decide whether it is a contextual fragment (no package import) or a copyable
  module, and fix only the module;
- the guard reports a JSX `theme={…}` prop as a variable use — the prop strip is
  the part to fix, not the block;
- a docs guard pins a block verbatim and the added `getTheme` line breaks it —
  fix the guard to derive the claim instead of deleting the check;
- declaring a theme changes a documented value or count — the docs guards own
  those and must stay green without edits.

## 10. Acceptance

- [x] all twenty-two blocks in §1 import `getTheme` and bind `const theme =
      getTheme(…)` before the helper call;
- [x] the new guard fails on the pre-fix tree with the twenty-two labels and
      passes after;
- [x] the synthetic case proves the predicate both reports and accepts;
- [x] no token value, role, pair, floor, metric, check, style or shipped theme
      moves;
- [x] `docs.test.ts`, `readme.test.ts`, `examples.test.ts`, the tokens suite,
      `check:tests`, `check`, `lint` and `test` pass; the command results are
      recorded in the commit message;
- [x] `TODO.md`, the plan index and the audit note are updated.
