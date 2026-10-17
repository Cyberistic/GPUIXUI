# 073 — A theme declares its contrast level

| Field | Value |
| ----- | ----- |
| Phase | F (theme extension and accessibility) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `013` (high contrast), `063` (platform styles), `071` (contrast contract) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

Plan `063` introduced `applyPlatformStyle(base, style, contrast?)`, whose third
parameter decides whether the platform **colours** apply. The JSDoc says "pass
the base's contrast level"; `docs/tokens.md` says the function "takes the base
theme's contrast level, so a copied style never overrides a high-contrast
palette". The second sentence reads as a guarantee and is not one: the
parameter defaults to `"default"`, so

```ts
applyPlatformStyle(getTheme("light", "high"), copiedWindowsStyle)
```

replaces the AAA palette with the platform's default-contrast palette. Measured
on the pinned package: the result reports **contrast failures** at the high
floors while the same call with `"high"` returns `[]`. A consumer following the
workstream's own "copy a platform file and edit it" story at high contrast
silently ships a theme that misses the guarantee.

`themeContrastFailures(theme, contrast?)` has the identical shape: it defaults
to `"default"`, so

```ts
themeContrastFailures(extendTheme(highContrastLightTheme, { colors: { mutedForeground: "#6B6B6B" } }))
```

returns `[]` even though `mutedForeground` on `#FFFFFF` is 5.33:1 — under the
7:1 the theme is designed for. The one check that exists to catch a broken
high-contrast theme is laxer than the theme.

Both functions need the same missing fact: **a resolved `Theme` does not record
which floor set it was built for.** `mode` is already carried on the theme so
nothing has to guess it; `contrast` is the same kind of identity.

## 2. Design decision

1. **`Theme` gains `contrast: ThemeContrast`** — "the floor set this theme is
   designed against", beside `mode`. The four built-ins declare it
   (`light`/`dark` → `"default"`, both high-contrast themes → `"high"`).
2. **`ThemeOverrides` gains `contrast?: ThemeContrast`.** `extendTheme` keeps
   the base's level unless one is declared. Declaring one is a **claim, not a
   measurement** — the extension mechanism never measures colours — and
   `themeContrastFailures` is the check that proves it.
3. **`themeContrastFailures(theme, contrast = theme.contrast)`** — the safe
   level is the default. The explicit argument stays for checking a theme
   against a different bar (for example a default-contrast theme against the
   high floors before promoting it).
4. **`applyPlatformStyle(base, style, contrast = base.contrast)`** — the same
   default. `getPlatformTheme` then stops passing the level it just used to
   build the base, because the base carries it.
5. **No implicit detection.** Reading `base.colors === highContrastLightColors`
   would silently fail for any extended theme and would make the contract depend
   on object identity. The declaration is explicit data, like `mode`.
6. **No new dependency and no schema.** This is a field on an interface the
   package already owns; the package stays inert data and total functions.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/073-declared-contrast.md` | **create** (this file) |
| `packages/tokens/src/theme.ts` | **edit** — `Theme.contrast`, `ThemeOverrides.contrast`, the four built-ins, `extendTheme`, `applyPlatformStyle`, `getPlatformTheme` |
| `packages/tokens/src/contrast.ts` | **edit** — default to `theme.contrast` |
| `packages/tokens/src/theme.test.ts` | **edit** — the declaration and its merge rule |
| `packages/tokens/src/contrast.test.ts` | **edit** — drop the explicit level, add the declared-level test |
| `packages/tokens/src/platforms.test.ts` | **edit** — a high-contrast base needs no third argument |
| `packages/tokens/src/contrast.example.ts` | **edit** — a high-contrast theme whose declared level is the check |
| `packages/tokens/src/docs.test.ts` | **edit** — guard the documented `Theme` fields and the two contract sentences |
| `packages/tokens/README.md` | **edit** — one sentence on the declaration |
| `packages/tokens/src/readme.test.ts` | **edit** — guard that sentence |
| `docs/tokens.md` | **edit** — Theme API, high contrast, platform styles, checking a theme, verification |
| `docs/design-system.md` | **edit** — §4 and §11 |
| `COMPONENTS.md` | **edit** — the high-contrast, contrast-check and platform rows |
| `TODO.md` | **edit** — tick the task, correct the section bar |
| `.agents/slop/plans/README.md` | **edit** — add the `073` row and its explanation |

## 4. The implementation

`src/theme.ts`:

```ts
export interface Theme {
  readonly name: string;
  readonly mode: ThemeMode;
  /**
   * The floor set this theme is designed against. `extendTheme` keeps the base
   * level unless one is declared; `themeContrastFailures` checks it.
   */
  readonly contrast: ThemeContrast;
  readonly colors: ThemeColors;
  // …the other groups unchanged
}

export interface ThemeOverrides {
  readonly name?: string;
  /**
   * Declare the floor set the result is designed against. A claim, not a
   * measurement: `themeContrastFailures(theme)` checks it.
   */
  readonly contrast?: ThemeContrast;
  // …unchanged
}

export const lightTheme: Theme = { name: "Light", mode: "light", contrast: "default", /* … */ };
export const darkTheme: Theme = { name: "Dark", mode: "dark", contrast: "default", /* … */ };
export const highContrastLightTheme: Theme = { /* … */ mode: "light", contrast: "high", /* … */ };
export const highContrastDarkTheme: Theme = { /* … */ mode: "dark", contrast: "high", /* … */ };

export function extendTheme(base: Theme, overrides: ThemeOverrides): Theme {
  return {
    name: overrides.name ?? base.name,
    mode: base.mode,
    contrast: overrides.contrast ?? base.contrast,
    colors: { ...base.colors, ...overrides.colors },
    // …unchanged
  };
}

export function applyPlatformStyle(
  base: Theme,
  style: PlatformStyle,
  contrast: ThemeContrast = base.contrast,
): Theme {
  return extendTheme(base, platformOverrides(base, style, contrast));
}

export function getPlatformTheme(
  platform: PlatformName,
  mode: ThemeMode,
  contrast: ThemeContrast = "default",
): Theme {
  const base = getTheme(mode, contrast);
  return platform === "default" ? base : applyPlatformStyle(base, platformStyles[platform]);
}
```

`src/contrast.ts`: one line plus its JSDoc.

```ts
/**
 * Every documented pair a theme misses, at the level the theme declares unless
 * a different level is named — a high-contrast theme is checked against its own
 * floors by default.
 */
export function themeContrastFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<ContrastFailure> { /* body unchanged */ }
```

`contrast.example.ts` gains the declaration's purpose:

```ts
import { extendTheme, getTheme, highContrastLightTheme, themeContrastFailures } from "./index.js";

/** A theme that declares AAA and no longer meets it. */
export const quietHighContrastTheme = extendTheme(highContrastLightTheme, {
  name: "Quiet AAA",
  colors: { mutedForeground: "#6B6B6B" },
});

/** The declaration is what the check reads; no second argument. */
export const quietHighContrastFailures = themeContrastFailures(quietHighContrastTheme);
```

`quietHighContrastFailures` must hold exactly the four `mutedForeground` pairs at
floor 7: `#6B6B6B` on `#FFFFFF` is 5.33:1 (fails 7) and on the high-contrast
`muted` `#F2F2F2` is 4.76:1 (passes 4.5, so the default floors would report
nothing). Do not change the value without redoing both ratios.

## 5. Tests

`theme.test.ts`:

1. In **built-in themes** / **high-contrast themes**: every shipped theme
   declares its level (`light`/`dark` → `"default"`, both high-contrast →
   `"high"`). Fails if a built-in omits the field or copies the wrong one.
2. In **extendTheme**: `extendTheme(highContrastLightTheme, { colors: { primary: "#123456" } })`
   keeps `"high"`; `extendTheme(lightTheme, { contrast: "high" })` reports
   `"high"`. Fails if the merge drops the declaration or ignores the override.

`contrast.test.ts`:

3. "passes every shipped theme at its own contrast level" loses the second
   argument and asserts `theme.contrast` equals the level in the table, so the
   test proves the declaration is read.
4. New: `themeContrastFailures(quietHighContrastTheme)` reports the four
   `mutedForeground` pairs at floor `7`, and
   `themeContrastFailures(quietHighContrastTheme, "default")` is `[]`. This is
   the regression test: with a `"default"` default it returns `[]` and fails.
5. Reuse the example's `quietHighContrastFailures` in the assertion so the
   documented one-liner is the tested one.

`platforms.test.ts`:

6. "keeps a high-contrast base's colours when told the contrast" drops the
   `"high"` argument and is renamed to say the base's declaration is enough;
   the assertions (`themed.colors` equals the high-contrast set, and
   `themeContrastFailures(themed)` is `[]`) stay. Fails if the default goes
   back to `"default"`.

`docs.test.ts`:

7. Build the `Theme` interface block of `docs/tokens.md` and require exactly the
   keys of `themes.light`, in order. A new theme field that the reference does
   not name fails; a documented field the interface does not have fails too.
8. Require the two contract sentences (whitespace-collapsed markdown):
   `` `themeContrastFailures(theme, contrast = theme.contrast)` `` and
   `` `applyPlatformStyle(base, style, contrast = base.contrast)` `` — the
   signatures in the reference must be the ones the package ships.

`readme.test.ts`:

9. Require `The \`Theme\` records the floor set it is designed against` in the
   collapsed README.

## 6. Documentation edits

`docs/tokens.md`:

- **Import** block: unchanged (`ThemeContrast` is already imported).
- **High contrast**, after "It is an ordinary `Theme`": "It also declares
  `contrast: "high"`, so the checks that read a theme default to the floor set
  it was built for."
- **Platform styles**, replace the false sentence with: "`applyPlatformStyle(base, style, contrast = base.contrast)` reads the level the base declares, so a copied style never overrides a high-contrast palette unless the caller asks it to."
  Keep the working example and add the high-contrast line:
  ```ts
  applyPlatformStyle(getTheme("dark", "high"), contosoStyle); // keeps the AAA palette
  ```
- **Theme API**, in the `interface Theme` block, add
  `contrast: ThemeContrast;` after `mode`, and one paragraph: "`contrast` is the
  floor set the theme is designed against — `"default"` or `"high"` — carried
  like `mode` so a checker does not have to guess. `extendTheme` keeps the base
  level; `{ contrast: "high" }` declares a new one, which is a claim until
  `themeContrastFailures` proves it."
- **Merge rules**: a bullet "`contrast` defaults to the base's declaration; an
  override is a claim the extension mechanism does not check."
- **Checking a theme**: signatures become `themeContrastFailures(theme, contrast = theme.contrast)`
  with the sentence "The default is the level the theme declares, so a
  high-contrast theme is checked against 7:1 without a second argument"; the
  example becomes:
  ```ts
  themeContrastFailures(brandTheme); // [] at the level brandTheme declares
  themeContrastFailures(brandTheme, "high"); // the same theme against the AAA floors
  ```
- **Verification**: one sentence that both functions read the declaration, and
  that `docs.test.ts` holds the `Theme` block to the interface.

`docs/design-system.md`:

- §4 (high contrast paragraph): "…and declares `contrast: "high"`, so the
  contract in §9 is the one its own themes are checked against."
- §11 (Extension): "A theme carries its contrast level the way it carries its
  mode; `applyPlatformStyle` and `themeContrastFailures` default to it, so the
  safe call is the short one."

`packages/tokens/README.md`, in the theme section: "The `Theme` records the
floor set it is designed against (`contrast`), and `themeContrastFailures(theme)`
checks against that level by default."

`COMPONENTS.md`:

- **High-contrast theme** row: add "each variant declares `contrast: "high"`".
- **Theme contrast check** row: `themeContrastFailures(theme)` defaults to the
  theme's declared level (plan 073).
- **Platform style variants** row: applying a copied style to a high-contrast
  base keeps the AAA palette without a third argument.

`TODO.md`: one ticked task in the tokens section ("Make a theme declare its
contrast level so `applyPlatformStyle` and `themeContrastFailures` default to the
floors it was designed against (plan 073)") and a recount of the bar with §7.

`.agents/slop/plans/README.md`: the `073` index row and a paragraph explaining
why the declaration exists (the two laxer defaults and the false platform
sentence).

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; record the observed count
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run fmt                                    # exit 0
nub run test                                   # exit 0
```

Recount the tokens section's bar:

```sh
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[x\]`'   # done, including the bar line
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[ \]`'   # pending
awk '/### Design tokens and theming/{f=1} /## Phase C/{f=0} f' TODO.md \
  | grep -c '^`\[!\]`'   # blocked
```

The bar counts tasks, not the bar line: done / (done + pending + blocked).

## 8. STOP conditions

Stop and report if:

- a consumer package's `Theme` literal (a structural copy under another
  worktree's `packages/tokens`) has to change for this worktree to compile — it
  does not: the copies are their own packages and are deleted by their owners'
  interlock rows;
- `applyPlatformStyle` would have to detect the base's contrast by comparing
  colour objects — that is the rejected identity check; the declaration is the
  contract;
- `themeContrastFailures` would have to become effectful or return `Result` —
  the package ships zero runtime dependencies and an empty array is already the
  documented success value;
- the doc `Theme` block guard cannot be written without a Markdown parser — a
  fenced-block regex plus `^\s{2}(\w+):` is enough for the hand-written
  interface; do not add a dependency;
- the four `mutedForeground` failures in test 4 are not exactly four — recheck
  the ratios before changing the test, not the floors.

## 9. Test plan and both directions

1. Revert `themeContrastFailures`'s default to `"default"` → test 4 returns `[]`
   and fails. (Test 3 keeps passing: a high-contrast palette also clears the
   default floors, so only the stricter case can catch the laxer default.)
   Restore.
2. Revert `applyPlatformStyle`'s default to `"default"` → test 6 fails (platform
   colours replace the AAA set). Restore.
3. Remove `contrast` from `highContrastLightTheme` → test 1 fails type-check and
   the assertion. Restore.
4. Make `extendTheme` hardcode `"default"` → test 2 fails. Restore.
5. Delete `contrast: ThemeContrast;` from the `Theme` block in
   `docs/tokens.md` → test 7 fails. Restore.
6. Restore either contract signature in the docs to `contrast?` → test 8 fails.
   Restore.
7. Change `#6B6B6B` to `#767676` in the example → test 4 fails on the `muted`
   pair (4.06 < 4.5), proving the example value is load-bearing. Restore.

## 10. Acceptance criteria

- `Theme` carries `contrast`; all four built-ins declare it; `extendTheme`
  keeps it and can override it.
- `applyPlatformStyle` and `themeContrastFailures` default to the theme's
  declaration; `getPlatformTheme` passes no redundant argument.
- A high-contrast theme with a quiet role is caught without a second argument,
  and the same theme against the default floors passes — both observed.
- `docs/tokens.md`, `docs/design-system.md`, `README.md` and `COMPONENTS.md`
  describe the declaration truthfully; the reference's `Theme` block is held to
  the interface.
- `TODO.md` carries the ticked task and an honest bar; the plan index lists
  `073`.
- The gate commands exit 0.
