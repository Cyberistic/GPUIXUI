# 536 — The catalogue's present-tense figures

Status: ready. Depends on 336 (the first figure pins), 348 (the Toast's tone
pairs), 377 (the design-system figures), 514/520 (the disabled panel action),
503 (the track's washed surfaces).

## The bugs

Three claims in `docs/tokens.md` describe the shipped package in the present
tense and no longer do. Two are unguarded; the third is guarded by a case that
measures a narrower subject than the sentence claims.

1. **The Toast's tone margin is off by one rounding step.** *Status tones* says
   the shipped Toast pair clears its floor "with a wide margin (**11.97:1** at
   the tightest, Linux dark `infoSoftForeground`)". The shipped value is
   `11.9753…`, which rounds to **11.98**. `docs.test.ts` derives many quoted
   figures but not this one — `toastTonePairs` is only read for its roles. The
   same wrong figure is repeated in `COMPONENTS.md` (*Theme contrast check*) and
   `TODO.md` (plan 348's row).

2. **The disabled panel action quotes the pre-520 palette.** *Accessibility* says
   `inactivePanelActionPairs` holds "the resting label (4.343:1 identity dark,
   5.199:1 AAA dark)". Plan 520 moved `disabledForeground` in both dark sets
   *after* plan 514 measured those figures, so the shipped values are
   **5.148:1** and **7.310:1**. No test reads this sentence.

3. **The track's guard measures a narrower list than its sentence.** *Value
   indicators* says "The tightest shipped pairs are identity dark `track` on its
   `selected` fill at **1.06:1** and macOS light `success` on the groove at
   **3.04:1**." `docs.test.ts` (`quotes the weakest value groove and the mark it
   carries`) computes `tightest("track", "selected")` — a helper that takes one
   surface — and asserts the prose. Both sides agree on 1.06, but the claim is
   about `trackSurfacePairs`, which plan 503 grew to the `hover`/`active` washes
   and the four soft fills. The real minimum is **Linux light** `track` on
   `active` at **1.050:1**; identity dark on `selected` measures 1.058:1. The
   guard cannot catch the false superlative because it never measures the list
   the sentence names — the plan-350 failure mode, one document over.

Each figure is real and every shipped set still passes its floor — no colour
moves. What is false is the documentation, and the guard that was supposed to
hold it.

## The decision

Derive the figures from the shipped enumeration and hold each sentence to it,
naming the *provenance* of the theme that produces the minimum as well as the
number (the `full-set-claims.ts` / `platform-table.ts` precedent).

**`packages/tokens/src/figures.ts`** (test-shaped source beside the suites, not
public API):

```ts
export type FigureKind = "plain" | "selection" | "overlay";

export interface DocumentedFigure {
  readonly document: DocumentName;
  readonly name: string;                     // the failure message
  readonly pairs: ReadonlyArray<ContrastPair>;
  readonly kind: FigureKind;
  readonly theme: ShippedThemeProvenance;     // must produce the minimum
  readonly decimals: number;                  // the precision the sentence quotes
  readonly figure: string;                    // "{figure}" placeholder
  readonly sentence: string;                  // the human label, pinned
}

export const tightestFigure: (entry: DocumentedFigure) => {
  readonly ratio: number;
  readonly figure: string;
  readonly provenance: ShippedThemeProvenance;
};
```

- `plain` compares the two roles directly, as `contrastPairs` does.
- `selection` composites the `selection` wash over the background first, as
  `themeContrastFailures` measures `selectionStatusPairs`.
- `overlay` compares the `overlay` wash composited over a surface against that
  surface, as `overlayWashPairs` is measured (the foreground slot names the
  wash).

`tightestFigure` walks `shippedThemes`, measures every pair, and returns the
lowest ratio with the provenance of the set that produced it:

```ts
type ShippedThemeProvenance =
  | { readonly source: "identity"; readonly mode: ThemeMode; readonly contrast: ThemeContrast }
  | { readonly source: "platform"; readonly platform: PlatformVariant; readonly mode: ThemeMode; readonly contrast: ThemeContrast }
  | { readonly source: "recipe"; readonly recipe: PlatformRecipeName; readonly mode: ThemeMode; readonly contrast: ThemeContrast };
```

The test asserts the provenance, so a sentence naming the wrong set fails even
when its number is right. The figure renders with `ratio.toFixed(decimals)`,
which reproduces every current figure exactly (`1.050`, `7.310`, `11.98`).

**The guarded claims.**

| # | Sentence (document) | List / pair | Kind | Provenance that must produce it | Today |
| - | ------------------- | ----------- | ---- | ------------------------------- | ----- |
| 1 | Toast tone, tightest — `docs/tokens.md` | `toastTonePairs` | plain | platform `linux`, dark, default | `11.98` |
| 2 | Disabled panel action, identity dark — `docs/tokens.md` | `inactivePanelActionPairs` | plain | identity, dark, default | `5.148` |
| 3 | Disabled panel action, AAA dark — `docs/tokens.md` | `inactivePanelActionPairs` | plain | identity, dark, high | `7.310` |
| 4 | Track on a surface, tightest — `docs/tokens.md` | `trackSurfacePairs` | plain | platform `linux`, light, default | `1.050` |
| 5 | Track, identity dark on `selected` — `docs/tokens.md` | pair | plain | identity, dark, default | `1.058` |

The sentences are matched after whitespace normalisation, so a reflowed
paragraph does not fail the guard but an edited figure does.

`docs.test.ts`'s track case keeps its mark half (`success` on the groove,
3.04:1) and drops its one-surface measurement — the new guard owns the surface
claim, so the two suites cannot measure different lists again.

**Fix the sentences.** No colour, pair, floor or metric moves:

- `docs/tokens.md`: `11.97:1` → `11.98:1`; `4.343:1 identity dark, 5.199:1 AAA
  dark` → `5.148:1 identity dark, 7.310:1 AAA dark`; the track paragraph names
  Linux light `track` on the `active` wash as the tightest at **1.050:1**, keeps
  identity dark on `selected` at **1.058:1**, and calls macOS light `success`
  the tightest *mark* at **3.04:1**.
- `COMPONENTS.md` (*Theme contrast check*) and `TODO.md` (plan 348's row):
  `11.97:1` → `11.98:1`.
- `TODO.md` (plan 514's row): `4.343:1, AAA dark 5.199:1` → `5.148:1, AAA dark
  7.310:1`, with the plan-520 cause named.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/figures.ts` | new — provenance, the three measurement kinds, `tightestFigure`, the five claims |
| `packages/tokens/src/figures.test.ts` | new — derives each figure, asserts the provenance and the sentence |
| `packages/tokens/src/docs.test.ts` | the track case keeps the mark and drops its one-surface minimum |
| `docs/tokens.md` | three sentences corrected; the Verification section names the new guard |
| `COMPONENTS.md` | the Toast figure in the *Theme contrast check* row |
| `TODO.md` | plan 348's figure, the new row, the progress bar |
| `.agents/slop/plans/README.md` | index plan 536 |

## Steps

1. Read `contrast.ts` (the pair lists), `shipped-themes.ts` (the enumeration),
   `full-set-claims.ts`/`platform-table.ts` (the test-shaped precedent) and the
   current `docs.test.ts` track case (around "quotes the weakest value groove").
2. Create `figures.ts` with the types, `tightestFigure`, and the five claims.
3. Create `figures.test.ts`: one case per claim, titled with the document and
   the sentence; each asserts the provenance, then the rendered sentence in the
   document after whitespace normalisation; one case asserts no derived ratio is
   `NaN` (a broken composite must not let a sentence containing `NaN` pass).
4. Run `nub run --filter @gpuixui/tokens test`. Expected: claim 1 fails
   (`11.97` ≠ `11.98`), claims 2–3 fail (4.343/5.199), claim 4 fails (the page
   names identity dark), claim 5 passes.
5. Correct the three sentences and the two copied Toast figures.
6. Change the `docs.test.ts` track case to measure `trackSurfacePairs` and
   assert the corrected sentence; re-run the suite. Expected: green, 127 files.
7. Prove both directions:
   - restore `11.97` in the page → claim 1 fails naming the sentence; restore;
   - in the `docs.test.ts` track case, temporarily point the helper back at the
     single `selected` surface → the corrected sentence fails; restore.
8. Update the Verification section, the plan index, tick the `TODO.md` row and
   add the clause to the *Theme contrast check* row in `COMPONENTS.md`.
9. Run the gates: `nub run check`, `nub run lint`, `nub run test`.

## STOP conditions

- **STOP** if a derivation disagrees with a sentence other than the three named
  above. Report the sentence, the derived value and the producing theme; do not
  move a colour to make a number match.
- **STOP** if a claim needs a new public export. The guard uses exported pair
  lists and explicit pairs; it must not widen the public API. The walk-based
  figures (`elevation`, `skeletonPulse`) are out of scope — add a follow-up row
  instead of reaching for the private surface lists.
- **STOP** if `themeContrastFailures` reports a failure on any shipped set. This
  plan corrects prose and a guard; a failing pair is a different unit.

## Test plan

- `figures.test.ts` fails without the corrections (step 4) and passes with them.
- Claim 4 is the provenance proof: before the fix the page names identity dark
  while the minimum is Linux light, so the sentence fails even though 1.06 is a
  true measurement of the pair it names.
- Claim 5 proves the guard is not merely a minimum: a single named pair is held
  to its own value, so an edit to the identity dark `selected` fill fails the
  sentence without moving the minimum.
- The `NaN` case proves the composite cannot pass vacuously.
- No pair, colour, floor, metric, role or dimension changes, so the contrast,
  metric, theme-check and platform suites stay green.

## Acceptance

- The three sentences state what the package produces; the two copied Toast
  figures agree.
- `docs.test.ts`'s track case measures the list its sentence names.
- `nub run check`, `nub run lint` and `nub run test` pass; `packages/tokens` is
  127 files.
- `TODO.md` has the row ticked and the plan index names 536.
