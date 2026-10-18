# 540 — The alpha form of a colour role

| Field | Value |
| ----- | ----- |
| Phase | F (contract completeness) |
| Owner | `tokens-theme` — `packages/tokens`, `docs/tokens.md`, `docs/design-system.md` |
| Depends on | 371 (the colour-format check), 383 (the total check), 398 (the check index), 505 (the measured shadow), 508/509 (the scrim contract) |
| Status | done |

The guarantee is "one call, every defect", and every check is total over its own
domain. One domain is missing: the **alpha channel** of a role, as opposed to the
hex form of its bytes. Two shipped-relevant edits are accepted today and paint
something other than what the theme author wrote:

- `shadow: "#00000080"` — an elevation tint at 50%. `elevationShadow` composes
  each level with `alpha(theme.colors.shadow, levelAlpha)`, and `alpha` **replaces**
  the fourth byte, so the authored 0.5 is discarded and the level paints at its
  own 0.08/0.12/0.16. `themeFailures` returns `[]`.
- `overlay: "#000000"` — a **solid** modal scrim. The role is documented as
  translucent "because the surfaces beneath it must stay recognisable"; a solid
  value hides the window instead of veiling it. `themeFailures` returns `[]`.

The same asymmetry holds for the other two veils, `selection` and
`selectionOnFill`: a six-digit value is a solid block, and an eight-digit value
whose byte is `00` or `FF` is not a veil either. The two solid cases happen to
fail the contrast check today (a solid wash erases the text under it), but they
fail as *contrast* defects with 104 and 9 unrelated pair failures — and a palette
whose solid wash still reads would pass outright. The tint fails nothing at all.

This plan adds the missing half: an **opacity form** check. No colour value, pair,
floor or metric moves; the guarantee grows from six checks to seven and the
documents derive the count from `themeChecks`.

## 1. Evidence

### 1.1 The probe (pinned on this branch, 128 files / 5588 tests green)

| Edit | `themeColorFailures` | `themeContrastFailures` | `themeFailures` |
| ---- | -------------------- | ----------------------- | --------------- |
| `extendTheme(light, { colors: { shadow: "#191D2580" } })` | `[]` | `[]` | `[]` |
| `extendTheme(light, { colors: { overlay: "#000000" } })` | `[]` | `[]` | `[]` |
| `extendTheme(light, { colors: { selection: "#5F4BDB" } })` | `[]` | 104 failures | 104 `contrast` |
| `extendTheme(light, { colors: { selectionOnFill: "#808080" } })` | `[]` | 9 failures | 9 `contrast` |

The tint is the silent one; the scrim is silent and *documented* as translucent;
the two veils are caught only because their solid colour happens to erase the
text pair measured through them.

### 1.2 Why the tint is discarded, not measured

`packages/tokens/src/elevation.ts:64-65`:

```ts
const { alpha: opacity, ...geometry } = shape;
return { ...geometry, color: alpha(theme.colors.shadow, opacity) };
```

`alpha()` (`packages/tokens/src/color.ts:730-741`) writes the requested byte and
**replaces** any existing one. So for the light `md` level
(`{ offsetY: 4, blurRadius: 12, spreadRadius: -2, alpha: 0.12 }`) a
`shadow: "#191D2580"` paints `#191D251F` — 12%, not 50% and not 6%. The probe
returns exactly the shipped shape's colour:

```
elevationShadow({ …light, colors: { shadow: "#191D2580" } }, "md")
// { offsetX: 0, offsetY: 4, blurRadius: 12, spreadRadius: -2, color: "#191D251F" }
```

`themeColorFailures` deliberately accepts six- **or** eight-digit hex
(plan 371), so the authored byte passes the format check and is then lost. That
is the plan-371 failure mode one channel over: a value the author wrote that the
paint silently does not use.

### 1.3 What the roles promise

- `ThemeColors.shadow` — "**Opaque** elevation tint; each level applies its own
  alpha." (`color.ts:265`)
- `ThemeColors.selection` — "Text selection wash … **Translucent**, so text stays
  legible." (`color.ts:219`)
- `ThemeColors.overlay` — "Modal scrim. **Translucent**, because the surfaces
  beneath it must stay recognisable." (`color.ts:226-235`)
- `ThemeColors.selectionOnFill` — "a neutral 15% veil" (`color.ts:221-225`,
  plan 504); `selectionFillWashPairs` composites it, so a six-digit value is
  measured as a solid block.

### 1.4 Every shipped set already has the form

`grep` over `color.ts` and `platform-styles/**`:

- every role except `selection`, `overlay` and `selectionOnFill` is `#RRGGBB`;
- those three are `#RRGGBBAA` with a byte strictly between `0x01` and `0xFE`
  (`selection` 0x24–0x55, `overlay` 0x26–0xD0, `selectionOnFill` 0x26).

So the check moves no value in any of the 24 shipped sets, and the recipes
inherit their platform's colours.

## 2. Design decisions

1. **A seventh check, not a broader colour check.** `themeColorFailures` owns
   "the bytes are the form the maths parses"; this one owns "the channel is the
   form the role is painted in". Two causes, two diagnostics, and the diagnostic
   order names the format first. Folding it in would make `ColorFailure`'s
   meaning ambiguous and change a published payload.
2. **A new module, `opacity.ts`.** It follows `typeface.ts` and `direction.ts`:
   a check module owns its rules, its index and the shapes it returns. The three
   veils are the index; every other role is the complement, so a 71st role is
   governed the moment it ships with no list to update.
3. **`roleForm(role)` is total and names the contract.** It returns
   `"opaque" | "translucent"` for every role; a boolean guard would conflate
   "opaque" with "not a role". `translucentRoles` is the one list, so a fifth
   veil is one edit.
4. **Silent when the hex parser cannot read the value.** `themeColorFailures`
   already names `shadow: "black"`; one cause, one diagnostic, matching the
   `finite`/ladder convention in `metrics.ts` (plan 532).
5. **`00` and `FF` are not a veil.** A fully transparent wash paints nothing (the
   wash surface pairs already catch it) and a fully opaque one is a solid block.
   The rule is the *form*, so an alpha byte must be strictly between the two.
6. **Level-independent.** Like `themeMetricFailures`, the form does not change at
   `high` contrast; `themeFailures` does not pass its `contrast` argument here.
7. **Two stale claims in the same area land with it**, because they are the same
   story and no guard sees them:
   - `docs/tokens.md:2002` calls the colour-format check "the third check";
   - `packages/tokens/README.md:829` says the composition suites hold their
     results to `themeContrastFailures`, `themeMetricFailures` and
     `themeColorFailures`, while they have asked `themeFailures` since plan 398.

## 3. Exact changes

### 3.1 `packages/tokens/src/opacity.ts` (new)

```ts
import { colorRoles, isHexColor, type ThemeColors } from "./color.js";
import type { Theme } from "./theme.js";

/** The alpha form a colour role's value must take. */
export type ColorForm = "opaque" | "translucent";

/**
 * The roles the runtime composites. A wash is painted over content, so it needs
 * an alpha channel; every other role is opaque, and the elevation tint is the
 * opposite case — `alpha(theme.colors.shadow, levelAlpha)` replaces its fourth
 * byte, so a tint written at 50% paints at the level's own 8/12/16%.
 */
export const translucentRoles = [
  "selection",
  "overlay",
  "selectionOnFill",
] as const;

/** A role from {@link translucentRoles}. */
export type TranslucentRole = (typeof translucentRoles)[number];

/**
 * The form a colour role's value must take. Total over `colorRoles`: the three
 * veils are translucent, everything else is opaque.
 */
export const roleForm = (role: keyof ThemeColors): ColorForm =>
  translucentRoles.some((translucent) => translucent === role)
    ? "translucent"
    : "opaque";

/** A colour role whose alpha channel is not the form it is painted in. */
export interface OpacityFailure {
  /** The role, named the way the catalogue names it. */
  readonly role: keyof ThemeColors;
  /** The value the theme carried. */
  readonly value: string;
  /** The form the role must take. */
  readonly expected: ColorForm;
}

/** The alpha byte of an eight-digit colour, or `undefined` for six digits. */
const alphaByte = (value: string): number | undefined => {
  const bytes = value.slice(7);
  return bytes.length === 2 ? Number.parseInt(bytes, 16) : undefined;
};

/**
 * Every colour role whose alpha channel does not match the form it is painted
 * in — the alpha half of the editable-theme guarantee.
 *
 * `themeColorFailures` accepts six- and eight-digit hex because the token maths
 * parses both; this check asks which of the two the role needs. The three veils
 * (`selection`, `overlay`, `selectionOnFill`) composite over content, so they
 * need an alpha byte strictly between `00` and `FF`; every other role is opaque,
 * so a partial alpha is a value the paint will not use — `elevationShadow`
 * replaces the tint's byte with the level's own. A value the hex parser cannot
 * read is `themeColorFailures`' diagnostic and is skipped here, and a failing
 * role is reported with the form it needed.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeOpacityFailures } from "@gpuixui/tokens";
 *
 * const tinted = extendTheme(getTheme("light"), {
 *   colors: { shadow: "#191D2580" },
 * });
 *
 * themeOpacityFailures(tinted);
 * // [{ role: "shadow", value: "#191D2580", expected: "opaque" }]
 * ```
 */
export function themeOpacityFailures(
  theme: Theme,
): ReadonlyArray<OpacityFailure> {
  return colorRoles.flatMap((role) => {
    const value = theme.colors[role];
    if (!isHexColor(value)) {
      return [];
    }
    const byte = alphaByte(value);
    const expected = roleForm(role);
    const holds =
      expected === "translucent"
        ? byte !== undefined && byte > 0x00 && byte < 0xff
        : byte === undefined || byte === 0xff;
    return holds ? [] : [{ role, value, expected }];
  });
}
```

`alphaByte` reads the last two characters rather than owning a second regex:
`isHexColor` has already proved the value is `#RRGGBB` or `#RRGGBBAA`.

### 3.2 `packages/tokens/src/index.ts`

One line, alphabetically after `motion.js`:

```ts
export * from "./opacity.js";
```

### 3.3 `packages/tokens/src/theme-check.ts`

1. Import the check and its failure type.

   ```ts
   import { themeOpacityFailures, type OpacityFailure } from "./opacity.js";
   ```

2. The index gains the kind between the two format checks:

   ```ts
   export const themeChecks = [
     "color",
     "opacity",
     "typeface",
     "contrast",
     "hierarchy",
     "direction",
     "metric",
   ] as const;
   ```

3. `FailurePayload` gains `readonly opacity: OpacityFailure;`.

4. The composed list gains the check after `themeColorFailures` and before
   `themeTypefaceFailures`:

   ```ts
   ...themeOpacityFailures(theme).map(
     (failure): ThemeFailure => ({ kind: "opacity", ...failure }),
   ),
   ```

5. JSDoc: `ThemeFailure`'s sentence names the new kind ("`opacity` is an alpha
   channel the role is not painted with"); `themeFailures`' paragraph says "the
   three format checks first — `color`, `opacity`, then `typeface`" and its
   example lists a tint whose alpha is discarded beside the malformed one. Keep
   "the level the theme declares" sentence; state that opacity and metrics are
   level-independent.

### 3.4 `packages/tokens/src/theme-check.example.ts`

`brokenTheme` gains one defect from the new class and the JSDoc names it:

```ts
export const brokenTheme = extendTheme(getTheme("light"), {
  name: "Broken",
  colors: {
    shadow: "black",
    overlay: "#000000",
    mutedForeground: getTheme("light").colors.background,
    primary: "#1E1060",
    primaryHover: "#2A1A7A",
    primaryActive: "#372394",
  },
  typography: { sans: "Inter, system-ui, sans-serif" },
  borderWidth: { strong: 0 },
});
```

The doc comment above it gains "a scrim painted solid" and the comment above
`brokenFailures` reads "colour → opacity → typeface → contrast → hierarchy →
direction → metric order".

### 3.5 `packages/tokens/src/theme-check.test.ts`

1. Import `themeOpacityFailures` from `./index.js`.
2. The composed-count case adds `themeOpacityFailures(brokenTheme).length`.
3. The ordering case adds `firstOpacity`/`lastOpacity` and asserts
   `lastColor < firstOpacity < lastTypeface` (replacing the direct
   `lastColor < firstTypeface` comparison).
4. The payload case gains:

   ```ts
   expect(brokenFailures).toContainEqual({
     kind: "opacity",
     role: "overlay",
     value: "#000000",
     expected: "translucent",
   });
   ```

5. A new case, placed beside "catches a format-only defect":

   ```ts
   it("catches an opacity-only defect the contrast check alone passes", () => {
     const tinted = extendTheme(getTheme("light"), {
       colors: { shadow: "#191D2580" },
     });
     const scrimmed = extendTheme(getTheme("light"), {
       colors: { overlay: "#000000" },
     });

     expect(themeContrastFailures(tinted)).toEqual([]);
     expect(kinds(themeFailures(tinted))).toEqual(["opacity"]);
     expect(themeContrastFailures(scrimmed)).toEqual([]);
     expect(kinds(themeFailures(scrimmed))).toEqual(["opacity"]);
   });
   ```

6. Header comment: a new paragraph after the plan-502 one — "Plan 540 adds the
   seventh: a role whose alpha channel is not the form it is painted in. Neither
   a translucent elevation tint nor a solid scrim changes a single contrast pair,
   so the check is the only one that sees them." Also correct "indexes the five
   kinds" in the plan-398 paragraph to "the kinds".

### 3.6 `packages/tokens/src/opacity.test.ts` (new)

Header states the bug: `shadow: "#191D2580"` and `overlay: "#000000"` both
returned `[]` from `themeFailures`, while `elevationShadow` replaced the authored
50% with the level's 12% and a solid scrim hid the window the role exists to keep
recognisable.

Cases:

1. `passes every shipped set` — `shippedThemes.forEach`: `themeOpacityFailures`
   is `[]`.
2. `every veil ships the form it needs` — for each `translucentRole` and every
   shipped set, the value matches `/^#[0-9A-F]{6}(?!00|FF)[0-9A-F]{2}$/i` and
   `roleForm(role)` is `"translucent"` (derived guard; fails if a veil is ever
   authored solid).
3. `reports a translucent elevation tint` — the light edit, exact payload, and
   `themeFailures` contains `{ kind: "opacity", … }` while
   `themeContrastFailures` is `[]`. **This is the regression case**; it fails on
   the code before this plan with `themeFailures` returning `[]`.
4. `reports a solid scrim` — `overlay: "#000000"` (expected `translucent`) and
   `overlay: "#000000FF"` (a byte that is not a veil).
5. `reports a solid or invisible veil` — `selection: "#5F4BDB"`,
   `selection: "#5F4BDB00"`, `selectionOnFill: "#808080"`; each reports
   `selection`/`selectionOnFill` with `expected: "translucent"`.
6. `accepts a fully opaque byte on an opaque role` — `primary: "#5F4BDBFF"`
   reports nothing, because the role paints solid either way (the byte is
   redundant, not wrong).
7. `leaves a value the format check owns` — `scrollbar: "rebeccapurple"` and
   `shadow: "black"` each give `themeOpacityFailures` `[]` while
   `themeColorFailures` names the role (one cause, one diagnostic).
8. `measures the discarded tint` — `elevationShadow(edit, "md")` equals
   `elevationShadow(lightTheme, "md")` for the `#191D2580` edit: the painted
   colour is the level's alpha over the tint's RGB, with the authored byte gone.
   This records *why* the form is a rule and not a preference.
9. `is in the total check, in index order` — `themeFailures(...)` kinds for the
   tint are `["opacity"]`, and the index has `opacity` directly after `color`.

### 3.7 `packages/tokens/src/readme.test.ts` and `docs.test.ts`

- `readme.test.ts`: `countWords` gains `"seven"` before the lookup; add a case
  that the composition paragraph names `themeFailures` and that the page no
  longer lists `themeContrastFailures`, `themeMetricFailures` **and**
  `themeColorFailures` as what the suites hold their result to:

  ```ts
  it("names the one check the composition suites run", () => {
    expect(readme).toContain(
      "holds each result to `themeFailures`",
    );
    expect(readme).not.toContain(
      "to `themeContrastFailures`, `themeMetricFailures` and `themeColorFailures`",
    );
  });
  ```

- `docs.test.ts`: `checkNames` gains `opacity: "role opacity"`; `countWords`
  gains `"seven"`. The `colour format contract` describe gains a sibling guard:

  ```ts
  describe("docs/tokens.md opacity contract", () => {
    it("names the check, the failure type and the index", () => {
      ["themeOpacityFailures", "OpacityFailure", "translucentRoles", "roleForm"].forEach(
        (name) => expect(markdown).toContain(name),
      );
    });

    it("states the three veils and the tint consequence", () => {
      ["`selection`", "`overlay`", "`selectionOnFill`"].forEach((role) =>
        expect(markdownProse).toContain(role),
      );
      expect(markdownProse).toContain("replaces");
      expect(markdownProse).toContain("`shadow`");
    });
  });
  ```

### 3.8 `docs/tokens.md`

1. **Types table** — add, in alphabetical order:

   | Type | Purpose |
   | ---- | ------- |
   | `ColorForm` | The alpha form a colour role's value must take: `"opaque"` or `"translucent"`. |
   | `OpacityFailure` | A colour role whose alpha channel is not the form it is painted in. |
   | `TranslucentRole` | A role from `translucentRoles`, the three the runtime composites. |

   And extend the `ThemeFailure` row's tag list:
   "tagged `color`, `opacity`, `typeface`, `contrast`, `hierarchy`, `direction` or `metric`".

2. **The guarantee sentence** (`docs/tokens.md:1675-1678`): becomes

   ```
   The guarantee is seven checks — colour format, role opacity, typeface form,
   contrast, text hierarchy, interaction direction and numeric metrics — and
   [`themeFailures`](#one-check) runs all seven in one call; the sections below
   explain each one it composes.
   ```

3. **`#### Colour format`** — replace the opening of the closing paragraph
   "This is the third check in the editable-theme guarantee." with "This is the
   format half of the editable-theme guarantee, and the opacity half follows."
   (no ordinal to drift).

4. **A new `#### Role opacity` section** directly after `#### Colour format`
   and before `#### Typeface`, containing: the two-way rule; a table of the three
   veils and why (`selection` highlights glyphs, `overlay` veils the window,
   `selectionOnFill` veils content on an opaque fill); the tint consequence with
   the measured `#191D251F`; the `00`/`FF` rule; the non-hex silence; the failure
   shape; every shipped set passes; and two fenced examples — one for
   `themeOpacityFailures` and one for `roleForm`/`translucentRoles`. The prose must
   contain the guard strings from §3.7. Link the executed example
   `../packages/tokens/src/opacity.example.ts`.

5. **`#### One check`** — the composition list becomes "the three format checks
   first — `color`, `opacity`, then `typeface`", the example's comment lists
   `{ kind: "color" }`, `{ kind: "opacity" }`, … and the failure payload list
   gains `OpacityFailure`. The paragraph "Running one of the seven checks is not
   the guarantee" gains "a translucent `shadow` tint whose byte `elevationShadow`
   replaces, or a solid `overlay` scrim" to its examples.

6. **Elevation section** (the paragraph naming `colors.shadow`, near
   `docs/tokens.md:1069-1090`): one clause — "the tint is opaque: the level's own
   alpha replaces its fourth byte, so an eight-digit tint is reported by
   `themeOpacityFailures` rather than silently repainted."

### 3.9 `docs/design-system.md`

1. The **format** paragraph (`~:721`) gains the opacity half:

   ```
   The form is two-sided. `themeOpacityFailures` asks for the alpha the role is
   painted with: the three veils — `selection`, `overlay` and `selectionOnFill` —
   composite over content, so each needs a byte strictly between `00` and `FF`,
   and every other role is opaque. `shadow` is the opposite case: each level's
   alpha replaces the tint's fourth byte, so an eight-digit tint is a value the
   paint discards, and a solid `overlay` hides the window the scrim exists to
   keep recognisable. `roleForm` is the rule and `translucentRoles` the index;
   all 24 shipped sets carry the form they need.
   ```

2. The **`themeFailures`** paragraph (`~:845`) — "it composes the colour format,
   typeface form, contrast, hierarchy, direction and metrics" gains "role
   opacity" after colour, and its list of the checks available on their own
   (`:854`) gains `themeOpacityFailures`.

3. §10's runtime-constraints row for invalid colour strings gains a clause: "the
   channel is the other half — `themeOpacityFailures` reports a veil without an
   alpha byte and an opaque role with one".

### 3.10 `packages/tokens/README.md`

- `~:295` — "That is one of seven checks"; "composes all seven".
- `~:305-306` — the order list becomes `color`, `opacity`, `typeface`,
  `contrast`, `hierarchy`, `direction`, `metric`; the payload list gains
  `OpacityFailure`.
- After the `themeColorFailures` paragraph (`~:345-358`) add one paragraph
  naming `themeOpacityFailures`, the three veils, the discarded tint byte and
  `roleForm`/`translucentRoles`, with a fenced example.
- `~:829` — replace "holds each result to `themeContrastFailures`,
  `themeMetricFailures` and `themeColorFailures` (plan 374)" with "holds each
  result to `themeFailures` (plans 374 and 398)".

### 3.11 `COMPONENTS.md`

- Add a `Theme opacity check` row after `Theme colour check`:

  ```
  | Theme opacity check | done | yes (values in a `Theme`) | `themeOpacityFailures(theme)` asks for the alpha the role is painted with: the three veils (`selection`, `overlay`, `selectionOnFill`, the `translucentRoles` index) need a byte strictly between `00` and `FF`, and every other role is opaque — `roleForm` is the rule. A translucent elevation tint is the case that matters: `themeColorFailures` accepts six- or eight-digit hex, and `elevationShadow` replaces the tint's fourth byte with the level's own, so `shadow: "#191D2580"` painted at 12% while every check returned `[]`; a solid `overlay` hides the window the scrim exists to keep recognisable. A value the parser cannot read stays the colour check's diagnostic. All 24 shipped sets pass, so no colour moves (plan 540). |
  ```

- `Theme colour check` row: one sentence — "An eight-digit tint is inside the
  format and outside the paint; `themeOpacityFailures` owns that half
  (plan 540)."

- `Total theme check` row: add `themeOpacityFailures` to the composed list, add
  `opacity` between `color` and `typeface` in the diagnostic order, and add
  `OpacityFailure` to the payload list.

### 3.12 `TODO.md`

- One ticked workstream row for this plan; the section bar moves one task up and
  one total up (currently `204/270`).
- No cross-team row: this is the package's own promise.

### 3.13 `.agents/slop/plans/README.md`

Add `540` to the `tokens-theme` table after `539` and one paragraph to the prose
that follows the table: what it closes, why it is a seventh check rather than a
broader sixth, and the two document corrections.

## 4. Exact commands

```sh
nub run --filter @gpuixui/tokens test            # expected: exit 0, 129 files
nub run --filter @gpuixui/tokens check-types     # expected: exit 0
nub run check:tests                              # expected: exit 0
nub run lint                                     # expected: exit 0
nub run check                                    # expected: exit 0
nub run test                                     # expected: exit 0
```

## 5. Test plan — prove both directions

1. Land `opacity.ts`, `index.ts`, `theme-check.ts`, the example and
   `opacity.test.ts` **without** the document edits. Run
   `nub run --filter @gpuixui/tokens test`. Expected: `opacity.test.ts` green;
   `docs.test.ts`/`readme.test.ts` fail on the missing names and the count;
   `theme-check.test.ts` green.
2. **Prove the regression case can fail.** Temporarily remove the
   `themeOpacityFailures` composition line from `themeFailures`. Run
   `opacity.test.ts`. Expected: case 3 fails with
   `themeFailures(...)` = `[]` (the pre-plan behaviour), and case 9 fails.
   Restore the line.
3. **Prove the rule is not a tautology.** Temporarily set the light
   `selectionOnFill` to `"#000000"` (six digits) in `color.ts`. Expected: case 1
   (`passes every shipped set`) fails on the identity light set and case 2 fails
   for `selectionOnFill`. Revert with `git checkout -- packages/tokens/src/color.ts`.
4. Temporarily change the `Role opacity` prose to claim four veils. Expected: the
   `opacity contract` guard passes (it checks names, not the count) but the
   guarantee-count guard in `docs.test.ts` fails if the word count drifts; and
   `theme-checks` guards fail if the index and the sentence disagree. Revert.
5. Run the full command set in §4. Expected: all exit 0.
6. `git status` shows only this plan's files.

## 6. STOP conditions

Stop and report if:

- a shipped theme's role form is not the one the rule expects (e.g. a platform
  style ships `selection` at six digits) — the palette needs a fix, not the
  check, and the plan's "no colour moves" claim is wrong;
- a *painted* composition requires an opaque veil or a translucent opaque role —
  then the role's documentation is wrong and the plan must change the docs, not
  the rule;
- the new kind would change `themeContrastFailures`, a pair list, a floor or any
  colour value — this plan adds a check and prose only;
- `alpha()`'s replace semantics change while implementing — the discarded-byte
  evidence is the plan's foundation;
- a guard in `docs.test.ts`/`readme.test.ts` turns out to derive the count from
  something other than `themeChecks.length` — then §3.7's edits are wrong and the
  executor must read the guard before editing;
- any command in §4 fails for a reason other than the new assertions.

## 7. Acceptance criteria

- `themeOpacityFailures`, `OpacityFailure`, `ColorForm`, `translucentRoles`,
  `TranslucentRole` and `roleForm` are exported from `@gpuixui/tokens` and named
  in `docs/tokens.md` (values and types indexes included).
- `themeFailures` returns seven kinds, `opacity` directly after `color`, and
  `themeChecks` is the owner of the count.
- `shadow: "#191D2580"` and `overlay: "#000000"` each return exactly one
  `opacity` failure while `themeContrastFailures` stays `[]`; every shipped set
  returns `[]`.
- `opacity.example.ts`/`opacity.test.ts` exist, the example runs in the suite and
  is linked from `docs/tokens.md`; the regression case is demonstrated failing
  without the composition line (§5.2).
- `docs/design-system.md`, `README.md`, `COMPONENTS.md` and `TODO.md` state the
  seventh check and derive the count; the stale "third check" ordinal and the
  stale three-function suite claim are gone.
- Every command in §4 passes.
