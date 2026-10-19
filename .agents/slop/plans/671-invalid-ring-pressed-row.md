# Plan 671 — The invalid focus ring on a pressed selected row

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/contrast.ts`,
> `packages/tokens/src/invalid-ring.test.ts`,
> `packages/tokens/src/invalid-ring-pressed-row.test.ts`,
> `packages/tokens/src/contrast.test.ts`, `packages/tokens/src/docs.test.ts`,
> `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
> `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`. One new boundary
> pair; no colour, floor or shipped metric changes.

## Execution record (2026-10-19)

- The new suite failed before the pair: the planted `palette.neutral[200]`
  (`#E1E5EC`) returned `[]` for `destructive` on `selectedActive`, and the
  structural case found no published pair.
- After the pair: one `boundary` failure at floor 3, every shipped set clears its
  own floor, `contrastPairs.length` is **461**.
- The design-system floor row and the `docs.test.ts` literal were updated
  together, so the exact-row guard still matches.
- The full suite found a second hard pin of the contract size in
  `resting-fill-scrim.test.ts` (460); it moved to 461 with the other one.
- `nub exec vitest run src/invalid-ring-pressed-row.test.ts
  src/invalid-ring.test.ts src/contrast.test.ts src/docs.test.ts
  src/inventory.test.ts src/contrast-reference.test.ts` → **6 files / 278 tests
  passed**.

## Why

Plan `651` gave a selected row a press: `selectedActive` is the fill a chosen
row keeps under the pointer, and the documents list it as a surface text and
chrome are measured on. `selectionPressPairs` holds `ring` on it, so a normal
focus ring on a pressed selected row is measured.

The **invalid** ring is a separate list. `controlFocusStyle`
(`packages/primitives/src/core/style.ts`) recolours the ring with `destructive`
when a field fails validation; `invalidRingPairs` measures that ring on the
surfaces behind a control, but it was written before `selectedActive` existed
and omits it.

Both documents already claim the pair exists:

- `docs/tokens.md`, *Focus*: "`invalidRingPairs` holds it to the boundary floor
  on the surfaces a control sits on".
- `docs/design-system.md`, interaction-state table: "an invalid control
  recolours it with `destructive` on the same surfaces except the canvas" —
  and the same table lists the pressed `selectedActive` among the ring surfaces.
- `docs/design-system.md`, floor table: "the `destructive` ring an invalid
  control paints on the same surfaces".
- `packages/tokens/README.md`: "the same surfaces are measured for it too
  (`invalidRingPairs`, plan 340)".

The composition is real: an inline-edit field inside a chosen `List` row is
focused, invalid and pressed at the same time; the field's error ring lands on
`selectedActive`.

Probe on 2026-10-19 (this branch):

```ts
const light = getTheme("light");
const hidden = extendTheme(light, { colors: { destructive: palette.neutral[200] } });
// palette.neutral[200] is #E1E5EC, 1.0596:1 on light `selectedActive`
themeContrastFailures(hidden).filter(
  (failure) => failure.foreground === "destructive" &&
    failure.background === "selectedActive",
); // [] — the 1.05:1 status-chip pair passes; no boundary pair exists
```

Every shipped set already clears the pair at the boundary floor: the tightest is
**Light · Windows XP at 3.761:1** (the other sets are 4.08:1 or higher), so no
palette value moves.

## Scope

- Add `destructive` on `selectedActive` to `invalidRingPairs`.
- Pin the contract's new size and hold the documents to the true surface list.
- One regression suite states the erased error ring and proves the pair is read
  from the theme.

Out of scope: the normal `ring` on `selectedActive` (already covered by
`selectionPressPairs`), the invalid slider's `track` groove (documented as
keeping the accent ring), and any consumer change.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/contrast.ts` | add the pair to `invalidRingPairs`, extend its JSDoc. |
| `packages/tokens/src/invalid-ring.test.ts` | add `selectedActive` to its local surface list. |
| `packages/tokens/src/invalid-ring-pressed-row.test.ts` | new regression suite. |
| `packages/tokens/src/contrast.test.ts` | pin `contrastPairs.length` 460 → 461. |
| `packages/tokens/src/resting-fill-scrim.test.ts` | the second pin of the same size, 460 → 461. |
| `docs/tokens.md` | the invalid-ring sentence and the pair-count history. |
| `docs/design-system.md` | the interaction-state focus row and the floor table row. |
| `packages/tokens/README.md` | the invalid-ring sentence. |
| `COMPONENTS.md` | the two present-tense rows and the pair count. |
| `TODO.md`, `.agents/slop/plans/README.md` | ledger and index. |

## Exact edits

### 1. `packages/tokens/src/contrast.ts`

In `invalidRingPairs`, after the comment and before the `ringSurfaces` spread,
add:

```ts
  // A selected row's press: an inline-edit field inside a chosen row is
  // focused, invalid and pressed at once, and the field's error ring lands on
  // `selectedActive`. Plan 651 held the normal `ring` there through
  // `selectionPressPairs`; the error ring is this list and was missed (plan
  // 671). `track` stays out because an invalid slider keeps the accent ring.
  ["destructive", "selectedActive", "boundary"],
```

Extend the function's JSDoc sentence that enumerates the surfaces: after
"not on the field's own fill", add "and on the pressed `selectedActive` a
focused field inside a chosen row keeps".

### 2. `packages/tokens/src/invalid-ring.test.ts`

Add `"selectedActive"` to `invalidRingSurfaces`, after `"selected"` and before
the soft fills. The first case compares the list exactly, so it fails until the
pair exists. Leave its header and the other cases alone.

### 3. `packages/tokens/src/invalid-ring-pressed-row.test.ts` (new)

Header comment: state the bug — `selectedActive` was documented as an invalid
ring surface, the list omitted it, and a theme whose `destructive` cleared the
1.05:1 chip floor but not the 3:1 boundary floor returned `[]` for the error
ring.

Shape:

```ts
import { describe, expect, it } from "vitest";
import { palette } from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  invalidRingPairs,
  shippedThemes,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const hiddenColor = palette.neutral[200]; // #E1E5EC, 1.0596:1 on light selectedActive

const hidden = (): Theme =>
  extendTheme(getTheme("light"), { colors: { destructive: hiddenColor } });

const pressedRowFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background }) =>
      foreground === "destructive" && background === "selectedActive",
  );
```

Cases:

1. `hidden()` passes the chip's surface floor — `contrastRatio(hiddenColor,
   getTheme("light").colors.selectedActive)` is at least
   `contrastFloors.default.surface` and under
   `contrastFloors.default.boundary` — so the edit is not caught by
   `statusFillPairs`.
2. `pressedRowFailures(hidden())` is exactly one failure:
   `{ foreground: "destructive", background: "selectedActive",
   pairClass: "boundary", floor: 3, ratio: <computed> }`. Use `toMatchObject`
   for the ratio or compare the full object after rounding.
3. Every shipped theme's `destructive` on its `selectedActive` clears that
   theme's declared boundary floor, and the tightest ratio is above 3.7.
4. `invalidRingPairs` contains `["destructive", "selectedActive", "boundary"]`
   exactly once, and `contrastPairs` contains it.

Import `shippedThemes` from `./shipped-themes.js` if the barrel does not export
it (it does — `shippedThemes` is a public value; keep the import from
`./index.js` for consistency with `invalid-ring.test.ts`).

### 4. `packages/tokens/src/contrast.test.ts`

In "covers every documented pair", change `expect(contrastPairs.length).toBe(460)`
to `461`.

### 5. `docs/tokens.md`

In the *Focus* section, replace

```
holds it to the boundary floor on the surfaces a control sits on, which are not
the field's own fill; `destructive` on `background` is shared with the invalid
field edge.
```

with

```
holds it to the boundary floor on the surfaces a control sits on, which are not
the field's own fill, the pressed `selectedActive` a focused field inside a
chosen row keeps included; `destructive` on `background` is shared with the
invalid field edge, and an invalid slider keeps the accent ring on its `track`
groove.
```

In the pair-count history sentence, change `396 to **460** across plans `527`,
`557`, `595`, `619`, `650`, `651` and `659`` to `396 to **461** across plans
`527`, `557`, `595`, `619`, `650`, `651`, `659` and `671``.

### 6. `docs/design-system.md`

Interaction-state table, focus row: replace

```
an invalid control recolours it with `destructive` on the same surfaces except the canvas, which the invalid field edge already covers, while an invalid slider keeps the accent ring.
```

with

```
an invalid control recolours it with `destructive` on every one of those surfaces except the canvas, which the invalid field edge already covers, and the `track` groove, where an invalid slider keeps the accent ring.
```

Floor table, focus row: replace

```
the `destructive` ring an invalid control paints on the same surfaces
```

with

```
the `destructive` ring an invalid control paints on every ring surface except the canvas and the `track` groove
```

### 7. `packages/tokens/src/docs.test.ts`

The floor-table case at ~line 2966 reproduces the design-system row verbatim.
Apply the same two clauses there, so the literal row still matches the
document.

### 8. `packages/tokens/README.md`

Replace

```
the error ring is the
focus indicator: the same surfaces are measured for it too (`invalidRingPairs`,
plan 340).
```

with

```
the error ring is the
focus indicator: every ring surface except the canvas and the slider's `track`
groove is measured for it too (`invalidRingPairs`, plans 340 and 671).
```

### 9. `COMPONENTS.md`

- **Theme contrast check** row: change `the same 460 contrast pairs` to
  `the same 461 contrast pairs`. In the plan-340 sentence that ends
  "and the four soft status fills (294 → 305 pairs)", append
  " — the pressed `selectedActive` a focused invalid field keeps joins them
  (plan 671)".
- **Focus state** row: append "The invalid ring is measured on the pressed
  `selectedActive` a focused field inside a chosen row keeps (plan 671)." to the
  end of the existing paragraph.

### 10. `TODO.md`

Add the completed row after the plan-670 row:

```
`[x]` Hold the invalid focus ring on a pressed selected row — plan 651 gave a
chosen row its `selectedActive` press and both documents listed the invalid ring
on "the same surfaces" as `ring`, but `invalidRingPairs` predates that surface,
so a theme whose `destructive` measured **1.0596:1** on light `selectedActive`
cleared the chip's 1.05:1 floor and returned `[]` from the boundary check while
the error ring vanished; the pair joins `invalidRingPairs`, every shipped set
already passes (3.761:1 at the tightest, XP light), and the contract grows
460 → 461 (plan 671)
```

### 11. `.agents/slop/plans/README.md`

Add the row after `670` and one prose sentence after the plan-670 sentence.

## Commands, in order

Before the pair, prove the suite can fail:

```sh
cd packages/tokens
nub exec vitest run src/invalid-ring-pressed-row.test.ts
```

Expected: case 2 receives `[]` for the planted theme, and case 4 reports the
missing pair. If case 2 already reports a boundary failure, the pair exists —
**STOP** and re-measure.

After the edits:

```sh
cd packages/tokens
nub exec vitest run src/invalid-ring-pressed-row.test.ts src/invalid-ring.test.ts src/contrast.test.ts src/docs.test.ts src/inventory.test.ts src/contrast-reference.test.ts
nub run check-types
```

Expected: all green. `contrast.test.ts` sees 461 pairs; the shipped-set loops
gain the one pair and still pass.

Then the repository gates:

```sh
cd ../..
nub run check
nub run lint
nub run test
```

## STOP conditions

- The planted `neutral.200` already produces a boundary failure for
  `selectedActive`: the pair exists — **STOP** and report; do not add it twice
  (the uniqueness guard would fail).
- A shipped set fails the new boundary pair: **STOP**. The probe measured a
  minimum of 3.761:1; a failure means a shipped palette changed, which this plan
  does not authorise.
- `contrastPairs.length` is not 460 before the change: re-derive it and update
  the pin to the actual value plus one; note the difference in the execution
  record.
- A docs guard fails on a different row than the two named here: read the guard
  and adapt only the clauses it owns; do not relax an assertion.
- A colour, floor or shipped metric has to move: **STOP**. No shipped value
  moves in this plan.

## Test plan (both directions)

| Direction | Evidence |
| --------- | -------- |
| Fails without the fix | `invalid-ring-pressed-row.test.ts` case 2 gets `[]` from the checker for `destructive: #E1E5EC` on `selectedActive`, while case 1 proves the 1.05:1 surface floor passes. |
| Passes with the fix | The same case reports one `boundary` failure at floor 3, and every shipped set clears its own floor. |
| Cannot pass by widening the surface floor | The pair is the `boundary` class; the chip's `surface` pair is unchanged and explicitly shown passing in case 1. |
| Cannot pass by editing the test only | Case 3 walks `shippedThemes` through `themeContrastFailures`, and case 4 reads the exported `invalidRingPairs`/`contrastPairs`. |
| No palette fix smuggled in | No `ThemeColors` value changes; the tightest shipped ratio is already 3.761:1. |

## Acceptance

- [x] `invalidRingPairs` publishes `destructive` on `selectedActive` at the
      boundary floor.
- [x] The regression suite fails before the pair and passes after it.
- [x] `docs/tokens.md`, `docs/design-system.md`, the README and the ledger name
      the true surface set (canvas and `track` excluded, `selectedActive`
      included), and the pair history ends at 461.
- [x] No colour, floor or shipped metric moves.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.
- [x] Plan indexed in `.agents/slop/plans/README.md`; `TODO.md` row ticked.
