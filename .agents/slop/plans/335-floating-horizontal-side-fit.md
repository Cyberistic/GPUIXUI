# 335 — A requested horizontal side is a preference, not a clamp

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `020`, `041`, `047`, `060`, `066`, `067`, `095`, `098`, `156` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 outcome (filled after the run), §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

Plan `098` made every placement rule axis-aware and then **kept** the runtime's
clamp for a caller's explicit side, recording it as a documented limitation
(`TODO.md`, commit `fbea39f`). The recorded probe:

| Case | Measured | Exact placement | Verdict |
| ---- | -------- | --------------- | ------- |
| `Tooltip side="left"`, trigger `x 12..73` | tip `x 8..55` | tip end at the trigger's start: `x 26..73` | **37 px over the trigger** |
| `Select side="right"`, trigger `x 524..572` in a 600 px window, list 57 px | list `x 535..592` | list start at the trigger's end: `x 572..629` | **37 px over the trigger** |

Both are the runtime's `fit="snap"`: it clamps the layer inside the window
instead of flipping it. The wrapper already *owns* the side decision on the
vertical axis (plans `066`, `067`) and owns the measurements the horizontal
decision needs (plan `098` measures the trigger, the tip and the list's cap), so
this is a defect in our rule, not a missing runtime capability.

The executor re-measures it by running the new tests against the unmodified tree
(§5.3) and pastes the numbers into §7. Do not edit §0.

## 1. The decision

**A requested horizontal side is a preference.** `Tooltip.side="left"` and
`Select.side="right"` mean "beside the trigger, on that side if it fits". When
the layer physically cannot fit there, the wrapper opens it on the other
horizontal side, or on the roomier one when neither fits. This is the same rule
the vertical axis already applies to its automatic choice, so the `side` prop
now has one meaning on both axes: *where to open, when that is possible*.

**Out of scope (deliberate):** the vertical rule does not change. An explicit
`side="top"`/`"bottom"` still skips the vertical decision and is still exact
where the window allows it; near the edge the runtime still clamps it. That
remaining half is recorded as its own `TODO.md` row (§3) so the two axes can be
unified by a later plan with its own measurement, as `TODO.md` requires ("Do not
change the vertical rule in the same plan").

No new dependency, no runtime API, no reimplementation: the wrapper already knows
the trigger box and the layer's own size; it simply stops handing the runtime a
side that cannot fit.

## 2. The rule

1. `core/floating.ts` gains a horizontal sibling of `decideVerticalSide` and one
   shared fit rule, so the two axes cannot drift:

   ```ts
   /** The sides whose layer sits beside its trigger. */

   export interface HorizontalPlacementRequest {
     readonly triggerLeft: number;
     readonly triggerRight: number;
     readonly layerWidth: number;
     readonly viewportWidth: number;
     readonly margin: number;
     /** The side to keep when it has room. Defaults to `right`. */
     readonly preferred?: HorizontalSide;
   }

   /**
    * The side with room for the layer: the preferred side when the layer fits
    * there, else the other side when it fits there, else the roomier side. An
    * exact fit counts as fitting.
    */
   export const decideHorizontalSide = ({
     triggerLeft,
     triggerRight,
     layerWidth,
     viewportWidth,
     margin,
     preferred = "right",
   }: HorizontalPlacementRequest): HorizontalSide => {
     const after = viewportWidth - margin - triggerRight;
     const before = triggerLeft - margin;
     return preferred === "right"
       ? chooseSide(preferred, "left", layerWidth, after, before)
       : chooseSide(preferred, "right", layerWidth, before, after);
   };
   ```

   `chooseSide` is module-local (not exported from `core/index.ts`) and is the
   one place the "fits / other / roomier" order lives:

   ```ts
   const chooseSide = <Side extends string>(
     preferred: Side,
     other: Side,
     extent: number,
     preferredSpace: number,
     otherSpace: number,
   ): Side =>
     extent <= preferredSpace ||
     (extent > otherSpace && preferredSpace >= otherSpace)
       ? preferred
       : other;
   ```

   `decideVerticalSide` keeps its signature and behaviour and is re-expressed
   through `chooseSide`, so the vertical tests in `floating.test.ts` must stay
   green without edits.

2. `Select` measures the **open list's width** (a `ref` on `SelectContent`,
   read with `renderer.getElementBounds` in the same effect that measures the
   trigger). Before the first open, the trigger's width is the lower bound the
   list can paint at (`minWidth`), so it is the fallback. When `props.side` is
   `"left"`/`"right"`, the resolved side is
   `decideHorizontalSide({ triggerLeft, triggerRight, layerWidth, viewportWidth: viewport.width, margin, preferred: props.side })`.
   Any `"top"`/`"bottom"` (or no side) follows the existing path unchanged.

3. `Tooltip` measures the trigger's `left`/`right` and passes the measured
   **tip width** (falling back to the trigger width before the tip is
   measurable). A `"left"`/`"right"` request goes through
   `decideHorizontalSide`; anything else follows the existing path.

4. Both components measure in `useLayoutEffect`/`useEffect` before paint, which
   is the mechanism plan `098`'s centre correction already uses, so a flipped
   layer is the first painted frame — no visible jump.

5. Docs say what the code does: a `left`/`right` side is a preference and may
   open on the other side; an explicit `top`/`bottom` is exact. The residual
   limitation — a layer wider than the room on **both** sides is still clamped
   by the runtime — is stated on both pages.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | add `HorizontalPlacementRequest` + `decideHorizontalSide`; extract the shared `chooseSide` and re-express `decideVerticalSide` through it (same behaviour) |
| `packages/primitives/src/core/floating.test.ts` | add a `describe("decideHorizontalSide")` with fits / flips / exact-fit / roomier / preferred cases; keep every vertical case unchanged |
| `packages/primitives/src/core/index.ts` | export `decideHorizontalSide` and `HorizontalPlacementRequest` |
| `packages/primitives/src/components/Select.tsx` | measure the open list's width (content ref); resolve a horizontal `side` through the new rule; update the `side` prop docstring |
| `packages/primitives/src/components/Tooltip.tsx` | measure the trigger's left/right; resolve a horizontal `side` through the new rule; update the `side` prop docstring |
| `packages/primitives/runtime/fields.runtime.test.tsx` | four cases: Tooltip flips off the left edge and off the right edge; Select flips off the left edge and off the right edge. Header comments record the measured old numbers |
| `packages/primitives/docs/tooltip.mdx` | Placement + Limitations + Verification: a horizontal side is a preference |
| `packages/primitives/docs/select.mdx` | Placement + Limitations: the list is measured and the side may flip |
| `packages/primitives/README.md` | the "a layer that clamps instead of flipping" row |
| `COMPONENTS.md` | the Selects and Tooltips rows |
| `TODO.md` | tick the horizontal-side task; add the deferred vertical explicit-side row |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/335-floating-horizontal-side-fit.md` | §7 after the run |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons`,
`docs/gpuix-capabilities.md` or `apps/*`. No element-tree test is added: the
side is resolved from renderer bounds, so the runtime suite is the only honest
proof (the element tree receives the caller's side unchanged, as before).

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/core/floating.test.ts` | the new horizontal cases fail before the fix and pass after |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 41 files / 536 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the four new cases pass; the existing tooltip/select cases stay green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 22 files / 349 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertion in §7.

### 5.1 The pure rule (`src/core/floating.test.ts`)

Use a fixture beside `room()`:

```ts
const across = (
  overrides: Partial<HorizontalPlacementRequest> = {},
): HorizontalPlacementRequest => ({
  triggerLeft: 400,
  triggerRight: 432,
  layerWidth: 68,
  viewportWidth: 800,
  margin: 8,
  ...overrides,
});
```

1. **"opens right when the layer fits"** — `decideHorizontalSide(across())` is
   `"right"` (`after = 800 − 8 − 432 = 360`, `before = 392`).
2. **"opens left when it does not fit right but fits left"** — `triggerLeft 700`,
   `triggerRight 732`, layer `68`: `after = 60`, `before = 692` → `"left"`.
   This is the bug's shape; it fails against the current code, which has no rule.
3. **"keeps the margin out of the available space"** — `triggerRight 724` gives
   `after = 68` exactly, so `"right"`; `triggerRight 725` (67) flips.
4. **"treats an exact fit as fitting"** — `triggerLeft 76`, `before = 68` →
   `"left"` for `preferred: "left"`; `triggerLeft 75` (67) flips right.
5. **"picks the side with more room when neither fits"** — `layerWidth 600`,
   trigger `300..332`: `after 460 ≥ before 292` → `"right"`; trigger `600..632`:
   `after 160 < before 592` → `"left"`.
6. **"keeps a preferred left when it has room"** — `across({ preferred: "left" })`
   → `"left"` (the default is `right`; both fit).
7. Keep every existing `decideVerticalSide` / `availableOn` case unchanged. A
   refactor of `decideVerticalSide` that changes a verdict fails them.

### 5.2 The runtime contract (`runtime/fields.runtime.test.tsx`)

All four are measured on a `1280 × 800` window. `Surface` pads by `lg` (12 px),
so the content box runs `x 12..1268`.

8. **"opens a left-side Tooltip on the right when the left edge has no room"** —
   `<Tooltip side="left">` with a `60 × 24` trigger in the surface's column
   (trigger `x 12..72`, tip 47 px: `before = 4`). Assert
   `tip.x >= target.x + target.width`. Measured before: tip `x 8..55`, over the
   trigger.
9. **"opens a right-side Tooltip on the left at the right edge"** — a full-width
   row with `justifyContent: "flex-end"` and a `300 × 40` trigger (target
   `x 968..1268`, `after = 4`). Assert `tip.x + tip.width <= target.x`. Measured
   before: the runtime clamps the tip to `x 1225..1272`, over the trigger.
10. **"opens a left-side Select list on the right when the left edge has no
    room"** — a row-hugging `Select side="left"` (trigger at `x 12`, natural
    width). Open it, then assert `list.x >= trigger.x + trigger.width - 1`.
    Measured before: the list starts at `x 8`, over the trigger.
11. **"opens a right-side Select list on the left at the right edge"** — a
    full-width row with `justifyContent: "flex-end"` and a natural-width
    `Select side="right"`. Open it, then assert
    `list.x + list.width <= trigger.x + 1`. Measured before: the list is clamped
    to the window's right margin, over the trigger.
12. Keep every existing tooltip/select case green, in particular
    `centres a Tooltip beside its trigger`, `centres a Tooltip on the left side
    of a right-aligned trigger`, `caps a long Select list beside its trigger`,
    the vertical flips and the width match.

### 5.3 Two-direction proof (required before "done")

- Run cases 8–11 against the **unmodified** tree first; record the measured
  numbers in §7 (they must fail).
- Remove the `Tooltip` call to `decideHorizontalSide` (pass `props.side`
  through): cases 8 and 9 fail.
- Remove the `Select` call (keep `props.side`): cases 10 and 11 fail.
- Remove `chooseSide`'s roomier branch and keep only "flip when the preferred
  side does not fit": the roomier case (5) fails.
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. A horizontal side **already fits** in the measured cases above — then the
   premise is wrong and the plan re-derives the rule from a fresh probe instead
   of shipping arithmetic for a non-existent defect.
3. Flipping a side makes the layer unreachable (e.g. the runtime repaints it off
   the window anyway, or the list is no longer scrollable after the flip).
   Report the measurement and propose the strongest honest alternative (keep
   the clamp and document it) rather than forcing the rule.
4. The unmodified tree's failure numbers do not reproduce at all: report the
   tree's state before writing code.
5. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

A requested horizontal side is now a preference, on both wrappers, and both
directions are measured.

**The rule.** `core/floating.ts` has one module-local `chooseSide` (fits →
other side → roomier) shared by `decideVerticalSide` (unchanged behaviour) and
the new `decideHorizontalSide`. `Tooltip` measures its trigger's left/right and
its tip's width; `Select` measures its trigger's edges and the open list's width
(the trigger width is the list's minimum), both in layout effects, so the flip
is in the first painted frame. An explicit `top`/`bottom` still skips the
vertical decision.

**Measured before (unwired code, same probes as §0):**

| Case | Failing assertion |
| ---- | ----------------- |
| `Tooltip side="left"`, trigger `x 12..72` | `tip.x` `8`, expected `≥ 72` |
| `Tooltip side="right"`, trigger ending at `x 1268` | `tip.x + tip.width` `1272`, expected `≤ 968` |
| `Select side="left"`, trigger at `x 12` | `list.x` `8`, expected `≥ 59` |
| `Select side="right"`, trigger ending at `x 1268` | `list.x + list.width` `1272`, expected `≤ 1221` |

**After:** all four open beside the trigger (left-edge requests open right;
right-edge requests open left). The measured residual is a layer wider than both
sides, which the runtime still clamps — stated on both pages.

One existing case needed a correction, not a behaviour change: `caps a long
Select list beside its trigger` pressed Down 29 times because, with the old
clamp, the list covered the pointer and the first row was already highlighted by
mouse-enter. It now presses `up` once, which reaches the last row from either
initial state, so the cap proof no longer depends on the layer covering its
trigger.

**Two-direction proof.**

- Unwiring `Tooltip`'s horizontal decision failed the two tooltip cases with the
  numbers above.
- Unwiring `Select`'s failed the two select cases with the numbers above.
- Removing `chooseSide`'s roomier branch failed
  `picks the side with more room when neither fits` (`"left"` for the expected
  `"right"`).
- Restored: offline **41 files / 543 tests**, runtime **22 files / 353 tests**.
  `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] A horizontal `side` that cannot fit beside the trigger opens on the other
      horizontal side, or the roomier one when neither fits.
- [x] The trigger never ends up underneath the layer in the four measured cases.
- [x] An explicit `top`/`bottom` and every automatic vertical decision are
      unchanged.
- [x] A layer wider than both sides is still clamped, and both pages say so.
- [x] Every new test fails in both directions before the fix.
- [x] Docs, `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index record it.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
