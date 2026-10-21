# 823 — The declared tween curve, in the frame: does `ease`, `delay` and a cubic-bezier reach the pixels?

Status: planned 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

`MotionProps.transition` is a public prop with three fields — `duration`,
`delay` and `ease` — and `ease` accepts **five names plus a four-number
cubic-bezier tuple**:

```ts
export type MotionEase =
  | "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut"
  | [number, number, number, number];
export interface MotionTransition {
  duration?: number; // seconds
  delay?: number;    // seconds
  ease?: MotionEase;
}
```

Every motion claim in this repo is a **linear** tween:

- `apps/playground/src/scenarios/motion.tsx` declares
  `transition={{ duration: 0.2, ease: "linear" }}` on both its fixtures, and
  `motion-collapse` (plan `157`) / `live-motion` (plan `192`) assert the
  resulting 40 % width at 40 % of the duration;
- `apps/playground/src/scenarios/collapsible.tsx` declares the same linear
  tween, and `collapsible-height` (plan `186`) / `live-collapsible` (plan `592`)
  assert a 56 px frame of a 140 px linear tween;
- `COMPONENTS.md`'s `motion` capability row (`motion-collapse`,
  `collapsible-height`, `live-motion`, `live-collapsible`) says **verified**;
- `@gpuixui/motion` ships a curve library (`linear`, `easeIn/Out/InOut`,
  `circIn/Out/InOut`, `backIn/Out/InOut`, `anticipate`, `bezier`) and its React
  hooks drive **numbers** into `motion.div`, so a consumer who writes
  `transition={{ ease: "easeOut" }}` has no evidence at all.

**The bug being guarded:** a runtime that accepts `ease`/`delay` and ignores
both — tweening linearly, immediately, or from the target instead of the
visible value — passes every check in both registries. The consequence for the
library is not cosmetic: every component that declares an eased transition
(collapsible, drawer, toast exit, sidebar) would be shipping a curve it does not
paint, and the token layer's motion roles would be unverifiable decoration.

## 2. Reconnaissance (source, pinned `0.10.0`)

1. **The typings the consumer sees** —
   `apps/playground/node_modules/@gpuix/native/dist/host.d.ts:9-27` (re-exported
   by `@gpuix/react`'s `MotionProps`): `MotionStyle` animates `width`, `height`,
   `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`;
   `MotionTransition` is `{ duration?: number; delay?: number; ease?: MotionEase }`.
   `duration` and `delay` are **seconds**.
2. **The reference clone's implementation** — `~/GPUIXUI/references/gpuix`
   `packages/native/src/motion.rs` (main, `515df19`, *ahead of the pin* — PLAN
   D9, plan `529`) names the five eases to CSS curves
   (`easeIn` `[0.42,0,1,1]`, `easeInOut` `[0.42,0,0.58,1]`, `ease`
   `[0.25,0.1,0.25,1]`, the fall-through branch `[0,0,0.58,1]`), solves a
   cubic-bezier by 20-iteration bisection, clamps the result to `[0, 1]`,
   defaults the duration to `0.3 s` and the ease to `easeOut`, and retargets
   from the **visible** value. **This is main, not the pin**, which is exactly
   why every number below is measured rather than assumed.
3. **What is already proven** — plan `157` proves the clock and the tween
   mechanism (a paused clock plus `fastForwardMotion` gives an exact mid-tween
   width); plan `192` proves the same in a real window; plan `186`/`592` prove
   the height variant. None of them varies `ease` or declares a `delay`, and
   nothing measures a retarget (every probe toggles after the tween completes).
4. **What is not measurable** — the runtime exposes no easing readout, no
   cursor, and no frame `progress`. A curve is only observable as **geometry at
   a known clock time**, which is what this probe does.

## 3. Design

### 3.1 The fixture (one static view, shared by both hosts)

A single 8-row column. Each row is a label (`<text>`) over a **240 px rail**
(`testId="curve-<name>-rail"`, `height: 24`, `backgroundColor: muted`), whose
first child is the animating `motion.div` (`height: 24`,
`backgroundColor: primary`) followed by a 4 px tick
(`testId="curve-<name>-marker"`). The rail is painted before the tween starts,
so "the fill is absent" always means "zero width", never "the row did not
mount".

**The fill has no `testId`:** `MotionDivProps` publishes no `testId` (PLAN D31),
so the probe cannot address the animated box directly. It reads the **tick that
follows the fill**: `fill width = marker.x - rail.x`. That is the same sibling
displacement `motion-collapse` uses on its content pane, and it makes a
zero-width fill measurable instead of invisible.

| row | `transition` |
| --- | --- |
| `curve-linear` | `{ duration: 0.2, ease: "linear" }` |
| `curve-ease` | `{ duration: 0.2, ease: "ease" }` |
| `curve-ease-in` | `{ duration: 0.2, ease: "easeIn" }` |
| `curve-ease-out` | `{ duration: 0.2, ease: "easeOut" }` |
| `curve-ease-in-out` | `{ duration: 0.2, ease: "easeInOut" }` |
| `curve-bezier` | `{ duration: 0.2, ease: CUSTOM_CURVE }` — `[0.6, 0.05, 0.3, 0.95]` |
| `curve-delay` | `{ duration: 0.2, delay: 0.1, ease: "linear" }` |
| `curve-default` | omitted entirely |

Controls (each a focusable `div role="button"` like `motion.tsx`'s
`ProbeButton`):

- `curve-run` — sets `phase` from `"rest"` to `"run"`, so **one commit** starts
  every tween above;
- `curve-retarget-run` — starts a separate 0 → 240 linear tween on
  `curve-retarget` (same 240 × 24 track);
- `curve-retarget-back` — flips that tween's target to 0.

A `Readout` (`curve-readout`) prints `phase=<phase> retarget=<value>`, so a
check can prove the state the paint belongs to.

The fill's **painted width** is the measurement: 240 px travel, so a progress of
`p` is `240 × p`. Width never reflows another sample because every row is its
own track.

### 3.2 The checks

The probe freezes the clock (`pauseMotion`) **before** the first click. Every
sample is `fastForwardMotion(delta)` from the previous sample, and the expected
width comes from the pure model — never from a literal the scenario restates.

**Samples at 50 / 100 / 150 ms** (a quarter, half and three quarters of the
200 ms tween), for the six 200 ms curves:

| curve | 50 ms | 100 ms | 150 ms |
| --- | --- | --- | --- |
| `linear` | 60.0 | 120.0 | 180.0 |
| `ease` | 98.0 | 192.6 | 230.5 |
| `easeIn` | 22.4 | 75.7 | 149.2 |
| `easeOut` | 90.8 | 164.3 | 217.6 |
| `easeInOut` | 31.0 | 120.0 | 209.0 |
| `curve-bezier` | 24.5 | 143.4 | 222.8 |

CSS `cubic-bezier` reference values, for review only — the scenario computes
them through the model, so a typo here cannot become an expectation.

Checks, in order:

1. `the linear tween is linear` — 60/120/180 ± 2.
2. `easeIn lags a linear tween early` — its 50 ms sample is **below** linear's
   by more than 20 px, and its 150 ms sample is below linear's.
3. `easeOut leads a linear tween early` — its 50 ms sample is **above** linear's
   by more than 20 px.
4. `easeInOut is symmetric at the midpoint` — 120 ± 2 at 100 ms, and its 50 ms
   sample is below 60 while its 150 ms sample is above 180.
5. `ease is the CSS ease curve` — all three samples within 2 px of
   `cubic-bezier(0.25, 0.1, 0.25, 1)`, and its 150 ms sample is **more than**
   8 px past `easeOut`'s (0.9605 vs 0.9065 — 13 px), so a runtime that aliased
   `ease` to `easeOut` fails.
6. `a cubic-bezier tuple is honoured` — all three samples within 2 px of the
   model for `[0.6, 0.05, 0.3, 0.95]`, and **at one sample** the tuple is at
   least 12 px from every named curve's model (the closest name is
   `easeInOut` at 100 ms and `easeIn` at 50 ms — 2 px, because both start slow —
   so the check uses the maximum over the three samples, 23 px), meaning a
   runtime that ignored the tuple and kept one named curve fails by name.
7. `the delay holds the from-value` — at 50 ms the fill's painted width is 0
   (a zero-width fill may report no bounds, which the probe reads as 0); at
   150 ms it is 40 ± 2; at 250 ms 120 ± 2; at 400 ms 240 ± 1.
8. `the default transition eases out` — with no `transition`, the probe samples
   the fill at 50 / 100 / 150 ms of the runtime's default 300 ms duration and
   fits the three progress values against the five named curves
   (`nearestEase`); the identified name must be `easeOut`. A failure prints the
   identified name, so the run reports the pin's real default instead of only
   "not easeOut". A second check samples 225 ms against the 300 ms `easeOut`
   model (217.6 px), which a 200 ms default would have finished (240 px).
9. `a retarget starts from the visible value` — 80 ms into 0 → 240 (96 px), flip
   the target to 0, then 80 ms more: 57.6 ± 2. Starting from the target (240)
   would paint 144; restarting at 0 would paint 0. The completion readout must
   stay `retarget=0` until the second tween settles.

The live twin (`live-motion-curve`) reuses the same view and runs the same
samples through the async host, `settle`-ing after each click and each
`fastForwardMotion` (the protocol has no frame boundary). One frame is captured
as the artifact.

### 3.3 The pure helper — `apps/playground/src/scenarios/motion-curve-model.ts`

```ts
export type NamedEase = "linear" | "ease" | "easeIn" | "easeOut" | "easeInOut";
export type Curve = NamedEase | [number, number, number, number];

export const NAMED_EASES: ReadonlyArray<NamedEase>;
export const CUSTOM_CURVE: [number, number, number, number]; // [0.6, 0.05, 0.3, 0.95]
export const CURVE_DURATION_MS = 200;
export const DEFAULT_DURATION_MS = 300; // the runtime's default, measured by check 8
export const TRAVEL = 240;
export const SAMPLE_TIMES: ReadonlyArray<number>; // [50, 100, 150]
export const MATCH_TOLERANCE = 0.05;

export const easedProgress: (curve: Curve, progress: number) => number;
export interface Tween {
  readonly from: number;
  readonly to: number;
  readonly durationMs: number;
  readonly delayMs?: number;
  readonly ease: Curve;
}
export const widthAt: (tween: Tween, elapsedMs: number) => number;
export interface Sample {
  readonly at: number;
  readonly progress: number;
}
export const sampleAt: (at: number, width: number) => Sample;
/** The named curve whose model is closest to the observed samples. */
export const nearestEase: (
  samples: ReadonlyArray<Sample>,
  durationMs: number,
) => Option.Option<NamedEase>;
```

`easedProgress` is the CSS definition: solve `x(t)` by bisection (40 rounds, so
the pure answer is exact to far below the 2 px tolerance) and read `y(t)`,
clamped to `[0, 1]` like the runtime. `widthAt` clamps `elapsed < delay` to
`from`, `elapsed > delay + duration` to `to`, and interpolates the rest. A
`MotionEase`-shaped tuple is **one** source of truth (`CUSTOM_CURVE`) shared by
the view, the checks and the tests, so the fixture and its expectation cannot
drift.

`nearestEase` returns the minimum of the maximum absolute deviation across the
samples, and `Option.none()` when nothing is within `0.05` — so the fit is only
as strong as the separation the unit tests pin.

### 3.4 Why a new scenario, not an edit to `motion-collapse`

`motion-collapse` is the **collapsible sidebar** contract (an outer clip that
animates while the inner pane keeps its width, plus `AnimatePresence`). Adding
eight fixtures to it would bury that contract, and its linear tween is itself
load-bearing evidence that the clock is exact. `live-motion` is its twin and
must stay a twin. The new id also means the curve evidence can fail alone.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/motion-curve-model.ts` — the pure model.
2. `apps/playground/src/scenarios/motion-curve-model.test.ts` — its unit tests
   (§6.1).
3. `apps/playground/src/scenarios/motion-curve.tsx` — the view, the shared
   `curveChecks` and the headless scenario `motion-curve`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import and register
   `motionCurveScenario` (next to `motionScenario`); the capability stays
   `motion`.
5. `apps/playground/src/live/scenarios.tsx` — import `motionCurveScenario` and
   add the `live-motion-curve` twin next to `live-motion`; append it to the live
   registry array.
6. `apps/playground/README.md` — a `## Motion curves (plan 823)` section next to
   the motion material.
7. `COMPONENTS.md` — the `motion` capability row (line ~60) gains
   `motion-curve`, `live-motion-curve`; the motion section (line ~339) gains the
   measured curve facts.
8. `PLAN.md` — one decision row (D98) recording the measured curve contract.
9. `TODO.md` — one ticked row under `### Playground workstream`, plus the
   cross-team row for the tokens/motion consumers (§9).
10. `.agents/slop/plans/README.md` — this plan's row in the playground table and
    the number-claim sentence (`823` verified free across every worktree).

No change to `packages/testing`: the host already exposes `pauseMotion`,
`fastForwardMotion` and `bounds`, which is everything the probe needs.

## 5. Steps, commands, expected results

Run every command from the repo root of the worktree.

1. Write the model and its tests (§3.3, §6.1).
   `nub run --filter playground test -- motion-curve-model`
   → the new tests pass.
2. Write the scenario and register it (§4.4).
   `nub run --filter playground build`
   → exit `0`; the binding line says
   `binding: gpuix-native.darwin-x64.node is current`.
3. `nub apps/playground/dist/smoke/run.js --list | grep motion-curve`
   → exactly `motion-curve` (once).
4. `nub apps/playground/dist/smoke/run.js --only motion-curve`
   → `1/1 scenarios passed`, `capabilities: motion=verified`, the check count
   printed in the report. **Record every measured number in §9.**
5. Add the live twin (§4.5) and rebuild.
   `nub apps/playground/dist/live/run.js --only live-motion-curve`
   → `1/1 scenarios passed`, a screenshot at
   `apps/playground/.artifacts/live/live-motion-curve.png`.
6. Mutation proofs (§6.2), each rebuilt and re-run focused:
   `nub apps/playground/dist/smoke/run.js --only motion-curve` → exit `1` with
   the named check; revert and re-run → green.
7. End-of-task gates:
   `nub run check`, `nub run lint`, `nub run test` → all exit `0`.
   The full headless suite is the end-of-task check for a cross-cutting change;
   this probe adds one scenario, so it is optional. **Do not** run the full live
   suite: it is the merge/release gate.

## 6. Test plan

### 6.1 Unit tests (`motion-curve-model.test.ts`)

Each must be able to fail:

1. `linear` is the identity at 0.25/0.5/0.75 and `easedProgress("linear", x) === x`.
2. Every named curve is monotonic on a 100-step grid and closed at 0 and 1
   (`0` and `1` within `1e-6`).
3. The reference CSS values: `easeInOut(0.5) === 0.5` (±1e-3); `easeIn` < 0.25 at
   0.25; `easeOut` > 0.25 at 0.25.
4. `CUSTOM_CURVE` differs from **every** named curve by at least `0.05` at one of
   the three sample times — the separation check 6 relies on.
5. The five named curves are pairwise separated by at least `0.02` on the
   50/100/150 ms grid — the separation `nearestEase` relies on.
6. `widthAt` holds `from` through the delay, is exact at `delay + duration`, and
   clamps past it (a negative `elapsed` is `from`).
7. `nearestEase` identifies each named curve from its own three samples;
   `Option.none()` for samples taken from a curve `0.2` off every named one.
8. A retarget model: `widthAt` with `from: 96, to: 0, duration: 200` at 80 ms is
   `57.6`.

### 6.2 Runtime mutations (each must fail by name, then be reverted)

- **M1** `curve-ease-in` declares `ease: "linear"` → check 2 fails
  (`easeIn lags a linear tween early`).
- **M2** `curve-bezier` declares `ease: "easeOut"` → check 6 fails.
- **M3** `curve-delay` drops `delay` → check 7 fails at 50 ms (it paints ~60).
- **M4** `curve-default` declares `ease: "linear"` → check 8 fails with the
  measured name.
- **M5** `curve-retarget-back` is a no-op → check 9 fails (240 instead of 57.6).
- **M6** a unit mutation: `easedProgress` returns `progress` for every curve →
  tests 1–3 fail. (The reverse direction for the model.)

If a mutation **passes**, the probe does not discriminate that field; record it
as a null result in §9 rather than tightening the check to fit.

## 7. STOP conditions

Stop and report with the evidence — do not improvise:

1. `@gpuix/react@0.10.0` no longer exports `MotionProps`/`MotionTransition` as
   recorded in §2.1, or `MotionEase` no longer includes the tuple form. The
   probe's premise is gone; re-plan.
2. The pinned runtime **rejects** a documented value (a valid named ease or a
   valid tuple) with a thrown error or a blank surface. Record the rejection as
   a measured limitation, keep only the values that render, and update §9. Do
   not substitute an invalid value to make a check run.
3. `pauseMotion()` does not freeze the new fixtures (a sample moves without
   `fastForwardMotion`). The numbers are then races, not facts; report and stop.
4. The live window cannot pause or advance its motion clock for this view.
   Keep the headless half, record the live gap explicitly, and do not claim a
   live twin.
5. A measured curve differs from the CSS model by more than ±2 px after the
   clock is confirmed exact. That is a **finding**, not a tolerance problem:
   record the measured value as a correction (the way plan `761` recorded the
   8-bit nested composite) and assert the measured curve with a stated
   tolerance. Never widen a tolerance to make a curve "fit".

## 8. Acceptance

- [ ] `motion-curve` and `live-motion-curve` are registered and green.
- [ ] The named curves, the cubic-bezier tuple, the delay, the default and the
      retarget each have a check that fails when the field is removed (M1–M5).
- [ ] The pure model owns every expected number; no scenario restates a literal.
- [ ] Unit tests cover the model's curve maths and the separation the fits rely
      on, and a unit mutation fails them (M6).
- [ ] `apps/playground/README.md`, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the
      plans index record the measured facts and the exact ids run.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The cross-team consequence is recorded in `TODO.md`: the motion tokens and
      `@gpuixui/motion` consumers can now cite a measured curve, and any
      component whose transition was authored against a different curve must be
      re-checked.

## 9. Outcome (measured 2026-10-21)

**The runtime honours the declared curve, the delay and the retarget, and its
default transition is `easeOut` over 300 ms.** All eight rails matched the CSS
cubic-bezier model at every sample, on both hosts, on the first green run.

- `motion-curve` — **150 checks**, `1/1 scenarios passed`,
  `capabilities: motion=verified`, 288–823 ms. `live-motion-curve` — **150
  checks** (the same `curveChecks` body), three consecutive green runs at
  1920 / 2110 / 1981 ms, exit `0`, artifact
  `apps/playground/.artifacts/live/live-motion-curve.png`.
- The painted widths are **integer-rounded**: a deliberate zero-tolerance debug
  read failed with `ease at 50 ms: expected 98.04254192534204 ± 0, got 98`,
  while `linear at 50 ms` was exactly `60`. The checks therefore compare against
  the CSS model with **±2 px**, which is rounding slack, not a widened curve.
- The fit identified the default as `easeOut` (`DEFAULT_DURATION_MS = 300`,
  225 ms sample 217.6 px against 240 settled), matching the reference clone's
  `default_ease`/`default_duration` — now **measured on the pin**, not read from
  main.
- A retarget continues from the **visible** value: 96 px at 80 ms, flip, then
  **57.6 px** at +80 ms (from the target it would have been 144, from zero 0).

**Correction to this plan §3.2 item 6:** the first run failed
`the cubic-bezier tuple is at least 12 px from every named curve` because the
original rule compared **only the 50 ms sample**, where the chosen tuple is
2 px from `easeIn` (both curves start slow — `0.1019` against `0.0935`). The
rule is now the **maximum gap over the three samples** (23 px, against
`easeInOut`), which is what actually distinguishes a tuple from a name.
`CUSTOM_CURVE` also moved from `[0.1, 0.2, 0.4, 1]` to
`[0.6, 0.05, 0.3, 0.95]` while fixing that separation.

**Mutation proofs observed and reverted** (each exit `1`, naming the check):

| # | Mutation | Failure |
| - | -------- | ------- |
| M1 | `curve-ease-in` declares `ease: "linear"` | `easeIn lags a linear tween early: expected true, got false` |
| M2 | `curve-bezier` declares `ease: "easeOut"` | `the cubic-bezier tuple is at least 12 px from every named curve: expected true, got false` |
| M3 | `transitionOf` drops `delay` | `delay at 50 ms: expected 0 ± 2, got 60` |
| M4 | `curve-default` gets `{ ease: "linear" }` | `the default transition is the runtime's easeOut: expected "easeOut", got "linear"` |
| M5 | `curve-retarget-back` is a no-op | `a retarget continues from the visible value: expected 57.6 ± 2, got 172.5` |
| M6 | `easedProgress` returns `progress` for every curve | the model unit suite (M6 ran as its own reverse direction, §6.1) |

M1 and M2 show why the **relational** checks exist: when a fixture's ease is
mutated, the per-row model check follows the mutation and passes, so only the
cross-curve comparisons catch it. The delay, default and retarget checks fail at
the row itself.

Files landed: `apps/playground/src/scenarios/motion-curve-model.ts` (+ 18 unit
tests), `apps/playground/src/scenarios/motion-curve.tsx`, the registry entries
`motion-curve` / `live-motion-curve`, and the ledger updates in
`apps/playground/README.md`, `COMPONENTS.md`, `PLAN.md` (D98) and `TODO.md`.

End-of-task gates: `nub run check`, `nub run lint` and `nub run test` green
(playground **671** tests, `testing` 75). Full headless suite **124/124**
(**4888** checks, 67 capabilities, 1259.7 s under concurrent load, exit `0`).
Live registry **112 → 113** (the plan-`812` total of 110 was stale: plans `819`
and `820` added `live-hidden-surface` and `live-scroll-clip` after it); the full
live suite was **not** run — it is the merge/release gate.
