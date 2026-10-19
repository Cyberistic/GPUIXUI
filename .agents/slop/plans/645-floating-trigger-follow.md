# 645 — A floating layer must follow its trigger, not only the window

**Phase:** F (integration and polish)
**Owner:** primitives
**Depends on:** 041, 060, 067, 095, 098, 335, 336, 347, 391, 393, 604, 609
**Status:** done — 2026-10-19

## 1. The defect

`Tooltip` and `Select` decide a floating layer's side, width cap and alignment
from the **trigger's box**. They re-measure when the window size changes (plan
`604`) and sleep while closed (plan `609`), but a trigger that moves or resizes
while the layer is already open never invalidates that decision. GPUix has no
`onLayout`; the runtime repositions the layer with its trigger, but the side and
cap are still the ones chosen for the old box.

Measured on the pinned release-tag runtime (2026-10-19, 1280 × 800), with a
`Tooltip` and a `Select` mounted after a spacer that shrinks from 700 px to 0
while the layer is open:

```
Tooltip, trigger y 712…736, side="top" → tip y 691…715   (above, correct)
Tooltip, trigger moved to y 12…36       → tip y 13…37    (covers the trigger)

Select, trigger y 713…747, list open    → list y 645…711 (above, correct)
Select, trigger moved to y 13…47        → list y 13…79   (covers the trigger)
```

Both layers are still anchored to the trigger; only the decision is stale. The
top edge has no room for a top-side layer, so the correct action is to open
below. This is the same class plan `604` fixed for a window resize, one input
further in: **the trigger's own box is a placement input and must be followed
while the layer is open.**

## 2. The rule

While a floating layer is painted, sample its trigger's box on the window
observer's cadence (100 ms). When the box changes, re-run the wrapper's existing
measurement; that updates the side, cap, alignment and (for `Tooltip`) the
painted tip's own measurements.

- The sampler **sleeps while the layer is closed**, exactly like the window
  observer (plan `609`). A closed layer has no placement to correct.
- The sampler updates state only when a measured value changed. A 100 ms
  re-render of an unchanged tooltip/list is not acceptable.
- The measurement is **shared**: one hook (`useFloatingFollow`) takes the active
  flag and the component's stable measurement callback, so `Tooltip` and
  `Select` cannot drift on the polling rule. The constant
  `FLOATING_FOLLOW_MS = 100` lives beside `FLOATING_MARGIN` in
  `core/floating.ts`, where the placement rules already live.
- This is a follow, not a flip: the runtime's layer still anchors itself; the
  wrapper only refreshes what it decided.

Do **not** introduce a second resize observer library, an `onLayout` prop, or a
poll while closed. Do not change the public `Tooltip`/`Select` API.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/floating.ts` | Add `FLOATING_FOLLOW_MS = 100` with TSDoc stating it is the trigger-follow cadence and why (no `onLayout` in 0.10.0). |
| `packages/primitives/src/components/internal.ts` | Add `useFloatingFollow(active, measure)`: keep the latest callback in a ref, then `setInterval` at `FLOATING_FOLLOW_MS` while `active`, cleared on close/unmount. One TSDoc block explaining the measured class and the sleep. |
| `packages/primitives/src/components/Tooltip.tsx` | Extract the existing layout-effect body into a `measure` callback. Compare the next `TooltipBox` with the current one and keep the current state object when equal. The layout effect calls `measure`; `useFloatingFollow(open, measure)` follows the trigger while open. |
| `packages/primitives/src/components/Select.tsx` | Extract the existing layout-effect body into a `measure` callback. Compare the next `TriggerBox` and list width with the current ones and keep the current state when equal. The layout effect calls `measure`; `useFloatingFollow(open, measure)` follows the trigger while open. |
| `packages/primitives/runtime/floating-resize.runtime.test.tsx` | Add the two measured cases below, plus the closed-sampler case. Update the file header to record the trigger-follow class and plan `645`. |
| `packages/primitives/docs/tooltip.mdx` | In the placement/resize section, state that the trigger's box is followed while open and that the runtime re-anchors but does not re-decide the side. |
| `packages/primitives/docs/select.mdx` | The same statement for the list's side/cap. |
| `packages/primitives/README.md` | The floating row of the "What GPUix does not provide" table adds trigger movement to the window-resize sentence; the runtime file count stays **58** (cases are added to an existing file). |
| `COMPONENTS.md` | `Tooltip` and `Select` rows record the measured defect, the 100 ms follow (sleeps while closed) and the cases; the runtime prose is unchanged in count. |
| `.agents/slop/plans/README.md` | Index this plan. |
| `TODO.md` | One ticked primitives row. |

Do not touch `packages/tw`, `packages/tokens`, or any docs-site path.

## 4. Commands and expected results

Run from `workspaces/primitives`:

```sh
# 1. Before the fix, the new cases must fail by name (from packages/primitives;
#    `nubx` keeps the runtime config and the correct Node):
cd packages/primitives
nubx vitest run --config vitest.runtime.config.ts runtime/floating-resize.runtime.test.tsx
# Expected before: the two follow cases fail —
#   Tooltip: tip y 13…37 over a trigger y 12…36
#   Select:  list y 13…79 over a trigger y 13…47
# The existing resize and closed-sampler cases pass.

# 2. Implement, then run the same file:
nubx vitest run --config vitest.runtime.config.ts runtime/floating-resize.runtime.test.tsx
# Expected: all cases pass, including the new closed-sampler case.

# 3. Offline suite (the hook/equality changes must not disturb the element trees):
cd ../..
nub run --filter @gpuixui/primitives test
# Expected: 60 files pass (the runtime-only additions do not change this count).

# 4. Full runtime suite at the end of the task (release-tag build):
nub run --filter @gpuixui/primitives test:runtime
# Expected: 58 files pass.

# 5. Gates:
nub run check
nub run lint
nub run test
# Expected: all pass.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- the trigger cannot be sampled through `renderer.getElementBounds` while the
  layer is open (the hook has no signal; record the measured API instead);
- the follow interval causes a render loop (the equality check must stop it);
- the layer still covers its trigger after the follow (the side decision is not
  the cause — record the measured boxes and do not loosen the assertion);
- the closed-sampler case shows a call after 250 ms closed (the active gate is
  wrong);
- a full runtime run becomes order-dependent or slower in a way the test
  timings cannot absorb.

## 6. Test plan (both directions)

Add to `runtime/floating-resize.runtime.test.tsx`, reusing its `belowSpacer`
helper and the existing `settleWindow` timing idea:

1. **Tooltip follows a trigger that moves up.** Mount a top-side tooltip after a
   700 px spacer; hover; assert the tip is above the trigger. Re-render the same
   tree with the spacer at 0; wait `FLOATING_FOLLOW_MS + 80` and flush; assert
   `tip.y >= trigger.y + trigger.height` (it opened below). Before the fix the
   tip is `13…37` over the trigger at `12…36`.
2. **Select follows a trigger that moves up.** Mount the select after the same
   spacer; click its trigger; assert the list is above. Re-render with the
   spacer at 0; wait and flush; assert `list.y >= trigger.y + trigger.height` or
   `list.y + list.height <= trigger.y` (the list is on a side, never over the
   trigger). Before the fix it is `13…79` over the trigger at `13…47`.
3. **A closed layer does not sample its trigger.** Instrument
   `renderer.getElementBounds` with a counter, mount a closed tooltip, settle,
   record the count, sleep `2 × FLOATING_FOLLOW_MS + 100`, and require no new
   calls. Open it, sleep the same, and require calls (the follow is live). Close
   it, sleep, and require none again. This guards the sleep rule like plan
   `609`'s window case.

Both directions: revert the two `useFloatingFollow` calls (or the hook's interval)
and the two follow cases fail by name; restore them and all cases pass. Remove
the equality guards and confirm the closed case still passes but the open layer
re-renders every tick (observe the state identity in the test only if needed —
do not ship a timing assertion that a busy CI can flake).

## 7. Acceptance

- A tooltip whose trigger moves while open flips to the side with room; it does
  not cover the trigger.
- A select list whose trigger moves while open does the same.
- A closed layer performs no follow sampling; an open one samples at 100 ms.
- The docs, README, inventory and plan index record the measured rule.
- Offline, scoped runtime, full runtime, `check`, `lint` and `test` pass.

## 8. Outcome (2026-10-19)

Landed as planned. `core/floating.ts` exports `FLOATING_FOLLOW_MS = 100`;
`components/internal.ts` exports `useFloatingFollow(active, measure)`, which
keeps the latest measure callback in a ref and schedules it only while the layer
is open. `Tooltip` and `Select` now run their measurement body through a
`useCallback`, keep the previous state object when the measurement is unchanged,
and call the hook with `open`.

- Scoped runtime: `runtime/floating-resize.runtime.test.tsx` **8/8** (the two
  new follow cases and the closed-sampler case included).
- Both directions proven: calling the hook with `false` made the two follow
  cases fail by name — Tooltip `tip.y 8 < 35`, Select `list.y 8 < 43`; restored,
  all 8 pass.
- Full runtime: **58 files / 812 tests** green on the release-tag build (was
  809; the three cases are in an existing file).
- Offline: **60 files / 860 tests**.
- `nub run check`, `nub run lint` and `nub run test` pass.
- Docs (`tooltip.mdx`, `select.mdx`, the README floating row,
  `docs/gpuix-capabilities.md`), the two inventory rows and the plan index carry
  the measured rule. The `Select` page's "a trigger width change keeps the old
  `minWidth` until reopen" limitation was made false by this fix and is replaced
  with the follow contract.
