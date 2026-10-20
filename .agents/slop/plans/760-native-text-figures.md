# 760 — The native-text figures have one owner

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `071` (the contrast contract), `544` (every quoted figure on every shipped set), `569`–`592`/`649` (the native text contract), `717` (the figure table) |
| Feeds | every future palette edit, the catalogue's §Native text documents, the ledger's Theme contrast row |

## 1. The bug

`docs/tokens.md` §*Native text documents* quotes five figures in the present
tense with no derivation behind them. Falsifying any one of them in place leaves
every suite green — the same defect plan `717` fixed for five other figures:

| Page sentence | Figure | What it claims |
| ------------- | ------ | -------------- |
| "Every shipped set clears the opaque floor; the tightest is `primaryText` at **7.706:1** (`Light`)." | `7.706` | the minimum of `nativeSyntaxPairs` across the 24 shipped sets |
| "The ink wash is held for every syntax role on the same four tones; the tightest is `successText` at **7.110:1** (`Light · macOS`)." | `7.110` | the minimum of every syntax role on `nativeInk(tone, 0.035)` across the 24 sets |
| "and the tightest shipped pair is **7.102:1** (`Light · Windows XP`)." | `7.102` | `primaryText` on the `accent` a native inline-code run paints, across the 24 sets |
| "The tightest tinted pair is **7.008:1** (`Light`, `primaryText` on the `destructiveText` tint)." | `7.008` | the minimum of every syntax role on the 5.5% `destructiveText` diff tint across the 24 sets |
| "`successText`'s string token 5.813:1 in identity dark" | `5.813` | the word-level 28% self-wash composition on the code block's `card` |

`COMPONENTS.md`'s Theme contrast row quotes plan `574`'s tightest pair as
**opaque 7.562:1, inked 7.008:1**. Later palette plans moved both values — the
shipped minima are **7.706:1** and **7.110:1** — so the ledger now states a
figure the package no longer produces. That is the failure mode plans `313`,
`536`, `617` and `664` exist to stop, one row over.

The fifth figure is also wrong by a rounding step: the composition measures
**5.813 852…**, which rounds to **5.814**, not `5.813`. It was written before a
later palette move, and no test read it.

`figures.ts` cannot express the ink wash at all: its kinds composite a *theme
role* over the surface, while the runtime's ink is black on a light tone and
white on a dark one (`nativeInk`, `nativeInkOpacity`). That is why the section
was skipped when plan `717` built the table.

## 2. Design

1. **One new kind, one new measurement.** `FigureKind` gains `"ink"`: the
   pair's foreground is painted *whole* on the runtime's fixed ink wash over the
   background role, composited at `composition.opacity`. It calls the runtime
   bridge's own `nativeInk` — not a second copy of the black/white rule — so the
   table and `themeNativeTextFailures` measure the same paint.
2. **The table carries the theme, not its colours.** `measure`/`within` take the
   `Theme` (they only need `theme.colors` today; `nativeInk` needs the theme to
   pick its ink). This is an internal signature change in `figures.ts`; no
   public export changes.
3. **Seven entries** in `documentedFigures`:
   - `docs/tokens.md`: the four tightest figures above and the word-wash value.
   - `COMPONENTS.md`: the ledger's opaque and inked tightest figures.
   The opaque pair list is `nativeSyntaxPairs`; the ink and tint lists derive
   from `Object.values(nativeSyntaxRoles)` on `nativeTextSurfaces`, the same
   derivation the checker walks, so a fifth capture class joins them.
4. **Two page corrections, no colour moves:**
   - `docs/tokens.md`: `5.813` → `5.814`; the table's size `**49**` → `**56**` (the count is guarded by `docs.test.ts`).
   - `COMPONENTS.md`: the plan-574 parenthetical becomes the derived figures,
     with the set and the pair each was measured on: "at the tightest: opaque
     **7.706:1** (`Light`, `primaryText` on `background`) and inked
     **7.110:1** (`Light · macOS`, `successText` on `background`)".
5. **The ledger names the plan** in the Theme contrast row, in the row's own
   convention.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/figures.ts` | `"ink"` kind; `measure`/`within`/`derivedAt`/`deriveFigure`/`tightestProvenance` take a `Theme`; import `nativeInk`/`nativeInkOpacity` and `nativeSyntaxRoles`/`nativeTextSurfaces`; seven entries |
| `packages/tokens/src/figures.test.ts` | `"ink"` joins the composition rule; the ink case compares the table with `nativeInk`; the ticked-tint case proves the destructive tint is the tighter one; the stale digits (`5.813`, ledger `7.562`, inked `7.008`) are rejected per entry |
| `docs/tokens.md` | `5.813` → `5.814`; `**49**` → `**56**` |
| `COMPONENTS.md` | plan-574 parenthetical → derived figures and their pairs; Theme contrast row names plan `760` |
| `TODO.md` | a new ticked row under *Design tokens and theming* |
| `.agents/slop/plans/README.md` | this plan's index row |

## 4. Commands and expected results

Run from `packages/tokens` unless stated.

```sh
nub exec vitest run src/figures.test.ts
# expected: all cases green, including the new entries' `derives …` cases
nub exec vitest run src/docs.test.ts
# expected: green — the page's table size now says 56
nub run --filter @gpuixui/tokens test
# expected: 208 files / 6999+ tests green
cd ../.. && nub run check && nub run lint
# expected: exit 0 each
```

## 5. Test plan, with both directions

New cases:

1. `derives the native syntax palette's tightest opaque pair` (automatic entry
   case) — the derived figure is `7.706` and the set is identity Light, and
   `tightestProvenance` agrees.
2. `derives the native syntax ink wash's tightest pair` — `7.110`, `Light ·
   macOS`; a second case asserts the ratio equals
   `contrastRatio(theme.colors.successText, nativeInk(theme, "background",
   nativeInkOpacity))` for that set, so the kind cannot measure a different
   paint than the checker.
3. `derives the native inline code's tightest pair` — `7.102`, `Light · Windows
   XP`.
4. `derives the native syntax on the destructive diff tint` — `7.008`, identity
   Light; a case derives the same composition on the `successText` tint and
   asserts it is **higher** (`7.050`), so "the tightest tinted pair" names the
   tint that produces it.
5. `derives the word-level diff wash` — `5.814`, identity dark, `card`.
6. The ledger's two clauses — `7.706` opaque, `7.110` inked — in `COMPONENTS.md`.

Fail-without-the-fix proof (run each, then restore):

```sh
# 1. the rounding: the page must quote 5.814, not 5.813
sed -i '' 's/5\.814:1 in identity dark/5.813:1 in identity dark/' ../../docs/tokens.md
nub exec vitest run src/figures.test.ts   # expected: FAIL on the word-wash entry
# restore

# 2. the ledger's stale digits
#   replace "opaque **7.706:1**" with "opaque **7.562:1**" and
#   "inked **7.110:1**" with "inked **7.008:1**" in COMPONENTS.md
nub exec vitest run src/figures.test.ts   # expected: FAIL on both ledger entries
# restore

# 3. the kind is the paint: change the ink entry's opacity to 0.05
nub exec vitest run src/figures.test.ts   # expected: FAIL (derived 7.0…, page 7.110)
# restore
```

Before this plan, steps 1–3 pass with the wrong value in place (step 1 does
today), which is the bug.

## 6. STOP conditions

- **Stop** if a derived figure differs from the page by more than rounding — a
  different composition is a different finding, not a digit to edit. Report the
  derived value, the composition the entry built and the sentence.
- **Stop** if any token value, pair, floor or metric would have to move. This
  plan changes no colour: every shipped set already clears every floor.
- **Stop** if `figures.ts` needs an import that creates a runtime cycle through
  `contrast.ts` (it must not: `native-text.ts` and `native-ink.ts` import only
  `color.ts`, `contrast.ts` and `theme.ts` types).
- **Stop** if `docs.test.ts`'s table-size case cannot be satisfied without
  rewriting a paragraph other than the `**49**` count.

## 7. Acceptance

- `figures.ts` states seven more figures than before (49 → 56 across both
  tables) and `docs.test.ts` agrees.
- Falsifying any of the five page figures or the ledger's two fails
  `figures.test.ts`.
- `docs/tokens.md` quotes 5.814, and the ledger quotes the shipped tightest
  opaque and inked pairs with their sets and pairs.
- No colour, pair, floor, metric, role or shipped theme moves.
- `nub run check`, `nub run lint` and the tokens suite are green.

## 8. Results (2026-10-20, darwin-x64)

All five page figures and the ledger's plan-574 pair were stale or unguarded
exactly as §1 states; the four page "tightest" figures were already correct, so
only the rounding figure and the ledger moved.

| Measurement | Shipped value | Before |
| ----------- | ------------- | ------ |
| opaque syntax minimum | **7.706** (`Light`, `primaryText` on `background`) | unguarded |
| 3.5% ink wash minimum | **7.110** (`Light · macOS`, `successText` on `background`) | unguarded |
| native inline-code pair | **7.102** (`Light · Windows XP`, `primaryText` on `accent`) | unguarded |
| pressed diff tint minimum | **7.008** (`Light`, `primaryText` on the `destructiveText` tint) | unguarded |
| 28% word wash on `successText` | **5.814** (identity dark, `card`) | page said 5.813 |
| ledger opaque / inked | **7.706 / 7.110** | quoted 7.562 / 7.008 |

The success tint's own minimum is 7.050, so the destructive tint is the tighter
of the row's two and the sentence names the right one.

Commands and results:

```sh
nub exec vitest run src/figures.test.ts      # 68 passed
nub exec vitest run src/docs.test.ts          # 224 passed
nub run --filter @gpuixui/tokens check-types  # Done
nub run --filter @gpuixui/tokens test         # 208 files, 7010 tests
nub run check                                 # exit 0 (check:tests, lint, fmt, types)
nub run lint                                  # exit 0
```

Both-directions runs: reverting the page's 5.814 to 5.813 failed the word-wash
entry and the stale-digit case; restoring the ledger's 7.562/7.008 failed both
ledger entries and the stale-digit case; setting the ink entry's opacity to 0.05
failed the entry and the bridge case. Each was restored before the green run.

No colour, pair, floor, metric, role or shipped theme moves; `contrastPairs`
stays 470.
