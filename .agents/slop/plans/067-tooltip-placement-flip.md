# 067 — `Tooltip`'s tip covers its trigger at the window's top edge

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `060`, `066` (the shared side rule), `156` (the measured `fit="snap"` rule) |
| Status | planned |

Self-contained. §1 is the measurement, §2 the rule, §3 the files, §4 the tests,
§5 the STOP list.

---

## 1. The bug, measured

`TooltipContent` defaults to `side="top"`, and `FloatingLayer` is `fit="snap"`.
Snap clamps a layer into the window **without flipping it** (plan `156` §8), so
a tooltip whose trigger sits at the window's top edge opens *over* the trigger.

Measured on this host (GPUix 0.10.0, `TestRenderer`, 1280×800), tooltip at the
top of the `Surface`:

| Element | Bounds |
| ------- | ------ |
| trigger (`target`) | `x 12, y 12, w 61, h 18` |
| tip (`tip`) | `x 12, y 8, w 47, h 26` |

The tip's bottom (34) is below the trigger's top (12): the hint covers the text
it describes. The tip's height is deterministic from `tooltipStyle`:
`2 * paddingY(xs) + caption.lineHeight + 2 * borderWidth.thin` =
`2*4 + 16 + 2 = 26` — exactly the measured height.

The `Tooltip` wrapper already owns the root element (`<div style={tooltipRootStyle}>`),
so a `ref` on it measures the trigger's box. Verified while probing: the root's
id resolves to `{ x 12, y 12, w 61, h 18 }`.

## 2. The rule

- `side` prop present → wins.
- `side` absent and the root is measured → keep GPUix's `top` when the tip fits
  above; otherwise `bottom` when it fits below; otherwise the roomier side.
- before the first measurement → `undefined`, and `TooltipContent`'s own
  `top` default applies.

`decideVerticalSide` (plan `066`) is the rule; `FLOATING_MARGIN` (8, the
runtime's `snapMargin`) is hoisted into `core/floating.ts` so `Select` and
`Tooltip` share one number. The root is re-measured when the tip opens, so a
layout change between mount and hover cannot leave a stale box.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | add `FLOATING_MARGIN = 8` |
| `packages/primitives/src/core/index.ts` | export it |
| `packages/primitives/src/components/Select.tsx` | use `FLOATING_MARGIN` instead of the local `COLLISION_PADDING` |
| `packages/primitives/src/components/Tooltip.tsx` | add `tooltipHeight(theme)`; accept `TooltipHandlers` (`ref`, `onOpenChange`) in `renderTooltip`; the wrapper measures the root and resolves `side` |
| `packages/primitives/src/components/Select.test.tsx` | add the `tooltipHeight`-vs-`tooltipStyle` guard (the Tooltip suite lives in this file) |
| `packages/primitives/runtime/fields.runtime.test.tsx` | two placement tests: flipped below at the top edge, kept above with room |
| `packages/primitives/docs/tooltip.mdx` | placement section, API default, limitation (estimated height), verification |
| `packages/primitives/README.md` | extend the clamp-instead-of-flip row to name the tooltip |
| `COMPONENTS.md` | append placement to the `Tooltips` row and bump the runtime count |
| `TODO.md` | tick the recorded Tooltip task |
| `.agents/slop/plans/README.md` | index this plan as **done** with the outcome |

Implementation notes:

- `tooltipHeight = 2 * theme.spacing.xs + theme.typography.caption.lineHeight + 2 * theme.borderWidth.thin`,
  exported beside `tooltipStyle` with the same style-mirror reason as
  `selectListHeight`.
- The wrapper reads `readWindowSize(renderer)` (exported by `@gpuix/react`) at
  decision time rather than subscribing every tooltip to a 100 ms window-size
  poll; the window size only matters when the box is re-measured.
- `renderTooltip(props, theme, handlers = {})` stays pure: `handlers` carries
  `ref` and `onOpenChange`, both optional, so existing element-tree calls are
  unchanged.
- Pass `collisionPadding={FLOATING_MARGIN}` to `TooltipContent` so the decision
  and the runtime clamp use the same number.

## 4. Test plan and commands

Offline:

1. `tooltipHeight(testTheme)` equals the height derived from `tooltipStyle`'s
   padding, line height and border (guards the estimate against a restyle).

Runtime:

2. **top edge** — mount the tooltip as the first child of the `Surface`
   (trigger at `y 12`), hover, then assert the tip is below the trigger
   (`tip.y >= trigger.y + trigger.height`) and that its painted height equals
   `tooltipHeight(testTheme)`.
3. **room above** — mount it at the bottom of a 400 px column, hover, assert
   `tip.y + tip.height <= trigger.y` (the fix must not hard-code `bottom`).

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
```

Expected: offline count +1; runtime **160** tests (158 + 2).

**Two-direction proof:** force `side = props.side`, run test 2, record the exact
failure in §6, restore.

## 5. STOP conditions

- Stop if `GpuixTooltip` does not forward the `ref` to its root div (the probe
  shows it does on React 19; if it stops, report rather than wrapping the
  tooltip in a second div).
- Stop if `readWindowSize` cannot see the window in the TestRenderer (probe:
  it reports 1280×800 there).
- Stop if the tip's painted height differs from `tooltipHeight` by more than
  1 px — the style mirror is wrong; do not tune the constant.

## 6. Outcome

Executed on this host, 2026-10-17.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 29 files, **334 tests green** (331 + 2 preferred-side rule cases + 1 `tooltipHeight` guard) |
| `nub run --filter @gpuixui/primitives test:runtime` | 15 files, **160 tests green** (158 + 2 tooltip placement) |
| top-edge tip, before | `y 8..34` over a trigger at `y 12..30` |
| top-edge tip, after | below the trigger |
| tip with room above | stays above |
| tip height | painted `26` = `tooltipHeight(testTheme)` (exact) |

**Two-direction proof.** With the decision forced off
(`const side = props.side;`), the top-edge test fails and the room-above test
still passes:

```
AssertionError: expected 8 to be greater than or equal to 30
 ❯ runtime/fields.runtime.test.tsx:586:17
```

Restored, the file is green 27/27 and the full runtime suite 160/160.

Two refinements the execution needed beyond §2:

- `decideVerticalSide` gained a `preferred` side (default `bottom`); a tooltip
  prefers `top`, and the first attempt (bottom-first) put a tip with room above
  *below* the trigger. Two core tests pin the preferred side and its fallback.
- the root measure runs on mount **and on open**, because `Tooltip` does not
  control its open state; `onOpenChange` gives the hook, and
  `readWindowSize(renderer)` is read at decision time instead of subscribing
  every tooltip to a window-size poll.

