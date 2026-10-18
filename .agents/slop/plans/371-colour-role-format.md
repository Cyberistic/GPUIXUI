# Plan 371 — every colour role is a hex colour the helpers parse

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
011 (the role set), 014 (`alpha`), 071 (the contrast contract), 085 (a level is
geometry plus an alpha over `shadow`), 099 (the checker measures the scrim),
306 (the completeness guard and its reasons).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

`colors.shadow` is the one role the colour contract does not measure, and it is
exempt for a good reason: it is a tint, not a foreground or a background. Plan
085 made every elevation level `{ …geometry, alpha }` and composed the painted
shadow as `alpha(theme.colors.shadow, level.alpha)` — so the tint is *used* by
the contract's own maths, and nothing holds it to a form that maths can read.

`alpha` parses only `#RRGGBB` and `#RRGGBBAA` (`color.ts` `hexColor`); a value it
does not recognise is returned **unchanged**, the documented fallback that keeps
`alpha(NaN)` from emitting `#…NaN` (plan 077). The pinned `@gpuix/native@0.10.0`
accepts every CSS colour form — `parse_color_rgba` delegates to
`csscolorparser 0.8.3`, whose tests include `rebeccapurple`, `rgb(255 0 0)`,
`hsl(…)` and `#f00f` (`references/gpuix` `packages/native/src/color.rs`). A
consumer may therefore write a perfectly paintable theme that the token helpers
cannot measure:

```ts
const tinted = extendTheme(getTheme("light"), {
  colors: { shadow: "black" },
});

themeContrastFailures(tinted); // []   (before this plan)
themeMetricFailures(tinted);   // []   (before this plan)
elevationShadow(tinted, "sm"); // { …, color: "black" }  — 100% opaque
elevationShadow(tinted, "lg"); // { …, color: "black" }  — the 0.16 alpha is gone
```

The shipped light `md` shadow is `#191D251F` (a 12% tint). With `"black"` every
level paints an **opaque** shadow, so the levels stop differing in density and
the whole elevation scale collapses — while both checkers return `[]`. The same
happens for `#000` (three-digit hex), `#00000080` is fine because `alpha`
replaces the byte, and `rgb(0 0 0)` has the same defect as `"black"`.

This is a documentation claim the tests never held. `docs/design-system.md` §10
states *"invalid colour strings are ignored per property · a typo paints the
previous/black value; tests restrict roles to hex"*. Measured role strings
taken from `colorRoles` are restricted in practice, because `contrastRatio`
returns `NaN` for a non-hex value and `NaN` fails every floor (plan 071). The two
**exempt** roles are not: `scrollbar` is reserved (not painted in 0.10.0) and
`shadow` is painted through `alpha`, which silently passes an unparseable tint
through. So the sentence is false for exactly the role plan 085 taught a brand
to edit.

The fix is not to teach `alpha` every CSS form — that means a colour parser and
a dependency this package deliberately does not ship. The package's contract is
its own hex convention: the palette, every role, `alpha`, `compositeOver` and
`contrastRatio` are written in `#RRGGBB`/`#RRGGBBAA`. The missing half is to
*hold* an edited theme to that convention and to name the role that broke it,
instead of shipping an opaque shadow (or an opaque fallback) with no report.

## 2. Decision

1. **Export `isHexColor(value: string): boolean`** from `color.ts` beside
   `alpha`. It is the format predicate the helpers already implement privately
   (`hexColor`), and a consumer decoding a stored thematic value (a URL
   parameter, a settings row) can check one role without building a theme.
2. **Export `themeColorFailures(theme: Theme): ReadonlyArray<ColorFailure>`**
   from `contrast.ts`, beside the two other contract checks. It walks
   `colorRoles` in documentation order and returns `{ role, value }` for every
   value that is not a six- or eight-digit hex colour.
3. **Document the check as the third guarantee** (format beside contrast and
   metrics), and correct §10's "tests restrict roles to hex" sentence to name the
   checker that makes it true.
4. Keep the contrast completeness exemption list as it is. `shadow` is still
   not a pair; it is a tint whose value now has a format guarantee. `scrollbar`
   stays reserved, but a malformed reserved role is still a malformed role and
   is reported.

Rejected alternatives:

- **Parse every CSS colour in `alpha`** — a real parser (`csscolorparser` is a
  Rust crate; the JS equivalents are new dependencies) for a package whose
  selling point is zero runtime dependencies, and `contrastRatio`/
  `compositeOver` would still be hex-only, so the contract would stay partial.
- **Fold the format check into `themeMetricFailures`** — that checker is the
  numeric half; `shadow` is a string, and `MetricFailure.actual` is a number.
- **Fold it into `themeContrastFailures`** — `ContrastFailure` is a pair with a
  ratio; a tint has no pair and no WCAG ratio. Reusing the shape would make the
  public type lie.
- **Delete the "tests restrict roles to hex" sentence** — the convention is
  load-bearing (every helper depends on it) and a copied theme needs to know
  when it breaks it. Naming the check is the honest fix.
- **Silently normalise a named tint in `elevationShadow`** — guessing a
  replacement colour is exactly the class of silent repair this package refuses.

No shipped theme, platform variant or recipe carries a non-hex role (a probe of
all 24 sets returns none), so this plan moves **no token value, colour, pair or
floor** and changes no rendered pixel.

## 3. Exact edits

### 3.1 `packages/tokens/src/color.ts` — the predicate

`hexColor` is private at line ~590. Add below it:

```ts
/**
 * True when `value` is a `#RRGGBB` or `#RRGGBBAA` colour — the only form
 * {@link alpha}, {@link compositeOver} and {@link contrastRatio} parse. GPUix
 * itself accepts every CSS form, so a named or functional colour is paintable
 * but invisible to the token maths; use this at a boundary that receives a role
 * from storage, a URL or a payload.
 *
 * @example
 * ```ts
 * isHexColor("#191D25"); // true
 * isHexColor("#7567F23D"); // true
 * isHexColor("rebeccapurple"); // false
 * ```
 */
export const isHexColor = (value: string): boolean => hexColor.test(value);
```

`hexColor` is already `^#([0-9A-Fa-f]{6})(?:[0-9A-Fa-f]{2})?$`, so it accepts
exactly the two forms and nothing else. Do not change `alpha`: replacing an
eight-digit alpha is its documented behaviour and plan 077's fallback stays.

### 3.2 `packages/tokens/src/contrast.ts` — the checker

Change the colour import at the top:

```ts
import { colorRoles, isHexColor, type ThemeColors } from "./color.js";
```

Add beside `ContrastFailure` (after the `contrastFloors` block, before
`contrastRatio` — the public types then read together):

```ts
/** A colour role whose value the token helpers cannot parse. */
export interface ColorFailure {
  /** The role, named the way the catalogue names it. */
  readonly role: keyof ThemeColors;
  /** The value the theme carried. */
  readonly value: string;
}

/**
 * Every colour role whose value is not a six- or eight-digit hex colour.
 *
 * The theme's maths — {@link contrastRatio}, {@link compositeOver} and
 * {@link alpha} — parse only that form. A role in another CSS form is painted
 * by the runtime but invisible to the helpers; for a measured role the contrast
 * check then reports `NaN`, but the two tint roles have no pair: a `shadow` of
 * `"black"` makes every elevation level fully opaque because `alpha` returns an
 * unparseable tint unchanged, and no other check sees it.
 *
 * @example
 * ```ts
 * const tinted = extendTheme(getTheme("light"), {
 *   colors: { shadow: "black" },
 * });
 *
 * themeColorFailures(tinted); // [{ role: "shadow", value: "black" }]
 * ```
 */
export function themeColorFailures(
  theme: Theme,
): ReadonlyArray<ColorFailure> {
  return colorRoles.flatMap((role) => {
    const value = theme.colors[role];
    return isHexColor(value) ? [] : [{ role, value }];
  });
}
```

Update the module JSDoc's opening sentence from "The accessibility contract" to
mention the format half, e.g.:

> The accessibility contract, as data and total functions: the colour roles are
> held to the hex form the helpers parse, the pairs to their floors, and the
> numeric contract lives in `metrics.ts`.

### 3.3 New `packages/tokens/src/color-format.test.ts`

Header states the guarded bug: `shadow` is exempt from the pair contract, plan
085 applies its alpha through `alpha()`, and `alpha` returns an unparseable tint
unchanged — so a copied theme with a valid CSS colour paints an opaque shadow at
every level while `themeContrastFailures` and `themeMetricFailures` both return
`[]`; `docs/design-system.md` claimed "tests restrict roles to hex" and nothing
did.

Build the shipped list locally (no helper exists):

```ts
const shippedThemes = (): ReadonlyArray<Theme> => [
  ...themeModes.flatMap((mode) => [getTheme(mode), getTheme(mode, "high")]),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) =>
      themeModes.flatMap((mode) => [
        getPlatformTheme(platform, mode),
        getPlatformTheme(platform, mode, "high"),
      ]),
    ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.flatMap((mode) => [
      getPlatformRecipeTheme(recipe, mode),
      getPlatformRecipeTheme(recipe, mode, "high"),
    ]),
  ),
];
```

Cases:

1. `isHexColor` accepts `#191D25`, `#7567F23D` and lowercase `#191d25`; rejects
   `#FFF`, `#191D25FF00`, `"black"`, `"rebeccapurple"`, `"rgb(0 0 0)"`, `""`
   and `"#GG0000"`.
2. Every one of the 24 shipped themes returns `[]`; each role in `colorRoles`
   passes `isHexColor`. The count is asserted as `24` so a new platform/recipe
   cannot silently join without a format check.
3. The regression: `shadow: "black"` reports exactly
   `[{ role: "shadow", value: "black" }]`, **and** both existing checkers still
   return `[]`, **and** `elevationShadow(tinted, "lg")?.color === "black"` —
   the authored 0.16 alpha is ignored. This is the case that fails before the
   fix (the import is missing) and documents the measured consequence.
4. A three-digit `#000` — accepted by GPUix's parser — is reported for the same
   reason. A comment cites `references/gpuix` `packages/native/src/color.rs`'s
   `parse_color_rgba` and its `#f00f`/`rebeccapurple` cases.
5. A functional colour `rgb(0 0 0)` is reported.
6. The fixed value: `shadow: "#000000"` returns `[]` and resolves the three
   levels to `#00000014`, `#0000001F` and `#00000029` — the shipped 0.08/0.12/
   0.16 alphas — while an authored eight-digit `#00000080` resolves to the same
   three colours, because `alpha` replaces the byte.
7. A malformed measured role (`primary: "rebeccapurple"`) is named by the new
   check **and** still fails the contrast check with at least one `NaN` ratio.
   This records the difference: the new check is the precise diagnostic, not the
   only guard, for a role that is measured.
8. Every role is checked once: extend a theme with a non-hex value for `shadow`
   and `scrollbar` and assert the failures are exactly those two roles in
   `colorRoles` order; the reserved role is not exempt from being a colour.

### 3.4 `packages/tokens/src/docs.test.ts`

Add a `describe("docs/tokens.md colour format contract")` (or extend the
existing contract describe) with cases that read the page:

- `themeColorFailures`, `isHexColor` and `ColorFailure` are named.
- the page states the form ("six- or eight-digit hex") and the shadow
  consequence ("fully opaque" / the `"black"` example).
- the design-system source names `themeColorFailures` and no longer claims the
  tests restrict roles to hex without naming the check.

Update the file header with a plan 371 paragraph in the established voice.

### 3.5 `docs/tokens.md`

- The big import block at the top: add `isHexColor`, `themeColorFailures` and
  `type ColorFailure`.
- `## Types`: add the `ColorFailure` row in alphabetical order:
  `| \`ColorFailure\` | A colour role whose value is not a hex colour the token helpers parse. |`
- New `#### Colour format` subsection after `#### Numeric metrics`:
  - the three checks are format, contrast and numbers;
  - `isHexColor` and its snippet;
  - `themeColorFailures` and its `shadow: "black"` snippet with the measured
    result (both other checkers `[]`, every level opaque);
  - why the convention is hex (the helpers, zero dependencies) and that GPUix
    itself accepts more, so the package's contract is stricter than the runtime;
  - the shipped 24 sets pass, so the check moves no value.
- `## Verification`: one paragraph that the format check is part of the suite
  and names the two exempt roles it covers.
- `## Limitations and future work`: replace the "no runtime schema" line's
  implied trust with a pointer to `themeColorFailures` for the format half (the
  schema is still the application's).

### 3.6 `docs/design-system.md`

- §9 Accessibility, after the `themeMetricFailures` paragraph: a short paragraph
  on the format half — `themeColorFailures` holds every role to the six- or
  eight-digit hex form the helpers parse; the `shadow` evidence; the 24 shipped
  sets pass.
- §9's closing verification list: mention all three checks.
- §10 table row: replace *"a typo paints the previous/black value; tests restrict
  roles to hex"* with *"a role outside the six- or eight-digit hex form the
  helpers parse is reported by `themeColorFailures`; the runtime would paint it
  while the token maths cannot"*.
- §11 Extension: after "Verify an edited theme with
  `themeContrastFailures(theme)`", add the two sibling checks in one sentence.

### 3.7 `packages/tokens/README.md`

In "Checking a theme", add the third call and a two-sentence paragraph:

```ts
import { themeColorFailures } from "@gpuixui/tokens";

themeColorFailures(brandTheme); // [] when every role is a hex colour
```

State the `shadow: "black"` consequence. Check `readme.test.ts` for a
must-not-regress claim about the two checks; if it enumerates them, add the
third there.

### 3.8 `COMPONENTS.md` — a **Theme colour check** row

Add one row to the Design system table after **Theme contrast check**:

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Theme colour check | done | yes (values in a `Theme`) | `themeColorFailures(theme)` walks all 66 `colorRoles` and reports a role whose value is not a six- or eight-digit hex colour — the only form `alpha`, `compositeOver` and `contrastRatio` parse. Measured roles are caught by the contrast check as `NaN`; the tint role is not a pair, so a `shadow` of `"black"` made every elevation level fully opaque while both other checkers returned `[]`. `isHexColor` is the predicate for a single stored value. Every shipped theme, platform variant and recipe passes, so no colour moves. Docs in `docs/tokens.md`. |

Add a case to `inventory.test.ts`'s design-system describe:

```ts
it("states the colour-format check beside the other two", () => {
  const colour = row("Theme colour check");
  expect(colour).toContain("themeColorFailures(theme)");
  expect(colour).toContain(`${colorRoles.length} \`colorRoles\``);
});
```

### 3.9 `TODO.md` and `.agents/slop/plans/README.md`

- Add one ticked TODO row in the tokens list and move the progress count
  (`138/188` → `139/189`).
- Add the plan row (`371`) after `370` and a closing paragraph in the same
  voice: the two exempt roles, the `shadow` defect, the predicate and the
  checker, and that no value moves.

## 4. Test plan and both directions

The new file is a regression guard, so prove it can fail. Because
`themeColorFailures` does not exist before the fix, revert `contrast.ts` (which
also removes the export the test imports) and run the file:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- packages/tokens/src/contrast.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/color-format.test.ts)
# EXPECT: the file fails — `themeColorFailures` is not exported. Cases 1 and 2
# still pass against `isHexColor` if it is already in place, which documents the
# predicate half.
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/color-format.test.ts)
# EXPECT: every case passes.
```

`scripts/verify-two-directions.sh` is jj-based and does not run in this
git-only worktree (PLAN.md D1); the explicit stash/pop above is the equivalent
proof. Record both command outputs in the commit message.

Then the gate, from the workspace root:

```sh
nub run --filter @gpuixui/tokens test   # EXPECT: all files pass, +1 file
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: `check:tests` accepts every case (each asserts a real fact); `tsc`
clean; oxfmt/oxlint clean; the full suite green.

## 5. STOP conditions

Stop and report, do not improvise, if:

- any shipped theme, platform variant or recipe reports a colour failure — the
  probe over all 24 sets is empty, and this plan moves no token value;
- a measured role that is non-hex does **not** also fail the contrast check —
  that would mean the contrast maths changed, which this plan does not authorise;
- the docs guards (`docs.test.ts`, `public-types.test.ts`,
  `readme.test.ts`, `snippets.test.ts`) reject the new sentences — adjust the
  wording to the guard, never the guard to the wording;
- the change appears to need a colour parser, a dependency, a new metric rule or
  a schema — it is two functions, one type and four documents;
- a case passes on the pre-fix `contrast.ts` where §4 says it must fail.

## 6. Acceptance criteria

- `isHexColor` accepts exactly `#RRGGBB` and `#RRGGBBAA`, and is documented.
- `themeColorFailures(theme)` returns `{ role, value }` for every role outside
  that form, in `colorRoles` order, and `[]` for all 24 shipped sets.
- `shadow: "black"` is reported, both other checkers still return `[]`, and
  `elevationShadow` paints the unchanged opaque tint — the regression the plan
  guards is stated by a test that fails without the fix.
- `shadow: "#000000"` and `shadow: "#00000080"` both apply each level's alpha
  (`#00000014` / `#0000001F` / `#00000029`).
- `docs/tokens.md`, `docs/design-system.md`, the package README, `COMPONENTS.md`
  and `TODO.md` state the format check; the ledger row is guarded.
- No path outside `packages/tokens`, `docs/tokens.md`, `docs/design-system.md`,
  `COMPONENTS.md`, `TODO.md` and `.agents/slop/plans/` is touched.

## 7. Cross-team

None required. The two exports are additive. Consumers should call the third
check beside the two they already call; that is a documentation follow-up in
`apps/docs`' Theming page, which belongs to the `docs-site` workstream and is
recorded as a TODO row rather than edited here.
