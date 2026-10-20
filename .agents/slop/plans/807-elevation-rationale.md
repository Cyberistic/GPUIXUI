# 807 — The AAA dark elevation rationale has no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `085`, `099`,
`345`, `369`, `390`, `505`, `509`, `566`, `618`, `642`, `757`, `778`.

## 1. The defect

`highContrastDarkElevation`'s JSDoc (`packages/tokens/src/elevation.ts`) is the
rationale a consumer reads before copying the AAA dark set — it is the only
place that explains *why* the set paints with a light tint. It makes five
statements:

```
The canvas is pure black, so a dark tint cannot darken it: the identity dark
set measured **1.000:1** on the canvas at every level and 1.030:1 at the
tightest on the card. This set paints with the light tint instead — the same
choice the AAA scrim makes (plan 099) — and its alphas are its own, because a
light tint is as potent on black as a dark tint is on white. The geometry is
the identity dark set's, so the feather ladder still holds.
```

1. the counterfactual is **1.000:1 on the canvas at every level**;
2. the counterfactual is **1.030:1 at the tightest on the card**;
3. the set paints with the **light** tint, **the same choice the AAA scrim
   makes**;
4. **its alphas are its own**;
5. **the geometry is the identity dark set's**.

`elevation-contrast.test.ts`'s header repeats (1) and (2). Nothing derives (2),
(4) or (5):

- (1) is derived — but *elsewhere* and in a different shape: `docs.test.ts`
  (*states the AAA tint, its three alphas and the tint it replaced*, plan 778)
  composes the identity dark tint at the identity's own alphas over the AAA
  canvas and holds the catalogue and the design system to `1.000:1`. No case
  reads `elevation.ts`'s sentence.
- (2) is read by no case at all. Bumping `1.030` to `1.031` in `elevation.ts`
  and in the test header leaves the suite green — and `1.031` is exactly the
  spelling plan `505`'s own plan text uses, so the two spellings already
  disagree in the tree and only one can be right.
- (3) is half-held: `docs.test.ts` holds the AAA `shadow` and `overlay` values
  the catalogue prints, but not the *claim that they are the same choice*.
- (4) is unheld: setting `highContrastDarkElevation`'s alphas to
  `darkElevation`'s (0.4 / 0.65 / 0.8) satisfies every check —
  `themeMetricFailures` only bounds an alpha to `0…1` and holds the feather
  ladder, and the painted ratio grows rather than shrinks — while the sentence
  that says the alphas are the set's own becomes false.
- (5) is unheld: changing one AAA level's geometry (`md`'s `offsetY` from 8 to
  10, say) passes every check and makes "The geometry is the identity dark
  set's" false.

Why this matters rather than being pedantic:

- The JSDoc is the *copy-and-own* artefact. `docs/tokens.md` sends a reader to
  `highContrastDarkElevation` for the AAA alphas and says the set "paints with
  light"; the source file is where they edit. A rationale whose figures cannot
  fail is the class plans `785`, `795`, `798`, `799`, `800`, `803` and `805`
  closed for the brand example, the platform headers, the recipes, the palette's
  inline comments and the copyable examples' headers — each found the same way:
  mutate a digit in the sentence and watch the suite stay green.
- (4) and (5) are the two design constraints the set's whole justification
  rests on. If the alphas stop being its own, a dark-mode platform's 0.4–0.8
  opacity over the AAA light tint paints a near-white halo — the defect plan
  `345` exists to prevent; if the geometry stops being the identity dark set's,
  the feather ladder and the "as potent on black as on white" argument no longer
  describe the same shape.
- A *wrong* figure is worth fixing here too: the card composition is
  `1.03045…:1`, so `1.030` (the shipped spelling, `toFixed(3)`) is correct and
  plan `505`'s `1.031` is an over-rounding. The guard is what settles it.

The counterfactual is derivable from shipped data (the identity dark tint, the
identity dark alphas and the AAA dark `card` are all still shipped), but it is
a **historical** composition: the pre-505 palette must be written out, as plans
`785` and `798`–`800` write out their pre-fix fills, so a future edit to the AAA
card cannot silently move a figure about a set that no longer exists.

## 2. What the composition is today

Derived on this tree (`nub exec vitest run` probe, deleted again) with
`themes.dark.colors.shadow` + `themes.dark.elevation[level][0].alpha`
composited over the pre-505 AAA dark surfaces with the package's own
`alpha`/`compositeOver`/`contrastRatio`:

```
pre-505 AAA dark set (plan 505's parent)
  canvas    #000000     card   #0D0D0D
  tint      #000000     alphas 40% / 65% / 80%   (darkElevation)

composite over the canvas
  sm 1.000   md 1.000   lg 1.000          every level, exactly

composite over the card
  sm 1.030   md 1.049   lg 1.061          tightest = sm, 1.030451… → 1.030

shipped AAA dark set (today)
  colors.shadow  #FFFFFF     colors.overlay #FFFFFF26   both light
  alphas         10% / 14% / 18%          each differs from the identity's
  geometry       identical to darkElevation's at every level, alpha excluded
```

No colour, pair, floor, metric, role or shipped theme moves. The plan owns one
sentence and one guard.

## 3. Decision

1. Keep every figure. Tighten `highContrastDarkElevation`'s JSDoc so each claim
   names what it is about — the tightest *level* on the card, the alphas, the
   geometry — and name the guard that holds it, the way the catalogue's other
   rationale sentences name their suite.
2. Add `packages/tokens/src/elevation-rationale.test.ts`: derive the
   counterfactual from a written-out pre-505 palette and the package's maths,
   hold both copies of the sentence to the derived figure, and derive the three
   structural claims from the shipped sets.
3. Name the guard in the catalogue's elevation section so the source claim is
   discoverable from the page that sends a reader to it.

`docs/design-system.md` needs no edit: §7's elevation paragraph states the AAA
set's tint and alphas (held by `docs.test.ts`, plan 778) and makes no claim
about the counterfactual's card figure, the geometry or the alphas being the
set's own.

## 4. Files to change

1. `packages/tokens/src/elevation.ts` — `highContrastDarkElevation`'s JSDoc.
2. **create** `packages/tokens/src/elevation-rationale.test.ts`.
3. `docs/tokens.md` — one clause in the elevation section naming the guard.
4. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
5. `TODO.md` — a ticked row, and the section counter.

No other file changes; no token value moves.

## 5. Step 1 — `packages/tokens/src/elevation.ts`

Replace the JSDoc block above `highContrastDarkElevation` (currently lines
134–142) with:

```ts
/**
 * High-contrast dark elevation. The canvas is pure black, so a black tint
 * cannot darken it: the identity dark set measured **1.000:1** on the canvas at
 * every level and **1.030:1** at the tightest on the card — the small level at
 * the identity's own 40%. This set paints with the light tint instead — the
 * same choice the AAA scrim makes (plan 099) — and its alphas are its own
 * (10, 14 and 18%), because a light tint is as potent on black as a dark tint
 * is on white. The geometry is the identity dark set's, so the feather ladder
 * still holds. `elevation-rationale.test.ts` derives both figures and the three
 * structural claims.
 */
```

Only words are clarified: the two ratios, the level names and the alpha
percentages are the shipped values. The bolding of `1.030` is new (it is a
figure a test owns, and the neighbouring `1.000` is already bold).

`elevation-contrast.test.ts`'s header keeps its figures and needs no edit; the
guard reads it as the second copy of (1) and (2).

## 6. Step 2 — `packages/tokens/src/elevation-rationale.test.ts`

Header states the bug: the JSDoc's card figure was read by nothing, so `1.030`
and `1.031` could both live in the tree, and its two structural claims (the
alphas are the set's own, the geometry is the identity dark set's) could be
falsified without a single check reporting it.

```ts
/**
 * Guards `highContrastDarkElevation`'s rationale.
 *
 * The JSDoc above the set is the copy-and-own rationale: it explains why the
 * AAA dark set paints with a light tint by quoting the counterfactual — the
 * identity dark tint at the identity's alphas over the pre-505 surfaces — and
 * by naming the two constraints the set keeps. No suite read it. Bumping the
 * card figure from 1.030 to 1.031 left the suite green (plan 505's own text
 * uses 1.031, so the tree disagreed with itself), and setting the set's alphas
 * to the identity's, or moving one level's geometry, returned no failure from
 * any check.
 *
 * The composition below is written out, not read from the shipped themes: it
 * is a *historical* claim about the tree before plan 505, so a future edit to
 * the AAA card must not move it (plans 785 and 798-800 do the same).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alpha,
  compositeOver,
  contrastRatio,
  elevationLevels,
  getTheme,
  themes,
  type ElevationLevel,
} from "./index.js";

/** A source file as one line, so a wrapped claim is not a substring. */
const prose = (url: URL): string => readFileSync(url, "utf8").replaceAll(/\s+/g, " ");

const source = prose(new URL("./elevation.ts", import.meta.url));
const header = prose(new URL("./elevation-contrast.test.ts", import.meta.url));

/** The pre-505 AAA dark palette: the canvas and the card it painted on. */
const preFixCanvas = "#000000";
const preFixCard = "#0D0D0D";

/** The identity dark tint and alphas the counterfactual paints with. */
const identityDark = themes.dark;

const painted = (level: ElevationLevel): number =>
  identityDark.elevation[level][0]?.alpha ?? Number.NaN;

const blackOn = (surface: string, level: ElevationLevel): number =>
  contrastRatio(
    compositeOver(
      alpha(identityDark.colors.shadow, painted(level)),
      surface,
    ),
    surface,
  );

const levels = elevationLevels.filter((level) => level !== "overlay");
```

Cases:

1. **the canvas figure is 1.000 at every level** — `levels.map(blackOn(canvas))`
   all `toFixed(3)` to `"1.000"`, and that is the sentence's "1.000:1 on the
   canvas at every level" — the palette's premise "a black tint cannot darken
   it", not a lower bound.
2. **the card figure is the tightest level, and every copy quotes it** — the
   three card ratios are `1.030` / `1.049` / `1.061`, the minimum is `sm`, and
   all three surfaces that state it — `source`, `catalogue` and `header` —
   contain the derived figure: `` `**1.030:1** at the tightest on the card` ``
   in the first two and `` `(1.030:1 at the tightest on the card)` `` in the
   header's parenthetical. The figure is derived rather than typed, so a
   palette edit that moves the composition fails here.
3. **the tightest level is named** — `source` contains `` `the small level at the identity's own 40%` ``
   and `sm`'s alpha is the one printed (`Math.round(painted("sm") * 100)`).
4. **the light tint is the scrim's choice** — the AAA dark set's `shadow` and
   `overlay` name the same channel: `shadow` is `#FFFFFF`, `overlay` is
   `#FFFFFF26` (a light veil), and both sentences say "the light tint" / "the
   same choice the AAA scrim makes (plan 099)". Assert the two roles' RGB agree
   and both differ from the identity dark's `shadow`.
5. **the alphas are the set's own** — for every level, the shipped AAA alpha
   differs from the identity's, and `source` contains
   `` `its alphas are its own (10, 14 and 18%)` `` built from the shipped
   alphas. Scoping metadata: the sentence is a claim about every painted level.
6. **the geometry is the identity dark set's** — for every level (the empty
   `overlay` included), the AAA level's `offsetX`, `offsetY`, `blurRadius` and
   `spreadRadius` equal `darkElevation`'s at every entry; `source` contains
   `` `The geometry is the identity dark set's` ``. Alpha is the one field that
   may differ, which is what case 5 holds.

Every expectation is derived: the ratios from the written-out palette and the
package's maths, the alphas and geometry from the shipped sets, the phrases
from the values. No case imports `shippedThemes` (case titles therefore avoid
"every shipped set", which `shipped-themes.test.ts` would require to read the
enumeration).

## 7. Step 3 — `docs/tokens.md`

In *Elevation*, after the sentence naming `highContrastDarkElevation` and its
alphas (line 1286), replace the AAA paragraph's counterfactual with:

```
the way the AAA scrim already veils with light (plan `099`). A black tint
measured **1.000:1** at every level on that canvas, and **1.030:1** at the
tightest on the card; `elevation-rationale.test.ts` derives both figures, the
alphas and the geometry the set keeps from the identity dark set's own levels.
```

The card figure joins the page because the guard now owns it in all three
places: leaving it out of the catalogue would have made the guard's own
document an exception. The remaining sentences are unchanged; `docs.test.ts`
asserts them by exact substring and tolerates the added clause. Verify with
`nub exec vitest run src/docs.test.ts`.

## 8. Test plan

From `packages/tokens`:

```sh
nub exec vitest run src/elevation-rationale.test.ts src/elevation-contrast.test.ts src/docs.test.ts src/elevation.test.ts
```

Expected: the new suite green; the three existing suites still green (the
rationale is prose, and none of them reads `elevation.ts`'s JSDoc).

**Prove every case can fail** (revert each mutation, one at a time):

1. `elevation.ts`: `1.030` → `1.031` → case 2 fails.
2. `elevation-rationale.test.ts`: `preFixCard = "#0E0E0E"` → case 2 fails (the
   derived figure moves; this proves the composition is live, not restated).
3. `elevation.ts`: `the small level at the identity's own 40%` → `the medium
   level` → case 3 fails.
4. `elevation.ts`: delete `the same choice the AAA scrim makes` → case 4 fails.
5. `elevation.ts`: `colors.shadow` AAA → `#000000` in `color.ts` → case 4 fails
   and `docs.test.ts` fails (the catalogue prints it).
6. `elevation.ts`: `its alphas are its own (10, 14 and 18%)` → `(40, 65 and
   80%)` → case 5 fails; and set `highContrastDarkElevation.md[0].alpha` to
   `0.65` → case 5 fails from the other direction.
7. `elevation.ts`: `The geometry is the identity dark set's` → `its own` →
   case 6 fails; and set `highContrastDarkElevation.md[0].offsetY` to `10` →
   case 6 fails.
8. `elevation-contrast.test.ts`: `1.030` → `1.032` in the header → case 2
   fails.
9. `docs/tokens.md`: `**1.030:1** at the tightest` → `**1.032:1**` → case 2
   fails.
10. `elevation-contrast.test.ts`: `**1.000:1** on the canvas` → `**1.001:1**`
    → case 1 fails.

Then the workstream gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: **216** files and **7107** tests green (215 / 7101 before; six cases
added); `check` and `lint` clean. No native scenario changes, so no smoke
scenario is run for this plan.

## 9. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. This
  plan states what the tree already ships.
- Stop if a case needs a cast, `any`, a hand-typed ratio for a *shipped* value,
  or a name-based field lookup where a derived one exists. The two counterfactual
  figures are the deliberate exception: they belong to a palette that is not in
  the tree any more, so the pre-fix surface is written out and the ratio is
  derived from it.
- Do not reformat or rewrap `elevation.ts`'s other JSDoc, `elevation-contrast`
  `test.ts`'s body, or the catalogue's elevation tables: `docs.test.ts` and
  `figures.test.ts` read them.
- Do not add the figures to `documentedFigures`: its `FigureDocument` union and
  `provenance` name a *shipped* theme, and this composition is historical. A
  dedicated suite is the precedent (`palette-rationale-figures.test.ts`, plan
  803; `example-header-figures.test.ts`, plan 805).
- If `docs.test.ts` fails on the clause added in §7, stop and record the case —
  do not tune the guard to a sentence that was asserting something else.

## 10. Acceptance

- `elevation.ts` names the tightest level, the alphas and the geometry, and
  names `elevation-rationale.test.ts`; both copies of the counterfactual quote
  the derived `1.030`.
- The six cases fail under their §8 mutation and pass when reverted; every
  figure, level, alpha and geometry field is derived.
- `nub run --filter @gpuixui/tokens test` is green (216 files, 7107 tests),
  `nub run check` and `nub run lint` clean.
- `TODO.md` ticks the row and the plan index lists `807`.

## 11. Execution record

Executed on 2026-10-20 on `agent/tokens-theme`.

- The counterfactual derived exactly as §2 predicted: `1.000` at every level on
  the pre-505 canvas, and `1.030` / `1.049` / `1.061` on the pre-505 card, the
  tightest being `sm` at `1.030451…`. The shipped spelling was already right;
  plan 505's `1.031` was the over-rounding.
- `nub exec vitest run src/elevation-rationale.test.ts` → 6 cases green.
- The ten mutations of §8 (including the two the plan listed for the catalogue
  and the header's canvas copy) each failed the suite and the tree was restored
  green after every one.
- `nub run --filter @gpuixui/tokens test` → **216 files / 7107 tests** green;
  `nub run check` (check-tests, lint, fmt, type-check) clean.
- No native scenario was run: the change is a JSDoc, a catalogue clause and a
  source-reading suite, none of which the runtime paints.
