# Plan 156 — floating-layer placement and collision (Tier 2 feasibility)

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B (feasibility) → feeds C (Tier 2 popovers, menus, tooltips).
**Depends on:** plans `120`, `140` (overlay facts), `155` (the modal contract).

## 1. Why this plan exists

`@gpuix/react/floating` is the only positioning engine the library has. Its
`FloatingLayer` renders a native `<anchored side align gap offset fit="snap"
snapMargin deferred priority occlude>`; there is no React-side measurement and
no `z-index` (`dist/components/floating.js`). `Popover`, `DropdownMenu`,
`ContextMenu` and `CommandMenu` in `@gpuixui/components` all sit on it, and none
of them can be verified on this host (that package has no built binding, so its
native tests report `unsupported-host`).

The upstream README documents the intent (`references/gpuix/README.md`
"Overlay menus"): floating content snaps inside the window and paints above the
page. What is **not** measured here is whether the published 0.10.0 anchored
layer actually:

- places a panel on the requested `side` with `sideOffset` and `align`;
- flips when there is no room at the window edge;
- keeps the panel inside the window (`collisionPadding`).

A menu that opens off-screen or under the trigger is a broken component, and no
unit test can catch it without a renderer. This probe supplies that evidence.

## 2. What is built

One scenario, `floating-placement` (capability `floating`, new in
`@gpuixui/testing`), built only from `@gpuix/react/floating` and the app's
`ui.tsx` helpers.

View (`apps/playground/src/scenarios/floating.tsx`):

- A root the size of the test window, `position: "relative"`.
- `float-anchor` — a 120×40 focusable `div` at `(200, 120)`; clicking it opens
  the panel. The `FloatingLayer` renders **inside** the anchor, because the
  native anchored layer measures against its parent, not a trigger rect.
- `float-open`/`float-switch` controls outside the anchor: `float-switch`
  toggles the layer between `side="bottom" align="start"` and `side="right"
  align="center"`, both with `sideOffset={6}` and `collisionPadding={8}`.
- `float-edge-anchor` — a 120×40 div at the bottom of the window
  (`top = window.height - 70`), always `side="bottom"`.
- A `float-panel` (160×80) with `pointerEvents: "auto"` and an opaque theme
  background; a readout `float-readout` reports
  `open=<bool> side=<side> edge=<bool>`.

Steps:

1. Click `float-anchor` → readout `open=true side=bottom`; the panel and the
   anchor are both painted.
2. Bottom-start geometry: `panel.y ≈ anchor.y + anchor.height + 6` and
   `panel.x ≈ anchor.x` (tolerance 1px).
3. Click `float-switch` → `side=right`: `panel.x ≈ anchor.x + anchor.width + 6`
   and the panel's vertical centre ≈ the anchor's (`expectNear`, 1px).
4. Click `float-edge-anchor` → the panel is inside the window: `panel.y >= 8`,
   `panel.y + panel.height <= edge.y + 1` (it flipped above the bottom anchor
   instead of running off-screen).

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"floating"` to `CAPABILITIES` |
| `apps/playground/src/scenarios/floating.tsx` | new scenario |
| `apps/playground/src/scenarios/index.ts` | register it; add `"floating"` to `CORE_CAPABILITIES` |
| `apps/playground/README.md` | scenario count `19 → 20`; measured-facts row; structure line |
| `COMPONENTS.md` | evidence table row for `floating`; notes on Popover / Dropdown / Context / Command menus cite it |
| `TODO.md` | tick the item; progress bar |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/140-…md` §4 | the `floating` row of measured facts |

No change outside `apps/playground`, `packages/testing` and the ledgers.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js --only floating-placement` | passes, `floating=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `20/20 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof.** Change the bottom case's `side` to `"top"` and run
`--only floating-placement`: the bottom-start geometry check must fail with the
measured y and exit `1`. Restore: green.

## 5. STOP conditions

Stop and report with the measured bounds if:

- **`side`/`align` are ignored** (the panel always sits at the same corner).
  Record the anchor and panel boxes; the popover/menu components must position
  themselves or the API promise must be corrected.
- **`sideOffset` is not applied** (the gap is 0 or double). Record the value; a
  component that assumes 6 px would overlap the trigger.
- **The layer does not flip at the window edge.** Record the panel box; a menu
  near the bottom would open off-screen and the docs must say the component
  must flip itself.
- **`align="center"` does not centre.** Record both centres.
- **A change outside this workstream is needed**: record it in `TODO.md`.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `floating-placement` steps | native smoke | ignored side/align, missing offset, no edge flip, a panel partly outside the window |
| `scenarioProblems` | unit (exists) | the `floating` capability losing its scenario |
| full suite | native smoke | the new anchored layer disturbing later scenarios |
| two-direction run (§4) | native smoke | the probe passing when the requested side is ignored |

## 7. Acceptance criteria

- `floating-placement` is registered, green, and `floating` is a required core
  capability.
- The suite is **20/20 green on this host**, exit `0`.
- The two-direction proof is recorded.
- The measured geometry is in plan `140` §4, `COMPONENTS.md` and the app README.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

**20/20 green**, exit `0`; `floating-placement` records 9 checks and
`floating=verified`. Geometry measured with the anchor at `(200, 120, 120×40)`
and a `160×80` panel:

| Request | Measured | Verdict |
| ------- | -------- | ------- |
| `side="bottom"`, `align="start"`, `sideOffset=6` | panel `(200, 166)`, i.e. `anchor.bottom + 6`, left edge = anchor left | exact |
| `side="right"`, `align="start"`, `sideOffset=6` | panel `(326, 120)`, i.e. `anchor.right + 6`, top = anchor top | exact |
| `align="center"` (right side) | panel top `60`, bottom `140` = anchor centre, **not** centred around it | off by half the panel height |
| bottom edge anchor at `y=730`, `side="bottom"` | panel `y=712..792`; the window is `800` high, `snapMargin=8` | snapped to `window − 8`, **did not flip**; the panel overlaps its anchor |

Two findings the components must design around:

- **`align="center"` is not centred.** On both axes it places the panel's *end*
  at the anchor's centre line: bottom side → `x = anchorCentreX - panelWidth`
  (measured `100` instead of `180` for a 160px panel and a 120px anchor); right
  side → `y = anchorCentreY - panelHeight`. `start` and `end` are exact.
  Cause: `anchored.rs` wraps the layer in a full-height/width zero-size flex box
  **and** positions it from the anchor point, so the offset is applied twice.
  A component can compensate with `alignOffset` only if it knows the panel's
  measured size; until then it must use `start`/`end` or document the offset.
  The scenario asserts the measured formula so an upstream fix fails the check.
- **`fit="snap"` clamps to the window, it does not flip.** A bottom-side layer
  near the window edge moves up until its bottom is at `window - snapMargin`,
  which can put it *over* its trigger. A menu near the bottom must choose
  `side="top"` itself (or accept the overlap); "collision-aware flip" is not a
  runtime feature in 0.10.0.

Two-direction proof: hard-coding `side="bottom"` in the `FloatingLayer` gives
`side=right sits one gap right of the anchor: expected 326 ± 1, got 200`
→ `floating=failed`, exit `1`. Restored: green, exit `0`.

