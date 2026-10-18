# 527 — The paint/frame counters: `frames`, the sample ring and the debug overlay

| Field | Value |
| ----- | ----- |
| Status | landed — `frame-stats` 67 checks + `live-frames` 29; suite `99 → 100` (3455 → 3522 checks), `frames=verified`, exit `0`; six mutation + one reverse proof (§6/§8) |
| Phase | B→F (runtime diagnostics — the last supported surface with no contract) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100` (harness), `110`/`120` (suite + shell), `140` (0.10.0 runs here), `182` (keyed remount), `197` (the live host reads the renderer it owns), `302` (the cost model) |
| Answers | does `getDebugFrameOverlayStats()` count paints (so a test can prove a frame happened), what does `resetDebugFrameOverlayStats()` clear, and is the debug overlay paint-only or does it touch the tree and input? |

## 1. Question

`GpuixRenderer`/`TestRenderer` expose four diagnostics that no probe has
measured:

- `getDebugFrameOverlayStats() → { frames, samples, currentMs, p90Ms, p99Ms, maxMs }`
- `resetDebugFrameOverlayStats()` — documented as "clears the last 1000 draw
  samples. Frame count stays."
- `setDebugFrameOverlay("hidden" | "minimal" | "full")`, `cycleDebugFrameOverlay()`,
  `getDebugFrameOverlay()`

`frames` is the only runtime-owned signal that a paint actually happened, so a
component test could use it instead of guessing with `advance(0)`. The open
questions:

1. Is `frames` a paint counter or a frame-loop ticker? Does an idle window
   increment it?
2. Does reading the stats paint? Does one forced paint cost exactly one frame?
3. Does `reset` clear `frames` or only the sample ring — and what does it leave
   in the ring?
4. Is the sample ring really bounded at 1000 entries?
5. What is the mode contract — does `set` return the previous or new mode, and
   what is the `cycle` order?
6. Does the overlay change the retained tree or the painted text, and does it
   intercept a click underneath it?
7. Do the timings have an order (`p90 ≤ p99 ≤ max`) that a check can rely on?

Reconnaissance on this host (0.10.0, throwaway scripts, deleted):

```
headless, settled tree
  two consecutive getDebugFrameOverlayStats()   frames 6 → 6   samples 6 → 6   (a read is pure)
  flush()                                        frames +1, samples +1 (×3 runs)
  advanceTime(0)                                 +0
  dispatchNativeEvents()                         +0
  nativeSimulateClick (button whose text changes) +4
  dispatchScrollWheel                            +1
  nativeSimulateScrollWheel                      +2
  setDebugFrameOverlay("minimal")                +1, returns "minimal"
  resetDebugFrameOverlayStats()                  frames +1, samples = 1,
                                                 p90 = p99 = max = current = that one sample
  1200 × flush()                                 frames 1228, samples 1000 (cap), ~1.5 s
  p90 ≤ p99 ≤ max, current ≤ max                 true
  overlay full → retained nodes +0, painted text +0
  invalid mode "bogus"                           the native call throws (JS validates the mode)

live window (900×600, no motion)
  idle 300 ms                                    frames +0
  automation click on a button whose text changes frames +3
  reset                                          frames +1, samples = 1 (stable after 150 ms)
  setDebugFrameOverlay("full")                   +1, returns "full", get = "full"
  click under the full overlay                   still activates the button
  cycle from "full"                              → "hidden" → "minimal" → "full"
  idle 1.2 s after overlay toggles + 2 screenshots frames +3 (delayed repaints; do not
                                                 assert idle frames after touching the overlay)
```

So: the counter is structural (a paint count, not wall-clock noise); a read is
pure; `flush()` is exactly one frame; `reset` clears only the sample ring; the
ring caps at 1000; the overlay is a paint-only layer that never intercepts
input; and the live window paints on damage only.

Why it is load-bearing:

- A test that cannot prove a paint happened cannot prove a component *rendered*
  a state change, only that its handler ran. That distinction is exactly the
  "never claim a test passed unless it ran" rule.
- A debug overlay that intercepted input would make any screenshot-driven
  manual check lie about the interaction underneath it.
- The numbers are also the only route to a consumer-facing performance
  diagnostic (`scale-cost`, plan `302`, left them out deliberately).

## 2. Source evidence (confirm in the run, do not assume)

- `@gpuix/native` `index.d.ts`: `DebugFrameOverlayStats { currentMs?; p90Ms?;
  p99Ms?; maxMs?: number; frames: number; samples: number }`.
- `@gpuix/native/dist/testing.d.ts`: `TestRenderer` exposes all four verbs plus
  `flush()` ("Trigger the real GPUI rendering pipeline").
- `@gpuix/native/index.d.ts`: `"hidden" | "minimal" | "full"` is documented on
  `setDebugFrameOverlay`; `cycleDebugFrameOverlay` is "Hidden → minimal → full →
  hidden".
- `apps/playground/src/smoke/run.ts`: `createTestRoot` + `Native.createHost`.
- `apps/playground/src/live/run.ts`: the runner creates the `GpuixRenderer`, so
  the live host may read these verbs directly (plan `197`'s rule).

**STOP** and amend this plan if a run contradicts a number above (§8).

## 3. Design

One capability `frames`, one headless scenario, one live twin, five host verbs
on each host, one forced-paint verb on the headless host, and a schema-decoded
`FrameStats` at the adapter boundary.

### 3.1 `packages/testing/src/smoke.ts`

- `CAPABILITIES`: append `"frames"`.
- New schemas beside `WindowSize`:

```ts
/** A debug-overlay mode the runtime documents. */
export const FrameOverlayMode = Schema.Literals(["hidden", "minimal", "full"]);
export type FrameOverlayMode = typeof FrameOverlayMode.Type;

/** The runtime's paint counter and its 1000-entry sample ring. */
export class FrameStats extends Schema.Class<FrameStats>("FrameStats")({
  frames: Schema.Int,
  samples: Schema.Int,
  currentMs: Schema.OptionFromNullOr(Schema.Number),
  p90Ms: Schema.OptionFromNullOr(Schema.Number),
  p99Ms: Schema.OptionFromNullOr(Schema.Number),
  maxMs: Schema.OptionFromNullOr(Schema.Number),
}) {}
```

- `SmokeHost` gains:

| Verb | Contract |
| ---- | -------- |
| `paint: () => void` | Force exactly one paint of the current tree (offscreen only) |
| `frameStats: () => FrameStats` | The renderer's paint counter and sample ring |
| `resetFrameStats: () => void` | Clear the ring; `frames` keeps counting |
| `overlayMode: () => FrameOverlayMode \| null` | `null` when the runtime reports an undocumented mode |
| `setOverlayMode: (mode) => FrameOverlayMode \| null` | Returns the mode the runtime now reports |
| `cycleOverlayMode: () => FrameOverlayMode \| null` | hidden → minimal → full → hidden |

- `AsyncSmokeHost` gains the same five except `paint`, each as
  `Effect.Effect<..., SmokeHostError>` (`resetFrameStats`/`setOverlayMode`/
  `cycleOverlayMode` return `void`/the mode as above).

### 3.2 `packages/testing/src/native.ts`

- `NativeRenderer` adds `flush(): void`, `getDebugFrameOverlayStats(): unknown`,
  `resetDebugFrameOverlayStats(): void`, `getDebugFrameOverlay(): string`,
  `setDebugFrameOverlay(mode: string): string`,
  `cycleDebugFrameOverlay(): string`.
- `createHost` implements the verbs. `frameStats` decodes the raw record with
  `Schema.decodeUnknownSync(FrameStats)` at the boundary (a malformed record is
  a defect, as with any decoded runtime payload); the mode verbs decode with
  `Schema.decodeUnknownOption(FrameOverlayMode)` and return `null` for a string
  the published docs do not list, so a binding change is surfaced rather than
  guessed.

### 3.3 `packages/testing/src/test-support.ts`

`nullHost`: `paint`/`resetFrameStats` no-ops, `frameStats` an all-zero
`FrameStats` (`Option.none()` timings), the three mode verbs `"hidden"`.
`nullAsyncHost`: the same as `Effect.succeed(...)`.

### 3.4 `apps/playground/src/scenarios/frame-stats.tsx` (new)

Export `FrameStatsProbe` (reused by the live twin) and `frameStatsScenario`
(id `frame-stats`, capability `frames`).

View (tokens only, one root):

- `fs-root` — flex column, padding 16, gap 8, theme background.
- `fs-counter` — `role="button"`, muted surface, `onClick` increments a
  counter; `fs-paints` text = `paints ${count}`.
- `fs-scroller` — 160 px tall, `overflowY: "scroll"`, 40 rows of 20 px
  (`fs-row-${index}`), so the wheel has a real target.
- `fs-mode` — a static readout text the steps never assert on (the overlay mode
  is renderer state, not React state).

### 3.5 Assertions — `frame-stats` (headless)

| # | Label | Assertion |
| - | ----- | --------- |
| 1 | the renderer reports a paint counter | baseline `frames > 0`, `samples > 0` |
| 2 | the sample ring cannot exceed the paint count | `samples <= frames` |
| 3 | a read does not paint | two reads have equal `frames` and `samples` |
| 4 | the timings are ordered | `p90 ≤ p99 ≤ max` and `current ≤ max` (each `Some`) |
| 5 | one forced paint costs exactly one frame | `paint()` → `frames +1`, `samples +1` |
| 6 | a click that changes the tree paints | click `fs-counter`; `fs-paints` = `paints 1`; `frames` grew |
| 7 | the wheel is a real gesture | wheel `fs-scroller` `-60`; `scrollOffset.y` = `-60`; `frames` grew |
| 8 | reset keeps the lifetime frame count | after `resetFrameStats`, `frames` ≥ the previous value |
| 9 | reset clears the ring to its own paint | `samples` = `1` |
| 10 | reset collapses the percentiles onto that sample | `p90` = `p99` = `max` = `current` |
| 11 | a read after reset is still pure | two reads equal |
| 12 | the overlay starts hidden | `overlayMode` = `hidden` |
| 13 | set returns the mode the runtime reports | `setOverlayMode("minimal")` = `minimal`; `overlayMode` = `minimal` |
| 14 | the overlay adds no host nodes | `retainedElements` unchanged across the set |
| 15 | the overlay changes no painted text | `paintedText` joined is unchanged |
| 16 | the overlay never intercepts input | with `full` on, clicking `fs-counter` gives `paints 2` |
| 17 | cycle order is hidden → minimal → full | from `full`: `hidden`, `minimal`, `full`, `hidden` |
| 18 | setting the same mode is idempotent | `setOverlayMode("minimal")` twice: both `minimal` |
| 19 | the ring is bounded at 1000 samples | `resetFrameStats()` then 1005 `paint()`: `samples` = `1000`, `frames > samples` |
| 20 | the cap preserves the timing order | after the fill, `p90 ≤ p99 ≤ max` |
| 21 | the overlay is hidden again at the end | `setOverlayMode("hidden")` = `hidden` |

Check 14 uses `retainedElements()`, which is `Option`-shaped on the host
(`ctx.expectSome`); check 15 compares the joined painted text because array
identity is not the claim.

The 1005-paint loop is synchronous (measured 1.5–1.8 s; up to 6.6 s under a
loaded machine); it is the only way to prove the documented 1000-sample bound.

### 3.6 Live twin — `live-frames` (in `apps/playground/src/live/scenarios.tsx`)

`view: frameStatsScenario.view`, `ready: "fs-paints"`.

| # | Label | Assertion |
| - | ----- | --------- |
| 1 | the live renderer reports a paint counter | `frameStats()` has `frames > 0`, `samples > 0` |
| 2 | a live read does not paint | two consecutive reads equal |
| 3 | an idle window does not repaint | after `settle` + 300 ms, `frames` unchanged |
| 4 | a live click paints | click `fs-counter`, `waitFor` the text, `paints 1`; `frames` grew |
| 5 | a live reset clears the ring to its own paint | `samples` = 1, `frames` ≥ before |
| 6 | a live reset collapses the percentiles | `p90` = `p99` = `max` = `current` |
| 7 | the live overlay starts hidden | `overlayMode` = `hidden` |
| 8 | the live overlay changes no painted text | joined `paintedText` unchanged by `setOverlayMode("full")` |
| 9 | the live overlay never intercepts input | click `fs-counter` with `full` on → `paints 2` |
| 10 | the live cycle order is hidden → minimal → full | from `full`: `hidden`, `minimal`, `full` |
| 11 | the live overlay hides again | `setOverlayMode("hidden")` = `hidden` |
| 12 | screenshot | with `full` on before check 11 (artifact only, never an assertion) |

The idle check runs **before** any overlay toggle: the recon measured delayed
repaints for ~1 s after toggling, so an idle assertion there would flake. If
check 3 fails on a clean run, record the measured delta and replace it with
"an idle window does not paint on every tick" (assert a substantial decrease in
the paint rate, not zero) — do not widen silently.

### 3.7 Host implementations

- `apps/playground/src/live/host.ts`: extend the `Pick<GpuixRenderer, …>` with
  `getDebugFrameOverlayStats | resetDebugFrameOverlayStats |
  getDebugFrameOverlay | setDebugFrameOverlay | cycleDebugFrameOverlay`, and
  implement the five async verbs with `Effect.try`, naming the verb on failure
  (exactly like `windowSize`/`zoomWindow`).
- `packages/testing/src/native.test.ts`: `FakeRenderer` gains the five frame
  verbs + `flush` with recorded calls; three assertions: `frameStats()`
  decodes (frames/samples integers, timings `Some`), `overlayMode()` reports the
  renderer's mode, and `paint()`/`resetFrameStats()`/`setOverlayMode` forward.
- `packages/testing/src/test-support.ts`: the null hosts (§3.3).

### 3.8 Registry

`apps/playground/src/scenarios/index.ts`: import `frameStatsScenario`, add
`"frames"` to `PROBE_CAPABILITIES`, and place the scenario **second**, right
after `windowLayoutScenario` (the shell mounts the first entry and
`shell-selection` looks up `window-layout` by id, not by index).

`apps/playground/src/live/scenarios.tsx`: import `frameStatsScenario`, add
`liveFrames` with `view: frameStatsScenario.view`, `ready: "fs-paints"` and the
steps of §3.6.

## 4. Documentation

- `COMPONENTS.md`: capability row `| frames | frame-stats, live-frames | verified |`
  after `window`; a prose paragraph with the measured numbers (paint vs tick,
  pure read, flush +1, reset clears only the ring, 1000 cap, overlay paint-only,
  cycle order, live idle = 0); update the suite line (`99/99`, 3455 checks) and
  the live registry count, and add `frames` to the list of live-confirmed
  capabilities.
- `apps/playground/README.md`: a "Paint and frame diagnostics" subsection —
  the two ids, the five host verbs, and the two consumer rules ("a read is
  free; `flush` is one paint" and "the overlay is paint-only").
- `PLAN.md`: decision row **D66** recording the measured contract (one short
  paragraph, same shape as D64/D65).
- `.agents/slop/plans/README.md`: index this plan in the playground table and
  advance the "next playground plan takes `528`" note.
- `TODO.md`: tick the paint/frame probe under the playground section with the
  measured result, keep the progress bar current, and add a **cross-team** row
  for the docs site's capability matrix (`frames` + both ids) — do not edit
  `apps/docs`.

## 5. Commands and expected results

From the repository root:

```sh
nub run --filter playground build
# expect: exit 0 (testing build + vendor + tsc)

nub run --filter playground test
# expect: exit 0; the adapter tests and scenarioProblems pass

nub apps/playground/dist/smoke/run.js --only frame-stats
# expect: 1/1 scenario, all checks green, exit 0, frames = verified

nub apps/playground/dist/live/run.js --list
# expect: live-frames listed, no window opened, exit 0

nub apps/playground/dist/live/run.js --only live-frames
# expect: 1/1 live scenario, all checks green, exit 0, one screenshot,
#         frames = verified; the overlay is hidden afterwards
```

Then the gates:

```sh
nub run check
nub run lint
nub run test
```

Because the change touches the capability model, both host interfaces and the
registry, run the **full headless** suite once:

```sh
nub apps/playground/dist/smoke/run.js
# expect: 99 → 100 scenarios, exit 0; record the new check total
```

The full live suite is the merge/release gate: **not** run here; no live total
is claimed. Record the exact focused ids that ran.

## 6. Mutation proofs (the two-direction requirement)

Apply, run the focused suite, record the observed failure, revert.

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | `paint` maps to `advance(0)` instead of `renderer.flush()` | `frame-stats`: "one forced paint costs exactly one frame" — expected `n+1`, got `n` |
| M2 | `resetFrameStats` is a no-op in `native.ts` | `frame-stats`: "reset clears the ring to its own paint" — samples still far above 1 |
| M3 | `overlayMode` returns the constant `"hidden"` | `frame-stats`: "set returns the mode the runtime reports" |
| M4 | `cycleOverlayMode` returns the constant `"hidden"` | `frame-stats`: "cycle order is hidden → minimal → full" |
| M5 | run the cap loop 100 times instead of 1100 | `frame-stats`: "the ring is bounded at 1000 samples" — samples 101, not 1000 |
| M6 | `resetFrameStats` no-op in `apps/playground/src/live/host.ts` | `live-frames`: "a live reset clears the ring to its own paint" |

**Reverse proof for check 16** (not committed): render an absolute, full-size
sibling with `pointerEvents: "auto"` over `fs-counter` while the overlay is
`full`; the click must stop activating it. This proves the overlay check is not
vacuous — the check itself must then be restored.

## 7. STOP conditions

Stop and report; do not improvise:

- A headless measurement differs from §1 (for example `flush` is not +1, or
  `reset` zeroes `frames`). Record the measured value and amend §3.5/the plan
  before writing the scenario — the point of the probe is the truth, not the
  planned number.
- `reset` leaves `samples = 0` or a value other than 1. Assert the measured
  value and record it; do not force 1.
- The live idle 300 ms paints on a clean run. Apply §3.6's fallback (record the
  delta, assert a paint-rate claim), or drop the check and document why — never
  leave a check that cannot fail.
- The live run exits `2` (no window). That is missing evidence: report it and
  leave the live twin unlanded rather than claiming a live verdict.
- Adding `"frames"` breaks `apps/docs`' capability test. Do not edit
  `apps/docs`; record the exact assertion in `TODO.md` (§4).
- The 1100-paint loop makes the focused scenario take longer than ~5 s. Reduce
  to 1005 and record the measured duration. *(It did: 6.6 s once under load; the
  loop is now 1005 paints and the normal run is 1.5–1.8 s.)*

## 8. Results

Executed 2026-10-18. Both focused scenarios ran (headless `frame-stats` and live
`live-frames`); the full headless suite ran once (the change touches the
capability model, both host interfaces and the registry). The full live suite is
the merge gate and was **not** run; no live total is claimed.

| Item | Result |
| ---- | ------ |
| `frame-stats` | **67/67 checks**, exit `0`, `frames=verified`, 1.5–1.8 s (6.6 s once under load); `flush()` `+1` frame/`+1` sample; a click and a `-60` wheel repainted (`offset.y = -60`); reset left `samples = 1` with `p90 = p99 = max = current`; the 1005-paint loop ended at `samples = 1000` with `frames` ahead; the overlay added no host node and changed no painted text; a click under `full` still gave `paints 2`; the cycle was `hidden,minimal,full,hidden` |
| `live-frames` | **29/29 checks**, exit `0`, `frames=verified`, 0.9 s, one screenshot (`live-frames.png`, taken with the overlay `full`); an idle 300 ms did not repaint; a click grew the count (3 frames); a live reset left `samples = 1`; the overlay changed no painted text and a click underneath it gave `paints 2`; the cycle was `hidden,minimal,full` |
| M1 | `paint` → `advanceTime(0)` → "one forced paint costs exactly one frame: expected 7, got 6", exit `1` |
| M2 | `resetFrameStats` a no-op in `native.ts` → "reset clears the ring to its own paint: expected 1, got 16", exit `1` |
| M3 | `overlayMode` constant `"hidden"` → "get agrees with the mode just set: expected \"minimal\", got \"hidden\"", exit `1` |
| M4 | `cycleOverlayMode` constant `"hidden"` → "the cycle order …: expected \"hidden,minimal,full,hidden\", got \"hidden,hidden,hidden,hidden\"", exit `1` |
| M5 | the cap loop 100 times → "the sample ring is bounded at 1000 samples: expected 1000, got 101", exit `1` |
| M6 | `resetFrameStats` a no-op in `live/host.ts` → "a live reset clears the ring to its own paint: expected 1, got 14", exit `1` |
| reverse proof | an absolute, full-size sibling with `pointerEvents: "auto"` over `fs-counter` made the first click miss ("the click repaints its counter: expected \"paints 1\", got \"paints 0\""), proving the no-capture check is not vacuous; reverted |
| full headless | `100/100` scenarios, **3522 checks**, exit `0` (`99 → 100`, `3455 → 3522`) |
| gates | `nub run check` = `0`, `nub run lint` = `0`, `nub run test` = `0`; `packages/testing` 57 tests (+3), playground 389 tests |

Measured notes that shaped the implementation:

- The recon's `nativeSimulateScrollWheel` cost **2** frames and
  `dispatchScrollWheel` **1**, so the probe asserts "the wheel paints", not a
  fixed delta: the number depends on which input path a host uses.
- `resetDebugFrameOverlayStats()` itself paints: `samples` is **1** after it,
  never 0, in both harnesses. The plan's STOP condition did not trigger.
- A live click cost 3 frames (headless 4) because the React commit and the
  input flush differ by one paint; the live checks assert growth, not a delta.
- The live window repainted a few times **after** the overlay toggles and two
  screenshots (3 frames over 1.2 s in the recon), so the idle assertion runs
  before any overlay change.

