# 799 — The Aero recipe's disabled-fill rationale has no owner

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `535`, `737`,
`795`.

## 1. The defect

Plan `737` moved the Aero light `disabled` fill and justified it in the recipe
file (`platform-styles/recipes/aero.ts`, on `disabled`):

> The quiet panel is `#EBF3FC`, so the inherited identity fill measured 1.025:1
> on it; this step clears it at 1.076:1 (plan 737).

`platform-claims.test.ts` is the suite that owns every current-state figure in
the platform style files (plan `535`, extended to the disabled step by plan
`795`), but its `source()` helper is only ever called with a file directly under
`platform-styles/`: no test reads anything from `platform-styles/recipes/`. Both
figures in this comment are unguarded, and one of them (`1.076:1`) is a
present-tense claim about a **shipped** value: a palette edit to the Aero fill or
its quiet panel leaves the recipe quoting a step it no longer produces while
every gate stays green. That is the same class plan `795` closed for the Linux
and macOS `disabled` rationales.

Proof, recomputed through the public helpers:

```
Aero light  muted #EBF3FC
  pre-737 fill #EAF0F7  → 1.0247:1  → "1.025:1"
  shipped fill #E2EBF5  → 1.0759:1  → "1.076:1"
```

## 2. Decision

Extend `platform-claims.test.ts` with one case, reading the recipe file through
the existing `source()` helper (its path is relative to `platform-styles/`, so
`"recipes/aero.ts"` needs no new helper). No colour, pair, floor, metric, role,
recipe or shipped theme moves.

The case derives three things:

1. the shipped step — `contrastRatio(disabled, muted)` at three decimals;
2. the premise — `contrastRatio("#EAF0F7", muted)` at three decimals, with the
   pre-737 fill written out in the test (it is no longer in the palette, the
   same split plan `785` used for the pre-098 brand fill);
3. the panel the sentence names — `muted` must be the one hex the sentence
   prints, because its singular value is the reason the step is stated once.

## 3. Files to change

1. `packages/tokens/src/platform-claims.test.ts` — one import line, one constant,
   one case.
2. `.agents/slop/plans/README.md` — the index row.
3. `TODO.md` — the ticked row.

No source, document or token value changes.

## 4. Step 1 — the case

Add beside the plan-795 disabled case:

```ts
/** The identity fill Aero inherited before plan 737. */
const aeroPreFixFill = "#EAF0F7";

it("holds the Aero disabled fill's rationale to its own quiet panel", () => {
  const light = getPlatformRecipeTheme("aero", "light");
  const { muted } = light.colors;

  expect(source("recipes/aero.ts")).toContain(
    `The quiet panel is ${muted}, so the inherited identity fill measured ` +
      `${fixed(contrastRatio(aeroPreFixFill, muted), 3)}:1 on it; this step ` +
      `clears it at ${fixed(
        contrastRatio(light.colors.disabled, muted),
        3,
      )}:1 (plan 737).`,
  );
});
```

Imports: `getPlatformRecipeTheme` from `./platform-recipes.js` beside the
existing `getPlatformTheme`. `fixed`, `contrastRatio` and `source` already exist.

## 5. Test plan

```sh
cd packages/tokens
nub x vitest run src/platform-claims.test.ts
nub run check-types
nub run test
```

Expected: the suite passes, the type check is clean and the package suite is
green.

**Prove the case can fail** (each mutation reverted afterwards):

1. Change the Aero recipe's light `muted` to `#ECF4FD`: the shipped step and the
   quoted panel both move, and the case fails on the ratio.
2. Change the Aero light `disabled` to `#EAF0F7` (the pre-737 value): the step
   falls to 1.025:1, the case fails on the shipped figure, and
   `disabled-fill.test.ts` also reports the fill under the surface floor.
3. Restate the comment's `1.076` as `1.077`: the case fails on the sentence.

## 6. STOP conditions

- Stop if a shipped value has to move: the figures are true today, so the fix is
  the guard, not the palette.
- Stop if the case needs a cast, `any`, a second copy of the sentence or a new
  file-reading helper — `source()` already accepts a nested path.
- Do **not** widen this plan to the recipes' three inherited status-ink ranges
  (`xp.ts` 6.41–6.95, `aero.ts` 4.437–4.498 and 4.429–4.496): those are
  historical premises for the shipped inks and their endpoints are owned by the
  defect suites plan `574`, `582` and `649` landed. They are recorded in
  `TODO.md` as a follow-up, not pinned from a hand-written history here.

## 7. Acceptance

- `platform-claims.test.ts` reads `recipes/aero.ts` and derives the panel, the
  shipped step and the pre-737 premise.
- The case fails under each mutation in §5 and passes when reverted.
- `nub run --filter @gpuixui/tokens test` is green;
  `nub run --filter @gpuixui/tokens check-types` is clean.
- `TODO.md` ticks the row (and records the recipe status-ink follow-up) and the
  plan index lists 799.
