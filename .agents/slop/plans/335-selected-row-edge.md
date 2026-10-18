# 335 — The control edge on the selected row fill

Phase: F (docs-truth and contrast completeness) · Workstream: `tokens-theme` ·
Depends on: 080, 097, 309, 312, 316, 318, 327, 334 · Block: `300–399` (free)

## 1. The defect

Two related gaps, one in the contract and one in the guard that should have
caught the first.

### 1.1 The pair

`list.tsx` paints a selectable row's persistent fill with `selected`:

```tsx
backgroundColor: theme.colors.selected,
color: theme.colors.selectedForeground,
```

A row's children are arbitrary. The `outline` Button variant in
`packages/primitives/src/core/variants.ts` paints **no fill at rest** — only
`border` — so an outline action inside a selected row paints its edge directly
on `selected`; a separator inside the row paints the same pair. The contract
measures `border` on `hover`, `active` and `accent` (`controlFillPairs`, the
three row fills an outline control steps through) but **not** on `selected`, the
one row fill that persists while the pointer is elsewhere. So a copied platform
style or brand theme can set `selected` to the divider's own value and erase the
only outline an action has, while `themeContrastFailures` returns `[]`.

This is the same class of gap plans 316 and 322 closed one role over, and the
`selected` row is the most persistent of the four fills.

### 1.2 The guard that hid it

`packages/tokens/src/docs.test.ts` has a case named
`names every fill the control edge is held against`. It filters `contrastPairs`
through a **hand-typed list of six**:

```ts
[
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "hover",
  "active",
  "accent",
].includes(background)
```

Plan 327 added `border` on `accentHover` and `accentActive`; the filter never saw
them, so the Verification paragraph in `docs/tokens.md` still lists six fills
while the design-system floor table and the package README list eight. The test
stayed green because it only ever checked the names it already knew. That is the
defect plan 326 fixed for the contract's *counts*: a document must be checked
against the contract, not against a copy of it.

## 2. Measured baseline

Across the 24 distinct shipped colour sets (identity, the three real platform
variants and the XP/Aero recipes, each in light/dark and default/high) the new
pair already clears its floor, so **no colour moves**:

| Pair | Floor (default / high) | Tightest shipped | Theme |
| ---- | ---------------------- | ---------------- | ----- |
| `border` on `selected` | 1.05 / 3 | **1.113:1** | `win32` dark default (the XP/Aero dark halves are the same palette) |
| `border` on `selected` | 1.05 / 3 | **5.158:1** | `identity` light high (every AAA light set) |

Next-tightest default sets: `win32` light 1.146, identity dark 1.171, Linux
light 1.191. The pair count is `292 + 1 = **293**`.

## 3. Files to change

### 3.1 `packages/tokens/src/contrast.ts`

After `controlFillPairs`, add the pair as a named one-entry list, the way
`fieldEdgePairs` holds its single pair:

```ts
/**
 * The selected row fill an outline control keeps its edge on. A selectable row
 * paints `selected` behind its children and the outline Button variant paints
 * no fill at rest — only a `border` edge — so the edge lands on the row, as
 * does a separator inside one.
 */
const selectedRowEdgePairs: readonly ContrastPair[] = [
  ["border", "selected", "divider"],
];
```

In `contrastPairs`, immediately after `...controlFillPairs,`, spread
`...selectedRowEdgePairs,`.

Extend the `contrastPairs` doc comment (the long block above the array) with one
sentence: the decorative divider is also measured on the `selected` fill an
outline action sits on in a selected row, because that row fill persists while
the pointer is elsewhere.

### 3.2 `packages/tokens/src/contrast.test.ts`

`expect(contrastPairs.length).toBe(292)` → `293`.

### 3.3 `packages/tokens/src/selected-row-edge.test.ts` (new)

Header comment states the guarded bug: the contract measured the outline
control's edge on `hover`, `active` and `accent` but not on the persistent
`selected` row fill, so an edited theme could erase an outline action inside a
selected list or tree row while the checker returned `[]`. State that no colour
moves and that plan 335 also makes the documentation guard total.

Build the same `themes` array as `secondary-wash-text.test.ts` (identity + the
three real platforms + both recipes, `themeModes × themeContrasts` = 24).
Import `contrastFloors`, `contrastPairs`, `contrastRatio`, `extendTheme`,
`getPlatformRecipeTheme`, `getPlatformTheme`, `getTheme`, `platformNames`,
`platformRecipeNames`, `themeContrastFailures`, `themeContrasts`, `themeModes`
and `type Theme` from `./index.js`.

Cases:

1. **The contract names the edge on every row fill once.** Filter
   `contrastPairs` for `border` and keep the four row fills
   `["hover", "active", "accent", "selected"]`; assert the `[background,
   pairClass]` pairs are exactly those four, each `divider`, in that order.
2. **Every shipped theme clears its declared divider floor.** For each theme,
   `contrastRatio(theme.colors.border, theme.colors.selected) >=
   contrastFloors[theme.contrast].divider`; collect failures as strings and
   assert `[]`.
3. **The erased edge is reported.** `extendTheme(getTheme("light"), { colors: {
   selected: getTheme("light").colors.border } })`, filter
   `themeContrastFailures` to `foreground === "border" && background ===
   "selected"`; assert one failure, class `divider`, floor
   `contrastFloors.default.divider`, ratio `toBeCloseTo(1, 5)`.
4. **The AAA level is the declared one.** The same regression from
   `getTheme("dark", "high")`; assert floor `contrastFloors.high.divider` and
   ratio 1 with no second argument.
5. **Pin the tightest figures the catalogue quotes.** Reduce the 24 themes to
   the worst default and the worst AAA ratio; assert
   `["win32 dark default", 1.113]` and `["identity light high", 5.158]`
   (`Number(ratio.toFixed(3))`).

### 3.4 `packages/tokens/src/docs.test.ts`

- The pair-count history now ends at 293: in
  `ends the pair-count history at the contract's shipped size`, the fixed start
  becomes `taking it from 292 to **${contrastPairs.length}**`.
- `names the audit series through the latest plan`: `plans \`076\`–\`334\` closed`
  → `076`–`335`.
- Replace the hand-typed filter in `names every fill the control edge is held
  against` with a derived one:
  - collect every `border` background from `contrastPairs`;
  - drop the plain surfaces (`background`, `card`, `popover`, `muted`, `input`,
    `disabled`) and the soft status fills (names ending `Soft`);
  - assert the result is exactly
    `["secondary", "secondaryHover", "secondaryActive", "hover", "active",
    "accent", "accentHover", "accentActive", "selected"]`;
  - build the expected sentence from the first eight and assert the paragraph
    contains `the <eight> fills a bordered control paints, on the \`selected\`
    fill an outline action sits on in a selected row`.
- In the design-system floor-row list (the `decorative dividers` row string),
  insert `the \`selected\` fill an outline action sits on in a selected row,`
  before `the \`disabled\` fill a disabled control keeps its edge on`.

### 3.5 `docs/tokens.md`

- Pair-count history, after the plan-334 sentence: “Plan `335` adds the control
  edge on the `selected` fill an outline action sits on in a selected row,
  taking it from 292 to **293**.”
- Verification paragraph: replace the six-fill clause with the eight fills plus
  the selected sentence:

  ```
  on the `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active`,
  `accent`, `accentHover` and `accentActive` fills a bordered control paints, on
  the `selected` fill an outline action sits on in a selected row,
  ```

  Keep the surrounding “if a decorative `border` is imperceptible … or on the
  four soft status fills …” grammar intact.

### 3.6 `docs/design-system.md`

- §8, “A bordered control keeps its `border` edge …”: list all eight designed
  fills, then add one sentence — an outline action inside a selected row paints
  the same edge on the row's persistent `selected` fill, so the divider floor
  covers that fill too; the row fill is the one a control does not paint itself.
- §9 floor table, `decorative dividers` row: insert
  `the `selected` fill an outline action sits on in a selected row,` before
  `the `disabled` fill …`.

### 3.7 `packages/tokens/README.md`

Add the same `selected` clause to the sentence that lists the fills a bordered
control paints its edge on, keeping it one sentence.

### 3.8 `packages/tokens/src/readme.test.ts`

Update the expected sentence in `states the fills a bordered control paints its
edge on` to match §3.7 exactly.

### 3.9 `COMPONENTS.md`

- `Theme contrast check` row: `the same 292 contrast pairs` → `the same 293
  contrast pairs`.
- Append beside the plan-334 sentence: “Plan 335 holds the control edge on the
  `selected` row fill an outline action sits on, the one row fill the control
  does not paint itself (292 → 293 pairs).”

### 3.10 `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)”, after the plan-334 row:

```
`[x]` Hold the control edge on the selected row fill — `list.tsx` paints
`selected` behind arbitrary row children and the outline Button paints no fill
at rest, so an outline action or separator inside a selected row paints `border`
on that fill, which the contract measured only on `hover`/`active`/`accent`;
every shipped set passes (1.113:1 at the tightest), so no colour moves, the
contract grows 292 → 293, and the hand-typed six-fill filter that hid plan 327's
accent steps is now derived from the contract (plan 335)
```

Keep the progress bar current (`102/135` → `103/136`).

### 3.11 `.agents/slop/plans/README.md`

- Table row after 334:

```
| [335](./335-selected-row-edge.md) | The control edge on the selected row fill | F | 080, 097, 309, 312, 316, 318, 327, 334 | done |
```

- Rationale paragraph after the 334 paragraph: the selected row is a persistent
  fill painted behind arbitrary children; the outline Button variant paints no
  fill at rest, so its edge lands there; the pair is a guard (1.113:1 tightest),
  no colour moves, and the documentation guard now derives the fill list from
  the contract instead of a hand-typed six, which had hidden plan 327's accent
  steps.

## 4. Commands and expected results

From the worktree root, on branch `agent/tokens-theme`:

```bash
nub run --filter @gpuixui/tokens test
```

Expected: **57 test files, all green** (56 before; the new file adds five
cases). If any other file fails, stop and read the failure before touching it.

```bash
nub run check
```

Expected: `check:tests` reports every test asserts something; oxlint and oxfmt
are clean; `packages/tokens` and `packages/deploy` type-check.

```bash
nub run test
```

Expected: the workspace suite is green. A failure outside `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md` or `TODO.md` is
another workstream's: stop and record it rather than editing it.

## 5. Two-directions proof

`scripts/verify-two-directions.sh` drives `jj`, which is not installed
(`PLAN.md` D1). Prove by hand:

1. With `...selectedRowEdgePairs` commented out of `contrastPairs`, run
   `nub run --filter @gpuixui/tokens test -- src/selected-row-edge.test.ts`.
   Expect **failure** in cases 1, 3 and 4 (the pair is missing and the erased
   edge is not reported); cases 2 and 5 read the palette, so they still pass.
2. Restore the spread, re-run the file. Expect **green**.
3. Record both outputs in the commit message or the plan's outcome line; do not
   claim the proof without running it.

## 6. STOP conditions

- Any shipped theme fails `border` on `selected` at its declared floor. Then
  this is a palette defect, not a guard: record the set and ratio, write a
  follow-up plan that moves the fill or the divider, and do not move a value in
  this plan.
- `contrastPairs.length` is not 292 before the change, or `border` on `selected`
  already exists. Re-read the branch; a peer may have landed the same plan.
- The new docs sentence cannot be added without rewording an unrelated clause in
  `docs/tokens.md` or `docs/design-system.md`. Stop and record why; do not
  restructure the contract prose for one pair.
- A test outside the listed files must change to make the suite green. Stop and
  record it as a cross-team task in `TODO.md`.
- A peer `tokens-theme` session is writing the same files: this worktree has
  documented concurrent writers (`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`).
  If `git status` shows changes you did not make, stop and reconcile before
  committing; never `git add -A` over a peer's edits.

## 7. Acceptance criteria

- `border` on `selected` is a documented `divider` pair, exactly once.
- All 24 shipped colour sets pass it; no token value moves.
- `contrastPairs.length` is 293 and every document, ledger row and guard that
  states it agrees.
- The documentation guard derives the control-edge fills from `contrastPairs`,
  so a new edge pair cannot ship unmentioned again.
- The new test fails without the pair and passes with it (both directions
  observed).
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` pass; the work is committed on `agent/tokens-theme` and pushed.
