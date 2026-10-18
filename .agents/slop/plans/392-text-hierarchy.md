# Plan 392 — the text tiers must stay a hierarchy

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
057 (status text), 306 (the inactive state), 309 (the state fills), 317/319
(the placeholder and typed text), 351 (the floor table), 383 (the one total
check), 387 (the shipped-theme enumeration), 388 (the list migration), 391 (the
contrast reference).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

The design system documents a three-tier text hierarchy:

- `foreground` — body text (`docs/tokens.md`, role table: "default text");
- `mutedForeground` — "secondary text", which `docs/design-system.md` §8 and §9
  describe as the tier a caption sits in;
- `placeholder` — "a hint" (`docs/tokens.md`, role table), and
  `placeholder-surfaces.test.ts` states that it "keeps the hint dimmer than
  secondary text";
- `disabledForeground` — the unavailable label, which §8 describes as "a
  readable dim … while staying **well below secondary text**" and §9 as "keeping
  it **far below secondary text**".

The public contract enforces only **minimums**. Every role has a floor pair, and
a floor cannot see an inverted hierarchy: a role raised to body strength still
clears its own floor. Nothing in `themeColorFailures`, `themeContrastFailures`,
`themeMetricFailures`, `themeTypefaceFailures` or `themeFailures` compares one
text role with another. Measured on the built package (`dist`, 24 shipped sets):

```text
disabled = foreground      → themeFailures 0  contrast 0  metric 0
muted = foreground         → themeFailures 0  contrast 0  metric 0
placeholder = foreground   → themeFailures 0  contrast 0  metric 0
disabled = muted           → themeFailures 0  contrast 0  metric 0
```

So a consumer who copies a platform style and raises `disabledForeground` for
readability — a plausible edit, because 3:1 is the lowest floor in the system —
gets a theme where an unavailable control's label is **at least as readable as
an enabled one** and the package's one total call says the theme is good.

The rule survives today only as two assertions over the **shipped** themes, each
on a single surface pair and not public:

- `inactive-state.test.ts` — "keeps the inactive label dimmer than secondary
  text", comparing `disabledForeground` on `disabled` with `mutedForeground` on
  `muted` (two different surfaces);
- `placeholder-surfaces.test.ts` — "keeps the hint dimmer than secondary text on
  the quiet panel", on `muted` only.

That is the same shape of gap plans 342 and 357 closed for the filled families
and the generic wash: a state that is not perceivable is not a state, whether
the theme is shipped or edited. A tier that is not dimmer is not a tier.

## 2. Decision

Ship the hierarchy as a **fifth public check**, `themeTextTierFailures`, and
compose it into `themeFailures` as kind `"hierarchy"`.

1. **The tiers are data, derived from the contract.** `textTiers` is an ordered
   tuple list `[dimmer, brighter]`:
   `mutedForeground < foreground`, `disabledForeground < mutedForeground`,
   `placeholder < mutedForeground`. A fourth tier joins the list, not a new
   condition in the function.
2. **The surfaces are derived from `contrastPairs`.** For each tier, compare the
   two roles only on the surfaces where **both** already have a documented pair.
   No new hand-typed surface list: a surface that joins one role's pairs joins
   the comparison, and the check cannot name a surface the contract does not
   paint. This yields 29 comparisons today (12 + 12 + 5).
3. **The measure is the step floor.** The dimmer role must sit at least
   `contrastFloors[level].step` (1.05:1) below the brighter one **on the same
   surface** — the ratio of their ratios, not their mutual contrast. It is the
   same 1.05:1 the filled families and the wash ladder use for "a state must be
   a perceivable change", and it is the level the theme declares.
4. **A fifth kind, not a new pair class.** `ContrastFailure` reports a pair's
   ratio against its floor; a hierarchy failure reports two ratios and their
   step. Reusing `ContrastFailure` would have to lie about `foreground`/
   `background`, so the failure is its own type and `themeFailures` tags it
   `"hierarchy"`. `contrastFloors` gains no member, so the published floor table
   and `inventory.test.ts`'s `floorRow` are untouched.

Rejected alternatives, with reasons:

- **Fold it into `themeContrastFailures`.** Its shape is
  `{ foreground, background, pairClass, floor, ratio }`; a hierarchy failure has
  two ratios and a step and no single "floor" a pair clears. Reusing the type
  would make the published reference describe two different measurements with
  one vocabulary.
- **Add an `inactive` ceiling only.** Plan 357's audit found the same defect one
  state over and closed the whole ladder; the caption-vs-body and hint-vs-caption
  inversions are the same bug (`muted = foreground` and
  `placeholder = foreground` both return `[]` today), and a rule that covers
  only the bottom tier would leave two documented relationships unguarded.
- **Add a `ceiling` pair class.** `ContrastPairClass` is consumed by
  `contrastFloors`, the floor table in both documents, `inventory.test.ts` and
  the docs guard that requires a row per class. A maximum is not a floor class.
- **Compare the two roles' colours directly (`contrastRatio(dimmer, brighter)`).**
  That is a text-on-text ratio neither role paints; the hierarchy is about what
  the reader sees on a surface, so both ratios must be measured against it.
- **Enforce it on the shipped themes only (status quo).** The whole point of
  `themeFailures` is the edited theme; the shipped suite already proves the
  values and does not protect a consumer's copy.

## 3. Exact edits

### 3.1 `packages/tokens/src/contrast.ts`

Insert this block **after `contrastFloors`** (so both `contrastPairs` above it and
the floors are in scope) and **before `ColorFailure`**:

```ts
/**
 * The text tiers the library documents, each held a perceivable step below the
 * tier above it, as `[dimmer, brighter]`: body copy, then secondary text, then
 * the two roles below it — an unavailable label and a field's hint. A tier that
 * is only *at least* as readable as the one above it is not a tier; the reader
 * uses the difference to tell an enabled label from a disabled one and a caption
 * from a hint. This is the same 1.05:1 step the filled families and the wash
 * ladder publish, applied to the roles a reader compares side by side.
 */
export const textTiers = [
  ["mutedForeground", "foreground"],
  ["disabledForeground", "mutedForeground"],
  ["placeholder", "mutedForeground"],
] as const satisfies ReadonlyArray<
  readonly [keyof ThemeColors, keyof ThemeColors]
>;

/** A text tier that is not a perceivable step below the tier above it. */
export interface TextTierFailure {
  /** The dimmer role, which must measure below `brighter`. */
  readonly dimmer: keyof ThemeColors;
  /** The role above it in the hierarchy. */
  readonly brighter: keyof ThemeColors;
  /** The surface both are measured on. */
  readonly surface: keyof ThemeColors;
  /** The dimmer role's ratio on `surface`. */
  readonly dimmerRatio: number;
  /** The brighter role's ratio on `surface`. */
  readonly brighterRatio: number;
  /** The step the dimmer tier missed — `contrastFloors[level].step`. */
  readonly step: number;
}

/** The surfaces a role is documented on, in `contrastPairs` order, deduplicated. */
const textSurfaces = (
  role: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> =>
  contrastPairs
    .flatMap(([foreground, background]) =>
      foreground === role ? [background] : [],
    )
    .filter((surface, index, all) => all.indexOf(surface) === index);

/**
 * Every text tier that is not one step below the tier above it.
 *
 * The contrast check enforces minimums, so it cannot see an inverted hierarchy:
 * a `disabledForeground` raised to body strength, or a `mutedForeground` equal
 * to `foreground`, clears every floor while the reader can no longer tell the
 * tiers apart. This check compares the two roles **on the same surface**, where
 * both already have a documented pair, and reports the pair when the brighter
 * role's ratio is less than one `contrastFloors[level].step` above the dimmer
 * one's. The level defaults to the one the theme declares, like the other
 * checks.
 *
 * The surfaces come from `contrastPairs`, so a new surface joins the comparison
 * by joining a role's pairs, and the check never names a surface no pair paints.
 * A role whose value the token maths cannot parse reports `NaN` here as well as
 * in {@link themeColorFailures}.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeTextTierFailures } from "@gpuixui/tokens";
 *
 * const flattened = extendTheme(getTheme("light"), {
 *   colors: { disabledForeground: getTheme("light").colors.mutedForeground },
 * });
 *
 * themeTextTierFailures(flattened); // a failure per surface the tiers share
 * ```
 */
export function themeTextTierFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<TextTierFailure> {
  const step = contrastFloors[contrast].step;
  return textTiers.flatMap(([dimmer, brighter]) => {
    const brighterSurfaces = textSurfaces(brighter);
    return textSurfaces(dimmer).flatMap((surface) => {
      if (!brighterSurfaces.includes(surface)) {
        return [];
      }
      const dimmerRatio = contrastRatio(
        theme.colors[dimmer],
        theme.colors[surface],
      );
      const brighterRatio = contrastRatio(
        theme.colors[brighter],
        theme.colors[surface],
      );
      return brighterRatio / dimmerRatio >= step
        ? []
        : [
            {
              dimmer,
              brighter,
              surface,
              dimmerRatio,
              brighterRatio,
              step,
            },
          ];
    });
  });
}
```

`contrastRatio` is a function declaration below the block and is hoisted;
`textSurfaces` reads `contrastPairs` at call time, so there is no initialisation
order hazard. Do not move `contrastPairs`.

### 3.2 `packages/tokens/src/theme-check.ts`

- Import the new names:

```ts
import {
  themeColorFailures,
  themeContrastFailures,
  themeTextTierFailures,
  type ColorFailure,
  type ContrastFailure,
  type TextTierFailure,
} from "./contrast.js";
```

- Extend the union and the JSDoc:

```ts
/**
 * One defect in an edited theme, tagged with the check that found it. `color`
 * is a role outside the hex form the token maths parses, `typeface` is a family
 * name the runtime cannot resolve as written, `contrast` is a documented pair
 * below its floor, `hierarchy` is a text tier that is not a perceivable step
 * below the tier above it, and `metric` is a numeric invariant a component
 * relies on.
 */
export type ThemeFailure =
  | (ColorFailure & { readonly kind: "color" })
  | (TypefaceFailure & { readonly kind: "typeface" })
  | (ContrastFailure & { readonly kind: "contrast" })
  | (TextTierFailure & { readonly kind: "hierarchy" })
  | (MetricFailure & { readonly kind: "metric" });
```

- In `themeFailures`, insert the hierarchy pass after the contrast pass and
  before the metric pass:

```ts
    ...themeTextTierFailures(theme, contrast).map(
      (failure): ThemeFailure => ({ kind: "hierarchy", ...failure }),
    ),
```

- Rewrite the function's JSDoc paragraph: "the colour-format, typeface,
  contrast, text-hierarchy and metric checks all run", "this function composes
  the five in diagnostic order — format first … then contrast, then the text
  hierarchy, then metrics", and keep the executable example. Its output line
  stays a `color`, a `typeface` and a `metric` failure (the example's theme has
  no hierarchy defect).

### 3.3 `packages/tokens/src/theme-check.example.ts`

`brokenTheme` lowers `mutedForeground` to the canvas colour, which is *both* a
contrast defect and an inverted hierarchy (the tier below is now brighter than
it). The example therefore produces a `hierarchy` failure without a change, and
that is honest — it is a theme broken in every class. Update only the comment:

```ts
/** Every check reports through one call, in colour → typeface → contrast → hierarchy → metric order. */
```

Keep `brokenTheme` and `brandTheme` unchanged: `brandTheme` still passes, which
is the point of the pairing.

### 3.4 `packages/tokens/src/theme-check.test.ts`

- The header comment's "colour format, contrast and numeric metrics" sentence
  gains the hierarchy and a paragraph naming plan 392.
- "returns exactly the four checks' failures, tagged and grouped" becomes
  **five**: add `themeTextTierFailures(brokenTheme).length` to the sum, add
  `"hierarchy"` to the expected kind set, and add the ordering assertions
  `lastContrast < firstHierarchy` and `lastHierarchy < firstMetric`.
- The "runs the documented examples" case expects the five-kind set.
- Leave the three "catches a …-only defect the contrast check alone passes"
  cases as they are — they are still single-class themes.

### 3.5 New `packages/tokens/src/text-hierarchy.test.ts`

Header comment states the guarded bug:

> **The bug:** the design system documents a three-tier text hierarchy — an
> unavailable label and a field hint below secondary text, and secondary text
> below body copy — but every public check enforces only minimums. A theme that
> raised `disabledForeground` to body strength, or set `mutedForeground` equal
> to `foreground`, returned `[]` from `themeFailures` while a disabled control
> looked enabled and a caption looked like body copy. Two shipped-theme
> assertions covered one surface each; nothing held an edited theme.

Cases (import only through `./index.js`, like the other suites):

1. **Every shipped set keeps the hierarchy.** `shippedThemes.forEach(…)` →
   `themeTextTierFailures(theme)` is `[]`, labelled with `theme.name`.
2. **A raised inactive tier is reported by the one total call.** Build
   `extendTheme(getTheme("light"), { colors: { disabledForeground: lightColors.foreground } })`;
   assert `themeContrastFailures(theme)` is `[]` (the floors still pass — this is
   the sentence the plan exists for) and
   `themeFailures(theme).some(f => f.kind === "hierarchy")` is true. This case
   fails on the pre-fix tree by assertion, not by a missing import.
3. **Every tier in `textTiers` can fail.** Loop the list; for each pair build a
   theme setting the dimmer role to the brighter role's value and assert
   `themeTextTierFailures(theme).some(f => f.dimmer === pair[0] && f.brighter === pair[1])`.
   Use `Object.fromEntries`-style construction or a `Record` map so the colour
   override is typed without a cast:
   `{ colors: { [dimmer]: lightColors[brighter] } }`.
4. **The failure carries both ratios and the level's step.** For the
   `disabledForeground` case assert `dimmerRatio` and `brighterRatio` equal
   `contrastRatio(role, surface)` for the reported `surface`, and `step` equals
   `contrastFloors.default.step`. Repeat on an AAA theme built with
   `getTheme("light", "high")` so the step comes from the declared level (still
   1.05).
5. **The surfaces are the pair surfaces, not a retyped list.** Set
   `placeholder` to `lightColors.mutedForeground` and derive the expected
   surfaces in the test from `contrastPairs` (roles on both sides), then assert
   the reported `surface`s equal that derived list. This fails if someone
   replaces the derivation with a hand-typed list that omits `input` or adds a
   surface no pair paints.
6. **The hierarchy is a step, not equality.** Set
   `disabledForeground` to a colour exactly one 1.05 step below
   `mutedForeground` on `card` and assert no failure; then move it one byte
   toward `mutedForeground` (closer) and assert a failure. Compute the colour
   in the test through `contrastRatio` in a small loop over the hex channels, or
   pick two shipped values that sit either side of the step. The second route is
   simpler and honest: use the shipped `light` `disabledForeground` (passes) and
   `lightColors.mutedForeground` (fails) — the step itself is already pinned by
   case 4.

Test-file conventions: `describe`/`it` from `vitest`, no `node:fs`, labels from
`theme.name`, and no colour literal that is not derived from the package.

### 3.6 `packages/tokens/src/docs.test.ts`

- Line ~1394: "The guarantee is four checks — colour format, typeface form,
  contrast and numeric metrics" becomes "The guarantee is five checks — colour
  format, typeface form, contrast, text hierarchy and numeric metrics".
- Line ~1396: "The four parts are available on their own" becomes "The five
  parts are available on their own".
- Add a `describe("docs/tokens.md text hierarchy")` block:
  - names `textTiers`, `themeTextTierFailures` and `TextTierFailure` in
    `markdown`;
  - states each tier from `textTiers` (the dimmer and brighter names);
  - derives the three tightest shipped steps from `shippedThemes` and asserts
    the prose quotes them: `1.274` (`mutedForeground` vs `foreground`),
    `1.349` (`disabledForeground` vs `mutedForeground`), `1.440`
    (`placeholder` vs `mutedForeground`), each formatted with
    `toFixed(3)`;
  - asserts `themeFailures` appears with the word "five" in the same sentence
    the page uses for the total check.

Figures are computed the same way the shipped suite computes them, so a palette
edit must move the page.

### 3.7 `docs/tokens.md`

- `## Types` table: add, alphabetically after `TextStyleProperties`:

```
| `TextTierFailure` | A text tier that is not one step below the tier above it, with both ratios and the step. |
```

- Update the `ThemeFailure` row's kind list: "tagged `color`, `typeface`,
  `contrast`, `hierarchy` or `metric`".
- In **Checking a theme** (~1371): "The guarantee is five checks — colour format,
  typeface form, contrast, text hierarchy and numeric metrics — and
  `themeFailures` runs all five in one call".
- Add a `#### Text hierarchy` subsection immediately **before `#### One check`**:

```markdown
#### Text hierarchy

The colour check enforces minimums, so it cannot see an inverted hierarchy. The
design system documents three tiers — body copy (`foreground`), secondary text
(`mutedForeground`), and the two roles below it, an unavailable label
(`disabledForeground`) and a field's hint (`placeholder`) — and
`themeTextTierFailures(theme, contrast = theme.contrast)` holds each tier to one
`contrastFloors[level].step` (1.05:1) below the tier above it, measured **on the
same surface**, where both roles already have a documented pair. `textTiers` is
the ordered list, `[dimmer, brighter]`, and `TextTierFailure` reports the two
ratios and the step.

The surfaces are derived from `contrastPairs`, not retyped: 12 shared surfaces
for secondary text below body copy, 12 for the inactive label below secondary
text (every surface `inactivePairs` measures except the `disabled` fill, which
carries no secondary text), and the five surfaces a hint and a caption share.
Every shipped set clears the step; the tightest are **1.274:1**
(`mutedForeground` vs `foreground`, high-contrast light on `warningSoft`),
**1.349:1** (`disabledForeground` vs `mutedForeground`, XP light on `card`) and
**1.440:1** (`placeholder` vs `mutedForeground`, Windows dark on `input`). No
shipped value moves; the check exists for the theme a consumer edits. A theme
that sets `disabledForeground` to `foreground` still passes every floor, and is
reported only here.
```

- In **One check** (~1656): "Running one of the five checks is not the
  guarantee", and add the hierarchy to the sentence listing what `themeFailures`
  composes.

### 3.8 `docs/design-system.md`

- §9 (~628): "held to all `five` checks" — say "all five checks" and keep the
  plan reference.
- §9 (~647): "The four parts are available on their own" → "The five parts";
  add `themeTextTierFailures` to the list of individual checks.
- §9, after the inactive paragraph (~495): one paragraph:

> The inactive label is not merely above its floor; it stays **below** the
> secondary text it sits beside. The same is true of a field's hint. Those three
> relationships are the text hierarchy, and `themeTextTierFailures` holds an
> edited theme to them: each tier must sit one 1.05:1 step below the tier above
> it on the same surface. A theme that raises `disabledForeground` to body
> strength passes every floor and still makes an unavailable control look
> enabled; the hierarchy check is what reports it.

- §8 disabled row: no change needed — it already states the rule.

### 3.9 `packages/tokens/README.md`

- "That is one of four checks" → "one of five checks"; "composes all four" →
  "all five".
- Add one sentence naming `themeTextTierFailures` and the hierarchy in the same
  paragraph, so the README's list matches the package.

### 3.10 `COMPONENTS.md`

- **Total theme check** row: name the five checks and the `"hierarchy"` kind;
  replace any "four" with "five" in that row.
- **Theme contrast check** row: add that the text hierarchy is the separate
  fifth check, so the row does not imply the contrast check covers it.
- **Platform style variants** row: "all four checks" → "all five checks
  (`platform-composition.test.ts`, plan 374)".
- Do not change any role/type/plan counts: no role, type or pair moves.

### 3.11 `.agents/slop/plans/README.md`

- Add the row after 391:

```
| [392](./392-text-hierarchy.md) | The text tiers must stay a hierarchy | F | 306, 309, 317, 351, 383, 387, 388, 391 | done |
```

- Add a closing paragraph in the established voice: the inverted tiers that
  returned `[]`, the fifth check, the derived surfaces, the three tightest
  shipped steps, and that no colour, pair, floor or metric moves.

### 3.12 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)" and bump
the section count (`157/212` → `158/213`):

```
`[x]` Hold the text tiers to their hierarchy — `mutedForeground` below
`foreground`, and `disabledForeground`/`placeholder` below `mutedForeground`,
were documented in the design system and asserted on shipped themes at one
surface each, but every public check enforces only minimums: setting
`disabledForeground` to `foreground`, `mutedForeground` to `foreground` or
`placeholder` to `foreground` returned `[]` from `themeFailures` while a
disabled control looked enabled; `themeTextTierFailures` is the fifth check,
`textTiers` is the ordered list, its surfaces derive from `contrastPairs`, and
every shipped set clears the 1.05:1 step (1.274 / 1.349 / 1.440 at the
tightest) so no colour moves (plan 392)
```

## 4. Test plan and both directions

First the package gates after the edits:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: 98 files, every test passes; the three documentation suites
# (public-types, docs, inventory) are green with the new names and counts.

nub run --filter @gpuixui/tokens check-types
# EXPECT: no diagnostics.
```

Then prove the regression test in both directions. `scripts/verify-two-directions.sh`
still speaks `jj` (recorded cross-team), so use git:

```sh
# Direction 1 — the composition is what reports the inversion:
git stash push -- packages/tokens/src/theme-check.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/text-hierarchy.test.ts)
# EXPECT: the "raised inactive tier" case FAILS on the assertion
# (`themeFailures` has no hierarchy entry) while the direct
# `themeTextTierFailures` cases pass. A case that passes here does not guard the
# composition — STOP and rewrite it.
git stash pop

# Direction 2 — the check itself is required:
git stash push -- packages/tokens/src/contrast.ts packages/tokens/src/theme-check.ts
(cd packages/tokens && ./node_modules/.bin/vitest run src/text-hierarchy.test.ts)
# EXPECT: the suite fails to collect on the missing `themeTextTierFailures`
# export. This proves the file cannot pass without the implementation.
git stash pop
```

Both must be run; a test that is not run is not evidence. Then the whole
workspace gate:

```sh
nub run check
nub run lint
nub run test
```

`nub run test` runs every package: `primitives`/`components` consume
`@gpuixui/tokens` from source in their own trees, so this worktree's run is the
tokens suite plus whatever else is present here.

## 5. STOP conditions

Stop and report, do not improvise, if:

- a shipped set fails `themeTextTierFailures` — that is a shipped defect, not a
  guard, and the plan's "no value moves" claim is false; record the failing
  theme and surface with its ratio and stop;
- the derived surface count is not 12 / 12 / 5 — check whether a pair list
  changed before editing the prose, and state the new counts instead of forcing
  the old numbers;
- the tightest shipped steps differ from 1.274 / 1.349 / 1.440 — quote the
  derived values in both documents rather than the plan's, and say so;
- `public-types.test.ts` fails for a type this plan did not intend to export
  (the `## Types` table must contain exactly the public types);
- `docs.test.ts` fails on a sentence this plan updates — re-read the assertion
  and update the sentence, not the test's intent;
- `snippets.test.ts` rejects the new `@example` (every name must be imported and
  the block must be runnable);
- `theme-check.test.ts`'s broken example produces a *different* set of kinds
  than the five after the change — inspect `brokenTheme` before relaxing the
  assertion;
- a gate fails for a reason outside the files this plan names.

## 6. Acceptance criteria

- `themeTextTierFailures`, `textTiers` and `TextTierFailure` are public,
  documented in `docs/tokens.md` (value, type index and hierarchy section) and
  named in the README.
- `themeFailures` composes five checks in colour → typeface → contrast →
  hierarchy → metric order; the kind is `"hierarchy"`.
- The check derives its surfaces from `contrastPairs`; no new hand-typed surface
  list exists.
- Every shipped theme, platform variant and recipe passes; no colour, pair,
  floor or metric value changes.
- `text-hierarchy.test.ts` fails without the composition and without the
  function, and passes with both; every case was run.
- The 29 comparisons (12 + 12 + 5) and the tightest steps (1.274 / 1.349 /
  1.440) are stated from derived values in both documents and guarded by
  `docs.test.ts`.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 7. Cross-team

None. The change is additive: no existing export changes shape, and the
`themeFailures` array gains entries only for a theme that already had an
invisible tier. Consumers that assert `themeFailures(theme)` is empty for a
shipped or brand theme keep passing (the brand example is unaffected); the
docs-site's interlock row already calls `themeFailures`, so its Theming page
inherits the check without an edit.
