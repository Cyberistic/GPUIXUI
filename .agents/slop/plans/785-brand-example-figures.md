# Plan 785 — the brand example's quoted figures have one owner

**Workstream:** `tokens-theme`. **Phase:** F (truth maintenance).
**Depends on:** 098 (the brand example), 310 (the recipe edit), 526 (the dialog
face), 536/544/760 (the figure table), 698 (the selected-option check).
**Owns:** `packages/tokens/src/brand-figures.test.ts` (new),
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`packages/tokens/src/brand-theme.example.ts`, `TODO.md`.

---

## 1. The defect

The executed brand example is the extension story: a consumer copies
`src/brand-theme.example.ts`, edits it, and ships it. Four documents quote three
figures about that example in the present tense, and **no test derives any of
them**:

| Figure | Where it is quoted | What it measures |
| ------ | ------------------ | ---------------- |
| **4.24** / **4.243** | `docs/tokens.md` (*Theme API*), `docs/design-system.md` §3, `brand-theme.example.ts` header | the inherited dark `primaryForeground` on the pre-098 brand fill — the cost the "move the family" rule exists to prevent |
| **3.146** | `docs/tokens.md`, `packages/tokens/README.md`, `brand-theme.example.ts` header | `primary` as the selected option's check on the `selected` fill the brand inherits |
| **1.157** | `docs/tokens.md`, `packages/tokens/README.md`, `brand-theme.example.ts` header | the dialog face (`popover`) over the identity scrim composited with the brand's primary action |

Evidence, measured on this branch (`7045` tests, all green):

```sh
# falsify two of the three figures in the catalogue
sed -i '' 's/measured 4\.24:1 on its original brand fill/measured 4.99:1 on its original brand fill/' docs/tokens.md
sed -i '' 's/\*\*3\.146:1\*\*/**3.199:1**/' docs/tokens.md
nub run --filter @gpuixui/tokens test   # 7045 passed — the suite stays green
```

`docs.test.ts` pins the **1.157** catalogue sentence only (`pins the brand
scrim's documented figures`), `theme.test.ts` pins **3.146** numerically
(`keeps the brand's selected-option check on the fill it marks`) but never
against a sentence, and nothing reads the README's two copies, the design
system's one, or the example's own header. So a later palette step can move a
figure and leave three documents quoting the old number — the failure mode
plans `536`, `544` and `760` closed for *shipped-theme* figures.

Why this is not a `documentedFigures` entry: that table names a shipped theme
as its provenance (`ShippedThemeProvenance`), and the brand example is an
executed example, not a shipped set — its primary family is not in
`shippedThemes`. The 4.24 figure is historical on top of that: plan 098 moved
the example's fill, so the measured composition is the **pre-098 fill**
`#7C5CFF` with the dark theme's `primaryForeground`, which is still
`palette.neutral[950]` (`#11141A`).

## 2. Decisions

- **D1 — one new suite, not a figures-table entry.** `brand-figures.test.ts`
  owns the three figures and reads all four documents. Extending
  `DocumentedFigure` with an example-theme source would change a 39-entry table
  and every consumer for three entries; the split is stated in the new suite's
  header.
- **D2 — the historical fill is written out, the role is derived.** The 4.24
  composition is `contrastRatio(getTheme("dark").colors.primaryForeground,
  "#7C5CFF")`: the role follows the theme (a palette edit must fail), the
  retired fill is a literal with a comment naming plan 098 — the pattern
  `docs.test.ts` already uses for pre-091 soft fills.
- **D3 — assert sentences with the derived figure, not the whole paragraph.**
  Each document gets one `toContain` per claim, built from the derived value at
  the precision that document uses (2 dp in the two prose pages, 3 dp in the
  README and the example header). Rewording stays free; a stale digit fails.
- **D4 — no token value moves.** Every figure is already correct today
  (`4.243`, `3.146`, `1.157`); this plan adds an owner, not a palette edit.

## 3. Files and steps

### 3.1 Create `packages/tokens/src/brand-figures.test.ts`

Header comment (required: state the bug the suite guards):

- the three figures, the four documents, and the probe above — falsifying the
  catalogue's 4.24 and 3.146 left `7045` tests green;
- why the suite is not `documentedFigures` (D1) and that the pre-098 fill is a
  written-out literal (D2).

Code, in this order:

1. `node:fs` reads of the four documents, keyed by path (the pattern every
   docs suite in the package uses; `node:fs` is deliberate — the package ships
   zero runtime dependencies).
2. `const inherited = contrastRatio(getTheme("dark").colors.primaryForeground, "#7C5CFF")`
   with a comment naming plan 098 as the reason the fill is a literal.
3. `const selectedCheck = contrastRatio(brandTheme.colors.primary, brandTheme.colors.selected)`.
4. `const face = contrastRatio(brandTheme.colors.popover, compositeOver(brandTheme.colors.overlay, brandTheme.colors.primary))`.
5. Cases:
   - **pins the three figures** — `toBeCloseTo(4.243, 2)`, `toBeCloseTo(3.146, 3)`,
     `toBeCloseTo(1.157, 3)`, and that the brand keeps the identity scrim
     (`brandTheme.colors.overlay === getTheme("dark").colors.overlay`), which is
     what makes the face figure the brand's.
   - **the catalogue quotes them** — `measured 4.24:1 on its original brand fill`,
     `**3.146:1** without repainting the selection`,
     `measures **1.157:1** over the base 65% scrim` (figures interpolated from
     the derivations, not typed).
   - **the design system quotes it** — `measured 4.24:1 on its brand`.
   - **the README quotes both current figures** — `clears it at 3.146:1` and
     `the face measures 1.157:1 over the identity 65% scrim`.
   - **the example header quotes all three** — `measured 4.243:1 on the original
     fill`, `clears it at 3.146:1 without repainting`, and
     `a dialog's face measures 1.157:1 over`.
   - **the falsified figures the probe used stay out** — the catalogue does not
     contain `4.99:1` beside the inherited-foreground claim or `3.199:1`; this
     is the case that proves the sentence matcher can fail (the guidance is a
     guard, not a tautology).

### 3.2 Check the prose

If a figure has drifted, the new suite fails; correct the **document** to the
derived value — never the test. Today all three are current, so no prose changes
are expected. If a sentence needs a reword to stay readable with the figure, keep
the figure adjacent to the composition it names (the rule plans 536/760 applied).

### 3.3 Tick the ledger

Add a ticked row to `TODO.md` under *Design tokens and theming*: the brand
example's three published figures have one owner (`brand-figures.test.ts`), the
defect (two falsified figures left `7045` tests green), and "no colour, pair,
floor, metric or shipped theme moves (plan 785)".

## 4. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/brand-figures.test.ts   # the new suite: all cases pass
nub run --filter @gpuixui/tokens test           # 7046+ passed, 0 failed
cd ../..
nub run check                                   # check:tests, lint, fmt, check-types all pass
```

## 5. Test plan — both directions

1. **Fails without the guard.** Before adding the suite, run the probe in §1 and
   record `7045 passed`.
2. **The new suite can fail.** With the suite in place, mutate each figure in
   each document in turn and confirm the suite fails with the document's name:
   - `docs/tokens.md` 4.24 → 4.99, 3.146 → 3.199, 1.157 → 1.199;
   - `docs/design-system.md` 4.24 → 4.99;
   - `packages/tokens/README.md` 3.146 → 3.199, 1.157 → 1.199;
   - `brand-theme.example.ts` 4.243 → 4.999, 3.146 → 3.199, 1.157 → 1.199.
   Restore after each (`git checkout -- <file>`).
3. **A palette edit fails the suite.** Move the brand fill
   (`brand-theme.example.ts` `primary`) and confirm the derived figures and the
   sentences disagree — that is the regression this suite exists for.
4. **Nothing else moves.** `git diff --stat` shows one new test file and the
   `TODO.md` row only; `contrastPairs` stays `470` and no theme value changes.

## 6. STOP conditions

- A figure has **already** drifted: fix the document, not the test, and record
  the correction in the plan's §3.2 and the TODO row. If more than one has
  drifted, stop after the suite is green and report — that means a palette step
  landed without its documents.
- The sentences cannot be matched without pinning a whole paragraph: assert the
  claim phrase plus the derived figure only (D3); do not copy the paragraph.
- Any temptation to change a token value: stop. This plan changes documentation
  ownership only.

## 7. Acceptance

- `brand-figures.test.ts` exists, states the bug in its header, and derives all
  three figures from the package.
- Each of the four documents is held to every figure it quotes.
- Both directions verified per §5, with the exact commands and their results
  recorded in the commit message.
- `nub run check` and the tokens suite pass; no colour, pair, floor, metric or
  shipped theme moves.
- `TODO.md` carries the ticked row.
