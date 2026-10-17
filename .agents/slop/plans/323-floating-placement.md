# Plan 323 — floating placement truth: centre alignment and a real near-edge flip

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 correctness) |
| Owner | components workstream (`packages/components`) |
| Depends on | `112` (Popover), `114` (menus), `117`, `156` (measured floating placement, playground) |
| Status | in progress |

## 1. Why

The playground probe `156` measured two defects in GPUix 0.10.0's anchored layer,
and `@gpuixui/components` currently exposes both as if they worked:

1. **`align="center"` is off by half the panel on both axes.** For a 120×40
   anchor at `(200, 120)` and a 160×80 panel, `side="bottom" align="center"`
   paints at `x = 100` — the panel's *end* lands on the anchor's centre
   (`anchorCentreX - panelWidth`), not its centre (`anchorCentreX - panelWidth/2`).
   On `side="right"` the same error appears vertically: `y = anchorCentreY -
   panelHeight`.
2. **`fit="snap"` clamps, it does not flip.** A bottom panel whose trigger sits
   near the window bottom is moved up until its bottom is at `window - snapMargin`,
   which puts it *over* its trigger. The host also accepts `fit="switch"`, but
   `anchored.rs` in the reference source only implements `snap` — measured in
   this package, `fit="switch"` produces the same clamped, overlapping box.

`PopoverContent` and `DropdownMenuContent` both expose `align="center"` and rely
on a flip that never happens; their docs and inventory rows claim the layer
"flips". That is a broken promise, so this plan fixes it in the component rather
than documenting a lie.

## 2. What is implemented

### 2.1 A pure placement rule (`src/internal/placement.ts`)

```ts
export interface FloatingBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface Placement {
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly alignOffset: number;
}
export const resolvePlacement: (input: {
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly trigger: FloatingBounds;
  readonly surface: FloatingBounds;
  readonly window: { readonly width: number; readonly height: number };
  readonly margin: number;
}) => Placement;
```

Rules, all pure and unit-tested:

- **Centre**: `align="center"` is not sent to the host. The runtime centres on
  the trigger's *containing block*, not the trigger (re-measured in this plan:
  a 60px trigger in a 1200px root put a 200px panel at `x = 540`). The component
  sends `align="start"` and adds
  `(trigger.width - surface.width) / 2` on a `top`/`bottom` side, or
  `(trigger.height - surface.height) / 2` on a `left`/`right` side. Both values
  come from measured bounds, so the result is exact; the snap margin still wins
  when the target would leave the window.
- **Flip**: when the surface (after snapping, which is what is measured) overlaps
  the trigger, choose the opposite side if it has room for the surface. When both
  sides overlap, choose the side with more space. `start`/`end` stay exact and
  never need an offset.
- **No change** when the requested side does not overlap the trigger.

`FloatingLayer` already maps its `alignOffset` prop to the host's `offset`
(`x` for top/bottom, `y` for left/right), so no host-level code is needed.

### 2.2 Wire the rule into the two named surfaces

Both surfaces mount only while open, so a `useState` placement resets for free on
every open.

- `PopoverContent`: keep an internal ref on the `FloatingLayer`, compose it with
  the caller's `ref` (`useMergedRef`), and in one mount-time `useLayoutEffect`
  read `getElementBounds` for the surface and the trigger (already in context)
  plus `getWindowSize`, then `setPlacement(resolvePlacement(...))` when the
  result differs from the requested side / zero offset.
- `DropdownMenuContent`: identical, using the trigger already in
  `DropdownContext`.
- `ComboboxContent`: the same rule over GPUix's headless combobox surface, whose
  own `FloatingLayer` has the identical defects and whose docs promised a flip.

Both read the renderer through `useGpuix()`, guard the optional renderer methods
(`getElementBounds?`, `getWindowSize?`), and keep the requested `side`/`align`
props as the caller's intent. The effect runs once per mount; flipping cannot
oscillate because it never re-runs.

### 2.3 Correct the documentation and inventory

- `docs/popover.mdx` and `docs/dropdown-menu.mdx`: replace every "flips" claim
  with the measured truth — the runtime snaps, the component flips once when the
  snapped surface would cover its trigger, and centre is compensated from the
  measured panel.
- `COMPONENTS.md`: Popover `gpuixSupport` becomes `partial` with the measured
  evidence; Dropdown menus keep `partial` but cite centre compensation + the
  component-owned flip; update the notes text.
- `examples/popover.example.tsx`: show `align="center"` and put the trigger near
  the bottom of the card so the example exercises the flip path.
- Inspect `docs/combobox.mdx`'s "it flips" sentence: only correct it if the
  wrapped GPUix combobox is ours to correct (it is GPUix's own popup). Record a
  TODO row instead if it is the runtime's promise.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/323-floating-placement.md` | this plan |
| `.agents/slop/plans/README.md` | index row |
| `packages/components/src/internal/placement.ts` | new pure placement rule |
| `packages/components/src/internal/placement.test.ts` | unit tests |
| `packages/components/src/popover.tsx` | measure + flip + centre compensation |
| `packages/components/src/dropdown-menu.tsx` | same for the menu surface |
| `packages/components/src/combobox.tsx` | same over the headless combobox popup |
| `packages/components/src/behaviour/popover.test.tsx` | centre + near-bottom flip |
| `packages/components/src/behaviour/dropdown-menu.test.tsx` | centre + near-bottom flip |
| `packages/components/src/behaviour/combobox.test.tsx` | centre + near-bottom flip |
| `packages/components/examples/popover.example.tsx` | centre alignment, low trigger |
| `packages/components/docs/popover.mdx` | truth pass |
| `packages/components/docs/dropdown-menu.mdx` | truth pass |
| `packages/components/docs/combobox.mdx` | truth pass |
| `COMPONENTS.md` | Popover and Dropdown rows |
| `TODO.md` | tick the workstream row and record the cross-team evidence |

No file outside `packages/components`, `COMPONENTS.md`, `TODO.md` and
`.agents/slop/plans/` changes.

## 4. Commands and expected results

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/components test` | unit suites green, including `placement.test.ts` |
| `nub run --filter @gpuixui/components test:behaviour` | all behaviour suites green, including the new Popover/Dropdown cases |
| `nub run --filter @gpuixui/components check-types` | no type error |
| `nub run check` | check-tests, lint, fmt, type-check clean |
| `nub run lint` | clean |
| `nub run test` | clean |

## 5. STOP conditions

Stop and report with the measured boxes if:

- `getElementBounds` returns `null`/zero inside the mount layout effect, so the
  surface cannot be measured after its first paint. Record the order of the
  effect and the measured values; do not fall back to a guessed size.
- The centre compensation needs a different sign or magnitude per side. Record
  all four axes; do not ship a formula that only fits one side.
- The flip oscillates (a side chosen, then the opposite chosen on the next
  render). The implementation must be one-shot; if it cannot be, stop.
- The measured overlap cannot distinguish "snapped onto the trigger" from a
  legitimate overlap (e.g. a menu that intentionally covers its trigger).
  Record the geometry and leave the requested side unchanged.
- A change outside the listed files is needed. Record it in `TODO.md`.

## 6. Test plan

### Unit (`src/internal/placement.test.ts`)

| Test | What it catches |
| ---- | --------------- |
| bottom + centre → `(trigger.width - surface.width) / 2` from `start` | the measured containing-block error |
| right + centre → `(trigger.height - surface.height) / 2` from `start` | the other axis |
| start/end → offset 0 | over-correcting an exact alignment |
| no overlap → requested side | flipping when it is not needed |
| bottom overlapping near the window bottom → top | the probe's `y = 712..792` case |
| top overlapping near the top → bottom | the mirror case |
| left/right overlap → the opposite horizontal side | clamp on the other axis |
| both sides overlap → the roomier side | a needless flip into a worse space |

### Behaviour (real GPUix renderer)

| Test | What it catches |
| ---- | --------------- |
| Popover `align="center"` centres on the trigger | the half-panel offset in the real layer |
| Dropdown `align="center"` centres on the trigger | same via the menu surface |
| a Popover near the window bottom opens above its trigger | the `fit="snap"` overlap |
| a Dropdown near the window bottom opens above its trigger | same via the menu surface |
| a Popover that fits below still opens below | flipping every time |

### Two-direction proof

1. Comment out the `setPlacement` call → the two centre tests fail with the
   measured `anchorCentre - panelSize` x/y (the plan 156 numbers).
2. Force `resolvePlacement` to keep the requested side → the two near-bottom
   tests fail with the surface's top inside the trigger's bottom.
3. Restore; all green. Record the exact failure messages in the plan outcome.

## 7. Acceptance criteria

- `align="center"` is exact on both axes for Popover and Dropdown menu,
  asserted by measured bounds in the real renderer.
- A surface whose requested side would be snapped over its trigger opens on the
  opposite side when that side has room; roomier-side fallback otherwise.
- Docs and `COMPONENTS.md` no longer claim a runtime flip and record the measured
  limitation.
- Every command in §4 runs green.

## 8. Outcome (this worktree, 2026-10-18)

**Re-measured in the package.** With a 60×32 trigger at `(40, 40)` inside the
`Popover` root, a 200×46 panel landed at `x = 540` under `align="center"`: the
runtime centred it on the *containing block*, not the trigger. In the raw
`FloatingLayer` probe an `alignOffset` of `100` moved the panel by exactly `100`,
so the component can correct the position, but the correction has to be measured
(`target - current`) rather than a fixed half-panel.

**Implemented.** `center` is sent to the host as `start` plus
`(trigger.width - surface.width) / 2` (or the height pair on a horizontal side);
`start`/`end` are unchanged. The root surface flips once when the snapped box
overlaps the trigger and the opposite side has room, otherwise it picks the
roomier side. `usePlacement` measures through `getElementBounds` /
`getWindowSize`, resets on close, and re-measures when the requested placement
changes.

**Tests.** Unit `placement.test.ts` (9), Popover 12/12, Dropdown menu 35/35,
Combobox 17/17. Documentation and `COMPONENTS.md` no longer claim a runtime flip.

**Two-direction proof, recorded:**

- `resolveSide` forced to the requested side: the Popover and Dropdown near-bottom
  tests fail with `expected 792 to be less than or equal to 748` (the panel's
  bottom is the snap line, over the trigger). Restored: green.
- `alignOffset` forced to `0`: the centre tests fail with `expected 70 to be less
  than or equal to 1` (Popover) and `expected 56 ...` (Dropdown). Restored: green.

