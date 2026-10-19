# 580 — The drag family in a real window: cross-element capture and the edge-scroll loop

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `162` (`drag-targets`), `172` (`drag-autoscroll`), `189`/`190`
(the live window), `197` (the live observation surface), `536` (the live
press/move/release verbs), `577` (the last live twin).
**Phase:** F — the last **interaction** family whose only evidence is the
offscreen `TestRenderer`.

## 1. Why

Two scenarios carry the `drag` capability and both are headless-only:

- `drag-targets` (plan `162`) measured pointer capture across elements: every
  held move and the `up` reach the pressed source, hover is **frozen** during
  the drag and settles after release, and the gesture ends in a **click on the
  source**.
- `drag-autoscroll` (plan `172`) measured the mechanism a reorderable list or a
  movable tab strip needs: the runtime does **not** auto-scroll a held drag at
  a container edge, so component code owns an edge loop (`renderer.scrollTo`
  per held move) which keeps the capture, and the drop index is derived from
  the pointer and the live offset.

A real window has differed from the `TestRenderer` on pointer claims before:
the drag-ending click resurrected a torn-off tab (`float-tab`, plan `194`),
a held move must carry `pressedButton: 0` (`live-pointer-entry`, plan `536`),
and a scroller's box moves with its own scroll (`live-grid`, plan `556`). Until
this plan, every drag claim the docking/detachable-tab/reorder contracts rest
on was measured only offscreen.

The live press/move/release verbs did not exist when plans `162`/`172` were
written; plan `536` added them. This plan uses them, with no new host verb, and
adds two live twins that reuse the existing views unchanged.

| Live id | View | Proves in the real `1100 × 720` window |
| ------- | ---- | ------------------------------------- |
| `live-drag-targets` | `dragTargetsScenario.view` | a real press keeps every held move and the `up` on the source, the element under the pointer gets no move/up, hover settles after the release, and the gesture ends in a click on the source |
| `live-drag-autoscroll` | `dragAutoscrollScenario.view` | three held moves at the bottom edge scroll three 24 px rows, a top-edge move scrolls one back, the drop index follows, the release keeps the `up`/click, and the plain list does **not** auto-scroll |

Only what a window can answer is asserted: element bounds, `text()` readouts
and pointer gestures. Colour and the accessibility dump stay headless for the
measured reason in plan `197`. The simulated file drop in `drag-targets` stays
headless: the automation protocol has no drop verb (plan `388` already recorded
that bound).

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `dragAutoscrollScenario` and `dragTargetsScenario`; add `liveDragTargets` and `liveDragAutoscroll`; register both near the other pointer twins (`capability: "drag"`). No view change. |
| `apps/playground/README.md` | a `### The drag family in a real window (plan 580)` section with the two-row table and the measured hover result; add the two ids to the live-evidence list. |
| `COMPONENTS.md` | the capability table's `drag` row lists the two new ids; the inventory `Drag and drop` row cites the live evidence (capture, hover, ending click, no runtime auto-scroll) and keeps the headless-only drop bound. |
| `TODO.md` | claim this task before implementing; tick it with the measured check counts and the exact focused ids run. |
| `.agents/slop/plans/README.md` | index row for this plan and one sentence in the playground narrative. |

No `packages/testing` change is expected: `bounds`, `text`, `pressWindow`,
`movePointer` and `releasePointer` already exist. **If** a needed verb is
missing, STOP — do not widen the async host in this plan; record the gap in §8
and open a follow-up task.

No production component change: both probes are app-owned pointer handling.

## 3. Implementation

### 3.1 `live-drag-targets`

Add to `apps/playground/src/live/scenarios.tsx`:

```ts
const liveDragTargets: LiveScenario = {
  id: "live-drag-targets",
  title: "Live drag targets: capture, hover edges and the ending click",
  capability: "drag",
  view: dragTargetsScenario.view,
  ready: "drag-a",
  steps: (ctx) => Effect.gen(function* () { /* steps below */ }),
};
```

Steps, with `settle` after every gesture half (the protocol has no frame
boundary, plan `189`):

1. `boxOf(ctx, "drag-a")`, `boxOf(ctx, "drag-b")`; expect both `100 × 100`
   (±1, the boxes declare no border).
2. `pressWindow(centre(a))`; `settle`.
3. `movePointer(centre(b))`; `settle`. Assert the log contains `A:down` and
   `A:move`, and **not** `B:move`.
4. Split the log at `A:up` (before the release there is no `A:up`, so use the
   whole log): assert `A:enter` occurs before the first held move
   (`indexOf("A:enter") < indexOf("A:move")`).
5. Do **not** assert that `B:enter` is absent during the drag. The first runs
   observed both orders: with the source's move handler recording state, the
   target's hover settled only after the release; with that handler removed the
   window delivered `B:enter>A:leave` during the held move. Hover delivery is
   therefore re-render/timing dependent live, not a stable rule; the headless
   freeze claim (plan `162`) stays headless. Record the measured order in §8.
6. `releasePointer(centre(b))`; `settle`. Assert `A:up`, no `B:up`, and
   `A:click` (the gesture-ending click).
7. Assert the whole log contains `B:enter` and `A:leave` (the target's hover
   and the source's leave settle, whatever their exact position relative to
   the `up`; assert membership, never order).
8. `click("drag-b")`; `settle`; assert the log gained `B:click`.
9. `hover("drag-a")`; `settle`; assert the tail contains `A:enter` and ends
   with `A:move` (the same post-gesture contract as the headless scenario).
10. Screenshot to `${LIVE_ARTIFACTS}/${liveDragTargets.id}.png`.

Expected: **10–12 checks**. Measured: **20** (each `expectNear`/
`expectContains` is a check).

### 3.2 `live-drag-autoscroll`

```ts
const liveDragAutoscroll: LiveScenario = {
  id: "live-drag-autoscroll",
  title: "Live drag: held edge scroll, capture and the derived drop index",
  capability: "drag",
  view: dragAutoscrollScenario.view,
  ready: "drag-source",
  steps: (ctx) => Effect.gen(function* () { /* steps below */ }),
};
```

Steps:

1. `reorder = boxOf(ctx, "drag-reorder")`, `plain = boxOf(ctx, "drag-plain")`.
   The reorder viewport is 180 px, so expect `height ≈ 178` (borderless, plan
   `529` §6.3) and a painted width `≈ 218`.
2. `source = boxOf(ctx, "drag-source")`; `pressWindow(centre(source))`;
   `settle`.
3. `movePointer(centreX(reorder), reorder.y + reorder.height - 6)`; `settle`.
   Assert `drag-row-6`'s painted `y` moved up by **exactly 24 px** (the
   readout alone is component state and can pass without a scroll — M1 proved
   that), then read `drag-reorder-offset`: expect exactly `offset=-24`.
4. Two more held moves at the same bottom point, each followed by `settle`.
   Expect `offset=-72` (three rows).
5. Read `drag-drop-index`: expect `index` to be `> 0`.
6. `movePointer(centreX(reorder), reorder.y + 6)`; `settle`. Expect
   `offset=-48` and a drop index smaller than the bottom one.
7. `releasePointer(centreX(reorder), reorder.y + 6)`; `settle`. The
   `drag-log` contains `down`, `up`, `click`, and at least four `move:` entries.
8. Plain list: read `drag-plain-row-1` bounds; `pressWindow` the centre of
   `drag-plain-source`; `settle`; `movePointer(centreX(plain), plain.y +
   plain.height - 6)`; `Effect.sleep("600 millis")`. Assert the post-gesture
   `drag-plain-row-1` bounds are unchanged within 1 px on `y`, and the
   `drag-plain-log` contains `move` (the gesture is live). `releasePointer`.
9. Screenshot to `${LIVE_ARTIFACTS}/${liveDragAutoscroll.id}.png`.

Expected: **10–12 checks**. Measured: **29**, including the painted-row check
added after M1 proved the readout alone could pass.

## 4. STOP conditions

- **STOP** if a needed `AsyncSmokeHost` verb is missing. Record it and open a
  follow-up task; do not add a protocol call without its own plan.
- **STOP** if a held live move does not reach the pressed source (no `A:move`,
  or the reorder offset stays `0`). Record the measured log and offset; do not
  remove the check or move the pointer until it passes without evidence.
- **STOP** if the edge loop scrolls by a different number of rows than the
  headless probe (`-24`/`-72`/`-48`). Record the numbers; do not widen the
  assertion without a reason.
- **STOP** if the gesture-ending click is absent live. That contradicts plan
  `194`'s measured click; record it in §8 and `COMPONENTS.md` and choose the
  honest wording ("the window delivers no click after a drag") rather than
  deleting the headless claim.
- **STOP** if `drag-plain-row-1` moves. That would mean the runtime auto-scrolls
  a held drag live, contradicting plan `172`; record the offset and the log.

## 5. Test plan

The two scenarios **are** the tests; each check can fail and the plan records
the mutation that proves it.

Required mutation proofs (run one at a time, observe the failure, revert):

- **M1** delete `renderer?.scrollTo?.(instance.id, 0, next)` from
  `apps/playground/src/scenarios/drag-autoscroll.tsx` → the painted row does
  not move and the readout stays `offset=-24` after the third move;
  `live-drag-autoscroll` fails at "the runtime scrolls the painted rows"
  (observed: the state-only check alone passed, which is why the row check was
  added).
- **M2** (null result) drop `{ pressedButton: 0 }` from `movePointer` in
  `apps/playground/src/live/host.ts` → the scenario stayed **green**: the
  runtime still captured the held move to the pressed source, so pointer
  capture does not depend on the per-move `pressedButton` field (unlike the
  native editor's selection, plan `536`). Reverted; recorded as a null result.
- **M3** set `EDGE` to `0` in `drag-autoscroll.tsx` → the edge band is empty,
  so no move scrolls; the painted-row check fails (`expected 151 ± 1, got 175`).
- **M4** (reverse proof) change the expected plain-list row `y` from unchanged
  to `plainRowBefore.y - 24` → the check fails with the measured unchanged row
  (`expected 31 ± 1, got 55`). Revert.
- **M5** change the expected first-edge offset from `-24` to `-48` → the check
  fails with the measured `-24`. Revert.
- **M6** remove `onMouseMove` from `DragBox` in `drag-targets.tsx` → the source
  records no `A:move`; `live-drag-targets` fails at "the source keeps the held
  move". The same run also delivered `B:enter>A:leave` during the held move,
  which is why the live probe does not assert hover freeze.

After the revert, the focused runs must be green twice in a row.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep -E 'live-drag-(targets|autoscroll)'
nub apps/playground/dist/live/run.js --only live-drag-targets,live-drag-autoscroll
```

Expected: `2/2` scenarios passed, exit `0`, two screenshots under
`apps/playground/.artifacts/live/`. Record the check total.
End-of-task gate (cross-cutting smoke registry change):

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --all
```

Expected: all green; the headless suite is **101/101** with an unchanged check
count (these are live scenarios; the headless registry is untouched). The full
**live** suite is a merge/release gate and is **not** run for this task — the
focused ids above are the evidence, and the registry total is derived
(`liveScenarios.length`).

## 7. Acceptance

- Both live ids exist, are listed by `--list`, and are green twice.
- Every asserted number is measured from the runtime; the plan records the
  measured check counts.
- The mutation proofs were observed failing and reverted.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (a D-row) and the playground README
  carry the measured result; no colour or a11y claim is invented.
- `check`, `lint`, `test` and the full headless suite are green.

## 8. Measured record (2026-10-19)

**Result:** `2/2` focused scenarios, exit `0`, **20 + 29 = 49 checks**, three
consecutive green runs. Live registry `71 → 73` (derived: `--list | wc -l`).
Screenshots: `.artifacts/live/live-drag-targets.png` and
`.artifacts/live/live-drag-autoscroll.png`.

| Measurement | Value |
| ----------- | ----- |
| drag box | declared 100 px, live **98** (the 1 px border is excluded by the live box contract, plan `529` §6.3) |
| reorder viewport | declared 180 × 220, live **178 × 218** |
| first bottom-edge move | painted row `y` **−24**; readout `offset=-24` |
| three held bottom-edge moves | `offset=-72` |
| one top-edge move | `offset=-48`, drop index smaller |
| plain list | a 600 ms bottom-edge hold moves the row **0 px**; the source still records the move |
| gesture ending | the live release produces `A:up` and `A:click` on the source |
| hover | **both orders observed**: with the source's move handler recording state, `B:enter`/`A:leave` settled after the release; with that handler removed, the window delivered `B:enter>A:leave` during the hold. The live probe asserts membership, never order; the headless freeze claim (plan `162`) stays headless |
| `pressedButton` | **null result**: dropping `{ pressedButton: 0 }` from the live `movePointer` left the scenario green — pointer capture does not depend on the per-move field (contrast plan `536`'s editor selection) |

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | removed the loop's `renderer.scrollTo` | failed "the runtime scrolls the painted rows": `expected 151 ± 1, got 175`. The first version of the probe read only the readout and **passed**; the painted-row check was added because of this proof |
| M2 | dropped `pressedButton` from `movePointer` | green (null result, recorded above) |
| M3 | `EDGE` `24 → 0` | failed "the runtime scrolls the painted rows": `expected 151 ± 1, got 175` |
| M4 | expected the plain row to move by `-24` | failed "the runtime does not auto-scroll a live held drag": `expected 31 ± 1, got 55` |
| M5 | expected the first edge offset to be `-48` | failed "a held bottom-edge move scrolls one row": `expected "offset=-48", got "offset=-24"` |
| M6 | removed `onMouseMove` from `DragBox` | failed "the source keeps the held move": log `A:down>A:enter>B:enter>A:leave`; the same run is how the hover-order variance was found |

**Focused ids run:** `live-drag-targets`, `live-drag-autoscroll` (three times);
`live-drag-autoscroll` alone for M1/M3/M4/M5; `live-drag-targets` alone for M6.

The full live suite was **not** run (merge/release gate). End-of-task gates:
`nub run check`, `nub run lint` and `nub run test` green (playground 417 tests,
primitives 282), and the full headless suite **101/101 (3554 checks, 64
capabilities)**, exit `0`.
