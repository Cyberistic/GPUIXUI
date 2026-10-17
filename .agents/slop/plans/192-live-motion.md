# 192 — Motion in a real window: the paused clock and a mid-tween frame

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §7) |
| Phase | B → F (release evidence) |
| Owner | playground workstream |
| Depends on | `100`, `157`, `186`, `189`, `190` |
| Feeds | the `motion` capability, collapsible sidebars / accordions / toast claims, Phase G |

## 1. Goal

Plan `157` measures dimension motion on the offscreen `TestRenderer` by pausing
its motion clock. The live suite has never exercised `motion`: `live-panel`
proves a pointer drag resizes a static split, not an animated one. Yet
`GpuixRenderer` exposes `clockPause`/`clockSet`/`clockFastForward`/`clockResume`
(the live automation server forwards them) and the runner already threads them
into `AsyncSmokeHost.pauseMotion`/`fastForwardMotion`.

This plan adds `live-motion` and answers two questions in a real window:

- does the paused clock control a `motion.div` tween at all (or is the live
  window's clock independent)?
- is an 80 ms frame of a 200 ms / 240 px linear tween exactly 96 px, and does
  the inner pane keep its 240 px width (no reflow)?

It also checks the `AnimatePresence` exit: a leaving toast stays mounted until
the exit tween settles — and measures how many times `onExitComplete` fires live
(the headless suite sees once; this probe found **twice** for one exit).

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | Add `live-motion` (view = `motionScenario.view`, capability `motion`); import it |
| `apps/playground/src/live/host.ts` | **Fix found by this probe:** `bounds` now returns `null` when the locator matches nothing, instead of throwing `SmokeHostError`. The async interface already promised `Bounds \| null`; a removed toast is the case that exposed it |
| `apps/playground/README.md` | Add the live row and the measured limit (if any) |
| `COMPONENTS.md` | Add `live-motion` to the `motion` row and the live paragraph |
| `TODO.md` | Add and tick the task |
| `.agents/slop/plans/README.md` | Index this plan; `100–192` used |
| `PLAN.md` | D37: the live motion clock works (or the measured limit) |

No `packages/testing` change: the four verbs already exist. No production
component change.

## 3. Scenario

`live-motion`, view `motionScenario.view`, `ready: "motion-toggle"`:

1. `pauseMotion()`; read `motion-content`'s left (`expandedX`) and
   `motion-inner`'s width; assert width is 240 ±1.
2. click `motion-toggle`; `fastForwardMotion(80)`; `settle`.
   - `expandedX − left(motion-content)` is 96 ±4 (a jump or a frozen clock
     fails);
   - `motion-inner` is still 240 ±1;
   - `motion-readout` contains `complete=0`.
3. `fastForwardMotion(200)`; `settle`; the content has moved 240 ±1 and
   `motion-readout` contains `complete=1`.
4. click `motion-toggle`; `fastForwardMotion(80)`; the content is 96 px from the
   collapsed edge; `fastForwardMotion(200)`; it is back at `expandedX`;
   `complete=2`.
5. click `motion-show-toast`; wait for `motion-toast-label`; click
   `motion-hide-toast`; the label is still painted (retained during exit).
6. `fastForwardMotion(200)`; `settle`; the label's `bounds` is `null` and
   `motion-readout` reports at least one exit completion. **Measured live: the
   count is `exited=2` for the one leaving toast**, unlike the headless `1`; the
   live check therefore asserts removal and at least one completion, and the
   component guidance is that `onExitComplete` must be idempotent.
7. screenshot `apps/playground/.artifacts/live/live-motion.png`.

Read bounds through the async host; a missing bound is a named failure. The
`settle` after each clock move is the live runner's frame boundary (the
protocol has none).

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground test` | 9 files, 61 tests pass (unchanged) |
| `nub apps/playground/dist/smoke/run.js` | `56/56`, exit `0` (unchanged) |
| `nub apps/playground/dist/live/run.js` | `11/11`, exit `0`, `live-motion` checks pass |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if the paused clock does not freeze the tween in a real window (the
  content moves after the click without a `fastForwardMotion`). Record the
  measured positions and mark motion `TestRenderer`-only; do not keep a check
  that cannot distinguish a jump from a frame.
- **STOP** if `fastForwardMotion` throws or the live clock is not the motion
  clock. Record the error (the host turns it into `SmokeHostError`).
- **STOP** if the run exits `2` (no window).

## 6. Test plan

- The mid-tween check is the test: 96 px at 80 ms of 200 is unreachable by a
  0/240 jump and by a frozen clock. **Measured reverse run:** sending
  `fastForwardMotion(0)` instead of `80` fails
  `the content moved 96 px at 80 ms: expected 96 ± 4, got 0` and exit `1`.
- The headless `motion-collapse` suite must stay green.
- The toast's removal is checked by `bounds` (null after the exit), not painted
  text; the live host's new "no match → `null`" rule is what makes that read
  possible and would fail loudly if it regressed to a host error.

## 7. Measured results

Run on this host (Intel macOS, locally built `@gpuix/native@0.10.0`, ADR 0003),
2026-10-18.

**The live clock controls motion.** `live-motion` (1.3 s) records 25 checks; the
live suite is `11/11`, exit `0`:

- the expanded inner pane is 240 px;
- after `pauseMotion`, a click and `fastForwardMotion(80)`, the content moved
  **96 px ±4** of the 240 px collapse — a jump would be 240, a frozen clock 0;
- the inner pane is still 240 px mid-tween (outer clipping, no reflow);
- no `onMotionComplete` fires mid-tween; it fires once at each end
  (`complete=1`, `complete=2`);
- the expand tween is 96 px from the collapsed edge at 80 ms and returns to the
  same expanded edge;
- the leaving toast stays painted after `hide`, and `bounds` is `null` after
  `fastForwardMotion(200)`.

**Two measured differences from the headless run**

1. **`onExitComplete` fires twice live** for one leaving toast
   (`exited=2` after the exit; the headless probe reads `1`). The check asserts
   removal plus at least one completion, and the docs now say an
   `onExitComplete` handler must be idempotent.
2. **The live `bounds` verb had to return `null` for a removed element.** It
   threw `AutomationError: Locator did not match any element` when the toast was
   gone; the async interface already says `Bounds | null`, so the host now
   checks `all()` first. This surfaced only because the probe reads a removed
   element.

**Reverse run:** `fastForwardMotion(0)` instead of `80` fails
`the content moved 96 px at 80 ms: expected 96 ± 4, got 0`, capability
`motion=failed`, exit `1`. Restored and re-ran green. Screenshot:
`apps/playground/.artifacts/live/live-motion.png`.

## 8. Acceptance

- `live-motion` passes in a real window and fails in the recorded reverse
  direction.
- The docs state whether the live clock controls motion, with the measured
  numbers; no claim is copied from the headless suite.
