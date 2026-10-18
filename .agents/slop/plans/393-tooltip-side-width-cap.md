# 393 — A long tooltip beside its trigger paints over it

| | |
| --- | --- |
| Phase | F (integration and polish) |
| Workstream | primitives |
| Depends on | 020, 030, 041, 047, 060, 067, 071, 095, 098, 203, 335, 336, 347, 368, 379, 391 |
| Status | done |

## 0. The bug, measured

`Tooltip` caps its width so a long tip wraps instead of painting a 6 270 px
layer (plan `391`). The cap is computed by `tipWidthCap` in
`src/core/floating.ts`. On a **top**/**bottom** side it uses the anchor's
horizontal edges — correct. On a **left**/**right** side it returns only the
window cap:

```ts
const windowCap = Math.max(0, viewportWidth - 2 * margin);
if (isHorizontalSide(side)) return Math.floor(windowCap);
```

That ignores the room the chosen side actually has. A left-side tip ends at the
trigger's left edge, so its usable width is `triggerLeft − margin`, not
`viewportWidth − 2 × margin`. The side decision
(`decideHorizontalSide`, plan `335`) only knows the layer's *previous* width, so
it keeps the requested side and the runtime clamps the over-wide layer into the
window — across the trigger. This is exactly the class plan `379` fixed for
`Select`'s list width, left unfixed for `Tooltip`.

Measured on this host, GPUix 0.10.0, with a throwaway probe (deleted after the
measurement), 1 280 × 800 window, `FLOATING_MARGIN = 8`, 60-word content:

| Case | Trigger | Tip |
| ---- | ------- | --- |
| A. `side="left"`, trigger ends a 1 100 px row | `x 992..1112` | `x 15..1277`, **width 1 262** |
| B. `side="right"`, trigger starts the row | `x 12..132` | `x 15..1277`, **width 1 262** |
| C. `side="left"`, short "A hint" (control) | `x 992..1112` | `x 952..997`, width 45 |

In A the left side offers `992 − 8 = 984` px and the tip paints 1 262 px,
**278 px wider than its side**, covering the trigger. In B the right side offers
`1280 − 8 − 132 = 1 140` px and the tip again paints 1 262. C shows the control:
a short tip keeps its natural width, so the fix must not impose a fixed cap.

The current test suite pins the bug:

```ts
it("only takes the window cap beside its trigger", () => {
  expect(cap({ side: "left" })).toBe(1264);
  expect(cap({ side: "right", align: "end" })).toBe(1264);
});
```

and `docs/tooltip.mdx` records the consequence as a limitation ("a tip beside
its trigger takes the window width", "a tip wider than the room on both sides is
clamped … painted over its trigger"). Both are false: the cap can use the
trigger's edges, as `Select` already does.

**Provenance note.** The full live suite is not green on this host's binding
(plan `529`: it is built from `references/gpuix` `main`, not the published
0.10.0 tag, and absolute tooltip geometry is off by ~7 px). The defect above is
a **logic** error — 1 262 vs 984 px, far outside that skew — proved by the pure
rule; the runtime case asserts the cap reaches the paint, not an absolute edge
position. Run the scoped file only, as plans `379`/`392` do; the full live run
stays the merge gate.

## 1. The rule

The width cap belongs to the **resolved side**, like the height cap
(`availableOn`, plan `098`) and the select list's width (`availableWidth`, plan
`379`):

| Resolved side | Usable tip width |
| ------------- | ---------------- |
| `left` | `triggerLeft − margin` |
| `right` | `viewportWidth − triggerRight − margin` |
| `top` / `bottom` | the alignment's room (unchanged, plan `391`) |

On a horizontal side `align` places the **vertical** axis, so it must not change
the width cap. The cap is always also bounded by the window cap, so a nonsense
trigger box (outside the window) cannot ask for a tip wider than the window.

The function needs the trigger's edges, not the painted tip's: once the runtime
has clamped an over-wide layer, the tip's own box is on the wrong side of the
trigger and would perpetuate the error. The vertical branch keeps using the
painted tip's box as its anchor (plan `391`), because that is the true alignment
anchor there.

## 2. Exact changes

All paths are under `packages/primitives/` unless stated.

### 2.1 `src/core/floating.ts`

1. Extend `TipWidthRequest` with the trigger's edges:

```ts
export interface TipWidthRequest {
  readonly side: LayerSide;
  readonly align: LayerAlign;
  readonly anchorLeft: number;
  readonly anchorRight: number;
  /** The trigger's left edge: a layer beside its trigger is bounded by it. */
  readonly triggerLeft: number;
  /** The trigger's right edge: a layer beside its trigger is bounded by it. */
  readonly triggerRight: number;
  readonly viewportWidth: number;
  readonly margin: number;
}
```

2. Replace the horizontal branch of `tipWidthCap`:

```ts
const windowCap = Math.max(0, viewportWidth - 2 * margin);
if (isHorizontalSide(side))
  return Math.floor(
    Math.max(
      0,
      Math.min(
        windowCap,
        availableWidth(
          { triggerLeft, triggerRight, viewportWidth, margin },
          side,
        ),
      ),
    ),
  );
```

`availableWidth` is declared above `tipWidthCap` already (§166), so there is no
forward reference.

3. Update `tipWidthCap`'s docstring: a tip **beside** its trigger is capped by
   the room on that side — `triggerLeft − margin` on the left and
   `viewportWidth − margin − triggerRight` on the right — not by the window,
   because the trigger's edge is where the layer ends. Note that `align` places
   the other axis on these sides and therefore does not affect the width.

### 2.2 `src/components/Tooltip.tsx`

1. Pass the trigger's measured edges in the `tipWidthCap({...})` call:

```ts
return tipWidthCap({
  side,
  align: requested,
  anchorLeft,
  anchorRight,
  triggerLeft: measured.left,
  triggerRight: measured.right,
  viewportWidth: viewport.width,
  margin: FLOATING_MARGIN,
});
```

2. Correct the comment above `cap` (currently lines 343–346): the cap is the
   room the resolved side and alignment have; a **vertical** side measures from
   the painted tip's own box when it exists, while a **horizontal** side is
   bounded by the trigger's edges (the tip's box would be the clamped result).

Do not change the `onNone` (unmeasured) branch, `tooltipStyle`, the side
decision, or any other component.

### 2.3 `src/core/floating.test.ts`

1. Add `triggerLeft` / `triggerRight` to the `cap()` helper's defaults, e.g.
   `triggerLeft: 17, triggerRight: 400` (matching the existing
   `anchorLeft`/`anchorRight`), so every vertical case is unchanged.
2. Replace the `it("only takes the window cap beside its trigger")` case with a
   case that pins the side's room (see §3.1).
3. Extend the "never returns a negative or fractional cap" case with a
   horizontal side whose room is negative.

### 2.4 `runtime/tooltip-side-cap.runtime.test.tsx` (new)

A focused file with a header comment naming the guarded bug and the measurement.
It imports `Surface`, `openWindow`, `FLOATING_MARGIN` and `Tooltip` from the
package, exactly like the other runtime suites. Cases in §3.2. Keep it small;
do not add to `fields.runtime.test.tsx` (74 tests already).

### 2.5 `docs/tooltip.mdx`

1. API table, `content` row: "long text wraps inside a cap set by the resolved
   side's room" (replace "a window-wide cap").
2. Theming, **Long content** paragraph: replace "a tip beside its trigger takes
   the window width" with the side rule (`triggerLeft − margin` /
   `viewportWidth − margin − triggerRight`) and state that it cannot paint
   across the trigger (plan `393`).
3. Limitations: delete "**A tip wider than the room on both sides is
   clamped. …**" and replace it with the honest remaining limit: the width is
   capped per side, but a tip **taller** than the window is still clamped by the
   runtime (there is no height cap or scrolling; a paragraph belongs in a
   popover). Keep the sentence about the vertical case if still true.
4. Verification: add
   `runtime/tooltip-side-cap.runtime.test.tsx` — the side caps reaching the
   paint and the short tip staying narrow (plan `393`).

### 2.6 `COMPONENTS.md`

In the **Tooltips** row, append after the long-content sentence: the tip's
width cap is the room on the **resolved side** — left/right use the trigger's
edges (`triggerLeft − margin`, `viewportWidth − margin − triggerRight`), so a
long tip wraps instead of painting across its trigger; measured 1 262 → 984 px
on a 1 100 px row (plan `393`).

### 2.7 `TODO.md`

Under **Primitives workstream**, add a ticked row after the plan `392` row
describing the measured defect and the fix; raise the counter from `132/132` to
`133/133`.

### 2.8 `.agents/slop/plans/README.md`

Add the `393` row to the primitives table, status `done` with the measured
counts and both directions (template: the `379`/`391` rows).

## 3. Test plan

### 3.1 Core — `src/core/floating.test.ts`

New/replaced cases in the `tipWidthCap` block:

1. **A left-side tip uses the room before the trigger.**
   `cap({ side: "left", triggerLeft: 992, triggerRight: 1112 })` is `984`
   (old: `1264`).
2. **A right-side tip uses the room after it.**
   `cap({ side: "right", triggerLeft: 12, triggerRight: 132 })` is `1140`
   (old: `1264`).
3. **`align` does not change a side cap.**
   `cap({ side: "left", align: "center", triggerLeft: 900, triggerRight: 1200 })`
   and the same with `"end"` are both `892`.
4. **The window cap still bounds a side cap.**
   `cap({ side: "left", triggerLeft: 4000, triggerRight: 4100 })` is `1264`;
   `cap({ side: "right", triggerLeft: 0, triggerRight: 0 })` is `1264`.
5. **No negative/zero room.** `cap({ side: "left", triggerLeft: 4, triggerRight: 100 })`
   is `0`; vertical cases keep their existing expectations.

### 3.2 Runtime — `runtime/tooltip-side-cap.runtime.test.tsx`

Long content = 60 words (the probe's shape). Use the measured trigger box from
the runtime, never a magic absolute position.

1. **Left side.** `side="left"` on a trigger that ends a 1 100 px
   `justifyContent: "flex-end"` row, long content: `tip.width` is
   `<= trigger.x - FLOATING_MARGIN` (old: 1 262 > 984, failing by name).
2. **Right side.** `side="right"` on a trigger that starts a row: `tip.width`
   is `<= WINDOW.width - FLOATING_MARGIN - (trigger.x + trigger.width)`
   (old: 1 262 > 1 140).
3. **A short tip keeps its natural width.** `side="left"`, `"A hint"`:
   `0 < tip.width < 100` — guards against a fixed or zero cap.
4. **The width follows the trigger's position.** The same long tip on two
   triggers in one `justify-content: flex-end` row, 120 px apart: the right-hand
   trigger has 120 px more room on its left, so its tip is 120 px wider (±2).
   This is the artifact-robust proof that the cap is derived from the trigger,
   not the window.

Scoped command (do not run the whole live suite on this artifact):

```sh
cd packages/primitives
nub run test:runtime tooltip-side-cap
```

Expected: 4 passed.

### 3.3 Two-direction proof

1. Restore `if (isHorizontalSide(side)) return Math.floor(windowCap);` — core
   cases 1–3 fail with `1264` and runtime cases 1–2 fail with width `1262`.
2. Swap the `availableWidth` sides in the new branch (`right` ↔ `left`) — core
   case 1 (984) and case 2 (1 140) fail; the runtime left/right cases fail.
3. Drop `triggerLeft`/`triggerRight` from the `Tooltip` call (default them to
   the window in a scratch edit) — the core cases pass while runtime cases 1–2
   fail, proving the wiring is tested.
4. Return a fixed `30` for horizontal sides — the long cases still pass (30 ≤
   the side room), but runtime case 3 fails: the short "A hint" tip wraps to
   **56 px** high where one line is ≤ 32, and the position case's two tips both
   collapse to 28 px. This is why the short-tip case must assert one line, not
   only a width.
5. Restore everything and run:
   `nub run --filter @gpuixui/primitives test` (offline, must stay green).

## 4. STOP conditions

1. The runtime's horizontal placement does not honour a `maxWidth` smaller than
   the room on that side (the tip ignores or clamps the cap) — record the
   measurement and stop; do not force a width through `style`.
2. A side cap of `0` makes the tip paint nothing rather than the caller falling
   back — record it and stop. (The plan keeps the existing `cap > 0 ? cap :
   undefined` fallback, so a zero room should paint from the runtime clamp, not
   disappear.)
3. A core case needs the painted tip's box to derive a side cap — that is the
   bug, not the fix; stop and report.
4. The runtime suite cannot run on this host beyond a scoped file (plan `529`) —
   run the scoped file, record the scoping, and leave the full live run to the
   merge gate.
5. A gate fails for an unrelated reason — report it rather than editing another
   workstream's files.

## 5. Acceptance

- [x] `tipWidthCap` caps a left-side tip at `triggerLeft − margin` and a
      right-side tip at `viewportWidth − margin − triggerRight`, still bounded
      by the window cap, with `align` irrelevant on those sides.
- [x] `Tooltip` passes the trigger's measured edges, so the rule reaches the
      paint; a 60-word tip on a 1 100 px row paints ≤ 984 px instead of 1 262.
- [x] A short tip keeps its natural width.
- [x] The new tests fail with the old branch and with the wrong side mapping
      (both directions recorded in the plan's outcome).
- [x] `docs/tooltip.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index are
      current; the false limitation is gone.
- [x] `nub run test` for the package, `nub run check` and `nub run lint` pass.

## 6. Outcome

Implemented.

- `src/core/floating.ts`: `TipWidthRequest` carries `triggerLeft`/`triggerRight`;
  a horizontal side's cap is `availableWidth` on that side, bounded by the
  window cap. The vertical branch is untouched (it still anchors on the painted
  tip's box).
- `src/components/Tooltip.tsx`: the cap request passes the trigger's measured
  edges; the comment records why a clamped tip's own box cannot supply them.
- Tests: `floating.test.ts` gains/replaces 3 cases (side room, `align`
  irrelevance, window bound + zero room) — 32 in the file, offline 693 → 695.
  New `runtime/tooltip-side-cap.runtime.test.tsx` with 4 cases; the scoped run
  is 4/4 green.
- Both directions measured:
  - old window-cap branch → core `1264 vs 984`/`892`, runtime left `1262 > 984`
    and right `1262 > 1140`;
  - swapped trigger edges → core `1104 vs 984`, runtime `1102 > 984` and
    `1258 > 1140`;
  - trigger edges wired to the window → core green, runtime left `1262`,
    right `2678`;
  - fixed `30` cap → long cases pass, short tip wraps (56 px high against a
    ≤ 32 bound) and both position-case tips collapse to 28 px.
- Docs: `docs/tooltip.mdx` (API `content`, Theming long content, the false
  "wider than both sides" limitation replaced by the real height limit,
  Verification), `COMPONENTS.md` Tooltip row, `TODO.md`, plan index.
- The full live suite still shows the 9 pre-existing tooltip placement failures
  from plan `529`'s unpublished artifact (same values before and after: 2, 3, 5,
  7, 7.5 px skews), so the live evidence is the scoped file; the full run stays
  the merge gate.
