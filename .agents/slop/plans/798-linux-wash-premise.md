# 798 — The Linux wash rationale's figure and its premise

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `506`, `535`,
`710`, `781`, `795`.

## 1. The defect

`platform-styles/linux.ts` opens with the rationale plan `506` earned:

> The dark selected row is one designed step darker than plan 381 left it, so the
> row's title (`foreground`) keeps the 7:1 body floor through the selection wash
> while the row stays a 1.216:1 step past its accent wash; **the wash itself
> cannot soften further — at the alpha the title needs it measures 1.052:1 on the
> fill** (plan 506).

Three defects in that clause, all present tense:

1. **The number belongs to a fill the file no longer declares.** `1.052:1` is
   the highlight a **10%** wash measured over the *pre-506* `selected` fill
   `#2B4F76`. The shipped fill is `#27476A` at a 20% wash, where the same
   composition measures **1.143:1**. A reader resolving the shipped theme cannot
   reproduce `1.052` from anything in it.
2. **The mechanism it states is false.** "The wash itself cannot soften further"
   — the wash was not softened at all: it stayed at 20% and the **fill** moved.
   At the shipped settings the wash measures 1.143:1 on the fill (and 1.125:1 on
   the tightest selection surface), not a value at the 1.05:1 boundary.
3. **The figure does not follow from its own premise.** At the alpha the title
   allows on the pre-506 fill (27/255, 10.6%) the highlight measures 1.065:1;
   `1.052` is the *weakest* wash still over the floor (26/255). A byte search
   over the old fill leaves five alphas that clear both floors (23–27), so "no
   alpha window at all" is also more than the numbers say.

Neither `platform-claims.test.ts` (the owner of every current-state figure in
these files, plan `535`) nor `platform-header-text-step.test.ts` (the headers'
hexes, plan `781`) reads the clause, and `selected-title-selection.test.ts`
pins only the title and the selected step. A palette edit that stales this
sentence therefore passes every gate, and today the sentence already quotes a
number the shipped set does not produce.

Proof, recomputed through the public helpers (Linux dark, `foreground #EEF1F5`,
`selection #1C71D833`):

```
pre-506 fill #2B4F76, 20% wash   title 6.648:1   highlight 1.123:1
pre-506 fill #2B4F76, 10% wash   title 7.094:1   highlight 1.052:1
shipped fill #27476A, 20% wash   title 7.389:1   highlight 1.143:1
selected step past accent                        1.216:1
```

`selected-title-selection.test.ts`'s header repeats the same over-claim ("its
wash cannot soften far enough without falling under the 1.05:1 highlight
floor") — `1.052` clears that floor, so the sentence is wrong on its own terms.

## 2. Decision

Rewrite the clause to state the rejection with its **premise** and the figures
the shipped theme produces, and give the premise an owner in
`platform-claims.test.ts`. No colour, pair, floor, metric, role or shipped theme
moves: the defect is prose, and the new figures are all true today.

The replacement, in `platform-styles/linux.ts`:

```
 * The dark selected row is one
 * designed step darker than plan 381 left it, so the row's title (`foreground`)
 * keeps the 7:1 body floor through the selection wash while the row stays a
 * 1.216:1 step past its accent wash. The fill moved rather than the wash: on
 * the fill plan 381 shipped, the 20% wash held the title at 6.648:1, and a 10%
 * wash cleared it at 7.094:1 but measured 1.052:1 on that fill — a hair over
 * the 1.05:1 highlight floor (plan 506). The hint
 * clears the secondary floor on the row washes a field inside a row paints
 * (plan 527). The dark link is a step lighter so it keeps the secondary floor
 * through the selection wash (plan 528).
```

The pre-506 hex is **not** written in the header: `platform-header-text-step.test.ts`
(plan `781`) rejects an orphan hex, and `#2B4F76` is no longer in this palette.
The history lives in the guard, which writes the fill out itself — the same
split plan `785` used for the pre-098 brand fill.

And the test header in `selected-title-selection.test.ts`:

```
 * ... and Linux dark's selected fill one designed step
 * darker, because at the alpha its title needed its wash measured barely over
 * the 1.05:1 highlight floor on the old fill, so the fill moved instead of the
 * wash.
```

## 3. Files to change

1. `packages/tokens/src/platform-styles/linux.ts` — the header clause.
2. `packages/tokens/src/platform-claims.test.ts` — one helper and one case.
3. `packages/tokens/src/selected-title-selection.test.ts` — the header
   rationale only; no expectation changes.
4. `.agents/slop/plans/README.md` — the index row.
5. `TODO.md` — the ticked row.

No document, token value, pair, floor, metric, role or shipped theme changes.

## 4. Step 1 — the case

In `platform-claims.test.ts`, add beside the Linux case:

```ts
/** The pre-506 Linux dark fill the wash rationale is measured against. */
const linuxPre506Fill = "#2B4F76";

const fixed = (value: number, digits: number): string => value.toFixed(digits);

it("holds the Linux wash rationale to the fill it was measured on", () => {
  const dark = getPlatformTheme("linux", "dark");
  const { colors } = dark;
  const wash = alpha(colors.selection, 0.1);
  const shipped = alpha(colors.selection, 0.2);

  const title = (paint: string, fill: string): string =>
    fixed(contrastRatio(compositeOver(paint, fill), colors.foreground), 3);
  const highlight = (paint: string, fill: string): string =>
    fixed(contrastRatio(compositeOver(paint, fill), fill), 3);

  expect(
    Math.round((Number.parseInt(colors.selection.slice(7, 9), 16) / 255) * 100),
  ).toBe(20);
  expect(source("linux.ts")).toContain(
    `The fill moved rather than the wash: on the fill plan 381 shipped, ` +
      `the 20% wash held the title at ${title(shipped, linuxPre506Fill)}:1, ` +
      `and a 10% wash cleared it at ${title(wash, linuxPre506Fill)}:1 but measured ` +
      `${highlight(wash, linuxPre506Fill)}:1 on that fill — a hair over the ` +
      `${fixed(contrastFloors.default.surface, 2)}:1 highlight floor (plan 506).`,
  );
  expect(source("linux.ts")).not.toContain("cannot soften further");
});
```

Imports to add: `alpha`, `contrastFloors` beside the existing `compositeOver`,
`contrastRatio`, and `getPlatformTheme`; `fixed` already exists in the file.

The case derives, rather than pins, every figure in the sentence: the shipped
wash's fraction (20%), the old fill's title at it (6.648), the weakened wash's
title (7.094) and highlight (1.052), and the floor (1.05). The `not.toContain`
keeps the refuted mechanism from returning.

## 5. Test plan

```sh
cd packages/tokens
nub x vitest run src/platform-claims.test.ts src/selected-title-selection.test.ts
nub run check-types
nub run test
```

Expected: both suites pass, the type check is clean and the package suite is
green.

**Prove the case can fail** (each mutation reverted afterwards):

1. Restore the old clause (`the wash itself cannot soften further … 1.052:1 on
   the fill`) in `linux.ts`: the case fails on the sentence and on the
   `not.toContain` clause.
2. Change `linuxPlatformStyle`'s dark `selection` to `#1C71D840` (25%): the
   derived fraction is 25, the sentence's figures move, and the case fails.
3. Move the dark `selected` fill one step (`#27476A` → `#2B4F76`): the shipped
   title falls to 6.648:1, which `selected-title-selection.test.ts` rejects; the
   new case also fails because the sentence's "shipped 20% wash" clause still
   derives from `selection` but the plan-506 history no longer matches the
   contract.

## 6. STOP conditions

- Stop if any shipped value has to move: the defect is the sentence, and the
  figures are true today.
- Stop if the case needs a cast, `any`, a second copy of the sentence, or a
  helper outside `alpha`/`compositeOver`/`contrastRatio`.
- Stop if `contrastFloors.default.surface` is not `1.05`: the sentence's floor
  word must follow the contract, not a literal.
- Do **not** write the pre-506 hex into the header: plan `781`'s
  `platform-header-text-step.test.ts` rejects a colour the palette no longer
  declares. The guard writes it out; the header says "the fill plan 381
  shipped".

## 7. Acceptance

- `platform-styles/linux.ts` names the pre-506 fill, both washes and the floor,
  with no claim that the wash cannot soften.
- `platform-claims.test.ts` derives every figure in the sentence and rejects the
  old mechanism.
- `selected-title-selection.test.ts` states the same premise; its expectations
  are unchanged.
- `nub run --filter @gpuixui/tokens test` is green and
  `nub run --filter @gpuixui/tokens check-types` is clean.
- `TODO.md` ticks the row and the plan index lists 798.
