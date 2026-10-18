# 544 — The catalogue's quoted tightest figures are measured on ten of the twenty-four shipped sets

**Status (2026-10-18).** Done. `quotedSets` derives from `shippedThemes` with a
provenance label that carries ` high` at AAA, the alpha-hover figures narrow to
the light default sets their sentences name, the status-label case reads the
same list, and an extent case fails on the pre-544 ten-set list (10 ≠ 24). The
Verification paragraph now names `figures.ts` / `figures.test.ts` for the
sixteen-entry table and `docs.test.ts` for the quoted figures, held by a prose
case. A probe over the full enumeration finds every quoted minimum produced by
the set its sentence names, so no document value, colour, pair, floor, metric,
platform style or recipe moves. The package suite is 130 files / 5633 tests
green (two new cases), and `check`, `lint` and `test` pass.

**Workstream:** `tokens-theme`. **Phase:** F (guard quality).
**Depends on:** 380 / 387 / 388 (the shipped enumeration), 536 / 537 / 538 (the
present-tense figures and their counts), 371 / 383 (the total theme check).
**Files:** `packages/tokens/src/docs.test.ts`, `docs/tokens.md`,
`TODO.md`, `.agents/slop/plans/README.md`.

## 1. The defect

`docs/tokens.md` states the quoted figures beside each contract list as
**superlatives over the shipped package**:

- “the tightest shipped pair is `primaryText` on `selected` at **5.68:1**
  (Linux dark)” and the four row-text figures beside it;
- “the weakest shipped set is Linux dark at **1.25:1**” for the field edge;
- “the weakest … the shipped themes produce” for the status fill
  (**1.262:1**, XP light `warning` on `selected`);
- “the mark the weakest value groove carries” (**3.04:1**, macOS light);
- the status label the selection wash can erase (**4.584:1** XP light and
  **7.370:1** at AAA).

`docs.test.ts` holds those sentences, but the set they are measured over is
hand-built. `quotedSets` (`docs.test.ts:1276-1292`) enumerates **ten** sets:

```
2 identity (default contrast only)
6 platform variants (default contrast only)
2 recipes (light, default contrast only)
```

It omits **fourteen** of the twenty-four shipped sets: both identity AAA
variants, all six AAA platform variants, the two recipe darks and the two
recipe AAA variants. Every one of those is a real editable theme the docs
platform toggle offers, and plan 388's guard does not see this file because its
case titles say “quoted tightest figures”, not “every shipped set”.

The consequence is the plan-536 failure mode one list over: a role edit in a set
outside the hand-built list can become the minimum while the sentence keeps
naming the old set, and the case still passes because it never measured the new
one. Nothing is false **today** — the probe in §4.1 shows every quoted minimum is
still produced by the set the sentence names — so this is a guard defect, not a
palette defect.

The same audit finds two more instances of the same hand-built list:

- `it("quotes the status label the selection wash can erase")`
  (`docs.test.ts:1458-1480`) builds its own **twelve** sets — identity at both
  contrasts, the six platform variants at the default contrast only, and both
  recipes at light — then filters by `theme.contrast`. Its AAA branch therefore
  measures only the identity AAA palettes, never an AAA platform variant or
  recipe.
- `it("quotes the worst alpha-hover label ratios plan 338 records")`
  (`docs.test.ts:1557`) uses `quotedSets` for a figure that is **not** a
  superlative over the package: the sentences name the light composition the
  shipped consumers paint (“2.06:1 (Linux light, card) at 50%”). Its subset is
  right by accident — if the list becomes the full enumeration, the minimum
  moves into a dark set and every one of the six assertions fails. It must
  narrow explicitly instead.

The catalogue's account of who holds its figures is stale at the same time. The
Verification paragraph says

> `packages/tokens/src/figures.test.ts` holds every figure this page states in
> the present tense to the themes it ships …

which is false twice: `figures.ts` (not `figures.test.ts`) owns the table, and
the table holds sixteen entries across four documents, while the quoted tightest
figures above are derived in `docs.test.ts`. A maintainer reading that sentence
does not learn where to add the next guard.

## 2. The rule to state

**A figure the page calls the tightest is measured on every shipped set, and a
label names the one set it measured.**

- `shippedThemes` is the only enumeration. `quotedSets` derives from it, so the
  four axes (identity / platform / recipe, both modes, both contrasts) cannot be
  partially represented by an edit to this file.
- A label is derived from the set's provenance and carries ` high` at AAA, so a
  default-contrast set and its AAA twin can never print the same label.
- A figure that is **not** a superlative — the alpha-hover cost the consumers
  paint — narrows to the sets its sentence names, and says so.
- The page names both owners: `figures.ts` / `figures.test.ts` for the
  current-figure table, `docs.test.ts` for the quoted tightest figures.

## 3. Exact changes

### 3.1 `packages/tokens/src/docs.test.ts` — the label and the enumeration

Inside `describe("docs/tokens.md quoted tightest figures")`, replace the
hand-built `quotedSets` (currently lines 1276-1292) with a derivation. Keep the
existing `platformLabels` and `recipeLabels` records above it.

```ts
  /**
   * The label the page uses for a shipped set. A sentence names a provenance
   * ("Linux dark", "Aero light", "identity light"), never a `Theme.name`, and a
   * AAA set adds ` high` — the one thing its default-contrast twin cannot say,
   * so no two sets share a label.
   */
  const quotedLabel = (shipped: ShippedTheme): string => {
    const { theme } = shipped;
    const contrast = theme.contrast === "high" ? " high" : "";
    return shipped.source === "identity"
      ? `identity ${theme.mode}${contrast}`
      : shipped.source === "platform"
        ? `${platformLabels[shipped.platform]} ${theme.mode}${contrast}`
        : `${recipeLabels[shipped.recipe]} ${theme.mode}${contrast}`;
  };

  /**
   * Every shipped set, with the label its sentence uses. Plan 388 left this
   * list at ten sets — the identity and platform variants at the default
   * contrast and the recipes in light only — while every sentence it holds is a
   * superlative over the package, so fourteen shipped sets were unmeasured.
   */
  const quotedSets: ReadonlyArray<readonly [string, Theme]> =
    shippedThemes.map(
      (shipped): readonly [string, Theme] => [
        quotedLabel(shipped),
        shipped.theme,
      ],
    );
```

Import the `ShippedTheme` type beside the existing `shippedThemes` import.

Add the extent case beside the first case in the same describe:

```ts
  it("measures a quoted figure on every shipped set", () => {
    expect(quotedSets).toHaveLength(shippedThemes.length);
    expect(new Set(quotedSets.map(([label]) => label)).size).toBe(
      shippedThemes.length,
    );
  });
```

This fails on the pre-544 list (10 ≠ 24, and the ten labels are not the twenty-four
sets), and it fails again if a future edit narrows the list without saying so.

### 3.2 `packages/tokens/src/docs.test.ts` — the alpha-hover figures narrow

In `it("quotes the worst alpha-hover label ratios plan 338 records")`, replace
`quotedSets` in `worstAlpha` with an explicit light, default-contrast view:

```ts
    // The sentences name the light composition the consumers paint — a 50%
    // primary on a dark card is a different measurement, not this figure — so
    // this is a specific-subset claim, not a superlative over the package.
    const consumerSets = quotedSets.filter(
      ([, theme]) => theme.mode === "light" && theme.contrast === "default",
    );
```

and inside `worstAlpha`, change `quotedSets` to `consumerSets`. Every expected
value and every asserted sentence stays exactly as it is: the six quoted minima
are produced by these six sets today (probe in §4.1).

### 3.3 `packages/tokens/src/docs.test.ts` — the status-label case reads the same list

In `it("quotes the status label the selection wash can erase")`, delete the local
`shipped` array (`docs.test.ts:1459-1480`) and use the describe's `quotedSets`.
Its inner `tightest(contrast)` becomes:

```ts
    const tightest = (
      contrast: "default" | "high",
    ): readonly [string, number] => {
      let worst: readonly [string, number] = ["", Number.POSITIVE_INFINITY];
      quotedSets
        .filter(([, theme]) => theme.contrast === contrast)
        .forEach(([label, theme]) => {
          statusTones.forEach((tone) => {
            selectionSurfaces.forEach((surface) => {
              const ratio = contrastRatio(
                theme.colors[`${tone}Text`],
                compositeOver(theme.colors.selection, theme.colors[surface]),
              );
              if (ratio < worst[1]) {
                worst = [`${label} ${tone}Text on ${surface}`, ratio];
              }
            });
          });
        });
      return worst;
    };
```

The `label.replace(" default", "")` call goes: `quotedLabel` never emits that
suffix. The two expected labels stay `"XP light infoText on selected"` and
`"identity light high warningText on active"`, because the identity block comes
first in `shippedThemes` and a tie keeps the first minimum. Every expected ratio
stays (probe in §4.1).

### 3.4 `docs/tokens.md` — the page names both owners

Replace the Verification paragraph's first three sentences (currently lines
3224-3233, ending “a palette edit and a sentence cannot drift apart.”) with:

> `packages/tokens/src/figures.ts` holds the ratios the current-figure
> sentences state — `documentedFigures` and `documentedTierFigures`, **sixteen**
> entries across this page, the design system, the README and the ledger — and
> `packages/tokens/src/figures.test.ts` derives each one from `shippedThemes`
> with the checker's own measurement and asserts both the figure and the set
> (and surface) the sentence names. The quoted tightest figures beside each
> contract list are derived by `docs.test.ts` over the same twenty-four shipped
> sets, so both suites read one enumeration and a palette edit and a sentence
> cannot drift apart.

Leave the following sentences (“It found three: …”, “Plan `537` extends …”) as
they are: their figures and plan references are correct.

### 3.5 `packages/tokens/src/docs.test.ts` — the ownership sentence is guarded

Add a case to the "docs/tokens.md quoted tightest figures" describe (after the
extent case):

```ts
  it("names both suites that hold its figures, and the table's size", () => {
    const start = markdownProse.indexOf(
      "`packages/tokens/src/figures.ts` holds the ratios",
    );
    const paragraph = markdownProse.slice(
      start,
      markdownProse.indexOf("It found three", start),
    );
    const entries = documentedFigures.length + documentedTierFigures.length;

    expect(paragraph).toContain("`documentedFigures`");
    expect(paragraph).toContain("`documentedTierFigures`");
    expect(paragraph).toContain(`**${countWord(entries)}**`);
    expect(paragraph).toContain("`docs.test.ts`");
    expect(paragraph).not.toContain(
      "holds every figure this page states in the present tense",
    );
  });
```

Import `documentedFigures` and `documentedTierFigures` from `./figures.js`
(the file already imports `tierSurfaces` from it). `countWord` is the local
helper at `docs.test.ts:313`; `sixteen` is in its table.

### 3.6 `TODO.md`, plan index

- Add a ticked row under *Design tokens and theming (`tokens-theme`)* describing
  the unit and citing plan 544.
- Add `| [544](./544-quoted-figure-extent.md) | The catalogue's quoted tightest
  figures are measured on ten of twenty-four sets | F | 380, 387, 388, 536–538 |
  done |` to the `tokens-theme` table and a short prose paragraph to the index
  tail, in the same voice as the 543 entry.
- Update the section's progress fraction.

## 4. Test plan — prove both directions

### 4.1 Baseline probe (already run for this plan)

A throwaway `src/zz-probe.test.ts` measured each quoted pair over
`shippedThemes` and over the ten-set list. Results over all twenty-four sets:

| Pair | Full-set minimum |
| ---- | ---------------- |
| `primaryText` / `selected` | Dark · Linux, 5.6751 |
| `foreground` / `selected` | Dark · Linux, 8.4420 |
| `popoverForeground` / `selected` | Dark · Linux, 8.9840 |
| `selectedForeground` / `active` | Light · macOS, 6.2180 |
| `selectedForeground` / `accent` | Light · macOS, 6.9293 |
| `successText` / `muted` | Light · Windows 7 (Aero light), 7.6846 |
| `mutedForeground` / `destructiveSoft` | Light · Windows 7 (Aero light), 6.6077 |
| `primaryText` / `destructiveSoft` | Light (identity light), 6.1886 |
| `border` / `input` | Dark · Linux, 1.2533 |
| `success` / `track` | Light · macOS, 3.0438 |
| solid status fill (all `statusFillPairs`) | Light · Windows XP, `warning` on `selected`, 1.2621 |

Every minimum is the set the published sentence names, so **no document value
and no ratio moves**. The probe file is deleted before the commit.

### 4.2 Both directions for the extent guard

1. Run the package suite before any edit:
   `nub run --filter @gpuixui/tokens test` → all files pass, exit `0`.
2. Apply §3.1 only. `nub exec vitest run src/docs.test.ts` →
   `measures a quoted figure on every shipped set` fails with
   `expected [ …(10) ] to have a length of 24`, and the three other quoted
   cases pass with unchanged values. This is the pre-fix direction.
3. Apply §3.2–§3.5. Re-run → the extent case passes at 24 unique labels and
   every quoted figure keeps its value.
4. Restore the ten-set list temporarily (local, uncommitted) → the extent case
   fails again; restore the derivation. Both directions are now demonstrated.

### 4.3 The ownership guard can fail

- Temporarily change `sixteen` to `seventeen` in the new paragraph →
  `names both suites that hold its figures, and the table's size` fails.
- Temporarily delete the `docs.test.ts` sentence → the same case fails.
- Restore both.

## 5. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/docs.test.ts       # every quoted case passes; extent case 24
nub run --filter @gpuixui/tokens test      # full package suite green
cd ../..
nub run check                               # check:tests, lint, fmt, check-types
nub run lint
nub run test                                # workspace gate
```

Expected: `docs.test.ts` passes with no assertion value changed; the full suite
has one more case than before (the extent case) and the same file count; all
gates pass.

## 6. STOP conditions

Stop and report rather than improvising if:

- any quoted figure changes when measured over the full enumeration. That would
  mean the page is false today, not merely unguarded: the plan then becomes a
  colour/document fix and must record the failing set and ratio in this plan
  before touching a value. (The §4.1 probe says this does not happen.)
- the status-label AAA minimum does not come out as `identity light high
  warningText on active` at 7.370 because the enumeration order changed — do not
  reorder `shippedThemes`; report it, because the page's sentence names that set.
- `documents["docs/tokens.md"]` cannot see the new paragraph because
  `markdownProse` normalisation differs — adapt the slice to the normalised
  text, never loosen the assertion to a bare word.
- a change outside `packages/tokens/src/docs.test.ts`, `docs/tokens.md`,
  `TODO.md` and the plan index seems necessary. Cross-team work goes to
  `TODO.md` as a row; do not edit another workstream's tree.
- a gate fails for a pre-existing reason unrelated to this change: record it and
  stop rather than “fixing” another workstream.

## 7. Acceptance criteria

- `quotedSets` derives from `shippedThemes`; the extent case proves 24 unique
  labels and fails on the pre-544 list.
- The alpha-hover figures narrow explicitly to the light default sets, with a
  comment stating why, and their six values are unchanged.
- The status-label case reads `quotedSets` and keeps both published figures.
- `docs/tokens.md` names `figures.ts`, `figures.test.ts`, both table exports,
  the table's derived size and `docs.test.ts`, and the old universal claim is
  gone; the ownership case fails without those.
- No colour role, pair, floor, metric, platform style, recipe or theme value
  moves; all 24 shipped sets still pass `themeFailures`.
- The plan is indexed, the `TODO.md` row is ticked, and the commit is on
  `agent/tokens-theme` and pushed.

## 8. Rollback

Revert the commit. No runtime value moved, so a revert restores the ten-set
figure list and the stale ownership sentence with no migration.
