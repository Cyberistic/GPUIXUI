# `@gpuixui/motion`

Renderer-neutral motion physics — springs, easing, keyframes and inertia — plus
React hooks that drive GPUix `motion.div` numeric targets.

The math is pure TypeScript with no runtime dependencies and no timers: every
function samples from an explicit elapsed time, so it is deterministic and the
caller owns the clock. GPUix 0.10 is a *declarative tween executor* (it tweens
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
with `springPhysics({ stiffness, damping, mass, restDelta, restSpeed })`.

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
re-declared transition does not restart a run.

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
easing })` tweens; `useInertia(velocity, inertia)` coasts with momentum.
`useMotion(target, transition, options)` is the general hook behind them; pass
it a stable `transition` (`instant`, `tween`, or `springTransition`).

Pass `options.reducedMotion` from your platform's reduced-motion preference; it
completes immediately at the target.

## What is deferred to the runtime

GPUix 0.10 has **no `transform`**. Scale, rotate and translate have no style key
today, so the hooks cannot drive them directly. The computed `value` is still
exposed — a consumer can apply it once the runtime patch (plan 525) lands. Do
not fake `transform` with a decorative placeholder.

## Licences

- Spring / timeline / sequence math ported from open-gpui `crates/motion`
  (Apache-2.0) — see `LICENSES/open-gpui.md`.
- Easing variants and the `Inertia`/`MotionValue` API borrowed from
  `gpui-ce-motion` (MIT OR Apache-2.0) — see `LICENSES/gpui-motion.md`.
