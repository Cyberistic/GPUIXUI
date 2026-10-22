# `@gpuixui/motion`

Renderer-neutral motion physics — springs, easing, keyframes and inertia — plus
React hooks that drive GPUix `motion.div` numeric targets.

The math is pure TypeScript with no runtime dependencies and no timers: every
function samples from an explicit elapsed time, so it is deterministic and the
caller owns the clock. GPUix 0.11 is a *declarative tween executor* (it tweens
`initial` → `animate` → `exit` on its own clock); this package adds the
physics/state layer the runtime does not compute — springs, retarget,
keyframes, momentum, and reduced-motion-as-policy.

## Layout

| Module | Purpose |
| ------ | ------- |
| `spring.ts` | Closed-form under/critical/over-damped spring with velocity, rest thresholds, presets, and retarget |
| `easing.ts` | `linear`, `easeIn/Out/InOut`, `circIn/Out/InOut`, `backIn/Out/InOut`, `anticipate`, `bezier` |
| `timeline.ts` | Keyframes with offsets, `stagger`, and a keyed `Sequence` driver |
| `inertia.ts` | Exponential momentum decay with hard bounds/clamping |
| `motion.ts` | `MotionValue` — the retained scalar entry point, `sample(elapsed, reducedMotion)` |
| `timing.ts` | `motionLevels`, `motionEasings`, `motionTiming` — the house durations and per-phase easing the library's surfaces move with, in the runtime's seconds |
| `react.ts` | `useSpring`, `useTransition`, `useInertia` |

## Spring

```ts
import { layoutSpring, sampleSpring, retarget } from "@gpuixui/motion";

const physics = layoutSpring; // stiffness 260, damping 28

// Sample from an explicit elapsed time — no timers, deterministic.
const at = sampleSpring(physics, 0, 1, 0, 2000);
at.value; // 1 (settled: at rest within restDelta/restSpeed)
at.settled; // true

// Retarget keeps velocity: seed a new run from a live sample.
const mid = sampleSpring(physics, 0, 1, 0, 80);
const seed = retarget(mid, 2); // value and velocity carried over, target 2
```

Presets: `affordanceSpring`, `layoutSpring`, `continuitySpring`; build your own
with `springPhysics({ stiffness, damping, mass, restDelta, restSpeed })`. A
physics you write by hand is read the same way — a field that cannot be read
takes the house default (see [Inputs the runtime can paint](#inputs-the-runtime-can-paint)).

## The single entry point: `MotionValue.sample(elapsed, reducedMotion)`

```ts
import { MotionValue, springTransition, layoutSpring } from "@gpuixui/motion";

const value = new MotionValue(0);
value.animate(1, springTransition(layoutSpring));

// Reduced motion returns the target immediately, with zero velocity.
const frame = value.sample(16, true);
frame.value; // 1
frame.active; // false
frame.complete; // true
```

`MotionValue` retains `value`, `velocity` and `target`, and exposes `set`,
`animate(target, transition)`, `coast(inertia, velocity?)`, and
`sample(elapsedMs, reducedMotion?)`. `transition` is `instant`, `tween`, or
`spring` (built with `instant`, `tween(durationMs, easing)`,
`springTransition(physics)`); `transitionEquals` compares them structurally so a
re-declared transition does not restart a run. A coast is compared the same way:
re-declaring the inertia already in flight with the same release velocity is a
no-op, so a render that builds `inertia()` again does not relaunch the run from
the sample on screen with the speed it has since lost. A new gesture (another
release velocity, a changed time constant or bound) starts where the surface is,
and so does a coast after `set`/`animate`: `set` retires the run it cancelled, so
a release with the same speed afterwards is a new gesture rather than a
re-declaration of one that is no longer on screen.

## React hooks

```tsx
import { motion } from "@gpuix/react";
import { useSpring, layoutSpring } from "@gpuixui/motion/react";

function Grow({ open }: { open: boolean }) {
  const { value } = useSpring(open ? 100 : 0, layoutSpring);
  return <motion.div animate={{ width: value }} transition={{ duration: 0 }} />;
}
```

Each hook returns `{ value, velocity, complete }`. Map `value` onto a GPUix
`MotionStyle` numeric field — `width`, `height`, `top`, `right`, `bottom`,
`left`, `opacity` (0–1), `borderRadius`. `useTransition(target, { durationMs,
easing })` tweens; `useInertia(velocity, inertia)` coasts with momentum from
`options.initial` (zero by default) and may be given its inertia inline — the
declaration is compared by the physics it reads, so `inertia()` rebuilt on a
render does not restart the coast.
`useMotion(target, transition, options)` is the general hook behind them; a
re-declared transition is compared the same way.

Pass `options.reducedMotion` from your platform's reduced-motion preference; it
completes at the target, and the **first render** already paints that frame.
`options.initial` gives the first run a start value — `useTransition(1284, { durationMs: 320 }, { initial: 0 })` counts
up on mount, and `useInertia(400, inertia(), { initial: dragOffset })` coasts
from the offset a gesture released at — and is read once, because the
presentation on screen is the truth after it. A start or a target it cannot read
is no value: the start is the target, so the first published frame is a number
the runtime can paint rather than the `NaN` it draws as nothing.

Under the reduced preference there is **no first run to start**: a hook mounted
with `initial` paints the frame the preference names in its first render — the
target, or a coast's projected rest — and reports the skipped run as complete.
The `initial` belongs to an animated mount, so a reduced count-up or a reduced
drag release never flashes the value it was supposed to arrive from.

The hooks own one clock, so they **sample once before retargeting**: a run that
has come to rest is not advanced while nothing moves, and handing the retained
value a new target without that sample would count the pause as elapsed motion
and jump. A `CountingNumber` that rests at `100` and is later set to `200`
therefore counts again over the full duration rather than repainting `200` in
one frame. A consumer driving `MotionValue` directly owns the same rule: sample
at the moment you retarget.

## Inputs the runtime can paint

Every sampler is total: a number it cannot read is replaced before it reaches a
formula. `sampleSpring`, `sampleInertia`, `sampleKeyframes` and
`Sequence.sample`/`complete` read a `NaN` clock (or progress) as the start of
the run, and still clamp an infinity to the end — a presenter whose clock read
failed paints the first frame rather than `NaN`. A clock **before** the sequence
(a negative one) is its start too, and both entry points read it that way, so
`complete` and `sample` cannot disagree about a sequence with nothing left to
run. A tween duration that cannot run (`NaN` or an infinity) falls back to
`DEFAULT_TWEEN_MS` (300 ms), and a zero or negative one is an instant
assignment. `MotionValue.sample` keeps its own rule: an unusable clock holds the
last sample rather than jumping to the end.

The inertia inputs are repaired the same way, because `Inertia` is structural: a
time constant that cannot run takes the house 350 ms, a bound that cannot be read
is dropped while the readable one beside it still clamps, an inverted pair is
swapped, and a non-finite position or velocity reads as a standstill. A coast
therefore always projects a finite rest and settles, instead of painting `NaN` and
sampling forever.

The spring physics are repaired the same way, because `SpringPhysics` is
structural: a mass, stiffness, damping or rest threshold that cannot be read
takes the house default, and a readable one is left alone. Without that, a
`NaN` damping made every formula answer `NaN` and the spring jumped to its
target in a single frame, while a `NaN` rest threshold meant the run never
settled at all — a driver waiting for rest sampled it forever. The constructor
and the samplers read the physics the same way, so a hand-built spring samples
as the built one does.

A timeline is repaired at the value the caller supplies: a keyframe whose offset
or value cannot be read is not a stop (it is dropped, and a set with none answers
`0`), a `Sequence` step whose start cannot be read is placed at `0`, and a
duration it cannot run is no duration at all — the step is completed on the
first sample, and the sequence's own end never lands before a step it still has
to run. A stagger step that is non-finite or negative is no wait, and both
stagger entry points answer it the same way: the standalone `stagger()` and the
`Sequence`'s own group, whose members then all sit at the group's start rather
than one of them starting before the sequence does. An `index` or `count` the
standalone helper cannot read is no wait as well, so a failed position or length
never becomes a `NaN` or infinite delay.

An easing curve is the caller's own function, so it gets the same rule. The
shipped curves read a progress they cannot read as the start of the run (`NaN`
passed both clamp comparisons, so every curve answered `NaN`), and the three
samplers that apply a caller's curve — `MotionValue`'s tween, `sampleKeyframes`
and `Sequence.sample` — fall back to the linear progress when the curve answers a
value that cannot be painted, because a frame a curve cannot read is not a curve.
The run keeps its start, its end and its completion edge either way.

The hooks' first frame is a value the runtime paints, so it gets the same rule:
`options.initial` and the target are numbers the caller computed, and one that
cannot be read is replaced before the frame is published — an unreadable
`initial` is no initial (the start is the target) and an unreadable target is no
target (the start is `0`). The retained `MotionValue` repaired the same value on
its own, so the hook and the value it drives could disagree about the frame the
caller sees first. `useInertia` reads the same option as the offset the coast
accumulates from; an unreadable one is no offset, so the coast starts at `0`.
The reduced preference is read at the same boundary: a reduced mount paints the
resting frame — the target, or the coast's projected rest — rather than the
`initial` the run it removed would have started from, and reports that skipped
run as complete.

## The runtime's declarative timing

GPUix executes a tween over a duration and an easing it is told. That timing is
the library's, not each surface's:

```ts
import { motionTiming } from "@gpuixui/motion/timing";

motionTiming("slow");                    // { duration: 0.32, ease: "easeInOut" }
motionTiming("normal", { phase: "enter" }); // { duration: 0.2, ease: "easeOut" }
motionTiming("slow", { preference: "reduced" }); // { duration: 0 } — no journey
```

The levels are `step` 120 ms, `fast` 160, `normal` 200, `slow` 320 and `notice`
500; the phases ease out on entry, in on exit and both ways between two resting
states. `preference` is the application's — the runtime exposes no
reduced-motion query — and the reduced branch keeps the frames, so a component
still paints its resting state.

Import the subpath, not the barrel: a consumer that only needs a timing should
not load the spring and timeline maths (`@gpuixui/components` imports exactly
`./timing` for this reason).

## What is deferred to the runtime

GPUix 0.11 has **no `transform`**. Scale, rotate and translate have no style key
today, so the hooks cannot drive them directly. The computed `value` is still
exposed — a consumer can apply it once the runtime patch (plan 525) lands. Do
not fake `transform` with a decorative placeholder.

## Licences

- Spring / timeline / sequence math ported from open-gpui `crates/motion`
  (Apache-2.0) — see `LICENSES/open-gpui.md`.
- Easing variants and the `Inertia`/`MotionValue` API borrowed from
  `gpui-ce-motion` (MIT OR Apache-2.0) — see `LICENSES/gpui-motion.md`.

`NOTICE` beside this README carries the copyright lines and MIT text those two
records oblige the port to redistribute.
