# 339 — The field's adornment text, and the check the accent cannot carry

Phase: F (contrast completeness) · Workstream: `tokens-theme` ·
Depends on: 059, 071–095, 300, 306–319, 335 · Block: `300–399` (free)

## 1. The defect

### 1.1 The unmeasured surface

`mutedForeground` is the secondary-text role. The contract measures it on the
four plain surfaces (`background`, `card`, `muted`, `popover`) and on the four
row washes a description can sit on (`hover`, `active`, `accent`, `selected`).
It does **not** measure it on the `input` fill — the one surface a field paints
for its own chrome.

Two shipped compositions paint the role there:

- `packages/components/src/time-picker.tsx` `TimePickerSeparator` paints the
  `:` between the hour and minute segments with
  `color: theme.colors.mutedForeground` directly on the field's `input` fill;
- `TimePickerClear` paints its `x` control and icon with the same role on the
  same fill.

So a copied platform style or brand theme can set `mutedForeground` close to
`input` and erase the time field's separator and clear affordance while
`themeContrastFailures` returns `[]`. This is the same class of gap plans 317,
319 and 320 closed one role or one surface over: the role is measured somewhere,
just not on the surface the component paints it on.

The same audit found no other field composition without a pair. The
`SearchInput`, `InlineEdit`, `ColorPicker`, `TagInput` and `MentionInput` fields
are transparent on a `Surface` tone, which plans 315–319 cover; the `FieldInput`
paints `inputForeground` on the `input` fill, which is measured.

### 1.2 The audit finding: the menu's check glyph

While auditing the roles painted on a menu surface, one shipped composition is
wrong in a way no pair can fix: `MenuCheckboxItem`
(`packages/components/src/menu/item.tsx:286`) paints its checked glyph with
`theme.colors.accent` — a **wash** — directly on the menu's `popover`, and on the
`hover`/`active` fill when the row is under the pointer. Measured across the 24
shipped colour sets, `accent` on `popover` is **1.11:1–1.39:1** and on `hover`
**1.00:1–1.08:1**, far under the 3:1 `mark` floor. In the identity light theme
the check is effectively invisible on a hovered row (1.000:1).

`accent` cannot become a mark without breaking its job: it is the pale selected
row / toggle fill, held to 1.05:1 as a surface. The correct fix is the row's own
text role — `popoverForeground` — which the contract already measures on
`popover`, `hover`, `active` and `selected` (plan 312) and which is what the
sibling `ComboboxItem` already does for its own check with `primary`. That file
belongs to `components`, so this plan records the fix as a cross-team row in
`TODO.md` and ships **no** pair that would fail the shipped palette.

### 1.3 Why no shipped pair moves

`mutedForeground` on `input` already passes everywhere — the tightest shipped
set is `win32` dark at **8.376:1**, the identity at 9.671:1, the light sets at
8.8–10.2:1 — so this plan adds a guard, not a palette change. The check-glyph
finding is a consumer bug, evidenced in the TODO row, not a token value.

## 2. Measured baseline

Across the 24 shipped colour sets (identity, the three real platform variants and
the XP/Aero recipes, each in light/dark and default/high):

| Pair | Floor (default / high) | Tightest shipped | Theme |
| ---- | ---------------------- | ---------------- | ----- |
| `mutedForeground` on `input` | 4.5 / 7 | **8.376:1** | `win32` dark default (XP/Aero dark share the palette) |
| `mutedForeground` on `input` | 4.5 / 7 | **8.759:1** | `aero` light default (tightest light) |
| `mutedForeground` on `input` | 4.5 / 7 | **14.723:1** | `identity` dark high (tightest AAA) |

The pair count is `293 + 1 = **294**`.

## 3. Files to change

### 3.1 `packages/tokens/src/contrast.ts`

After `secondaryTextPairs`, add a named one-entry list, the way
`fieldEdgePairs` holds its single pair:

```ts
/**
 * The field's own secondary text. A time picker paints the separator between
 * its segments and its clear control on the `input` fill with
 * `mutedForeground`, so the secondary floor applies to the surface a field
 * paints for its own chrome, not only to the four plain surfaces and the row
 * washes.
 */
const fieldSecondaryPairs: readonly ContrastPair[] = [
  ["mutedForeground", "input", "secondary"],
];
```

In `contrastPairs`, immediately after `...secondaryTextPairs,`, spread
`...fieldSecondaryPairs,`.

Extend the `contrastPairs` doc comment with one sentence: secondary text is also
measured on the `input` fill, because a time picker's separator and clear
control paint there.

### 3.2 `packages/tokens/src/contrast.test.ts`

`expect(contrastPairs.length).toBe(293)` → `294`.

### 3.3 `packages/tokens/src/field-adornment-text.test.ts` (new)

Header comment states the guarded bug: `mutedForeground` had pairs on the four
plain surfaces and the four row washes, but the `input` fill a time picker's
separator and clear control paint was unmeasured, so an edited theme could erase
them while `themeContrastFailures` returned `[]`. State that no shipped colour
moves and that the menu check-glyph finding is a cross-team row, not a pair.

Build the same 24-set `themes` array as `selected-row-edge.test.ts` (identity +
the three real platforms + both recipes, `themeModes × themeContrasts`), using
the `./index.js` barrel exports only.

Cases:

1. **The contract names secondary text on every surface it paints on once.**
   Filter `contrastPairs` for `mutedForeground`; assert the `[background,
   pairClass]` list is exactly
   `muted`, `background`, `card`, `popover`, `hover`, `active`, `accent`,
   `selected`, `input`, each `secondary`, in that order. This fails if the pair
   is duplicated or if the surface list changes silently.
2. **Every shipped theme clears its declared secondary floor.** For each theme,
   `contrastRatio(theme.colors.mutedForeground, theme.colors.input) >=
   contrastFloors[theme.contrast].secondary`; collect failures as strings and
   assert `[]`.
3. **The erased separator is reported.** `extendTheme(getTheme("light"),
   { colors: { mutedForeground: getTheme("light").colors.input } })`, filter
   `themeContrastFailures` to `foreground === "mutedForeground" &&
   background === "input"`; assert exactly one failure, class `secondary`,
   floor `contrastFloors.default.secondary`, ratio `toBeCloseTo(1, 5)`.
4. **The AAA level is the declared one.** The same regression from
   `getTheme("dark", "high")`; assert floor `contrastFloors.high.secondary`
   (7) and ratio 1 with no second argument.
5. **Pin the tightest figures the catalogue quotes.** Reduce the 24 themes to
   the worst default (`win32 dark default`, 8.376) and the worst AAA
   (`identity dark high`, 14.723) with `Number(ratio.toFixed(3))`.

### 3.4 `packages/tokens/src/docs.test.ts`

- `ends the pair-count history at the contract's shipped size`: the fixed start
  becomes `taking it from 293 to **${contrastPairs.length}**`.
- `names the audit series through the latest plan`: `plans \`076\`–\`335\` closed`
  → `076`–`339`.
- The design-system floor row for secondary text (around line 1191) gains the
  `input` clause described in §3.6.

### 3.5 `docs/tokens.md`

- Verification paragraph: the secondary-text clause becomes “muted text on
  `background`, `card`, `popover` and the `input` fill a field paints for its own
  chrome, and secondary text on the `hover`, `active`, `accent` and `selected`
  washes a row paints behind a description”.
- The `themeContrastFailures` list paragraph: after the field-edge sentence,
  add “Secondary text is measured on that same `input` fill — a time picker
  paints its separator and clear control there.”
- Pair-count history: after the plan-335 sentence add “Plan `339` adds secondary
  text on the `input` fill a field paints for its own chrome, taking it from 293
  to **294**.”
- The “muted text” sentence in the Verification section (`mutedForeground` on
  `background`, `card`, `popover`) gains `input`, and the audit-series sentence
  names plan `339`.

### 3.6 `docs/design-system.md`

- §9 floor table, secondary-text row: insert “the `input` fill a field paints for
  its own chrome,” after the plain surfaces and before the row washes, so the
  table matches the contract.

### 3.7 `packages/tokens/README.md`

Add the same `input` clause to the sentence that lists where secondary text is
checked, keeping it one sentence. No `readme.test.ts` edit is needed unless the
changed sentence is asserted there (it is not today).

### 3.8 `COMPONENTS.md`

- `Theme contrast check` row: `the same 293 contrast pairs` → `the same 294
  contrast pairs`.
- Append after the plan-335 sentence: “Plan 339 holds secondary text on the
  `input` fill a field paints for its own chrome — a time picker's separator and
  clear control — (293 → 294 pairs).”

### 3.9 `TODO.md`

1. Add the completed task under “Design tokens and theming (`tokens-theme`)”:

```
`[x]` Hold the field's own secondary text — a time picker paints its separator
and clear control with `mutedForeground` on the `input` fill, which the contract
measured only on the plain surfaces and the four row washes; every shipped set
passes (8.376:1 at the tightest), so no colour moves and the contract grows
293 → 294 (plan 339)
```

2. Add the cross-team row beside the other `components` rows:

```
`[ ]` Cross-team: `components` moves the menu checkbox item's check glyph off
`accent` — `menu/item.tsx:286` paints `theme.colors.accent` on the menu's
`popover` (1.11–1.39:1) and on the `hover`/`active` row fill (1.00–1.08:1),
under the 3:1 mark floor, so a checked item has no visible check; `accent` is a
wash, not a glyph. Use `popoverForeground` — the row's own text role, already
measured on `popover`/`hover`/`active`/`selected` — as `ComboboxItem` already
does with `primary` (plan 339; owner: `components`)
```

3. Bump the section bar by one (`106/139` → `107/140`).

### 3.10 `.agents/slop/plans/README.md`

- Table row after 335 (the last `tokens-theme` row):

```
| [339](./339-field-adornment-text.md) | The field's adornment text and the check the accent cannot carry | F | 059, 071–095, 300, 306–319, 335 | done |
```

- A rationale paragraph after the 335 paragraph: the field's secondary text was
  measured only on plain surfaces and row washes; the time picker's separator
  and clear control paint it on the `input` fill, so the pair closes the last
  surface of that role; every shipped set already passes, so no colour moves.
  The same audit found the menu's check glyph painted with `accent` at
  1.00–1.39:1 — a consumer bug recorded cross-team, because `accent` is a wash
  and cannot become a mark without breaking its surface role.

## 4. Commands and expected results

From the worktree root on branch `agent/tokens-theme`:

```bash
nub run --filter @gpuixui/tokens test
```

Expected: **59 test files, all green** (58 before; the new file adds five cases).
If another file fails, read the failure before touching it.

```bash
nub run check
```

Expected: `check:tests` accepts every test; oxlint and oxfmt are clean; the
tokens and deploy packages type-check.

```bash
nub run lint
nub run test
```

Expected: both green. A failure outside `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md` or the plan index belongs to another workstream: stop and record it.

## 5. Two-directions proof

`scripts/verify-two-directions.sh` drives `jj`, which is not installed
(`PLAN.md` D1). Prove by hand:

1. With `...fieldSecondaryPairs` commented out of `contrastPairs`, run
   `nub run --filter @gpuixui/tokens test -- src/field-adornment-text.test.ts`.
   Expect **failure** in cases 1, 3 and 4 (the pair is missing, so the erased
   control is not reported); cases 2 and 5 read the palette, so they still pass.
2. Restore the spread and re-run. Expect **green**.
3. Record both outputs in the commit message and in §7; do not claim the proof
   without running it.

## 6. STOP conditions

- Any shipped theme fails `mutedForeground` on `input` at its declared floor.
  Then this is a palette defect, not a guard: record the set and ratio, write a
  follow-up plan that moves the value, and do not move a colour in this plan.
- `contrastPairs.length` is not 293 before the change, or `mutedForeground` on
  `input` already exists. Re-read the branch; a peer may have landed the same
  plan.
- The `input` clause cannot be added to a document without rewording an
  unrelated sentence. Stop and record why; do not restructure the contract prose
  for one pair.
- A test outside the listed files must change to make the suite green. Stop and
  record it as a cross-team task in `TODO.md`.
- A peer `tokens-theme` session is writing the same files: this worktree has
  documented concurrent writers
  (`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`). If
  `git status` shows changes you did not make, stop and reconcile before
  committing; never `git add -A` over a peer's edits.

## 7. Acceptance criteria

- `mutedForeground` on `input` is a documented `secondary` pair, exactly once.
- All 24 shipped colour sets pass it; no token value moves.
- `contrastPairs.length` is 294 and every document, ledger row and guard that
  states it agrees.
- The menu check-glyph defect is recorded as a cross-team `components` row with
  its measured evidence and the correct role; no pair that the shipped palette
  fails is added.
- The new test fails without the pair and passes with it (both directions
  observed).
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` pass; the work is committed on `agent/tokens-theme` and pushed.

## 8. Outcome (recorded by the executor)

- Baseline confirmed by a probe over the 24 shipped sets: `mutedForeground` on
  `input` is **8.376:1** on `win32` dark default and the XP/Aero dark halves,
  **8.759:1** on Aero light (tightest light), 9.671:1 on the identity light and
  **14.723:1** on the identity dark high sets. All clear 4.5:1 / 7:1, so no
  shipped value moved.
- The audit finding is recorded, not patched: `accent` as the menu check glyph
  measures 1.11–1.39:1 on `popover` and 1.00–1.08:1 on a hovered row across the
  24 sets, while `popoverForeground` — the row's own text role — already has
  pairs on `popover`, `hover`, `active` and `selected`.
- Two directions observed: with `...fieldSecondaryPairs` commented out,
  `field-adornment-text.test.ts` reported **3 failed | 2 passed (5)**; restored,
  **5 passed**.
- Green, run not assumed: **59 test files, 3715 tests**,
  `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test`.
