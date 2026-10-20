# 778 — The AAA elevation tint and its three alphas, in the three passages that state them

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `085`/`099`/`505` (the AAA tint), `376` (the design-system elevation prose), `777` (the elevation paragraph guard) |
| Feeds | `packages/tokens/README.md` §*Shadows*, `docs/tokens.md` §*Elevation*, `docs/design-system.md`, `readme.test.ts`, `docs.test.ts` |

## 1. The bug

Three passages state the AAA dark elevation's tint and its three alphas:

- `packages/tokens/README.md` §*Shadows*: "its canvas is pure black, so `shadow`
  is `#FFFFFF` and `highContrastDarkElevation` applies the set's own alphas
  (10%, 14% and 18%)";
- `docs/tokens.md` §*Elevation*: "`colors.shadow` is `#FFFFFF` there and
  `highContrastDarkElevation` carries the set's own alphas — 10%, 14% and 18%";
- `docs/design-system.md` §*Elevation*: "`highContrastDarkElevation` applies 10%,
  14% and 18% of the `#FFFFFF` tint".

Replacing both the tint and the three percentages in all three passages with
`#F5F5F5` / `11%, 15% and 19%` and running `readme.test.ts` and `docs.test.ts`
left **263 tests green**. `docs.test.ts` derives the resolved shadow table
(`documentedShadow`) and the elevation ratios, but never reads the prose that
justifies a light tint; `readme.test.ts` derives the paragraph's surface and
group counts (plan `777`) but not its figures.

The same paragraph also rests on a counterfactual: "A black tint measured
**1.000:1** at every level there". It is the reason the AAA set paints with
`#FFFFFF` — a default dark tint would be invisible on the pure black canvas —
and nothing measures it either.

| Claim | Owner | Passages | Guard before |
| ----- | ----- | -------- | ------------ |
| `shadow` is `#FFFFFF` | `getTheme("dark", "high").colors.shadow` (and the palette table) | README, catalogue | catalog table only |
| "10%, 14% and 18%" | `highContrastDarkElevation` at `sm`/`md`/`lg` | README, catalogue, design system | none |
| "a black tint measured 1.000:1 at every level" | the default dark tint painted on the AAA canvas | README, catalogue | none |

## 2. Design

1. **Derive the percentages from the level list.** Use
   `elevationLevels.filter((level) => level !== "overlay")` — the shipped
   `overlay` is empty — read each level's first shape alpha, and render it as
   `Math.round(alpha * 100)%`. The sentence builder joins the three with `,` and
   `and`, so the prose reads as it does today.
2. **Derive the tint from the resolved theme**, not a literal:
   `getTheme("dark", "high").colors.shadow`.
3. **Derive the counterfactual.** For each shipped level, paint the *default*
   dark tint at the AAA alpha over the AAA canvas and assert the result measures
   `1.000:1` at the prose's precision. That is the sentence's claim, and it
   breaks if the AAA canvas leaves pure black or the default tint stops being
   black.
4. **One case in each suite.** `readme.test.ts` holds §*Shadows*;
   `docs.test.ts` holds the catalogue and the design system (it already reads
   both files, and its `markdownProse`/`designSystem` are whitespace-collapsed).
5. **No prose edit.** Both values are correct today; if a derived value
   disagrees, the implementation is the owner and the sentence moves.

No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays **470** and the figure table stays **70**.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/readme.test.ts` | import `alpha`, `compositeOver`, `contrastRatio`, `elevationLevels`, `highContrastDarkElevation`, `getTheme`, `themes`; one case holding the tint, the three alphas and the counterfactual |
| `packages/tokens/src/docs.test.ts` | one case holding the same three claims in `markdownProse` and `designSystem` |
| `TODO.md` | the new row ticked; bar `352/428` → `353/429` |
| `.agents/slop/plans/README.md` | this plan's index row and summary sentence |
| `.agents/slop/plans/778-aaa-elevation-tint.md` | this plan, with the execution record |

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. the new cases over the shipped prose
cd packages/tokens && nub exec vitest run src/readme.test.ts src/docs.test.ts
# expected: PASS.

# 2. both directions: mutate, one at a time, and revert
#    README, catalogue and design system:
#      "#FFFFFF"        -> "#F5F5F5"
#      "10%, 14% and 18%" -> "11%, 15% and 19%"
#    and the README/catalogue rationale:
#      "1.000:1"        -> "1.001:1"
cd packages/tokens && nub exec vitest run src/readme.test.ts src/docs.test.ts
# expected: FAIL on the mutated claim, PASS after the revert.

# 3. gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- A derived percentage is not a whole number. The prose states whole percents;
  report the exact alpha rather than rounding the sentence.
- `highContrastDarkElevation` is not importable from `./elevation.js`. It is a
  public export; stop and report rather than retyping the alphas.
- The counterfactual does not measure `1.000` in **every** shipped set's levels.
  Then the set no longer ships a black default tint over a black canvas; report
  the measurement and correct the sentence to what the implementation does.
- A passage states a fourth format for the alphas (for example "10/14/18"). Do
  not add a second pattern; either the sentence is rewritten to the derived form
  or the STOP is reported.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `readme.test.ts` — AAA tint and alphas | an elevation alpha or tint edit leaving the front door behind | Yes — both were replaced with `#F5F5F5` / `11%, 15% and 19%` and the suite stayed green at 263 tests |
| `docs.test.ts` — AAA tint and alphas | the same drift in the catalogue and the design system | Yes — same mutation |
| the counterfactual assertion | a canvas or tint change that makes "a black tint measured 1.000:1" false | Yes — it derives the ratio instead of restating it |

## 7. Acceptance criteria

- The tint and the three percentages in all three passages derive from
  `highContrastDarkElevation` and the resolved AAA theme.
- The `1.000:1` rationale derives from the default dark tint on the AAA canvas.
- Each mutated claim fails, and the revert passes.
- No token value, pair, floor, metric, role or shipped theme moves.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Execution record

- **Before the fix**, replacing `#FFFFFF` with `#F5F5F5` and `10%, 14% and 18%`
  with `11%, 15% and 19%` in the front door, the catalogue and the design system
  left `readme.test.ts` + `docs.test.ts` green at **263 tests**.
- **Both directions, after the fix.** Three mutations across all three passages,
  each reverted: the alpha rewrite failed **2** cases, the tint rewrite failed
  **5**, and `1.000:1` → `1.001:1` failed **5**. Both new cases are among them.
- The percentage string derives from `highContrastDarkElevation` at
  `sm`/`md`/`lg` (`elevationLevels` minus the empty `overlay`), rounded from the
  level's first shape alpha; the tint derives from `getTheme("dark", "high")`.
  The rationale paints the default dark tint at each shipped level's alpha over
  the AAA canvas and holds every ratio to `1.000` at three decimals; the suite
  also holds the default tint to `#000000` and the AAA canvas to `#000000`, so
  the sentence's premise is measured rather than restated.
- Green after: `@gpuixui/tokens` **208 files / 7038 tests**, `nub run check`,
  `nub run lint` and `nub run test` pass. No token value, pair, floor, metric,
  role or shipped theme moves; `contrastPairs` stays **470** and the figure
  table stays **70**.
