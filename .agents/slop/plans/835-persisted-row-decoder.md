# 835 — The persisted row the design system says the package decodes

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `067`, `068`,
`305`, `380`, `529` and `755`.

## 1. The defect

Four documents describe where a persisted choice is decoded, and one of them
describes a call that does not exist:

| Document | Says |
| -------- | ---- |
| `docs/design-system.md` | "A choice … arrives as `unknown`. Narrow it with the five guards, **or hand the whole row to `resolveThemeChoice(choice)`**" |
| `docs/tokens.md` | "The object's shape is still the application's `Schema` boundary; the unions and the precedence are the package's." |
| `packages/tokens/README.md` | "A whole theme object loaded from a file is still the application's `Schema` boundary." |
| `theme-choice.example.ts` | "The shape is decoded by the application; the package narrows the five axes." |

`resolveThemeChoice` takes a `ThemeChoice`, so the design-system's call does not
compile from an `unknown` row, and a consumer who casts to make it compile hits
the second half of the defect: the resolver is not total over the row it
resolves.

```ts
resolveThemeChoice(JSON.parse(storedRow) as ThemeChoice);
// a missing storage key, or the text "null", yields null:
//   TypeError: Cannot read properties of null (reading 'mode')
```

The catalogue promises the opposite outcome — "A value from an older release
must not stop a settings screen from opening" — and the first run of a settings
screen is exactly the missing-key case. The URL half already has a decoder
(`themeChoiceFromParams`), so the package owns one transport of the same five
axes and not the other.

## 2. Decisions

1. **Ship the missing decoder, not a wider resolver.** `resolveThemeChoice` keeps
   its typed `ThemeChoice` parameter, so a direct caller still gets the
   excess-property check on a misspelled axis (`{ platfrom: "win32" }` is an
   error today and must stay one). The boundary value gets its own decoder:
   `themeChoiceFromRow(value: unknown): ThemeChoice`.
2. **One owner for the five axes.** `themeChoiceFromParams` and the new decoder
   both narrow through a private `narrowChoice(read)`, so a sixth axis is added
   once. The public `readChoice` helper disappears; `themeChoice.ts` loses lines.
3. **An unknown axis is absent, not an error.** Same rule as the URL decoder, so
   a row from an older or newer release opens. An unknown *key* is ignored, and
   a value that is not a row (`null`, `undefined`, a number, a string, an array)
   is the empty choice.
4. **The prose follows the code.** The design system names the decoder; the other
   three keep the theme-object boundary rule but stop implying the five-axis row
   has no decoder.
5. **No value moves.** No colour, pair, floor, metric, role or shipped theme —
   `resolveThemeChoice` itself is unchanged.

## 3. Files to change

1. `packages/tokens/src/theme-choice.ts` — `narrowChoice`, `isRow`,
   `themeChoiceFromRow`, and the rewritten `themeChoiceFromParams` (§4).
2. `packages/tokens/src/theme-choice.example.ts` — a stored row and its theme,
   executed by `theme-choice.test.ts` (§4.2).
3. `packages/tokens/src/theme-choice.test.ts` — four cases (§5).
4. `docs/tokens.md` — the persisted-choice passage and a snippet (§6).
5. `docs/design-system.md` — the "hand the whole row" sentence (§6).
6. `packages/tokens/README.md` — the persisted-choices paragraph (§6).
7. `COMPONENTS.md` — one clause in the **Theme extension** row (§6).
8. `TODO.md` — one ticked row, counter `382/457` → `383/458` (§7).
9. `.agents/slop/plans/README.md` — the row and one closing paragraph (§8).

## 4. The code

### 4.1 `theme-choice.ts`

Replace the `readChoice` helper and its two uses:

```ts
const readChoice = <A extends string>(
  source: ThemeParamSource,
  key: ThemeChoiceKey,
  guard: (value: unknown) => value is A,
): A | undefined => {
  const value = source.get(key);
  return guard(value) ? value : undefined;
};
```

with

```ts
/**
 * A row read from storage. The shape is not trusted: a missing key arrives as
 * `null` and the text `"null"` parses to `null`, which is not a row.
 */
const isRow = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Narrow the five axes through the package's guards — the one owner of the
 * choice a URL, a stored row and a settings screen carry. An unknown value is
 * absent, so an older or newer row still resolves to a readable theme.
 */
const narrowChoice = (read: (key: ThemeChoiceKey) => unknown): ThemeChoice => {
  const mode = read("mode");
  const contrast = read("contrast");
  const platform = read("platform");
  const recipe = read("recipe");
  const density = read("density");
  return {
    mode: isThemeMode(mode) ? mode : undefined,
    contrast: isThemeContrast(contrast) ? contrast : undefined,
    platform: isPlatformName(platform) ? platform : undefined,
    recipe: isPlatformRecipeName(recipe) ? recipe : undefined,
    density: isDensityName(density) ? density : undefined,
  };
};
```

`themeChoiceFromParams` becomes one line:

```ts
export function themeChoiceFromParams(source: ThemeParamSource): ThemeChoice {
  return narrowChoice((key) => source.get(key));
}
```

Add, after it (before the encoder):

```ts
/**
 * Decode a persisted row — a settings object, a stored preference, a payload —
 * into a {@link ThemeChoice} without trusting its shape.
 *
 * The row is what the application stores; the five unions are the package's, so
 * the package narrows them. Every axis goes through the same guard as a URL
 * parameter: a known value is kept, an unknown or missing value is absent, and a
 * key the row does not know is ignored, so a row written by an older or a newer
 * release still opens. A value that is not a row at all — `null` from a missing
 * storage key, the text `"null"` after `JSON.parse`, a number, an array — is the
 * empty choice, which {@link resolveThemeChoice} resolves to the identity.
 *
 * The shape of a **theme object** loaded from a file or a URL is a different
 * boundary and stays the application's `Schema`.
 *
 * @example
 * ```ts
 * import { resolveThemeChoice, themeChoiceFromRow } from "@gpuixui/tokens";
 *
 * const theme = resolveThemeChoice(themeChoiceFromRow(storedPreference));
 * ```
 */
export function themeChoiceFromRow(value: unknown): ThemeChoice {
  const row: Readonly<Record<string, unknown>> = isRow(value) ? value : {};
  return narrowChoice((key) => row[key]);
}
```

The doc comments on `themeChoiceFromParams`, `themeChoiceKeys` and
`resolveThemeChoice` stay; the new function is the row half they reference.

### 4.2 `theme-choice.example.ts`

Append:

```ts
/**
 * A row as storage really returns it: un-narrowed, possibly `null` on a first
 * run. The shape is the application's; the five axes are the package's, and
 * `themeChoiceFromRow` narrows them so a missing row opens the identity instead
 * of throwing. Asserted in `theme-choice.test.ts`.
 */
export const storedRow: unknown = {
  mode: "dark",
  platform: "win32",
  density: "wide",
  from: "an-older-release",
};

/** The theme the raw row resolves to: Windows dark, the row's bad density ignored. */
export const resolvedStoredRow: Theme = resolveThemeChoice(
  themeChoiceFromRow(storedRow),
);

/** A missing storage key, which must not stop the screen opening. */
export const emptyStoredRow = resolveThemeChoice(themeChoiceFromRow(null));
```

and add `themeChoiceFromRow` to the file's import.

Update its header: "The shape is decoded by the application; the package narrows
the five axes." → "`themeChoiceFromRow` narrows the five axes of an un-narrowed
row, so the row's shape never reaches `resolveThemeChoice`."

## 5. Tests

Add to `theme-choice.test.ts` (which already imports the example module):

1. **The row the docs name resolves.** `resolvedStoredRow` is the Windows dark
   theme with the identity's density (the row's `"wide"` is not a preset) and
   `themeFailures` is empty; `storedRow`'s `from` key is ignored.
2. **A missing row opens the default theme.** `themeChoiceFromRow(null)`,
   `undefined`, `42`, `"dark"` and `[]` each return the same value as
   `themeChoiceFromRow({})`, and `emptyStoredRow` is `getTheme("light")`. This is
   the regression: the documented path threw a `TypeError` for `null`.
3. **An unknown axis is absent, a known one narrows.** A row with
   `{ mode: "dark", contrast: "medium", platform: "beos", recipe: "aero",
   density: "cosy" }` yields `contrast`/`platform`/`density` `undefined` and
   keeps `recipe: "aero"`, so `resolveThemeChoice` still prefers the recipe.
4. **The two transports decode the same row.** For the full `storedChoice` row,
   `themeChoiceFromRow` and `themeChoiceFromParams` over the URL written by
   `themeChoiceParams` are equal, and both resolve to `resolvedChoice`.

Each case asserts a resolved theme or a narrowed axis; none compares a stub with
itself.

## 6. Documents

1. `docs/tokens.md`, the composition passage — after "Every axis is `unknown` and
   falls back rather than failing …", add:

   ```
   A row whose shape is not known yet narrows through
   `themeChoiceFromRow(value)`: it reads the five keys through the same guards,
   keeps an unknown axis absent, ignores a key it does not know, and answers the
   empty choice for a value that is not a row at all — `null` from a missing
   storage key included, so a first run opens the identity instead of throwing.
   ```

   and replace "The object's shape is still the application's `Schema`
   boundary; the unions and the precedence are the package's." with:

   ```
   The five axes' shape is the package's too; a **theme object** loaded from a
   file is the boundary that stays the application's `Schema`.
   ```

   Change the snippet to:

   ```ts
   import { resolveThemeChoice, themeChoiceFromRow } from "@gpuixui/tokens";

   const theme = resolveThemeChoice(themeChoiceFromRow(storedPreference));
   ```

2. `docs/design-system.md`, the persisted-choice paragraph — replace "or hand
   the whole row to `resolveThemeChoice(choice)`" with "or hand the whole row to
   `themeChoiceFromRow(value)` and resolve the choice it returns — a `null` from
   a missing storage key becomes the empty choice rather than an exception", and
   replace the "A whole theme object from a file is a different boundary" sentence
   with the same distinction the catalogue now draws.

3. `packages/tokens/README.md`, the persisted-choices paragraph — after the
   guards sentence, add: "A whole row that has not been narrowed goes through
   `themeChoiceFromRow(value)`, which applies those guards, ignores an unknown
   key and treats a non-row (a `null` from a missing key included) as the empty
   choice." Keep the theme-object sentence.

4. `COMPONENTS.md`, **Theme extension** row — after the `resolveThemeChoice`
   clause, add: "a row that has not been narrowed goes through
   `themeChoiceFromRow(value)`, which applies the same five guards to a stored
   object (an unknown key is ignored, a non-row is the empty choice), so a
   missing storage key opens the identity instead of throwing (plan 835)".

The value-coverage walk needs the new name in the catalogue (§6.1 provides it);
no type is added.

## 7. `TODO.md`

Add above the plan-834 row:

```
`[x]` Decode a persisted row the docs already named — the design system said to
hand an unknown row to `resolveThemeChoice`, which neither compiles nor survives
a missing key (`JSON.parse("null")` threw a `TypeError` on the documented
"must not stop a settings screen" path); `themeChoiceFromRow(value)` shares the
five guards with the URL decoder through one `narrowChoice`, ignores an unknown
key, treats a non-row as the empty choice, and the four passages name it
(plan 835)
```

and bump the counter `382/457` → `383/458`.

## 8. The index

```
| [835](./835-persisted-row-decoder.md) | The persisted row the design system says the package decodes | F | 067, 068, 305, 380, 529, 755 | done |
```

and one closing paragraph: the design system promised a call the package did not
have; the row's five axes were already the package's, so the decoder is the
missing half of the transport `themeChoiceFromParams` began, and the resolver
keeps its typed parameter so a misspelled axis is still a compile error.

## 9. Commands, expected results and both directions

```sh
cd packages/tokens
nub run --filter @gpuixui/tokens test theme-choice
nub run --filter @gpuixui/tokens test theme-choice-params snippets docs
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
cd ../..
nub run check
```

Expected: `theme-choice.test.ts` gains four cases; the package stays at 227 files
and moves 7204 → 7208 tests; `snippets.test.ts` passes with the new block; the
root gates green.

Both directions:

1. **Fails before the fix.** Before adding `themeChoiceFromRow`, the catalogue's
   documented path is run by hand and recorded in the commit message:
   `resolveThemeChoice(JSON.parse("null") as ThemeChoice)` throws `TypeError`.
   The new cases cannot even import the name before the function exists, which is
   the import-level half of the proof.
2. **Fails if the decoder stops being total.** Plant `isRow` returning `value as
   unknown` — i.e. hand the raw value to the guards — and case 2 fails on the
   `null`/number rows. Restore.
3. **Passes after.** The package and `nub run check` green, with the four new
   cases and no other change to a shipped theme.

**Native scenarios.** None; a pure decode over plain data. Record "no scenario
ran".

## 10. STOP conditions

- Stop if `themeChoiceFromParams` changes behaviour. `theme-choice-params.test.ts`
  pins the canonical writer and the decoder; every case must pass untouched.
- Stop if a caller of `themeChoiceFromParams` needs a signature change. The
  parameter type stays `ThemeParamSource`; only the private helper moves.
- Stop if the new decoder needs a cast. `isRow` narrows to
  `Readonly<Record<string, unknown>>`; if TypeScript refuses the empty-`{}`
  fallback, STOP and report rather than asserting.
- Stop if `nub run check` reports a snippet that names `themeChoiceFromRow`
  without importing it.

## 11. Not changed

- `resolveThemeChoice`, `themeChoiceParams`, `themeChoiceKeys` and the
  `ThemeChoice` type: the decoder is additive, and the resolver keeps the typed
  parameter that catches a misspelled axis.
- Every `Theme` value, colour, pair, floor, metric, role and shipped set.
- `packages/components`, `packages/primitives`, `apps/*`; the `docs-site` URL
  interlock stays a cross-team row and can consume the decoder when it lands.
