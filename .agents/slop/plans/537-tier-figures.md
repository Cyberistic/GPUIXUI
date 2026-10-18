# 537 — The tier figures the documents quote

Status: ready. Depends on 392 (the text hierarchy check and its first figures),
500 (the surface body roles), 510/520 (the inactive values), 527 (the hint's row
washes and its moved value), 536 (the figure-provenance table).

## The bugs

Two present-tense numeric claims about `themeTextTierFailures` are false, and
the case that was supposed to hold the first one cannot see either. No colour,
pair, floor or metric moves; the package produces the right values.

1. **`docs/tokens.md` names the wrong palette for the panel action's step.**
   *Theme API → Text hierarchy* says the weakest step is "**1.542:1**
   (`disabledForeground` vs `softActionForeground`, **identity dark** on
   `successSoft`)". The minimum is the **high-contrast dark** set:
   - high-contrast dark: **1.5424** on `successSoft`, the other three soft
     fills and `softAction` (all five tie);
   - identity dark: **1.8767**.

   Plan 392 wrote the sentence before plan 520 moved `disabledForeground` in
   both dark sets; identity dark has never measured 1.542. The quoted number is
   right and the named set is wrong.

2. **`docs/design-system.md` quotes a figure the package no longer produces.**
   *§9 Accessibility* says "every shipped set clears it — 1.274:1, 1.168:1,
   **1.440:1** and 1.542:1 at the tightest". The shipped tier minima are
   **1.274** (secondary below each body role), **1.168** (the unavailable label
   below secondary), **1.157** (the hint below secondary) and **1.542** (the
   panel action's disabled label). `1.440` was plan 392's `placeholder` figure
   *before* plan 527 moved the hint (identity dark `#858F9F` → `#A8B0BD`, AAA
   light and dark moved too), and nothing read the sentence afterwards.

3. **The guard measures presence, not attribution.** `docs.test.ts`'s "quotes
   the tightest shipped step of each tier" computes each tier's minimum and
   asserts the page contains `**<figure>:1**` **somewhere**. All four figures
   appear in the same paragraph, so any of the four satisfies every tier's
   assertion: the case cannot catch a figure attributed to the wrong tier, a
   wrong set, or a stale number replaced by another tier's number. It never
   reads `docs/design-system.md`, which is why `1.440` survived four plans.
   This is the plan-350/536 failure mode: the guard measures a narrower subject
   than the sentence claims.

Derived evidence (all 24 shipped sets, the checker's own measurement):

| Tier `[dimmer, brighter]`       | Tightest step | Producing set(s)                       |
| ------------------------------- | ------------- | -------------------------------------- |
| `mutedForeground` < `foreground` | 1.274        | high-contrast light (all six variants) |
| `mutedForeground` < `cardForeground` | 1.274    | high-contrast light                    |
| `mutedForeground` < `popoverForeground` | 1.274 | high-contrast light                  |
| `mutedForeground` < `inputForeground` | 1.274   | high-contrast light                    |
| `disabledForeground` < `mutedForeground` | 1.168 | high-contrast dark                   |
| `placeholder` < `mutedForeground` | 1.157      | high-contrast dark (every shared surface) |
| `disabledForeground` < `softActionForeground` | 1.542 | high-contrast dark             |

Identity dark measures 1.8767 for the last row, so the page's parenthetical is
the defect, not the number.

## The decision

Extend the figure-provenance table (`packages/tokens/src/figures.ts`, the
test-shaped source plan 536 added) with a **tier** measurement, and hold each
sentence to the set and surface it names. Then correct the two sentences.

A tier is a ratio of ratios, not a pair, so it cannot reuse
`DocumentedFigure`/`deriveFigure`:

```ts
/** A text tier a document quotes, and the set and surface it names. */
export interface TierFigure {
  readonly document: FigureDocument;
  readonly name: string;                       // the failure message
  readonly tier: readonly [keyof ThemeColors, keyof ThemeColors]; // [dimmer, brighter]
  readonly claim: FigureClaim;                 // "tightest" for every entry here
  readonly provenance: ShippedThemeProvenance; // the set the sentence names
  readonly surface?: keyof ThemeColors;        // omitted when the sentence names the list
  readonly decimals: number;
  readonly sentence: string;                   // "{figure}" placeholder
}

/** The surfaces both roles are documented on, from `contrastPairs`. */
export const tierSurfaces: (tier: TierFigure["tier"]) => ReadonlyArray<keyof ThemeColors>;

export interface TierDerivation {
  readonly kind: "derived";
  readonly ratio: number;
  readonly figure: string;
  readonly provenance: ShippedThemeProvenance;
}

/** The set the sentence names, measured at its surface or its weakest shared surface. */
export function deriveTierFigure(entry: TierFigure): TierDerivation | { readonly kind: "missing" };

/** The lowest step any shipped set measures across the tier's shared surfaces. */
export function tierMinimum(tier: TierFigure["tier"]): {
  readonly ratio: number;
  readonly provenance: ShippedThemeProvenance;
  readonly surface: keyof ThemeColors;
};

export const documentedTierFigures: ReadonlyArray<TierFigure>;
```

- `tierSurfaces` reproduces `themeTextTierFailures`' surface rule (a surface
  joins the comparison by joining **both** roles' pairs in `contrastPairs`).
  A case proves the two agree: flattening a tier makes the checker report
  exactly the surfaces `tierSurfaces` returns.
- `deriveTierFigure` measures the named set on the named surface, or its
  minimum shared surface when the sentence names the list. A missing named set
  is a table error the suite reports.
- `quotesFigure`'s parameter is widened to `{ readonly sentence: string }`; the
  existing `DocumentedFigure` call sites are unchanged.

**The guarded claims** (`documentedTierFigures`, in `docs/tokens.md` order,
each with the exact parenthetical the page writes):

| # | Sentence (`docs/tokens.md`) | Set | Surface |
| - | --------------------------- | --- | ------- |
| 1 | `mutedForeground` vs `foreground` | high-contrast light | `warningSoft` |
| 2 | `mutedForeground` vs `cardForeground` | high-contrast light | `card` |
| 3 | `mutedForeground` vs `popoverForeground` | high-contrast light | `popover` |
| 4 | `mutedForeground` vs `inputForeground` | high-contrast light | `muted` |
| 5 | `disabledForeground` vs `mutedForeground` | high-contrast dark | `active` |
| 6 | `placeholder` vs `mutedForeground` | high-contrast dark | every shared surface (omitted) |
| 7 | `disabledForeground` vs `softActionForeground` | **high-contrast dark** | `successSoft` |

The test asserts, per entry: the derived figure renders at the entry's
precision, the sentence is present after whitespace normalisation, and the
quoted figure equals `tierMinimum(tier).ratio` at that precision. A sentence
that names the wrong set yields the right set's larger ratio and fails; a
sentence that quotes a non-minimum fails the second assertion.

**The design-system summary.** The sentence is rewritten to name every group
the tier list defines, so a new tier cannot ship unquoted and a stale figure
cannot survive:

> This is the check that reports both, and every shipped set clears it —
> secondary text sits 1.274:1 below `foreground`, `cardForeground`,
> `popoverForeground` and `inputForeground`; the unavailable label 1.168:1 and
> the hint 1.157:1 below secondary text; and the disabled label of a
> status-panel action 1.542:1 below the enabled one.

The case derives the four figures from `tierMinimum` over the groups
(`brighter` is a body role / `mutedForeground` / `softActionForeground`),
asserts the four body-role tiers share one minimum, and builds the sentence from
the derived numbers and the body-role names. The count "four" is not written:
the role list is derived.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/figures.ts` | new tier types, `tierSurfaces`, `deriveTierFigure`, `tierMinimum`, `documentedTierFigures`; `quotesFigure` widened |
| `packages/tokens/src/figures.test.ts` | the seven sentence cases, the tier-minimum case, the checker-agreement case, the coverage case and the design-system summary case |
| `packages/tokens/src/docs.test.ts` | drop the presence-only "quotes the tightest shipped step of each tier" case — the new guard owns attribution |
| `docs/tokens.md` | the 1.542:1 parenthetical names high-contrast dark; *Verification* says `figures.test.ts` holds the tier minima too |
| `docs/design-system.md` | the §9 sentence states the derived four with their groups |
| `COMPONENTS.md` | *Total theme check* row: the tier minima are derived |
| `TODO.md` | new row, ticked; the progress bar and fraction |
| `.agents/slop/plans/README.md` | index plan 537 |

## Steps

1. Read `figures.ts`, `figures.test.ts`, `contrast.ts`'s `textTiers` /
   `themeTextTierFailures`, and `docs.test.ts`'s tier case.
2. Add the tier half to `figures.ts` (types, `tierSurfaces`, `tierStep` helper,
   `deriveTierFigure`, `tierMinimum`, the seven `documentedTierFigures`).
3. Add the cases to `figures.test.ts`.
4. Run `nub run --filter @gpuixui/tokens test`. Expected: claim 7 fails
   (identity dark derives **1.877**, not 1.542) and the design-system summary
   fails (the page says 1.440); claims 1–6 pass. If any other claim fails, STOP.
5. Correct `docs/tokens.md` (`identity dark` → `high-contrast dark` for the
   1.542 parenthetical) and the design-system sentence.
6. Re-run the suite. Expected: green, 127 files.
7. Delete the `docs.test.ts` tier case and re-run. Expected: green; the new
   cases still fail if either sentence is reverted.
8. Prove both directions:
   - restore `identity dark` in `docs/tokens.md` → claim 7 fails naming the
     sentence;
   - restore `1.440:1` in `docs/design-system.md` → the summary case fails;
   - restore both.
9. Update *Verification*, `COMPONENTS.md`, `TODO.md` and the plan index.
10. Run `nub run check`, `nub run lint`, `nub run test`.

## STOP conditions

- **STOP** if a derived figure disagrees with a sentence other than claims 7 and
  the design-system summary. Report the sentence, the derived value and the
  producing set; do not move a colour or a metric to make a number match.
- **STOP** if the fix needs a public export. `figures.ts` is not on the package
  entry; the guard must not widen the API.
- **STOP** if `themeFailures` reports a failure on any shipped set.
- **STOP** if `textTiers` does not cover the seven claims (a tier added or
  removed is a different unit).

## Test plan

- Claim 7 is the regression: with the pre-537 page the derived figure is
  **1.877** while the sentence says 1.542, so the case fails; with the fix it
  passes. The failure names the set, so a reader sees the cause.
- The design-system case is the other regression: `1.440` is not a derived
  figure, so the constructed sentence is absent and the case fails; the four
  real figures pass.
- The minimum assertion is the second direction: a sentence edited to quote a
  larger, true figure for the named set (e.g. identity dark's 1.877) still
  fails the "equals the tier minimum" check.
- The checker-agreement case proves the figure table and
  `themeTextTierFailures` compare the same surfaces: flattening each tier
  reports exactly `tierSurfaces`' list.
- The coverage case fails if `textTiers` grows a tier the page does not quote.
- No pair, colour, floor, metric or role changes, so the contrast, metric,
  direction, theme-check and platform suites stay green.

## Acceptance

- Every tier figure the two documents state is derived from `shippedThemes` and
  pinned with the set and surface the sentence names.
- `1.440:1` no longer appears in `docs/design-system.md`; the 1.542:1
  parenthetical names high-contrast dark.
- `nub run check`, `nub run lint` and `nub run test` pass; `packages/tokens`
  is 127 files.
- `TODO.md` has the row ticked and the plan index names 537.
