# 157 — Plan: motion probe — the collapsible sidebar and the exit tween

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §8) |
| Phase | B (feasibility) → feeds C (toast/accordion) and D (collapsible sidebar, drawer) |
| Owner | playground workstream |
| Depends on | `110`, `120`, `140` |
| Feeds | `@gpuixui/components` Collapsible/Toast/Accordion; `packages/docking` collapsible sidebar |

## 1. Goal

Measure whether GPUix's native `motion.div` really interpolates **width** over
time in the `TestRenderer`, whether the test clock makes that deterministic, and
whether `AnimatePresence` keeps a leaving child mounted until the native exit
tween settles. Answer with numbers, so the Tier 2 and Tier 4 components that
animate dimensions (collapsible sections, collapsible sidebars, drawers, toasts)
can be designed on measured behaviour, not on a README promise.

The probe is a **feasibility probe**: a `failed` verdict is a real outcome. If
GPUix cannot interpolate width under test, record it and give the honest
alternative (discrete steps) — do not fake the animation in the scenario.

## 2. What is documented (not yet measured here)

From `references/gpuix/README.md` §Native animations (lines ~1138–1300):

- `motion.div` accepts `initial`, `animate`, `exit`, `transition`,
  `onMotionComplete`; targets are `width`, `height`, `top`, `right`, `bottom`,
  `left`, `opacity`, `borderRadius`; `duration` is in **seconds**.
- Animate an **outer clipping container** and keep the inner sidebar at a fixed
  width; the outer width moves between `253` and `0` while the content stays
  mounted.
- A child with `exit` leaves only after the target finishes, and only inside
  `AnimatePresence`; without it React removes the node on the same commit.
- `AnimatePresence` accepts `onExitComplete`.
- `motion.div` accepts `onMotionComplete`; a stale completion is ignored.

From the installed `@gpuix/native@0.10.0` `TestRenderer` (published types):

- `clockPause(): number`, `clockFastForward(deltaMs): number`,
  `clockSet(nowMs): number`, `clockResume(): number` move the **motion clock**.
- `advanceTime(ms)` is a *different* clock (GPUI dispatcher/timers); it is not
  motion time.

From the pinned source (`references/gpuix/packages/native/src/automation.rs`,
`renderer.rs`), `clockPause` freezes the `AutomationClock` that
`sync_motion_states` reads at paint; `clockFastForward` moves it and notifies.

**None of this has a native verdict in this repo.** The capability is missing
from `Smoke.CAPABILITIES`, and no scenario animates a dimension.

## 3. Scenario `motion-collapse` (capability `motion`)

New view `apps/playground/src/scenarios/motion.tsx`.

State: `collapsed: boolean`, `showToast: boolean`, `complete: number`,
`exited: number`.

Tree (all colours from `useTheme`, all copy through `Body`/`Readout`):

```
<motion.div initial={false}
  animate={{ width: collapsed ? 0 : 240 }}
  transition={{ duration: 0.2, ease: "linear" }}
  onMotionComplete={() => setComplete(n => n + 1)}
  style={{ display: "flex", flexDirection: "row", flexShrink: 0, overflow: "hidden" }}>
    <div testId="motion-inner" style={{ width: 240, flexShrink: 0 }}>sidebar</div>
</motion.div>
<div testId="motion-content" style={{ flexGrow: 1 }}>content</div>
<Pressable testId="motion-toggle" onClick={() => setCollapsed(!collapsed)}>toggle sidebar</Pressable>
<Pressable testId="motion-show-toast" onClick={() => setShowToast(true)}>show toast</Pressable>
<Pressable testId="motion-hide-toast" onClick={() => setShowToast(false)}>hide toast</Pressable>
<AnimatePresence initial={false} onExitComplete={() => setExited(n => n + 1)}>
  {showToast ? (
    <motion.div key="toast" initial={false}
      animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "linear" }}>
      <text testId="motion-toast-label">saved</text>
    </motion.div>
  ) : null}
</AnimatePresence>
<Readout testId="motion-readout">{`collapsed=${collapsed} complete=${complete} exited=${exited}`}</Readout>
```

`initial={false}` on the frame means it mounts at `240`; the first measured
tween is the deliberate collapse, not a mount race.

**The animating node has no `testId`**, because the published `MotionDivProps`
omits it (§8). The probe measures the laid-out sibling `motion-content` instead:
when the sidebar narrows, the content's left edge moves left by exactly the
frame's width. That is a stronger assertion than reading the animating element's
own style, and it needs no cast.

### Steps and assertions

1. `host.pauseMotion()` — freeze the motion clock. Record
   `expandedX = bounds("motion-content").x`; assert
   `bounds("motion-inner").width` is `240 ± 1`.
2. `click("motion-toggle")` → `fastForwardMotion(80)`.
   `expandedX − bounds("motion-content").x` is `96 ± 4` (40% of 240). This is
   the interpolation check: a jump straight to the target moves the content by
   `0` or `240` and fails.
   `bounds("motion-inner").width` is still `240 ± 1` — the documented
   fixed-width inner sidebar did not reflow.
   `text("motion-readout")` contains `complete=0`.
3. `fastForwardMotion(200)` → content moved `240 ± 1`; readout contains
   `complete=1` (`onMotionComplete` fired exactly once).
4. `click("motion-toggle")` → `fastForwardMotion(80)` → content moved
   `144 ± 4` (the expand is symmetric); inner still `240 ± 1`;
   `fastForwardMotion(200)` → content's left edge is back at `expandedX ± 1`,
   readout contains `complete=2`.
5. `click("motion-show-toast")` → `text("motion-toast-label")` is `"saved"`.
   `click("motion-hide-toast")` (no time advance): the label is **still**
   `"saved"` — `AnimatePresence` retains the leaving child.
   `fastForwardMotion(200)`: the label is gone and the readout contains
   `exited=1`. This is the native exit tween, not a JS timer.

`expectNear` supplies the tolerance; `Option.isSome(Option.fromNullishOr(...))`
turns the presence check into a boolean for `expectEqual`.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/157-motion-collapse.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `157` in the playground table |
| `packages/testing/src/smoke.ts` | add `"motion"` to `CAPABILITIES`; add `pauseMotion(): number` and `fastForwardMotion(ms: number): number` to `SmokeHost` (JSDoc: the motion clock, not `advance`) |
| `packages/testing/src/test-support.ts` | `nullHost` gains `pauseMotion: () => 0`, `fastForwardMotion: () => 0` |
| `apps/playground/src/smoke/host.ts` | implement both over `renderer.clockPause()` / `renderer.clockFastForward(ms)`; fast-forward also calls `dispatchNativeEvents()` + `flush()` so the next read sees the painted frame **and** React receives `onMotionComplete` |
| `apps/playground/src/scenarios/motion.tsx` | the probe view + scenario, header comment citing the measured facts |
| `apps/playground/src/scenarios/index.ts` | import/register the scenario; add `"motion"` to `PROBE_CAPABILITIES`; update the comment |
| `apps/playground/src/smoke/run.test.ts` | the registry test also asserts `"motion"` is covered |
| `TODO.md` | new task under the playground workstream, ticked with the measured result |
| `COMPONENTS.md` | `motion` row in the native-evidence table; a sentence in the paragraph that records what the suite settled; a note on the Tier 4 collapsible-sidebar and Tier 2 toast rows |

**Do not** touch `packages/components`, `packages/docking` or any other
workstream's tree. If the components workstream needs a different motion
contract, record it as a cross-team task in `TODO.md`.

## 5. Commands and expected results

Run from the worktree root.

1. `nub run --filter @gpuixui/testing test`
   → 3 files, 19 tests pass.
2. `nub run --filter playground test`
   → 2 files, 11+ tests pass (the registry test now names `motion`).
3. `nub run --filter playground build`
   → exit `0`, `dist/smoke/run.js` written.
4. `nub apps/playground/dist/smoke/run.js`
   → `21/21 scenarios passed`, the capability line contains `motion=verified`,
   exit `0`; `.artifacts/smoke-report.json` has the `motion-collapse` checks.
5. `nub apps/playground/dist/smoke/run.js --only motion-collapse --screenshots`
   → the one scenario passes and writes
   `.artifacts/screenshots/motion-collapse.png`.
6. `nub run check` and `nub run lint` → both exit `0`.

## 6. STOP conditions

- **STOP** if `clockPause`/`clockFastForward` do not exist on the installed
  `TestRenderer`: record the type error verbatim; the probe cannot be
  deterministic. Fall back only if the owner asks, and document the alternative
  (a real-time tween with a wide tolerance is not acceptable as evidence).
- **STOP** if the content edge moves by `0` or `240` at 80 ms: GPUix did not
  interpolate under test. Record it as a real limitation with the measured
  numbers and update `COMPONENTS.md` to `unsupported (evidence)` for native
  width motion. Do not loosen the assertion to make it pass.
- **STOP** if the leaving toast is removed immediately on hide: `AnimatePresence`
  did not wait for the native exit. Record the measured behaviour; that changes
  the toast design.
- **STOP** if any command needs a different binding than the local 0.10.0 build
  (ADR 0003). Report; do not install another version.

## 7. Test plan (two directions)

- The **scenario itself** is the regression test for the runtime: it fails if
  the tween stops interpolating, if `onMotionComplete` stops firing, if the
  inner sidebar reflows, or if `AnimatePresence` stops retaining the exit
  child.
- **Two-direction proof**, recorded in this plan's §8: temporarily change the
  expected mid-collapse width to a value a jump could produce (`0`) and run
  `--only motion-collapse`; the suite must exit `1` and name
  `width mid-collapse`. Revert.
- `run.test.ts` guards the registry: removing the scenario makes
  `scenarioProblems` report `no scenario covers "motion"`.
- `check-tests` rejects an assertion-free test, so the registry assertion must
  keep naming a real capability.

## 8. Measured facts

Run on this host against the locally built `@gpuix/native@0.10.0` (ADR 0003).
`21/21 scenarios passed`, exit `0`, `motion=verified`; the probe's checks are in
`.artifacts/smoke-report.json`, the frame in
`.artifacts/screenshots/motion-collapse.png`.

- `TestRenderer.clockPause()` freezes the same `AutomationClock` that
  `sync_motion_states` reads at paint, so a tween's progress is deterministic:
  `clockFastForward(80)` on a 200 ms linear width tween moved the laid-out
  content edge by **exactly 96 px of 240** (40%), and the completion target was
  reached at +200 ms more.
- **Motion completion needs an explicit event dispatch.** `clockFastForward`
  moves the clock and paints, but `onMotionComplete` only reaches React after
  `renderer.dispatchNativeEvents()` — the first run reached the target and still
  read `complete=0`. The adapter's `fastForwardMotion` now dispatches and
  flushes, the same requirement `focusNext` has (plan `140` §4).
- The outer clipping container pattern works: while the animated container
  shrank past the inner pane, the inner pane's painted width stayed **240** —
  it does not reflow, it is clipped.
- `AnimatePresence` keeps a leaving child mounted until the native exit tween
  settles: right after `hide`, the toast label was still present; after
  `clockFastForward(200)` it was gone and `onExitComplete` had fired once.
- `motion.div`'s published type (`MotionDivProps`) **omits `testId`, `role` and
  the `aria-*` props**; the runtime passes extra props through, but a typed
  animated surface cannot be addressed directly. The probe therefore measures
  the animating container's effect on its sibling (`motion-content`), which is a
  stronger layout assertion anyway. Recorded as a cross-team task for
  `@gpuixui/components` (a typed motion wrapper), not worked around here.
- Two-direction proof: with the mid-collapse expectation changed from `96` to a
  jump value (`0`), `--only motion-collapse` exits `1` and reports
  `content moved mid-collapse: expected 0 ± 4, got 96`; `motion=failed`.
  Reverted, the full suite is green again.

