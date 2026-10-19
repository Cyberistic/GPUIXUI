# 658 — The documented recipe edit must own its whole family

**Phase:** F (the copy-and-own path must be a theme the contract accepts) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 310 (the platform snippet that shipped a half family), 311 (the
recipes), 318/327/330/331 (the family and edge rules the examples teach), 355
(the snippet guard), 389 (a style owns its whole look) ·
**Number block:** 500–699 (`tokens-theme` overflow; `657` is owned by
`components`, so `658` is the next free) ·
**Status:** done

## 1. The defect

`docs/tokens.md` teaches the recipe copy-and-own path twice, and both halves
model a **single-value colour edit**:

> is the whole recipe — copy it, edit a value, and apply it with
> `applyPlatformStyle`, exactly like a shipped variant.

```ts
// The copy-and-own path applies to a recipe too.
const mine = applyPlatformStyle(getTheme("dark"), {
  ...platformRecipes.aero,
  colors: {
    ...platformRecipes.aero.colors,
    dark: { ...platformRecipes.aero.colors.dark, primary: "#1F6FB5" },
  },
});
```

Running that block against the shipped theme (probe, 2026-10-19) builds
`Dark · Windows 7` and `themeFailures(mine)` returns **seven** failures:

| Pair | Floor | Ratio |
| ---- | ----- | ----- |
| `primaryForeground` on `primary` | 4.5 (`secondary`) | **3.999** |
| `primary` on `card` | 3 (`mark`) | **2.696** |
| `primary` on `popover` | 3 (`mark`) | **2.696** |
| `primary` on `muted` | 3 (`mark`) | **2.696** |
| `primary` on `input` | 3 (`mark`) | **2.696** |
| `primary` on `track` | 3 (`mark`) | **2.882** |
| `primary` on `hover` | 3 (`mark`) | **2.233** |

The page itself states the rule one section earlier: "A style that names only
the fill inherits a foreground designed for another fill; that is the 2.96:1
failure plan `310` fixed." The recipe block does exactly that — it keeps Aero's
black `primaryForeground`, its old hover/pressed family and its readable ink —
so the copyable example is rejected by the package's own guarantee.

Nothing catches it. `snippets.test.ts` holds the *brand* maps to
`themeFailures`, and the recipe block has no `brandTheme =`, so it is invisible
to that guard; `recipe-edit` has no executed example, so `examples.test.ts` has
nothing to import either.

## 2. Decision

The recipe path is a real, valuable way to start a look, so the fix keeps it
and makes the example honest:

1. **The documented edit moves the whole primary family** — fill, foreground,
   hover, pressed and readable text — the same Contoso family the platform
   examples already ship (plan `310`). On Aero dark it measures **10.35:1** for
   the label and at least **4.16:1** as a mark on every surface the probe
   measured, so the copied recipe passes `themeFailures`.
2. **Ship it as an executed example**, `recipe-edit.example.ts`, so the family
   has one owner and `examples.test.ts` imports it.
3. **Guard the snippet**: `snippets.test.ts` reads the nested `dark` map out of
   the documented block, requires it to equal the example's `recipePrimary`, and
   builds the documented edit to assert `themeFailures` is `[]`. A second case
   rebuilds the pre-fix one-role map and proves the guard can fail.
4. **Correct both sentences** — "edit a value" becomes "edit its values", and
   the paragraph quotes the seven failures the pre-fix block produced, with the
   figures derived by the regression suite.

No token value, pair, floor, metric, check kind, count or shipped theme moves.

## 3. Exact files

| File | Action |
| ---- | ------ |
| `.agents/slop/plans/658-recipe-edit-family.md` | this plan |
| `packages/tokens/src/recipe-edit.example.ts` | new executed example: `recipePrimary`, `editedAeroTheme` |
| `packages/tokens/src/recipe-edit.test.ts` | new regression suite (§5) |
| `packages/tokens/src/snippets.test.ts` | the recipe map case and its can-fail case (§6) |
| `docs/tokens.md` | the "edit a value" sentence, the block's dark map, the rationale with the seven figures and a link to the example |
| `COMPONENTS.md` | **Platform style variants** row: name `recipe-edit.example.ts` beside the other copy-and-own examples |
| `TODO.md` | add and tick the row; bump the `Design tokens and theming` counter |
| `.agents/slop/plans/README.md` | index this plan and add its summary paragraph |
| `.agents/slop/rd/2026-10-19-tokens-next-658.md` | the probe and its output |

No other file. **Do not** edit `packages/components`, `packages/primitives`,
`apps/*` or a shipped token value.

## 4. `packages/tokens/src/recipe-edit.example.ts`

```ts
import {
  applyPlatformStyle,
  getTheme,
  platformRecipes,
  type Theme,
  type ThemeColors,
} from "./index.js";

/**
 * The primary family a copied recipe moves, taken from the platform example so
 * both copy-and-own paths teach the same rule: a fill painted as a mark keeps
 * its foreground and its two pointer states beside it. The one-role edit this
 * replaced left the Aero dark black foreground on the new fill (3.999:1) and
 * the fill itself under the 3:1 mark floor on a card and the value groove.
 */
export const recipePrimary = {
  primary: "#5CB8FF",
  primaryForeground: "#001A33",
  primaryHover: "#8CCFFF",
  primaryActive: "#A6DBFF",
  primaryText: "#8CCFFF",
} as const satisfies Readonly<Partial<ThemeColors>>;

/**
 * Aero, copied and edited the way `docs/tokens.md` teaches. The recipe's light
 * half is untouched; the dark half is the Windows palette the recipe already
 * carries, so the Contoso family is designed against the same surfaces.
 */
export const editedAeroTheme: Theme = applyPlatformStyle(getTheme("dark"), {
  ...platformRecipes.aero,
  colors: {
    ...platformRecipes.aero.colors,
    dark: { ...platformRecipes.aero.colors.dark, ...recipePrimary },
  },
});
```

## 5. `packages/tokens/src/recipe-edit.test.ts`

Header: state the bug — the page's recipe block edited only `primary`, so the
copied theme was rejected by `themeFailures` with seven pairs, while the
snippet guard never ran it.

Imports from `./index.js`: `applyPlatformStyle`, `contrastFloors`,
`contrastRatio`, `getTheme`, `platformRecipes`, `shippedThemes`,
`themeContrastFailures`, `themeFailures`, `type ContrastPair`, `type Theme`.
Import `editedAeroTheme`, `recipePrimary` from `./recipe-edit.example.js`.

The pre-fix fixture is the old documented block, reconstructed:

```ts
const preFixTheme = applyPlatformStyle(getTheme("dark"), {
  ...platformRecipes.aero,
  colors: {
    ...platformRecipes.aero.colors,
    dark: { ...platformRecipes.aero.colors.dark, primary: "#1F6FB5" },
  },
});
```

Cases:

1. **The pre-fix edit was accepted by no check** — `themeFailures(preFixTheme)`
   is not empty, and its `contrast` entries contain exactly the label pair
   (`primaryForeground`/`primary`, `secondary`, 4.5) and the six mark pairs
   (`primary` on `card`, `popover`, `muted`, `input`, `track`, `hover`, `mark`,
   3). Assert each ratio to three decimals: `3.999`, `2.696` (×4), `2.882`,
   `2.233`. This is the fixture that proves the guards can fail.
2. **The documented edit is a theme the contract accepts** —
   `themeFailures(editedAeroTheme)` is `[]`, and
   `themeContrastFailures(editedAeroTheme)` is `[]`.
3. **It moves the whole family** — `editedAeroTheme.colors` matches
   `recipePrimary` for the five roles, and `primary` differs from
   `platformRecipes.aero.colors.dark.primary` (assert the inherited value is not
   the edited one; do not retype it).
4. **The copied fill keeps its floors** — for the six surfaces the pre-fix probe
   measured (`card`, `popover`, `muted`, `input`, `track`, `hover`),
   `contrastRatio(primary, surface) >= contrastFloors.default.mark`, and the
   label clears `secondary` on the fill. Also hold the new figures the docs
   quote (derive them; do not hard-code except in the can-fail case).
5. **The docs quote the pre-fix figures** — read `docs/tokens.md` with
   `node:fs` (the established pattern in `docs.test.ts`) and require `3.999`,
   `2.696`, `2.882`, `2.233`, the text `edit its values`, and the link
   `recipe-edit.example.ts`.
6. **Every shipped set still passes** — `shippedThemes.flatMap(({ theme }) =>
   themeFailures(theme))` is `[]`.

## 6. `snippets.test.ts`

Add beside the brand cases:

```ts
/**
 * Guards the defect plan 658 fixes: the recipe copy-and-own block edited only
 * `primary`, so a reader who copied it shipped a theme `themeFailures` rejects
 * seven times while the snippet guard passed it. The nested `dark` map is the
 * documented family; it must equal the executed example's and build a clean
 * theme.
 */
const nestedDarkColourMap = (code: string): Readonly<Record<string, string>> => {
  const body = /dark:\s*\{([^}]*)\}/.exec(code)?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/([A-Za-z]+):\s*"(#[0-9A-Fa-f]{6,8})"/g)].map(
      ([, role, value]) => [role ?? "", value ?? ""],
    ),
  );
};

it("builds a recipe edit the contract accepts", () => {
  const block = snippets.find(({ code }) => code.includes("platformRecipes.aero"));
  expect(block).toBeDefined();
  if (block === undefined) return;
  const documented = nestedDarkColourMap(block.code);
  expect(documented).toEqual(recipePrimary);
  expect(
    themeFailures(
      applyPlatformStyle(getTheme("dark"), {
        ...platformRecipes.aero,
        colors: {
          ...platformRecipes.aero.colors,
          dark: { ...platformRecipes.aero.colors.dark, ...documented },
        },
      }),
    ),
  ).toEqual([]);
});

it("catches the recipe snippet it replaced", () => {
  const preFix = applyPlatformStyle(getTheme("dark"), {
    ...platformRecipes.aero,
    colors: {
      ...platformRecipes.aero.colors,
      dark: { ...platformRecipes.aero.colors.dark, primary: "#1F6FB5" },
    },
  });
  expect(themeFailures(preFix)).not.toEqual([]);
});
```

Add the imports the cases need (`applyPlatformStyle`, `getTheme`,
`platformRecipes`, `recipePrimary`, `themeFailures` — `themeFailures` is already
imported).

## 7. Documents

`docs/tokens.md`, §Platform recipes:

- "copy it, edit a value, and apply it" → "copy it, edit its values, and apply
  it".
- Replace the single-role dark map in the block with the five-role family from
  §4.
- After the block, add: a fill is a mark and a label surface, so a one-role
  edit leaves the inherited Windows foreground and states behind — the old
  block measured **3.999:1** for the label on its new fill, **2.696:1** as a
  mark on a card, popover, the quiet panel or a field, **2.882:1** on the value
  groove and **2.233:1** on the hover wash, seven failures from
  `themeFailures` (plan `658`). Link
  [`src/recipe-edit.example.ts`](../packages/tokens/src/recipe-edit.example.ts).
- Update the copy-and-own paragraph above it (the platform example's
  "The edited family moves together…") only if it says "edit a value"; it does
  not.

`COMPONENTS.md`, **Platform style variants** row: after "The copy-and-own
examples (`resolveEditedPlatformTheme`, `contosoPlatformStyle`) move the whole
Contoso primary family…", add `recipe-edit.example.ts` to the list and note that
the documented recipe edit is held the same way (plan `658`).

`TODO.md`: one new ticked row in *Design tokens and theming*: "Make the
documented recipe edit own its whole family — the block edited only `primary`,
kept Aero's black foreground and measured seven failures (label 3.999:1, mark
2.696–2.882:1) while no test ran it; the example now moves the family and
`snippets.test.ts` executes the documented map (plan 658)". Bump the section
counter (`287/361` → `288/362`; the bar stays `[████████░░]`).

## 8. Commands and expected results

Before the fix, in `packages/tokens`:

```sh
nub exec vitest run src/recipe-edit.test.ts
```

fails at case 1 as written against a fixed tree only if the pre-fix fixture is
kept; the both-directions proof is:

- run the new `snippets.test.ts` recipe cases against the **unfixed** docs block
  — the `documented` map is `{ primary: "#1F6FB5" }`, so the equality and the
  `themeFailures` case fail;
- after the fix they pass.

Then:

```sh
nub exec vitest run src/recipe-edit.test.ts src/snippets.test.ts src/examples.test.ts
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check:tests
nub run check
nub run lint
```

Expected: clean. Record the exact results in the commit message.

## 9. STOP conditions

Stop and report with evidence if:

- the fixed Contoso family does not return `[]` from `themeFailures` on the Aero
  dark base — do **not** weaken the family or the check; choose another light
  shade and record the probe;
- the documented nested map (after the edit) does not parse with the one-level
  regex — the block must keep `dark: { … }` as the innermost braces so the
  simple reader stays honest; if a nested object is unavoidable, parse it with a
  named helper and say so;
- `examples.test.ts` does not see the new example imported by a suite (it will
  fail if the import is missing);
- any shipped token value, pair count, floor, metric or check kind would need to
  move — this plan is a documentation/example fix only;
- a document other than the four named files repeats the old block (search for
  `#1F6FB5` before implementing).

## 10. Acceptance

- [x] The docs recipe block moves the whole primary family and is executed by
      `recipe-edit.example.ts`.
- [x] `themeFailures(editedAeroTheme)` and every shipped theme are `[]`.
- [x] The pre-fix block is reconstructed in a test and produces the seven
      failures, with the figures the page quotes.
- [x] `snippets.test.ts` compares the documented nested map to the example and
      proves it can fail.
- [x] `examples.test.ts`, `check:tests`, `check` and `lint` pass; no token
      value, pair, floor or metric moves.
