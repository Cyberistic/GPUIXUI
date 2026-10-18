# 341 — The combobox check on a highlighted option

Phase: F (contrast completeness) · Workstream: `tokens-theme` ·
Depends on: 071–095, 300, 306–332, 339–340 · Block: `300–399` (free)

## 1. The defect

`ComboboxItem` (`packages/components/src/combobox.tsx`) marks the selected option
with a check glyph painted from `theme.colors.primary`:

```tsx
{selected ? (
  <Icon name="check" color={theme.colors.primary} size="sm" label="Selected" />
) : null}
```

The row's own fill changes with the pointer: `rowStyle` paints
`backgroundColor: state.highlighted ? theme.colors.hover : undefined`. When the
selected option is highlighted, the check is `primary` on the `hover` wash.
`markPairs` (plan 332) measures `primary` as a glyph on the plain surfaces —
`background`, `card`, `popover`, `muted` — and on the slider thumb's `input`
fill, but **not** on the row wash a highlighted option paints. So a copied
platform style could set `primary` close to `hover` and erase the selection
check exactly while the pointer is on the row, while `themeContrastFailures`
returns `[]`.

This is the last painted mark composition plan 332 left out, and it is the
correct mark in the right role: the sibling menu checkbox is the one that paints
`accent` instead (plan 339 records that consumer fix).

## 2. Measured baseline

Across the 24 shipped colour sets, `primary` on `hover` already clears the
`mark` floor, so **no colour moves**:

| Pair | Floor (default / high) | Tightest shipped | Theme |
| ---- | ---------------------- | ---------------- | ----- |
| `primary` on `hover` | 3 / 4.5 | **3.111:1** | `darwin` dark default |
| `primary` on `hover` | 3 / 4.5 | **8.675:1** | `identity` dark high |

Next-tightest default sets: macOS light 3.846, Linux light 3.934, Aero light
4.725. The pair count is `305 + 1 = **306**`.

## 3. Files to change

### 3.1 `packages/tokens/src/contrast.ts`

Add the pair to `markPairs` after the thumb's rings, with a comment naming the
composition:

```ts
/** A selected combobox option's check glyph on the wash it highlights with. */
const comboboxCheckPairs: readonly ContrastPair[] = [
  ["primary", "hover", "mark"],
];
```

Spread `...comboboxCheckPairs,` at the end of `markPairs`. Export nothing new:
`markPairs` is already public, and adding a private list keeps the catalogue at
its current size.

Extend the `markPairs` comment with one sentence: a selected combobox option
marks itself with a `primary` check on the `hover` wash it paints while
highlighted.

### 3.2 `packages/tokens/src/contrast.test.ts`

`expect(contrastPairs.length).toBe(305)` → `306`.

### 3.3 `packages/tokens/src/combobox-check-mark.test.ts` (new)

Header comment states the guarded bug: a selected combobox option paints a
`primary` check on the `hover` wash while highlighted, and `markPairs` covered
the plain surfaces but not the row wash. State that every shipped set passes
(3.111:1 at the tightest) so no colour moves, and that the menu checkbox's
`accent` glyph is a different, cross-team finding (plan 339).

Build the 24-set `themes` array as `invalid-ring.test.ts`.

Cases:

1. **The contract names the check on its row wash once.** Filter `contrastPairs`
   for `[primary, hover, mark]`; assert exactly one entry, and that it is in
   `markPairs`.
2. **Every shipped theme clears its declared mark floor.** For each theme,
   `contrastRatio(theme.colors.primary, theme.colors.hover) >=
   contrastFloors[theme.contrast].mark`; collect failures as strings and assert
   `[]`.
3. **The erased check is reported.** `extendTheme(getTheme("light"), { colors: {
   primary: getTheme("light").colors.hover } })`, filter
   `themeContrastFailures` to `foreground === "primary" && background ===
   "hover" && pairClass === "mark"`; assert exactly one failure with floor
   `contrastFloors.default.mark` and ratio `toBeCloseTo(1, 5)`.
4. **The AAA level is the declared one.** The same regression from
   `getTheme("dark", "high")`; assert floor `contrastFloors.high.mark` (4.5) and
   ratio 1 with no second argument.
5. **Pin the tightest figures the catalogue quotes.** Reduce the 24 themes to the
   worst default and the worst AAA; assert `["darwin dark default", 3.111]` and
   `["identity dark high", 8.675]` with `Number(ratio.toFixed(3))`.

### 3.4 `packages/tokens/src/docs.test.ts`

- `ends the pair-count history at the contract's shipped size`: the fixed start
  becomes `taking it from 305 to **${contrastPairs.length}**`.
- `names the audit series through the latest plan`: `plans \`076\`–\`340\` closed`
  → `076`–`341`.

### 3.5 `docs/tokens.md`

- The mark paragraph: add a sentence that a selected combobox option's check is
  a `primary` mark on the `hover` wash it highlights with, so it must stay
  visible while the pointer is on the row.
- Pair-count history: after the plan-340 sentence add “Plan `341` adds the
  combobox check glyph on the `hover` row wash, taking it from 305 to **306**.”
- The audit-series sentence names plan `341`.

### 3.6 `COMPONENTS.md`

- `Theme contrast check` row: `the same 305 contrast pairs` → `the same 306
  contrast pairs`.
- Append after the plan-340 sentence: “Plan 341 holds a selected combobox
  option's `primary` check on the `hover` wash it highlights with (305 → 306
  pairs).”

### 3.7 `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)”:

```
`[x]` Hold the combobox's selected check on the row wash — `ComboboxItem` marks
a selected option with a `primary` check and `rowStyle` paints `hover` behind it
while highlighted, but `markPairs` measured `primary` only on the plain surfaces
and the slider thumb; every shipped set passes (3.111:1 at the tightest), so no
colour moves and the contract grows 305 → 306 (plan 341)
```

Bump the section bar by one (`108/141` → `109/142`).

### 3.8 `.agents/slop/plans/README.md`

- Table row after 340:

```
| [341](./341-combobox-check-mark.md) | The combobox check on a highlighted option | F | 071–095, 300, 306–332, 339–340 | done |
```

- A rationale paragraph after the 340 paragraph: the selected option's check is
  the correct role — `primary` — but it is painted on the `hover` wash the row
  highlights with, which the mark contract did not measure; the pair is a guard
  (3.111:1 at the tightest), and the menu checkbox's `accent` glyph remains the
  cross-team finding plan 339 recorded.

## 4. Commands and expected results

From the worktree root on branch `agent/tokens-theme`:

```bash
nub run --filter @gpuixui/tokens test
```

Expected: **61 test files, all green** (60 before; the new file adds five cases).

```bash
nub run check
nub run lint
nub run test
```

Expected: all green. A failure outside `packages/tokens`, `docs/tokens.md`,
`packages/tokens/README.md`, `COMPONENTS.md`, `TODO.md` or the plan index belongs
to another workstream: stop and record it.

## 5. Two-directions proof

`scripts/verify-two-directions.sh` drives `jj`, which is not installed
(`PLAN.md` D1). Prove by hand:

1. With `...comboboxCheckPairs` commented out of `markPairs`, run
   `./node_modules/.bin/vitest run src/combobox-check-mark.test.ts` from
   `packages/tokens`. Expect **failure** in cases 1, 3 and 4 (the pair is missing
   and the erased check is not reported); cases 2 and 5 read the palette, so they
   still pass.
2. Restore the spread and re-run. Expect **green**.
3. Record both outputs in the commit message and in §8; do not claim the proof
   without running it.

## 6. STOP conditions

- Any shipped theme fails `primary` on `hover` at its declared mark floor. Then
  this is a palette defect, not a guard: record the set and ratio, write a
  follow-up plan that moves the value, and do not move a colour in this plan.
- `contrastPairs.length` is not 305 before the change, or `[primary, hover, mark]`
  already exists. Re-read the branch; a peer may have landed the same plan.
- A test outside the listed files must change to make the suite green. Stop and
  record it as a cross-team task in `TODO.md`.
- A peer `tokens-theme` session is writing the same files: this worktree has
  documented concurrent writers
  (`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`). If
  `git status` shows changes you did not make, stop and reconcile before
  committing; never `git add -A` over a peer's edits.

## 7. Acceptance criteria

- `primary` on `hover` is a documented `mark` pair, exactly once.
- All 24 shipped colour sets pass it; no token value moves.
- `contrastPairs.length` is 306 and every document, ledger row and guard that
  states it agrees.
- The new test fails without the pair and passes with it (both directions
  observed).
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` pass; the work is committed on `agent/tokens-theme` and pushed.

## 8. Outcome (recorded by the executor)

- Baseline confirmed by a probe over the 24 shipped sets: tightest default is
  `darwin` dark at **3.111:1**, then macOS light 3.846 and Linux light 3.934;
  tightest AAA is **8.675:1** on the dark AAA sets. All clear 3:1 / 4.5:1, so no
  shipped value moved.
- Two directions observed: with `...comboboxCheckPairs` commented out,
  `combobox-check-mark.test.ts` reported **3 failed | 2 passed (5)**; restored,
  **5 passed**.
- Green, run not assumed: **61 test files, 3846 tests**,
  `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test`.
