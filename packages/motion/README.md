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
| `presence.ts` | The frames, per-phase timing, hold window and leaving pointer rule both a component and a primitive package compose (entry `@gpuixui/motion/presence`) |
| `react.ts` | `useMotion` and its `useSpring` / `useTransition` / `useInertia` wrappers, `useMotionPreference` |
| `provider.ts` | `MotionProvider` — the one reduced-motion preference every package reads |

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
re-declared transition does not restart a run, and it compares what the sampler
reads: a tween by the duration it actually runs (a hand-built `{ durationMs:
NaN }` is the house 300 ms, and a zero or negative one is instant) and a spring
by its repaired physics. A coast is compared the same way:
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
import { layoutSpring } from "@gpuixui/motion";
import { useSpring } from "@gpuixui/motion/react";

function Grow({ open }: { open: boolean }) {
  const { value } = useSpring(open ? 100 : 0, layoutSpring);
  return <motion.div animate={{ width: value }} transition={{ duration: 0 }} />;
}
```

The reader's preference is stated **once**, at the root of the tree, because the
runtime publishes no reduced-motion query:

```tsx
import {
  MotionProvider,
  useMotionPreference,
} from "@gpuixui/motion/react";

<MotionProvider preference={reduceMotion ? "reduced" : "animated"}>
  <App />
</MotionProvider>;
```

`useMotionPreference()` reads the nearest provider and answers `"animated"`
without one. The context lives in this package — the one that owns the timing and
the policy — rather than in a component package, so a primitive, a component and
an application surface below one provider agree on the flag, and a package that
moves does not have to depend on the components library. `@gpuixui/components`
re-publishes this provider, so a tree written against it reads the same context.
`preference` is a policy, not a per-control option: a reduced run is a
zero-duration assignment, so the resting frame still paints and only the journey
is removed.

## The presence table

A surface that enters and leaves reads one table, exported from
`@gpuixui/motion/presence`:

- `fadeFrom`, `fadeFromAnchor`, `fadeFromSide` and `fadeOnly` build the three
  frames (first paint, rest, exit) — a fade plus an inset offset on `top` or
  `left`, never a `transform`, because the runtime has no such style key. A side
  the package does not name takes the house `bottom`, so a placement restored
  from storage cannot send a surface in from an edge it was never measured
  against; an **axis** it does not name takes the house vertical `top` for the
  same reason, so a builder handed a stored name arrives vertically instead of
  falling through to `left`; a distance it cannot read (a failed measurement
  reaching the table as `NaN` or an infinity) is **no travel** — the frame
  carries `0` on its axis instead of a number the runtime paints as nothing, so
  the surface fades in place rather than losing the movement it asked for;
- `presenceTiming(level, preference)` gives the enter and exit tween at one
  level: `easeOut` in, `easeIn` out, both zero-duration under `"reduced"`;
- `presenceMotion(frames, present, timing)` is the runtime's `motion` prop for a
  surface — the frames' first paint, the resting frame while it is open or the
  exit frame while it leaves, and that phase's transition — so a consumer that
  paints its own surface composes the table instead of restating the three
  fields;
- `transitionWindowMs` / `exitWindowMs` convert a tween to the whole milliseconds
  a box stays mounted for, including the wait a delayed run sits out first; a
  field that cannot be scheduled adds no time (a negative wait never shortens the
  journey) and a window the arithmetic cannot represent is no window at all;
- `delayedTiming` adds a stagger and drops it with a reduced journey, since the
  runtime waits out a delay before an instant assignment too;
- `presenceStyle` is the leaving pointer rule — a surface takes no presses while
  it fades, and a wrapper paints nothing at rest so it never covers its content.

The table is renderer-neutral and has no React or GPUix import, so a component
package and a primitive package compose the same one rather than agreeing by
hand. The React half — the mounted window, the preference provider and the
leaving shield — stays with the package that owns a tree.

Each hook returns `{ value, velocity, complete }`. Map `value` onto a GPUix
`MotionStyle` numeric field — `width`, `height`, `top`, `right`, `bottom`,
`left`, `opacity` (0–1), `borderRadius`. `useTransition(target, { durationMs,
easing })` tweens; `useInertia(velocity, inertia)` coasts with momentum from
`options.initial` (zero by default) and may be given its inertia inline — the
declaration is compared by the physics it reads, so `inertia()` rebuilt on a
render does not restart the coast.
`useMotion(target, transition, options)` is the general hook behind them; a
re-declared transition is compared the same way.

A declaration is read **by value, not identity**, because the documented forms
build one on every render: `useSpring(target, springPhysics({ … }))` and
`useInertia(v, inertia())`. An equal re-declaration keeps the declaration that is
already running, so a render does not re-arm the hook's effect or its frame loop,
and a frame is published only when it differs from the one on screen — the
completion edge counts as a difference, because it is the one report a caller
gets that its run ended. Before that rule a hook kept painting frames for as long
as it was mounted: measured 2026-10-23 in the real GPUix renderer, a spring
mounted at rest had painted 1 089 frames by 800 ms and 210 more in the following
150 ms.

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
drag release never flashes the value it was supposed to arrive from. A target or
release changed **while the preference is on** paints the same way in the render
that names it, with the completion edge, and retires the retained run in that
commit: the previous frame never survives the change for a reader who asked for
no journey, and a preference that turns back on starts where the reader is. A
value the render cannot read is no destination — a measurement that failed for
one commit is not a new resting place — so it holds the frame on screen and
reports no journey, instead of collapsing the surface to the first frame and
retiring the retained value there. That retire is also what keeps the preference
from replaying a gesture: turning it **off** again holds the frame the coast
came to rest on instead of releasing the same declaration a second time. A
coast is a gesture, and the reader watched it end — measured, a 50 ms coast
released at `400` rested at `20` under the preference and then drifted on to
`40` before the hold landed. The next genuine release still starts from the
frame on screen. A coast's projected rest is read **from the frame on screen**,
not from the offset the hook mounted at: a release is a new gesture from where
the surface is, so a reduced reader whose coast rested at `140` is not sent back
to `0` by the next release — or by a release of `0`, which asks for no journey
and stays put.

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
assignment; the equality check above reads the same duration, so a hand-built
`Transition` whose duration cannot run is not treated as a new run on every
render. `MotionValue.sample` keeps its own rule: an unusable clock holds the
last sample rather than jumping to the end.

The inertia inputs are repaired the same way, because `Inertia` is structural: a
time constant that cannot run takes the house 350 ms, a bound that cannot be read
is dropped while the readable one beside it still clamps, an inverted pair is
swapped, and a non-finite position or velocity reads as a standstill. A
declaration that carries **no inertia object at all** — a config that did not
decode — is the house coast too, because `useInertia` projects its resting frame
before it samples, so reading `.tau` off nothing threw a `TypeError` out of the
render and the surface never mounted. A coast
therefore always projects a finite rest and settles, instead of painting `NaN` and
sampling forever. A rest the arithmetic cannot represent is no journey either: an
overflowed projection still knows which way it went, so a wall in that direction
is the destination it lands on, and without one it lands where it was released —
the release frame is a number the runtime paints, where an overflowed travel
times a zero decay is `NaN` and an `Infinity` is painted as nothing. A bound is a
wall the coast stops at only while it moves into
it: a surface released *on* a bound with its velocity pointing back into its
range travels inward rather than being read as already settled — which used to
finish the run at the release frame and jump to the rest at the far end.

The spring physics are repaired the same way, because `SpringPhysics` is
structural: a mass, stiffness, damping or rest threshold that cannot be read
takes the house default, and a readable one is left alone. A declaration that
carries **no physics object at all** — a `{ kind: "spring" }` a caller decoded
from storage — is the house spring too, because `Transition` is structural as
well and reading `.mass` off nothing threw a `TypeError` out of the frame loop.
Without that, a `NaN` damping made every formula answer `NaN` and the spring
jumped to its target in a single frame, while a `NaN` rest threshold meant the
run never settled at all — a driver waiting for rest sampled it forever. The
constructor and the samplers read the physics the same way, so a hand-built
spring samples as the built one does.

A timeline is repaired at the value the caller supplies: a keyframe whose offset
or value cannot be read is not a stop (it is dropped, and a set with none answers
`0`), a set is read by the offsets its frames name rather than by the order they
were declared — a list built from a map interpolates through the journey it
describes, where reading the first and last entries as the ends made the frame
declared first answer for every progress below its offset — two frames at one
offset are an instant jump, so the value declared last at it holds from that
offset on, a `Sequence` step whose start cannot be read is placed at `0`, and a
duration it cannot run is no duration at all — the step is completed on the
first sample, and the sequence's own end never lands before a step it still has
to run. An end the arithmetic cannot represent is no duration either: two
readable numbers can add to an `Infinity` no clock reaches, which made
`duration()` infinite — so `complete()` never answered true — and `append` place
the next step at `0`, before the steps it was meant to follow; a duration the
start cannot move off (a huge start beside a small step) is read the same way,
so the step's own sample and `complete` agree on one clock. A stagger step that
is non-finite or negative is no wait — and so is a step times a distance the
arithmetic cannot represent — and both stagger entry points answer it the same
way: the standalone `stagger()` and the `Sequence`'s own group, whose members
then all sit at the group's start rather than one of them starting before the
sequence does — including a member whose start plus wait overflows. An `index`
or `count` the standalone helper cannot read is no wait as well, so a failed
position or length never becomes a `NaN` or infinite delay. A direction the
package does not name is the house `start`, not the centre: the distance
arithmetic used to end in a `center` arm, so a persisted `"middle"` staggered a
group from its middle instead of the documented default.

An easing curve is the caller's own function, so it gets the same rule. The
shipped curves read a progress they cannot read as the start of the run (`NaN`
passed both clamp comparisons, so every curve answered `NaN`), and the three
samplers that apply a caller's curve — `MotionValue`'s tween, `sampleKeyframes`
and `Sequence.sample` — fall back to the linear progress when the curve answers a
value that cannot be painted, because a frame a curve cannot read is not a curve.
A value that is not a function at all is no curve either: `Transition` and
`Keyframe` are exported and structural, so a hand-built one can carry the easing
a config never decoded, and calling it threw from a frame loop instead of
painting. The run keeps its start, its end and its completion edge either way.

A frame between two values is read the same way. The tween in `MotionValue` and
`sampleKeyframes` interpolate by weighting **both** endpoints rather than adding
a difference, because the difference of two finite endpoints can overflow where
neither endpoint can: a tween from `-1e308` to `1e308` used to paint `NaN` at its
first frame (`Infinity * 0`) and `Infinity` for the rest of the journey — a
surface that draws as nothing until it snaps to its target. The weighted sum
stays inside the endpoints' own range, and an overshooting curve that pushes it
out of range falls back to the endpoint it is heading for, so the frame is always
a number.

`sampleSpring` reads the same difference, and it needed the same rule. A spring
response is linear in its displacement and velocity, so when the difference of
two readable endpoints overflows, the sampler reads the response on unit inputs
and composes it with the endpoints through `mix` — the trajectory is the one the
same spring would draw between the endpoints scaled down, instead of every
formula answering `NaN` and the sanitiser replacing the journey with the target
on the first sample.

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
run as complete. A destination changed under the preference is read the same way
on every render, not only the mount's first: the value, the zero velocity and the
completion edge belong to the frame that names it.

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

A surface with its own feel names its duration instead of borrowing a level:
`motionTimingOf(durationMs, options)` builds the same timing from a millisecond
value, so `@gpuixui/components`' toast arrives over 220 ms and leaves over 180 ms
without dragging another surface along (or the reverse). It is the one place a
duration becomes a timing, so the reduced rule cannot be re-implemented beside
it, and a duration that is not positive and finite reads as the house surface
arrival (`normal`) rather than reaching the runtime as `NaN`:

```ts
import { motionTimingOf } from "@gpuixui/motion/timing";

motionTimingOf(220, { phase: "enter" }); // { duration: 0.22, ease: "easeOut" }
motionTimingOf(180, { phase: "exit", preference: "reduced" }); // { duration: 0 }
motionTimingOf(Number.NaN); // the house 200 ms, `easeInOut`
```

The tables are read by their **own** keys, so a level or phase an application
reads back from storage and a release no longer carries — including a name that
belongs to `Object.prototype` rather than to the table — takes the house
fallback: the surface arrival `normal` (200 ms) and the between-states curve,
instead of handing the runtime a `NaN` duration, an absent easing, or a method
where a curve belongs. A reduced run is still an instant assignment whatever the
tables hold.

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
