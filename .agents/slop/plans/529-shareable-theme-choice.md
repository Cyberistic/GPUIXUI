# 529 — A shareable theme choice: the URL boundary

**Phase:** F (integration and polish) · **Workstream:** `tokens-theme` ·
**Depends on:** plans 067, 068, 096, 305, 311, 380, 383, 387 ·
**Number block:** 500–599 (`tokens-theme` overflow).

## 1. The gap

The package owns every axis of a theme choice and their composition.
`ThemeChoice`'s own JSDoc says the shape "is the caller's `Schema` boundary" and
names **a shareable URL** as a place a choice arrives from:

```ts
/**
 * A theme choice as it arrives from storage — a settings row, a shareable URL,
 * an older release. ...
 */
export interface ThemeChoice { readonly mode?: unknown; ... }
```

`resolveThemeChoice(choice)` resolves the row (plan 380), and the five guards
narrow each axis. But the **transport** between a URL and that row has no owner:

- nothing in `@gpuixui/tokens` reads a query string into a `ThemeChoice`, so
  every consumer retypes the keys (`mode`, `contrast`, `platform`, `recipe`,
  `density`), the guard each key uses, and the fact that a missing key is
  absent rather than an error;
- nothing writes a choice back into a URL, so "which axes are worth writing"
  and "a stale axis must not survive beside its replacement" are retyped per
  consumer too;
- the one shipped consumer proves the drift. `apps/docs/src/platform/platform.ts`
  (the platform toggle MISSION.md requires to be shareable) retypes
  `platformNames` and `isPlatformName` — already recorded cross-team in
  `TODO.md` — and reads exactly **one** axis. The mode, contrast, recipe and
  density axes plan 380 composed have no URL representation in the docs at all,
  so the acceptance "the toggle state belongs in the page URL (shareable) and is
  remembered across navigation" cannot carry the theme the toggle actually
  resolves.

This is the same class of gap plans 067, 068, 096 and 305 closed for the unions:
a boundary value arrives as `unknown`, and the package that owns the union must
own the narrowing. Here the boundary value is a query string, and the missing
piece is a **total, canonical codec** — not a new role, pair or metric.

There is no palette defect to fix: every shipped set, platform variant and
recipe is valid. The defect is an unowned boundary, and the tests below prove
the codec's two properties (semantic round-trip and canonical omission) that no
hand-written consumer currently has.

## 2. Decisions

1. **Two pure functions and one index, in `theme-choice.ts`.** The module
   already owns the choice shape, the resolution and its precedence; a URL is a
   second way to spell the same row. `themeChoiceFromParams(source)`,
   `themeChoiceParams(choice)` and `themeChoiceKeys` (the ordered index, beside
   `platformNames`, `densityNames`, `themeModes` and `themeContrasts`).
2. **No `URLSearchParams` dependency.** The package is pure data with zero
   runtime dependencies, and `URLSearchParams` is not available on every GPUix
   host target. The reader accepts a structural `ThemeParamSource`
   (`{ get(key): string | null | undefined }`), which `URLSearchParams` satisfies;
   the writer returns `ReadonlyArray<readonly [ThemeChoiceKey, string]>`, which a
   consumer applies to its own search object. A test proves the structural
   interface is satisfied by a real `URLSearchParams`.
3. **Canonical output drops the fixed fallbacks.** An axis is written only when
   omitting it would resolve to a different theme:
   - `mode` is written only for `dark` (the fallback is `light`);
   - `contrast` is written only for `high` (the fallback is `default`);
   - `platform` is written only for `darwin`/`linux`/`win32` — `default` is the
     identity, which is also what an absent key selects;
   - `recipe` is written when valid, and it **suppresses** `platform`: a recipe
     wins in `resolveThemeChoice`, so a written platform would be dead data that
     could resurrect if the recipe is later removed;
   - `density` is written whenever it is a preset name. Its fallback is the
     *resolved theme's* preset (macOS is `compact`), so an explicit density is
     never redundant: the same stored `compact` applied to Windows is the reason
     the axis exists.
4. **Unknown values are absent, never errors.** `?mode=dusk` decodes to no mode,
   exactly like a missing key, so a hand-edited or older link keeps working —
   the same rule `resolveThemeChoice` already documents for a stored row.
5. **Stale keys are the consumer's clear step, made possible by the index.**
   `themeChoiceKeys` is exported so a consumer can delete every axis before
   applying the new entries; the docs show the three-line pattern and a test
   proves a leftover `platform` cannot survive beside a new `recipe`.
6. **No change to any theme, role, pair, floor, metric, platform style or
   recipe.** `themeFailures` stays `[]` for all 24 shipped sets and both
   executed examples; `contrastPairs` stays 404.

## 3. Exact edits

All paths are relative to the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

### 3.1 `packages/tokens/src/theme-choice.ts`

Add after `ThemeChoice` (before `resolveThemeChoice`):

```ts
/**
 * The query keys a shareable theme choice uses, in the order a canonical URL
 * writes them. A consumer clears these keys before applying
 * {@link themeChoiceParams}, so an axis a previous link set cannot survive
 * beside its replacement.
 */
export const themeChoiceKeys = [
  "mode",
  "contrast",
  "platform",
  "recipe",
  "density",
] as const;

/** A key of {@link themeChoiceKeys}. */
export type ThemeChoiceKey = (typeof themeChoiceKeys)[number];

/**
 * The lookup a URL search object provides. `URLSearchParams` satisfies it, as
 * does a plain record read through a function, so the package never depends on
 * a global the native runtime may not install.
 */
export interface ThemeParamSource {
  readonly get: (key: string) => string | null | undefined;
}

const readChoice = <A extends string>(
  source: ThemeParamSource,
  key: ThemeChoiceKey,
  guard: (value: unknown) => value is A,
): A | undefined => {
  const value = source.get(key);
  return guard(value) ? value : undefined;
};

/**
 * Decode the query string of a shareable URL into a theme choice. ...
 */
export function themeChoiceFromParams(source: ThemeParamSource): ThemeChoice {
  return {
    mode: readChoice(source, "mode", isThemeMode),
    contrast: readChoice(source, "contrast", isThemeContrast),
    platform: readChoice(source, "platform", isPlatformName),
    recipe: readChoice(source, "recipe", isPlatformRecipeName),
    density: readChoice(source, "density", isDensityName),
  };
}

/**
 * The canonical query entries for a choice. ...
 */
export function themeChoiceParams(
  choice: ThemeChoice,
): ReadonlyArray<readonly [ThemeChoiceKey, string]> {
  const encoder: Readonly<
    Record<ThemeChoiceKey, (value: ThemeChoice) => string | undefined>
  > = {
    mode: (value) =>
      isThemeMode(value.mode) && value.mode !== "light" ? value.mode : undefined,
    contrast: (value) =>
      isThemeContrast(value.contrast) && value.contrast !== "default"
        ? value.contrast
        : undefined,
    platform: (value) =>
      isPlatformRecipeName(value.recipe)
        ? undefined
        : isPlatformName(value.platform) && value.platform !== "default"
          ? value.platform
          : undefined,
    recipe: (value) =>
      isPlatformRecipeName(value.recipe) ? value.recipe : undefined,
    density: (value) =>
      isDensityName(value.density) ? value.density : undefined,
  };
  return themeChoiceKeys.flatMap((key) => {
    const value = encoder[key](choice);
    return value === undefined ? [] : [[key, value] as const];
  });
}
```

JSDoc must state the real behaviour a reader needs: the fallback list, the
recipe-suppresses-platform rule, why density is always written, the
clear-then-set pattern (with a runnable `@example` whose imports satisfy
`snippets.test.ts`), and that a default written by hand is still *read* (only
the writer omits it).

### 3.2 `packages/tokens/src/theme-choice-params.test.ts` (new)

Header comment states the gap: `ThemeChoice` documents a shareable URL but no
total function read or wrote one; the one shipped toggle retyped the platform
union and read a single axis. Cases:

1. **`reads every axis the package owns`** — a real
   `new URLSearchParams("mode=dark&contrast=high&platform=win32&recipe=aero&density=compact")`
   decodes to all five narrowed values. This also proves `URLSearchParams`
   satisfies `ThemeParamSource` (the type check) and that a recipe beside a
   platform is still read rather than silently dropped.
2. **`treats an unknown value as absent`** —
   `"?mode=dusk&contrast=maximum&platform=window&recipe=omarchy&density=cosy&size=huge"`
   decodes with every axis undefined and resolves identically to `{}`; a
   whitespace value (`mode=%20dark`) is unknown too.
3. **`round-trips every shipped choice through a real URL`** — for the full
   matrix (`themeModes` × `themeContrasts` × `platformNames` × recipes ×
   `densityNames`, plus an empty choice), apply the documented clear-then-set
   pattern to a `URLSearchParams`, read it back, and assert
   `resolveThemeChoice(decoded)` deep-equals `resolveThemeChoice(choice)`.
   Deep equality of the whole resolved `Theme` is the assertion — not a name.
4. **`writes only the axes whose absence would change the theme`** — assert
   `themeChoiceParams({ mode: "light", contrast: "default", platform: "default" })`
   is `[]`; `{ mode: "dark" }` is `[["mode", "dark"]]`; `{ contrast: "high" }`
   is `[["contrast", "high"]]`; `{ platform: "win32" }` is
   `[["platform", "win32"]]`; `{ platform: "default" }` is `[]`; and each
   emitted entry, removed from the resolved choice, changes the resolved theme.
5. **`lets a recipe suppress the platform it overrides`** —
   `{ platform: "win32", recipe: "aero" }` writes `[["recipe", "aero"]]` and
   resolves to `getPlatformRecipeTheme("aero", "light", "default")`; the emitted
   pair list never contains both keys.
6. **`writes a density on every platform, because the preset supplies the
   fallback`** — every default-contrast shipped platform writes the density it
   was given; a density written beside macOS (`compact`) survives a later
   platform edit to `win32`, where omitting it would silently take the new
   platform's `comfortable` preset instead.
7. **`keeps the documented key order`** — the keys of
   `themeChoiceParams({ mode: "dark", contrast: "high", platform: "win32", density: "compact" })`
   equal `themeChoiceKeys` filtered to the written axes, so a reorder cannot
   silently change every shared URL.
8. **`a stale axis cannot survive a canonical write`** — start from
   `"?mode=dark&platform=win32"`, clear `themeChoiceKeys`, write
   `{ recipe: "xp" }`, read back: `platform` is absent and the resolved theme is
   the XP recipe in light mode.
9. **`reads a default a hand-written link still carries`** —
   `"?platform=default&mode=light&contrast=default"` decodes to those values and
   resolves to the identity light theme (the writer omits them; the reader must
   not treat them as invalid).

Each case must be able to fail: case 1 fails if a key is mistyped; case 2 fails
if an unknown value is passed through; case 3 fails if omission and precedence
do not preserve the theme; case 4 fails if a default is written or a non-default
dropped; case 5 fails without the suppression; case 7 fails on a reorder;
case 8 fails without the exported index (a leftover key survives).

### 3.3 `docs/tokens.md`

- `## Types`: add, alphabetically,
  ```
  | `ThemeChoiceKey` | A query key from `themeChoiceKeys`. |
  | `ThemeParamSource` | The lookup a URL search object provides: `get(key)` returning a string, `null` or `undefined`. |
  ```
  (`ThemeChoiceKey` after `ThemeChoice`; `ThemeParamSource` after
  `ThemeOverrides`.)
- `## Theme API`, after the `resolveThemeChoice` paragraph and before "The
  object's shape is still the application's `Schema` boundary", add a
  **Shareable URL** paragraph: the three exports, the canonical rules from §2.3,
  the clear-then-set pattern, and the honest limit (a hand-written default is
  read; the writer omits it). Include one fenced `ts` block:

  ```ts
  import {
    resolveThemeChoice,
    themeChoiceFromParams,
    themeChoiceKeys,
    themeChoiceParams,
  } from "@gpuixui/tokens";

  const search = new URLSearchParams("?mode=dark&platform=win32");
  const theme = resolveThemeChoice(themeChoiceFromParams(search));

  const next = new URLSearchParams("?platform=win32");
  themeChoiceKeys.forEach((key) => next.delete(key));
  themeChoiceParams({ recipe: "aero" }).forEach(([key, value]) =>
    next.set(key, value),
  );
  ```
  The block must import every package symbol it names (plan 355/356 guard).
- The `themeContrastFailures`/`themeFailures` sections do not change.
- Plan history: append a plan `529` paragraph stating that no colour, pair,
  floor, metric, platform style or recipe moves and `contrastPairs` stays
  **404** (the count plan 527 left).

### 3.4 `docs/design-system.md`

§11 Extension, after "A whole theme object from a file is a different boundary:
decode it with the application's `Schema`.", add:

> A choice that travels in a URL is the same row: `themeChoiceFromParams(source)`
> reads the five keys through the same guards, and `themeChoiceParams(choice)`
> writes the canonical ones — the fallbacks are omitted, a recipe suppresses the
> platform it overrides, and a stored density is always written because the
> platform supplies the fallback preset. `themeChoiceKeys` is the key order and
> the clear list, so a link cannot keep an axis the new choice replaced. No
> theme, role or pair changes.

### 3.5 `packages/tokens/README.md`

In `## Persisted choices`, after the `resolveThemeChoice` paragraph and before
the `isControlSize` snippet, add two short paragraphs and one fenced `ts` block:
what the URL codec is for (the docs platform toggle is shareable), the canonical
rules, the clear-then-set pattern, and the four new names. The block must import
every package symbol it names.

### 3.6 `COMPONENTS.md`

`Theme extension` row: append one sentence — the URL boundary is the package's
too: `themeChoiceFromParams`/`themeChoiceParams`/`themeChoiceKeys` decode and
canonically encode the five axes, so a shareable link resolves through the same
guards and precedence as a stored row (plan 529). No counts change.

### 3.7 `TODO.md`

Add one ticked row before the cross-team block:

```
`[x]` Own the shareable theme choice — `ThemeChoice` documented "a shareable
URL" but nothing read or wrote one, so every consumer retyped the five keys and
the docs platform toggle parsed only `platform` while plan 380's recipe,
contrast and density axes had no URL form; `themeChoiceFromParams`,
`themeChoiceParams` and `themeChoiceKeys` decode through the existing guards,
write only the axes whose absence would change the theme (a recipe suppresses
the platform it overrides, a stored density is always written), and the exported
key order is the clear list that stops a stale axis surviving; no colour, pair,
floor, metric, style or theme moves and `contrastPairs` stays 404 (plan 529)
```

Bump the section bar from `193/255` to `194/256`.

### 3.8 `.agents/slop/plans/README.md`

Add to the table after the 527 row (528 is already listed after 527; append
after 528):

```
| [529](./529-shareable-theme-choice.md) | A shareable theme choice: the URL boundary | F | 067, 068, 096, 305, 311, 380, 383, 387 | done |
```

Append a plan-529 paragraph after the plan-528 paragraph.

## 4. Commands and expected results

Run in `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`:

1. `nub run --filter @gpuixui/tokens test -- theme-choice-params` before the
   source edit → no test file; after §3.1 and §3.2 → all nine cases pass.
   (Proves the gap was untested; §6 proves the file fails without the source.)
2. `nub run --filter @gpuixui/tokens test -- theme-choice` → the existing
   resolver cases still pass; the new module does not change resolution.
3. `nub run --filter @gpuixui/tokens test -- public-types` → after the table
   edit, the index names exactly the public types.
4. `nub run --filter @gpuixui/tokens test -- snippets` → the docs and README
   blocks import every symbol they use.
5. `nub run --filter @gpuixui/tokens test -- docs` → the value-coverage guard
   finds the three new names and every exact-prose guard still holds.
6. `nub run --filter @gpuixui/tokens test -- readme` → the README guards still
   hold.
7. `nub run --filter @gpuixui/tokens test -- inventory` → the ledger still
   states its counts; the new COMPONENTS sentence adds none.
8. `nub run --filter @gpuixui/tokens test` → record the file/test counts the run
   prints; do not quote a number the run did not print.
9. `nub run check` → `check:tests`, lint, format and `check-types` pass.
10. `nub run lint` and `nub run test` → both pass.

## 5. STOP conditions

Stop and report instead of improvising if:

- `themeChoiceParams` cannot stay total without a cast, a non-null assertion or
  a literal retyped outside `themeChoiceKeys` (the guards must narrow each
  axis). Report the compile error instead of adding a cast.
- Adding the two types to the `## Types` table fails the alphabetical or
  bidirectional guard for a reason other than a missed name — find the drift; do
  not reorder unrelated rows.
- A shipped set or executed example stops returning `[]` from `themeFailures`.
  No theme value should move in this plan; a failing check means an unrelated
  edit landed.
- A URL round-trip loses a theme for any matrix combination (case 3). Report the
  combination and the two resolved names; do not weaken the assertion to a name
  comparison.
- The codec needs `URLSearchParams`, `URL` or any global in `src/`. The package
  must stay runtime-dependency-free; the structural `ThemeParamSource` is the
  boundary.
- `snippets.test.ts` demands an import or a role that the documented snippet
  cannot reasonably have (§3.3). Fix the snippet, not the guard.

## 6. Test plan

| What can break | The case that catches it |
| --- | --- |
| A key or guard drifts from the union owner | case 1 + case 2 |
| An unknown or older value throws or reaches the resolver | case 2 |
| Omission, precedence or density handling changes the resolved theme | case 3 over the full matrix |
| A default is written, or a non-default dropped | cases 4 and 7 |
| A recipe and the platform it overrides are both written | case 5 |
| A density equal to the platform preset is dropped | case 6 |
| A reorder silently rewrites every shared URL | case 7 |
| A stale axis survives a new link | case 8 |
| A hand-written default is treated as invalid | case 9 |
| The docs or README snippet names an unimported symbol | `snippets.test.ts` |
| A public type or value ships unnamed | `public-types.test.ts`, `docs.test.ts` |

To prove both directions, keep the source change as a patch and run the new
suite twice:

```bash
git diff packages/tokens/src/theme-choice.ts > /tmp/plan-529.patch
git apply -R /tmp/plan-529.patch
nub run --filter @gpuixui/tokens test -- theme-choice-params   # must fail
git apply /tmp/plan-529.patch
nub run --filter @gpuixui/tokens test -- theme-choice-params   # must pass
```

Record both outputs in the commit message. (`scripts/verify-two-directions.sh`
is the repo convention; its `jj`-based root lookup does not resolve in this
worktree, so the manual pairing above is the honest equivalent.)

## 7. Acceptance criteria

- [ ] `themeChoiceFromParams`, `themeChoiceParams` and `themeChoiceKeys` are
      exported from the core entry; `ThemeChoiceKey` and `ThemeParamSource` are
      in the type index; no new runtime dependency.
- [ ] The reader accepts a real `URLSearchParams` and a plain lookup, treats an
      unknown value as absent, and returns every axis narrowed.
- [ ] The writer emits only `dark`, `high`, non-`default` platforms, valid
      recipes and valid densities; a recipe suppresses the platform; the key
      order is `themeChoiceKeys`.
- [ ] The full matrix round-trips semantically through a real URL, including a
      stale-key rewrite.
- [ ] No theme, colour, pair, floor, metric, platform style or recipe changes;
      `contrastPairs` stays **404** and every `themeFailures` result stays `[]`.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the README, `COMPONENTS.md`,
      `TODO.md` and the plan index state the codec, its canonical rules and the
      clear-then-set obligation.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
