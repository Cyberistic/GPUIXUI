# 770 — The washed unavailable label's AAA figure is stale, and three more washed figures have no owner

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `510` (washed inactive label), `512` (washed panel action), `520` (AAA/identity dark `disabledForeground`), `714`/`717`/`760` (the figure table), `745` (the light brand's link ink) |
| Feeds | `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`, `packages/tokens/src/brand-theme.example.ts`, `figures.ts` |

> ## Execution record (2026-10-20)
>
> - Guard first, over the unfixed prose: `src/figures.test.ts`,
>   `src/theme.test.ts` and `src/docs.test.ts` ran **11 failed / 326 passed** —
>   the washed entries (the three documents the test read × tightest + AAA) found
>   no sentence, the panel action's `8.667` found none, the catalogue's second
>   washed copy counted one instead of two, `4.722` was still present in all
>   three documents, the brand case found no `7.957` in the example, and the
>   catalogue's table size still said 56. The ledger's fifth occurrence was
>   found while reviewing the diff and joins the same table; its entries fail on
>   the pre-fix row the same way.
> - After the prose: **113/113** in the two figure suites and the whole package
>   **208 files / 7024 tests**, all green. `nub run check`, `nub run lint` and
>   `nub run test` pass.
> - The measurement that forced the correction: the AAA minimum over
>   `selectionInactivePairs` is **4.8444:1** on every AAA light set
>   (`destructiveSoft`), while the AAA dark sets measure **7.9325:1**; the
>   tightest default pair is **3.1768:1** on `Light · Windows 7` (Aero light),
>   the panel action is **8.6670:1** on identity `Dark` `infoSoft`, and the
>   brand's canvas ink is **7.9574:1** (pre-745 `#5330C8` **6.9411:1**).
> - The derived table size moved 56 → **65**, so the catalogue's own count
>   sentence moved with it — the guard existed and caught it.
> - No token value, pair, floor, metric, role or shipped theme moves;
>   `contrastPairs` stays **470**.

## 1. The bug

The catalogue and the design system state, in the present tense:

> the tightest washed pair is **3.177:1** (Aero light `destructiveSoft`) and
> **4.722:1** at AAA

**3.177:1 is right. 4.722:1 is stale, and so is the palette one sentence names.**
`selectionInactivePairs` holds `disabledForeground` through the composited
`selection` wash on the fourteen `inactiveSurfaces`. Measured over
`shippedThemes` today:

| Claim | Measured | Verdict |
| ----- | -------- | ------- |
| tightest default set, Aero light `destructiveSoft` | **3.1768:1** (`Light · Windows 7`) | correct |
| the AAA minimum, "at AAA" | **4.8444:1**, `High contrast light` on `destructiveSoft` | the sentence says **4.722** |
| the AAA *dark* palette (one sentence names it) | **7.9325:1** | the number is the pre-520 dark value |
| panel action `softActionForeground` through the wash, identity dark `infoSoft` | **8.6670:1** (`Dark`) | correct, unguarded |
| light brand `primaryText` through the runtime's 3.5% ink on the canvas | **7.9574:1** | correct, unguarded |
| the same brand before plan `745`, `#5330C8` | **6.9411:1** on the canvas | correct, unguarded |

Why 4.722: plan `510` wrote it from the AAA **dark** set, where
`disabledForeground` was still `#B0B0B0`. Plan `520` moved that value to
`#D0D0D0` for the disabled panel action's inverse veil, so the AAA dark pair is
now **7.9325:1** and the AAA *light* pair — **4.8444:1** — is the AAA minimum.
The sentence still quotes the pre-520 dark figure and calls the minimum "at
AAA"; one occurrence even spells out "AAA dark".

Nothing read any of these figures. Falsifying each number in place (`4.722 →
4.7229`, `8.667 → 8.6679`, `7.957 → 7.9579`, `6.941 → 6.9419`) left the whole
package suite green: **208 files / 7013 tests passed**, so the pages can quote a
ratio the package no longer produces. `figures.ts` is the owner of present-tense
figures, and these four compositions are absent from it.

The five places that quote the washed inactive figure:

- `docs/tokens.md` §*Text selection*: "the tightest washed pair is now
  **3.177:1** … and **4.722:1** at AAA"
- `docs/tokens.md` plan-510 history: "Every shipped set passes (3.177:1 Aero
  light, 4.722:1 AAA **dark**)"
- `docs/design-system.md` §*Text selection*: "… and **4.722:1** at AAA"
- `packages/tokens/README.md`: "…; 4.722:1 at AAA"
- `COMPONENTS.md` Theme contrast row, plan-510 history: "…; 4.722:1 at AAA"

The soft-panel figure appears twice in `docs/tokens.md`; the brand figures appear
in `brand-theme.example.ts`'s own JSDoc (`6.941`) and in the ledger's Theme
extension row (`7.957`), where neither says which of the four document tones it
was measured on — the canvas is the tightest, so that is the honest one to name.

## 2. Design

1. **Correct the prose to the measured minimum.** `4.722:1` → **`4.844:1`**, and
   "at AAA" / "AAA dark" → **"in the AAA light palette"**, because the dark
   palette is no longer the tightest. No colour moves: the palette is right, only
   the sentence is behind.
2. **Give the shipped figures to `figures.ts`.** A `selection` entry measures
   `disabledForeground` on a composited `selection` wash, exactly as the check
   does. The tightest entry carries every `selectionInactivePairs` member under
   `claim: "tightest"`, so `figures.test.ts` asserts Aero light really produces
   the global minimum; the AAA entry names the one pair on
   `High contrast light` under `claim: "value"`.
3. **Register one entry per document and sentence.** `FigureDocument` already
   names the four documents, and `quotesFigure` collapses whitespace, so a
   reflowed paragraph still matches. The two `docs/tokens.md` occurrences of the
   washed sentence are rewritten identically so one entry covers the page.
4. **The panel action's figure joins the table in `docs/tokens.md`.** Its entry
   derives from the `softActionForeground` rows of `selectionSoftPairs`, so a
   fifth status tone joins the measurement from the tone index.
5. **The brand figures get a bespoke case in `theme.test.ts`.** `figures.ts`
   derives only shipped sets, and the brand theme is an executed example; the
   case that already rebuilds the pre-fix brand (plan `745`) gains both figures,
   asserts the canvas is the tightest of the four document tones, and holds the
   example's JSDoc and the ledger row to them.
6. **Drop one unguarded count instead of guarding it.** The plan-510 history
   sentence says "each of the thirteen `inactiveSurfaces`"; the list has held
   fourteen since plan `650`. Rewording it to "every surface the list names"
   removes a number that no test reads, which is the same rule this workstream
   applies everywhere else.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/figures.ts` | import `selectionInactivePairs` and `selectionSoftPairs`; eight `DocumentedFigure` entries for the washed inactive pair (four documents × tightest + AAA) and one for the panel action; add them to `documentedFigures` through one `selectionWashFigures` block |
| `packages/tokens/src/figures.test.ts` | no source change for the entries: the table-driven cases derive them automatically. Two cases: the catalogue states the washed sentence twice (so one corrected copy cannot leave the other stale), and no document keeps `4.722` |
| `docs/tokens.md` §*Text selection* | "…and **4.722:1** at AAA." → "…and **4.844:1** in the AAA light palette." |
| `docs/tokens.md` plan-510 history | "on each of the thirteen `inactiveSurfaces`" → "on every surface the list names"; "Every shipped set passes (3.177:1 Aero light, 4.722:1 AAA dark)" → the canonical washed sentences |
| `docs/tokens.md` plan-512 history | "every shipped set clears them (8.667:1 at the tightest, identity dark on `infoSoft`)" → the canonical panel-action sentence with the bold figure |
| `docs/tokens.md` §*Text selection* (panel action) | "every shipped set clears **8.667:1** (identity dark on `infoSoft`)" → the same canonical panel-action sentence |
| `docs/tokens.md` figure-table paragraph | the derived entry count **56** → **65** |
| `COMPONENTS.md` Theme contrast row | the plan-510 clause's "3.177:1 … ; 4.722:1 at AAA" → the canonical washed sentences |
| `docs/design-system.md` §*Text selection* | "…and **4.722:1** at AAA (plan `510`)." → "…and **4.844:1** in the AAA light palette (plan `510`)." |
| `packages/tokens/README.md` | "… (Aero light `destructiveSoft`; 4.722:1 at AAA) (plan 510)." → "… (Aero light `destructiveSoft`) and **4.844:1** in the AAA light palette (plan 510)." |
| `packages/tokens/src/theme.test.ts` | extend "clears the native document's ink wash on the light brand's link": derive the canvas figure and the pre-fix figure, assert the canvas is the tightest tone, hold the example JSDoc's `6.941` and the ledger's `7.957` |
| `packages/tokens/src/brand-theme.example.ts` | the JSDoc names the canvas and both figures: "…over the canvas, where the old value measured 6.941:1 and this one 7.957:1…" |
| `COMPONENTS.md` Theme extension row | "**7.957:1** through the wash" → "**7.957:1** through the wash on the canvas" |
| `TODO.md` | one new ticked row under *Design tokens and theming*; bar `347/424` → `348/425` |
| `.agents/slop/plans/README.md` | this plan's index row and a summary paragraph |
| `.agents/slop/plans/770-washed-inactive-figure.md` | this plan, status `landed` with an execution record |

No token value, pair, floor, metric, role or shipped theme moves.
`contrastPairs` stays **470**.

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. add the table entries and the brand case first, over the unfixed prose
cd packages/tokens && nub exec vitest run src/figures.test.ts src/theme.test.ts src/docs.test.ts
# expected: FAIL, 11 cases — the four washed entries (three documents × tightest
# + AAA), the panel action's figure, the catalogue's two-occurrence count, the
# 4.722 rejection, the brand's 7.957, and the catalogue's table size (56 → 63).

# 2. after the prose edits
cd packages/tokens && nub exec vitest run src/figures.test.ts src/theme.test.ts src/docs.test.ts
# expected: PASS, every existing case unchanged.

# 3. the owning suites
cd packages/tokens && nub exec vitest run src/selection-inactive.test.ts src/selection-panel-action.test.ts
# expected: PASS, unchanged — this plan publishes figures, not pairs.

# 4. full gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- The measured tightest default pair is not `3.1768:1` on `Light · Windows 7`
  `destructiveSoft`, or the AAA minimum is not `4.8444:1` on the AAA light
  palette — report the measurement instead of fitting the prose to a number.
- The AAA dark palette is the minimum again (it would mean plan `520` was
  reverted): the sentence must then name dark, not light.
- `deriveFigure` reports `missing` for either provenance — the table would be
  naming a set `shippedThemes` does not contain; fix the provenance, not the
  sentence.
- The new guard passes on the pre-fix prose. If it does, it is not reading the
  sentence and must be tightened before any prose is edited.
- A change would move a token value, pair, floor, metric, role or shipped theme.
  This plan changes prose, one JSDoc block, one ledger cell and tests only.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `figures.test.ts` derives the washed inactive tightest entry | a wrong number and a sentence that names a set other than the minimum | Yes — the pre-fix page says 4.722 |
| `figures.test.ts` derives the AAA light entry | the stale 4.722 and, with the reworded sentence, the "AAA dark" name | Yes — pre-fix page has no 4.844 |
| `figures.test.ts` derives the panel action entry | a palette edit moving `softActionForeground` or a fifth tone changing the minimum | Yes — falsifying 8.667 in place stayed green before this plan |
| `figures.test.ts` requires both catalogue occurrences | one copy of the sentence being corrected while the other keeps the old digits | Yes — the pre-fix page's second copy says "AAA dark" |
| `theme.test.ts` derives the brand's canvas ink figure | a brand palette edit, or a sentence that measured another tone and called it the wash | Yes — falsifying 7.957/6.941 stayed green before this plan |
| `theme.test.ts` asserts the canvas is the tightest tone | a future document tone becoming darker than the canvas and the sentence naming the wrong surface | Yes — `card` measures 8.488 today |
| `docs.test.ts` table-size sentence | the nine new entries silently leaving the page's own count behind | Yes — the pre-fix page says 56 where the table holds 65 |

## 7. Acceptance criteria

- The washed inactive sentence reads **3.177:1** (Aero light
  `destructiveSoft`) and **4.844:1** in the AAA light palette, in the catalogue,
  the design system, the README and the ledger, with no place left saying 4.722
  or "AAA dark".
- The panel action's 8.667:1 and the brand's 6.941:1 / 7.957:1 are derived by a
  suite, and both brand places name the canvas.
- Every new case fails on the pre-fix prose and passes after it.
- No token value, pair, floor, metric, role or shipped theme moves, and all
  gates are green.
