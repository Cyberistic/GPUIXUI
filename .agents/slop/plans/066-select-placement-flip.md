# 066 — `Select`'s list covers its trigger near the window edge

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `062`, `156` (playground's measured `fit="snap"` rule) |
| Status | planned |

This plan is self-contained. Read §1–§2, then implement §3 in order and run
§4. §5 is the STOP list.

---

## 1. The bug, measured

GPUix's `FloatingLayer` (which `@gpuix/react/select` uses) hard-codes
`side = "bottom"` and `fit = "snap"`. `fit="snap"` **clamps the layer into the
window; it does not flip it** (plan `156` §8). So a select near the bottom of a
window opens a list that is clamped upward — over its own trigger.

Measured on this host (GPUix 0.10.0, `TestRenderer`, 1280×800), with a two-option
`Select` pushed to the bottom of a 760 px column:

| Element | Bounds |
| ------- | ------ |
| trigger | `x 12, y 740, w 74, h 32` |
| list (`<anchored>`) | `x 12, y 724, w 74, h 68` |

The list's top (724) is **above** the trigger's top (740) and its bottom (792)
is below the trigger's bottom (772): it covers the field the user just pressed.
The same probe with the select higher in the window puts the list at
`y 712` under a trigger at `680..712`, i.e. correctly below.

The list's painted height is deterministic from our own styles:

```
2 * padding(xs) + rows * controlHeight.sm + (rows - 1) * gap(2xs) + 2 * borderWidth.thin
```

For the test theme and 2 rows: `2*4 + 2*28 + 1*2 + 2*1 = 68` — exactly the
measured height.

## 2. The fix

The wrapper chooses the side, because the runtime will not:

- `side` prop present → it wins, unchanged (a consumer may force a side).
- otherwise, when the trigger's measured box and the window height are known,
  flip to `top` when the list does not fit below but does fit above.
- when neither side fits, use the side with more room (the honest choice without
  collision-aware flipping or a scrolling list).
- before the first measurement, `undefined` → GPUix's `bottom` default.

The decision is pure (`core/floating.ts`) and the height estimate sits beside
the two styles it mirrors (`selectListHeight` in `Select.tsx`), so a style
change that is not reflected in the estimate fails a test.

**Scope note.** Tooltip has the same class of defect at the top edge, but its
panel height is only known after content renders and its trigger is the
`asChild` child; it is recorded as a separate TODO row, not fixed here.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | **create** — `VerticalSide`, `PlacementRequest`, `decideVerticalSide` |
| `packages/primitives/src/core/index.ts` | export the three new names |
| `packages/primitives/src/components/Select.tsx` | import `useWindowSize` + `decideVerticalSide`; add `selectListHeight`; store the trigger's full box (width/Top/bottom) instead of only the width; pass `side` and `collisionPadding` to `SelectContent` |
| `packages/primitives/src/core/floating.test.ts` | **create** — the decision table |
| `packages/primitives/src/components/Select.test.tsx` | add the estimate-vs-styles guard |
| `packages/primitives/runtime/fields.runtime.test.tsx` | add two placement tests (above at the bottom edge, below when there is room) |
| `packages/primitives/docs/select.mdx` | document the placement rule and drop the claim that `side` defaults to "GPUix's choice" |
| `packages/primitives/README.md` | add the row to "What GPUix does not provide" |
| `COMPONENTS.md` | append placement to the `Selects` row |
| `TODO.md` | tick the new primitives task; add the Tooltip-follow-up row |
| `.agents/slop/plans/README.md` | index this plan as **done** with the measured outcome |

### 3.1 `core/floating.ts`

```ts
export type VerticalSide = "top" | "bottom";
export interface PlacementRequest {
  readonly triggerTop: number;
  readonly triggerBottom: number;
  readonly layerHeight: number;
  readonly viewportHeight: number;
  readonly margin: number;
}
export const decideVerticalSide = (request: PlacementRequest): VerticalSide
```

Rules, in order: `layerHeight <= below` → `"bottom"`; else
`layerHeight <= above` → `"top"`; else the larger of `below`/`above`.
`below = viewportHeight - margin - triggerBottom`, `above = triggerTop - margin`.
Write a module doc that names the runtime fact (plan `156` §8) and the caller.

### 3.2 `Select.tsx`

- `import { useGpuix, useWindowSize } from "@gpuix/react";`
- `const COLLISION_PADDING = 8;` — the same value `FloatingLayer` defaults to,
  passed explicitly to `SelectContent` so the decision and the runtime agree.
- `export const selectListHeight = (optionCount, theme): number` beside
  `selectContentStyle`, using `theme.spacing.xs`, `theme.spacing["2xs"]`,
  `theme.density.controlHeight.sm`, `theme.borderWidth.thin`, and
  `Math.max(optionCount, 0)`.
- Replace `triggerWidth` state with
  `{ width, top, bottom }` (an exported `SelectTriggerBox` interface is
  unnecessary; keep it local and pass `bounds.width` as `minWidth`).
- Measure in the existing effect, adding `window.height` to its dependencies;
  `y` is the top, `top + height` the bottom.
- `const resolvedSide = props.side ?? (box === undefined ? undefined :
  decideVerticalSide({...}))`, with `layerHeight: selectListHeight(options.length, theme)`,
  `viewportHeight: window.height`, `margin: COLLISION_PADDING`.
- Pass `side={resolvedSide}` and `collisionPadding={COLLISION_PADDING}` to
  `SelectContent` (a `renderSelect` argument, not read inside the pure renderer;
  add `side` to `SelectHandlers` or a new parameter — prefer a single
  `placement: { side?: FloatingSide; collisionPadding: number }` parameter
  beside `triggerWidth`).
- Keep `renderSelect` pure: it must not call `useWindowSize` or the renderer.

### 3.3 Docs

`select.mdx`:

- API row `side`: “`FloatingSide` | auto (bottom, flipped up when the list does
  not fit below) | which side the list opens on”.
- A short **Placement** paragraph in Theming (or its own section) with the rule
  and the measured defect it prevents (`fit="snap"` clamps without flipping —
  plan `156`).
- Limitations: the flip uses the **estimated** list height (the formula above),
  and neither side fitting leaves the list clamped, not scrollable.
- Verification: the two runtime tests and the estimate guard.

`README.md` capability table: add
`a layer that clamps instead of flipping | fit="snap"` | `Select` measures its
trigger and opens the list above when it does not fit below (plan 066)`.

`COMPONENTS.md` `Selects` row: append the measured placement behaviour.

## 4. Test plan and commands

### 4.1 Offline

`packages/primitives/src/core/floating.test.ts`:

1. a layer that fits below opens `bottom`;
2. a layer that does not fit below but fits above opens `top`;
3. neither fits → the side with more room, for both directions;
4. `margin` is honoured (a layer that fits below only when the margin is
   ignored opens `top`);
5. exact fit (`layerHeight === below`) opens `bottom`.

`Select.test.tsx`:

6. `selectListHeight(3, testTheme)` equals the height derived from
   `selectContentStyle`/`selectItemStyle` outputs (padding, gap, row height,
   border) — the guard against the styles and the estimate drifting apart.

```sh
nub run --filter @gpuixui/primitives test
```

Expected: all suites pass, count increases by the new tests.

### 4.2 Runtime (the bug's proof)

In `runtime/fields.runtime.test.tsx`:

7. **above the bottom edge** — mount a `Select` at the bottom of a 760 px
   column, click the trigger, find the `anchored` element and assert its bottom
   (`y + height`) is `<= trigger.y`. Without the fix this is `792 <= 740`
   → fails, with the list covering the trigger.
8. **below when there is room** — the same select near the top: assert
   `list.y >= trigger.y + trigger.height`. This keeps the fix from hard-coding
   `top`.

```sh
nub run --filter @gpuixui/primitives test:runtime
```

Expected: 158 tests pass (156 + 2).

**Two-direction proof.** After the green run, force `side` to `undefined` (or
invert the decision), run test 7, record the exact failure line in §6, restore,
re-run green.

## 5. STOP conditions

- Stop if `useWindowSize` returns `0` height in the `TestRenderer` (then the
  decision cannot be made from the runtime's own window; report with the probe).
- Stop if `renderer.getElementBounds` reports the trigger's height as `0` after
  a flush (the existing width measurement never hit this; a different cause is
  at play).
- Stop if `SelectContent` ignores the passed `side` (verify with a hard-coded
  `"top"` first). Do not compensate with offsets or negative margins.
- Stop if the estimate is off by more than the border in the runtime test; that
  means the list paints padding/gap the styles do not describe — report it.

## 6. Outcome

Executed on this host, 2026-10-17.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 29 files, **331 tests green** (was 325; +5 `core/floating.test.ts`, +1 estimate guard) |
| `nub run --filter @gpuixui/primitives test:runtime` | 15 files, **158 tests green** (was 156; +2 placement) |
| near-bottom list, after the fix | list `y 672..740`, trigger `740..772` — entirely above, touching |
| near-top list, after the fix | list opens below the trigger |
| list height | painted `68` = `selectListHeight(2, testTheme)` (exact) |

**Two-direction proof.** With the decision forced off
(`const side = props.side;`, everything else unchanged), the near-bottom test
fails and the near-top one still passes:

```
AssertionError: expected 792 to be less than or equal to 740
 ❯ runtime/fields.runtime.test.tsx:534:32
```

Restored, the file is green 25/25 and the full runtime suite 158/158.

`SelectPlacement` now carries the resolved `side`, `minWidth` and
`collisionPadding`, so `renderSelect` stays pure; its default is the runtime's
own placement, which keeps the existing element-tree tests honest about what a
tree rendered outside a renderer can know.

