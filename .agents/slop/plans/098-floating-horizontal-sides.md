# 098 — A floating layer's horizontal sides were never measured

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `020`, `041`, `047`, `060`, `066`, `067`, `068`, `069`, `095`, `156` |
| Status | done |

Self-contained: §0 the measured defect, §1 the gap, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome (filled after the run), §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

A throwaway probe mounted both components in the real `TestRenderer` and printed
the painted boxes. Window `1280 × 800`, `Surface` padding `lg` (12 px).

**`Tooltip`, trigger at `x 12, y 12, 300 × 100`; the tip paints `47 × 26`:**

| Case | Measured tip | Exact placement | Verdict |
| ---- | ------------ | --------------- | ------- |
| `side="left" align="center"` | `x 8, y 139` | `y = 12 + (100 − 26) / 2 = 49` | **90 px too low** |
| `side="right" align="center"` | `x 312, y 139` | `y = 49` | **90 px too low** |
| `side="left" align="start"` | `x 8, y 12` | `y = 12` | exact |
| `side="left" align="end"` | `x 8, y 86` | `y = 112 − 26 = 86` | exact |

`139 − 12 = 127 ≈ (triggerWidth 300 − tipWidth 47) / 2 = 126.5`: the wrapper
converts `center` into `align="start"` plus a **width** difference, then hands
that number to the runtime as `alignOffset`, which for a left/right layer is a
**vertical** offset (`@gpuix/react/dist/components/floating.js:157-160`).
`align="start"`/`"end"` need no arithmetic and were already exact.

**`Select`, `side="left"` and `side="right"`, 30 options:**

| Case | List box | Scrollable | Last option |
| ---- | -------- | ---------- | ----------- |
| `side="left"` | `y 8, 83 × 908` | `null` | row at `y 888.5` |
| `side="right"` | `y 8, 83 × 908` | `null` | row at `y 888.5` |

The window is 800 px tall: the list runs 116 px past the bottom edge and the
last options cannot be reached — the exact defect plan `068` fixed on the
bottom/top axis, still present beside the trigger.

Both are measured, not inferred. The probe was deleted after this table was
recorded.

## 1. The gap

`Select.side` and `Tooltip.side` are typed as the runtime's `FloatingSide =
"top" | "right" | "bottom" | "left"`, but every placement rule in
`src/core/floating.ts` was written for a vertical layer:

1. **`resolveHorizontalAlign`** derives the centre offset from
   `triggerWidth - layerWidth`. A left/right layer aligns on the **vertical**
   axis (`Side::Right | Alignment::Center` → `.items_center()` in an `h_full`
   container, `references/gpuix/packages/native/src/custom_elements/anchored.rs:217`),
   so it needs `triggerHeight - layerHeight`.
2. **`availableOn`** accepts only `"top" | "bottom"`, and `Select` only computes
   `maxHeight` when the resolved side is vertical. A left/right list is therefore
   never capped.
3. `core/floating.test.ts` tests only the vertical axis, and the runtime suite
   only mounts tooltips and selects on `top`/`bottom`, so neither defect was
   observable.

`TODO.md` records the neighbouring fact ("the primitives rule is horizontal (its
layers are all top/bottom)"). That is **false**: both public components accept
`left`/`right`. This plan makes the rule axis-aware, which is also the direction
the cross-team entry asks the components workstream to converge on.

## 2. The rule

**Every placement rule names the axis it works on, and every side the public prop
accepts is either measured or documented as the runtime's own behaviour.**

1. `core/floating.ts` gains the full side vocabulary and one axis-aware
   alignment rule:

   ```ts
   export type HorizontalSide = "left" | "right";
   export type LayerSide = VerticalSide | HorizontalSide;
   export const isHorizontalSide = (
     side: LayerSide,
   ): side is HorizontalSide => side === "left" || side === "right";

   export interface AlignRequest {
     readonly side: LayerSide;
     readonly align: LayerAlign;
     readonly triggerWidth: number;
     readonly triggerHeight: number;
     readonly layerWidth: number;
     readonly layerHeight: number;
   }

   export const resolveAlign = ({ ... }: AlignRequest): ResolvedAlign =>
     align !== "center"
       ? { align, offset: 0 }
       : {
           align: "start",
           offset: isHorizontalSide(side)
             ? (triggerHeight - layerHeight) / 2
             : (triggerWidth - layerWidth) / 2,
         };
   ```

   `resolveHorizontalAlign` is deleted (it is internal: not exported from
   `core/index.ts`, and `Tooltip` is its only consumer). `resolveAlign` and the
   new types are exported from `core/index.ts` beside `availableOn` and
   `decideVerticalSide`.

2. `availableOn` takes a `LayerSide`. A left/right layer is constrained on the
   **vertical** axis by the window, not the trigger, so its free space is
   `viewportHeight - 2 * margin`; `top`/`bottom` keep the existing subtraction:

   ```ts
   export const availableOn = (request, side: LayerSide): number =>
     side === "top"
       ? request.triggerTop - request.margin
       : side === "bottom"
         ? request.viewportHeight - request.margin - request.triggerBottom
         : request.viewportHeight - 2 * request.margin;
   ```

3. `Select` caps the list for the resolved side, whatever it is. The
   `verticalSide` narrowing is deleted; `maxHeight` is derived from
   `availableOn(measurement, side)` when the estimated list is taller than the
   space on that side.

4. `Tooltip` measures the tip's **height** as well as its width (`TooltipBox`
   gains `height` and `tipHeight`, both already available from the same
   `getElementBounds` calls) and passes the resolved side to `resolveAlign`. A
   `center` request therefore starts at the exact `start` edge on either axis and
   shifts by half the difference on the layer's own axis.

5. **The explicit-side contract does not change.** An explicit `side` still wins
   and is never flipped; near a window edge the runtime's `fit="snap"` clamps it,
   which is what the measured `side="left"` at `x 12` did (`tip x 8`, covering
   the trigger's left edge). That is documented for both components rather than
   silently re-decided, because flipping a caller's explicit request is a larger
   surprise than the clamp. Automatic side selection stays vertical-only.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | add `HorizontalSide`/`LayerSide`/`isHorizontalSide`; replace `resolveHorizontalAlign` with the axis-aware `resolveAlign`; make `availableOn` take a `LayerSide` |
| `packages/primitives/src/core/floating.test.ts` | keep the vertical cases; add the horizontal-axis align cases and the left/right `availableOn` cases |
| `packages/primitives/src/core/index.ts` | export `resolveAlign`, `isHorizontalSide`, `HorizontalSide`, `LayerSide` |
| `packages/primitives/src/components/Tooltip.tsx` | measure the trigger's height and the tip's height; call `resolveAlign` with the resolved side |
| `packages/primitives/src/components/Select.tsx` | cap the list on the resolved side (drop the `verticalSide` narrowing) |
| `packages/primitives/runtime/fields.runtime.test.tsx` | two Tooltip cases beside the trigger; one long Select list beside the trigger; record the old numbers in the header comments |
| `packages/primitives/docs/tooltip.mdx` | the centre rule follows the layer's axis; an explicit side is clamped, not flipped |
| `packages/primitives/docs/select.mdx` | a left/right list is capped to the window's height and scrolls |
| `packages/primitives/README.md` | the `align`/`snap` rows and the runtime counts |
| `COMPONENTS.md` | Tooltips + Selects rows: the horizontal axis is measured |
| `TODO.md` | add and tick the task; amend the cross-team `floating` note that calls primitives' rule horizontal-only |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/098-floating-horizontal-sides.md` | §7 after the run |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons`,
`docs/gpuix-capabilities.md` or `apps/*`.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/floating.test.ts` | the new horizontal-axis cases fail before the fix and pass after |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 39 files / 510 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the three new cases pass; the existing `top`/`bottom` tooltip and select cases stay green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 21 files / 307 tests) |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertion in §7.

### 5.1 The pure rule (`src/core/floating.test.ts`)

1. **"centres on the layer's own axis"** — one `it.each` over both axes:
   - `side: "bottom"`, trigger `400 × 40`, layer `100 × 20` → `{ align: "start",
     offset: 150 }` (widths);
   - `side: "left"`, same box → `{ align: "start", offset: 10 }` (heights).
   The horizontal case fails against the current code (it returns `150`).
2. **"start and end need no arithmetic"** — `start`/`end` on both axes return
   themselves with `offset: 0`.
3. **"left and right are bounded by the window's height"** — `availableOn` with
   the standard request returns `800 − 2 × 8 = 784` for both, while `top`/`bottom`
   keep the existing values (392 / 360 in the fixture).
4. Keep the existing `decideVerticalSide` cases unchanged — the side decision
   stays vertical-only and this plan must not move it.

### 5.2 The runtime contract (`runtime/fields.runtime.test.tsx`)

5. **"centres a Tooltip beside its trigger"** — `side="right"`, `align="center"`,
   trigger `300 × 100`. Assert `|tip centreY − trigger centreY| ≤ 1` and
   `tip.x ≥ trigger.x + trigger.width`. Measured before: tip `y 139` against an
   exact `49` (90 px off).
6. **"centres a Tooltip on the left side too"** — the trigger sits at the end of a
   900 px row so the left side has room; `side="left"`, `align="center"`. Assert
   `tip.x + tip.width ≤ trigger.x` and the same vertical centre. This proves the
   rule is not hard-coded to `right`.
7. **"caps a long Select list beside its trigger"** — `side="left"` (the list is
   placed at the trigger's left edge), 30 options. Assert the list's painted
   height is at most `window.height − 2 × FLOATING_MARGIN` (784), that the list
   reports a scroll offset, and that wheel scrolling reaches `Option 30` inside
   the list. Measured before: height `908`, no scroll, last row at `888.5`.
8. Keep every existing tooltip/select placement case green: above the trigger on
   the bottom edge, below at the top edge, side-choice, width match, capped
   vertical list and keyboard scroll.

### 5.3 Two-direction proof (required before "done")

- Revert only `resolveAlign` (return the width-based offset on both axes): cases
  5 and 6 fail, the pure horizontal case in 1 fails.
- Revert only the `Select` cap (compute `maxHeight` for vertical sides only):
  case 7 fails.
- Restore; every suite is green.
- Run the new cases against the unmodified tree first and paste the measured
  numbers into §7.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. The runtime's `align="center"` for a left/right layer turns out to be exact on
   this build — then the measurement above is wrong, and the plan re-derives the
   rule from a fresh probe instead of shipping arithmetic for a non-existent
   defect.
3. Capping a left/right list to `viewportHeight − 2 × margin` leaves it unusable
   (e.g. the layer is repainted shorter than its cap or the wheel cannot reach the
   last option). Report the measurement and propose the strongest honest
   alternative (a width cap or a documented limit) instead of forcing it.
4. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

Both defects are fixed, measured, and guarded in both directions.

**The rule.** `core/floating.ts` now names the whole side set (`LayerSide =
VerticalSide | HorizontalSide`, `isHorizontalSide`) and has one alignment rule,
`resolveAlign`, that takes the difference on the layer's own axis. `availableOn`
covers all four sides. The first version of the horizontal space used
`viewportHeight − 2 × margin` (784); measured, the layer's top edge sits on the
trigger's (`y 12`), so its bottom landed at `796`, four pixels past the bottom
margin. The rule is therefore `viewportHeight − margin − triggerTop`, which is
exact for the runtime's `align="start"` and measured 780.

**Measured after (same probes as §0):**

| Case | Before | After |
| ---- | ------ | ----- |
| `Tooltip side="right" align="center"` | tip `y 139` | tip `y 49` (trigger centre `49`), `x 912` at the trigger's right edge |
| `Tooltip side="left" align="center"` (900 px row) | tip `y 139` | tip `y 49`, `x 565` (tip end = trigger start `612`) |
| `Select side="left"`, 30 options | list `908`, unscrollable, last row `y 888.5` | list `780` from `y 12`, scrollable, "Option 30" inside after 29 Down presses |
| `align="start"` / `"end"` on a side | exact | exact (unchanged) |

**Two-direction proof.**

- Reverting `resolveAlign` to the width-only offset failed
  `centres a Tooltip beside its trigger` and
  `centres a Tooltip on the left side of a right-aligned trigger` (runtime), plus
  `centres a layer beside the trigger by height` and
  `shifts the other way when the layer is larger than its trigger` (core) — four
  failures across the two suites.
- Reverting `Select`'s cap to the vertical-only condition failed
  `caps a long Select list beside its trigger`.
- Restored: both suites green.

**Counts after the change:** offline **39 files / 510 tests** (was 505; +5:
one `availableOn` case and four `resolveAlign` axis cases), runtime **21 files /
307 tests** (was 304; +3). `nub run check`, `nub run lint` and `nub run test`
pass.

**What did not change, on purpose:** an explicit `side` is still never flipped.
Measured `side="left"` on a trigger at `x 12` clamps the tip to `x 8`, over the
trigger — the runtime's `fit="snap"`. That is documented in both pages instead of
being re-decided, and automatic side choice remains vertical-only.

## 8. Acceptance

- [x] `align="center"` on a left/right tooltip centres the tip on the trigger's
      vertical centre (measured within 1 px), from one axis-aware rule.
- [x] `align="start"`/`"end"` are unchanged on both axes.
- [x] A left/right `Select` list is capped to the window's height, scrolls, and
      its last option is reachable.
- [x] Every existing vertical placement case is unchanged.
- [x] Explicit sides still win and are never flipped; the clamp is documented.
- [x] The new cases fail in two independent directions before the fix.
- [x] Docs, `COMPONENTS.md`, `README.md`, `TODO.md` and the plan index record it.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
