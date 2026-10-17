# 304 — `createTheme` must start from the contrast variant it names

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
013, 071, 073, 301 · **Touches:** `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md`

## 1. The defect

`ThemeConfig extends ThemeOverrides`, and `ThemeOverrides.contrast` is the
`extendTheme` **claim** — "declare the floor set the result is designed
against". `createTheme` spreads every override onto `themes[mode]` and never
reads `contrast`, so the builder's most natural call does the opposite of what
it says:

```ts
const accessible = createTheme({ mode: "dark", contrast: "high" });
accessible.contrast;              // "high" — a claim
accessible.colors.background;     // "#11141A" — the default canvas
themeContrastFailures(accessible); // 32 failures
```

Measured on this host:

| Call | Name | Canvas | Declared | Checker failures |
| ---- | ---- | ------ | -------- | ---------------- |
| `createTheme({ mode: "light", contrast: "high" })` | `Light` | `#F6F8FA` | `high` | **66** |
| `createTheme({ mode: "dark", contrast: "high" })` | `Dark` | `#11141A` | `high` | **32** |
| `createTheme({ mode: "light" })` | `Light` | `#F6F8FA` | `default` | 0 |
| `createTheme({ mode: "dark" })` | `Dark` | `#11141A` | `default` | 0 |

The high-contrast palettes exist (`highContrastLightColors`,
`highContrastDarkColors`, `getTheme(mode, "high")`); the builder simply cannot
reach them, and `contrast` on its config is an undocumented tap that only
relabels. The library ships a checker that rejects the result, which is exactly
the class of defect plans 073, 098 and 301 closed: a theme declaring a level it
does not carry.

The shipped themes are correct. This is an extension-mechanism defect plus a
missing guard. No colour, scale or floor value changes.

## 2. Decisions (do not re-litigate)

- **`contrast` on `ThemeConfig` selects the base palette**, through
  `getTheme(mode, contrast)`. It keeps the meaning it has in `getTheme` and
  `getPlatformTheme`: which variant to build from. A consumer should never have
  to know that `getTheme("dark", "high")` is the only way to start from AAA.
- **The builder has no claim path.** `ThemeConfig` omits `contrast` from
  `ThemeOverrides` and re-adds it as a selector, so `createTheme` cannot declare
  a level while carrying another palette. `extendTheme` keeps the claim — it is
  what `applyPlatformStyle` uses to declare the palette it applied (plan 301).
- **The default is unchanged.** Omitting `contrast` selects `"default"`, so
  `createTheme({ mode })` still equals the mode's built-in theme.
- **The name follows the base variant**, so `createTheme({ mode: "light",
  contrast: "high" })` is named `High contrast light`; an explicit `name`
  override still wins.
- Build the guard from the shipped palettes and the public checker, never from
  prose. No `any`, no cast, no retyped union.

## 3. Exact changes

### 3.1 `packages/tokens/src/theme.ts`

Replace the config declaration and builder body:

```ts
/**
 * Input to {@link createTheme}: a mode, the built-in contrast variant to start
 * from, and overrides. `contrast` selects the palette; it is not a claim.
 */
export interface ThemeConfig extends Omit<ThemeOverrides, "contrast"> {
  readonly mode: ThemeMode;
  /**
   * Which built-in variant to build on. Defaults to `"default"`, so the call
   * without it is unchanged. Unlike an `extendTheme` override, this selects the
   * palette rather than declaring a level the theme may not carry.
   */
  readonly contrast?: ThemeContrast;
}

/**
 * Build a theme for a mode and contrast variant, starting from the built-in
 * theme for that pair.
 *
 * @example
 * ```ts
 * const accessible = createTheme({ mode: "dark", contrast: "high" });
 * ```
 */
export function createTheme(config: ThemeConfig): Theme {
  const { mode, contrast = "default", ...overrides } = config;
  return extendTheme(getTheme(mode, contrast), overrides);
}
```

`getTheme` is declared later in the module; function declarations hoist, so no
reordering is needed. Keep the existing `createTheme` JSDoc example.

### 3.2 `packages/tokens/src/high-contrast.example.ts` (extend)

Add an executed example so the documented builder path runs in the suite:

```ts
import { createTheme } from "./index.js";

/**
 * Start a theme on the high-contrast variant. `contrast` selects the palette,
 * the way it does in `getTheme`; it is not a claim about a palette the theme
 * does not carry.
 */
export const accessibleDarkTheme = createTheme({
  mode: "dark",
  contrast: "high",
});
```

### 3.3 `packages/tokens/src/theme.test.ts`

Import `accessibleDarkTheme` and add to `describe("createTheme")`:

1. **Starts from the variant it names** — light and dark AAA:
   - `createTheme({ mode: "dark", contrast: "high" })` has
     `colors.background === highContrastDarkTheme.colors.background`, name
     `High contrast light` / `High contrast dark` as appropriate, and
     `contrast === "high"`;
   - `accessibleDarkTheme.colors` equals `highContrastDarkTheme.colors`.
2. **Holds every mode and contrast combination to the floors it declares** —
   iterate `themes`' keys × `highContrastThemes`' keys (or the two literal
   modes) over `createTheme({ mode, contrast })`; each
   `themeContrastFailures(theme)` must be `[]`. This is the case that fails
   before §3.1 with 66 and 32 failures.
3. **Keeps the default builder unchanged** — existing case stays; extend it
   with `createTheme({ mode: "dark", contrast: "default" })` equal to
   `darkTheme`.
4. **A palette override still merges onto the selected base** —
   `createTheme({ mode: "dark", contrast: "high", colors: { primary: "#C7CBFF" } })`
   keeps `colors.background` from the AAA dark set and `contrast: "high"`.

No header-comment regression claim is needed beyond the suite header; state the
defect there in one sentence, as the other truth suites do.

### 3.4 `docs/tokens.md`

- **High contrast** (after the `getTheme` snippet, line ~282): add

  ```ts
  import { createTheme } from "@gpuixui/tokens";

  createTheme({ mode: "dark", contrast: "high" }); // builds on the AAA dark set
  ```

  with one sentence: `createTheme` reads `contrast` the way `getTheme` does, so
  a brand built on the AAA palette starts from the AAA palette and not from a
  relabelled default.
- **Theme API** (line ~887): replace

  `createTheme(config) starts from themes[config.mode]`

  with

  `createTheme(config) starts from getTheme(config.mode, config.contrast ??
  "default"), so contrast selects the palette it builds on`

  and say plainly that only `extendTheme` can declare a level, because
  `createTheme` has no claim path.
- **Merge rules** bullet (line ~946): keep the `extendTheme` claim wording but
  name `extendTheme` in it, since `createTheme` no longer accepts a claim.

### 3.5 `docs/design-system.md` §11

Change the first bullet to
`` `createTheme({ mode, contrast, ...overrides })` — start from a built-in
variant; `contrast` selects the palette it builds on. `` and note that the
declaration surface is `extendTheme`.

### 3.6 `packages/tokens/README.md`

In **Extending a theme**, state that `createTheme({ mode, contrast })` starts
from the built-in variant: `contrast: "high"` builds on the AAA palette, not a
relabelled default. Keep the existing brand snippet.

### 3.7 `COMPONENTS.md`

- *Theme extension* row: add that `createTheme({ mode, contrast })` selects the
  built-in variant, so the builder cannot claim a level it does not carry.
- *High-contrast theme* row: add that the variant is reachable through
  `createTheme({ mode, contrast: "high" })` as well as `getTheme`.

### 3.8 `TODO.md`

Add, ticked, under the tokens block:

```md
`[x]` Make `createTheme({ mode, contrast: "high" })` build on the AAA palette —
it only relabelled the default palette and the library's own checker rejected
the result (66 failures light, 32 dark); `contrast` now selects the base through
`getTheme` and the builder has no claim path (plan 304)
```

Update the section's done/total counts (`71/95` → `72/96`).

### 3.9 `.agents/slop/plans/README.md`

Add `304` with status `done` and a narrative paragraph. Correct plan `303`'s
row, which still says `in progress` although it landed in `9859104`.

## 4. Commands and expected results

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter @gpuixui/tokens test src/theme.test.ts` (before §3.1) | the new combination case fails on 66 light / 32 dark failures; the other new cases fail on the canvas and name |
| 2 | `nub run --filter @gpuixui/tokens test` (after §3.1) | 39 files green, 1822 + the new cases |
| 3 | `nub run --filter @gpuixui/tokens check-types` | exit 0 |
| 4 | `nub run lint` | exit 0 |
| 5 | `nub run fmt` | exit 0 |
| 6 | `nub run check` | exit 0 |
| 7 | `nub run test` | exit 0 |

## 5. Test plan — proof in both directions

1. Write §3.3 first and run it: case 1 fails on
   `expected '#11141A' to be '#000000'` (or the AAA canvas) and case 2 fails
   with 66 and 32 failures. Record the output.
2. Apply §3.1; every case passes.
3. Temporarily restore `return extendTheme(themes[mode], overrides);` and
   confirm cases 1–2 fail again; restore the fix.
4. Confirm the default path did not move: `createTheme({ mode: "dark" })`
   still equals `darkTheme`.
5. The existing suites — `docs.test.ts`, `readme.test.ts`,
   `inventory.test.ts`, `guards.test.ts` — stay green; the docs sentence added
   in §3.4 must not make a guarded phrase drift.

## 6. STOP conditions

Stop and report, do not improvise, if:

- omitting `contrast` from `ThemeOverrides` breaks a consumer inside this
  repository — report the call site instead of retyping the union;
- a shipped theme changes a colour, scale or floor value — this plan changes
  metadata and selection only;
- a new public export appears to be needed — `getTheme` already answers the
  question, so the builder reads it rather than duplicating it;
- a test needs `any`, a cast, or prose copied into an assertion where an export
  can be derived.

## 7. Acceptance

- [x] `createTheme({ mode, contrast })` builds on `getTheme(mode, contrast)`.
- [x] The builder cannot declare a contrast level; `extendTheme` still can.
- [x] The default call is unchanged.
- [x] The new suite fails without the fix and passes with it.
- [x] Docs, README, `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint`, `nub run test` pass — run, not assumed.
- [x] Committed on `agent/tokens-theme` and pushed.

## 8. Outcome (executed on this host, 2026-10-17)

- The defect was real and larger than a mislabel: `createTheme({ mode:
  "light", contrast: "high" })` returned the default light palette named
  `Light` with `contrast: "high"` and **66** checker failures; the dark pair
  returned **32**. The builder had no way to reach `highContrastLightColors` or
  `highContrastDarkColors` without first knowing `getTheme` or `extendTheme`.
- `ThemeConfig` now extends `Omit<ThemeOverrides, "contrast">` and re-adds
  `contrast` as the selector, and `createTheme` reads it through `getTheme`.
  The builder has no claim path; `extendTheme` keeps the claim that
  `applyPlatformStyle` depends on (plans 073, 301).
- The default call is unchanged (`createTheme({ mode })` equals the mode's
  built-in theme), and an explicit `name` still wins; a variant selected through
  `contrast` keeps the variant's own name.
- `high-contrast.example.ts` exports `accessibleDarkTheme` built through the
  documented path, so the new selection is executed rather than sketched.
- The new suite rebuilds all four shipped variants from their own `mode` and
  `contrast` and holds each to `themeContrastFailures`; three of the four cases
  (selection, rebuild, override merge) failed before the fix and pass after it.
- Two-direction evidence, run and reverted: restoring
  `return extendTheme(themes[mode], overrides);` fails the three new cases
  (`expected '#11141A' to be '#000000'`, `expected { name: 'Light', ... } to
  deeply equal { name: 'High contrast light', ... }`); the restored builder
  passes 31/31 in the file.
- Docs: the High contrast section shows the builder call, the Theme API
  paragraph states the selector, and the merge-rule bullet names `extendTheme`
  as the only claim path. `docs.test.ts` now holds the page to the new sentence
  and fails if the old `themes[config.mode]` claim returns.
- Green: **39 test files, 1826 tests** (1822 before the four new ones).
  `nub run check`, `nub run lint` and `nub run test` were run and passed.
