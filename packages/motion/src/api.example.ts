/**
 * Compile-checked usage of the public API.
 *
 * The `*.example.ts` name is the build exclusion: `tsconfig.build.json` skips
 * every example under `src`, so a usage module type-checks with the package
 * (like `@gpuixui/tokens`' examples) without shipping as public API.
 * `example.test.ts` runs these functions and holds the exclusion to this
 * directory, because a module named `example.ts` is not matched by the pattern.
 */
import {
  MotionValue,
  Sequence,
  bezier,
  continuitySpring,
  inertia,
  layoutSpring,
  retarget,
  sampleKeyframes,
  sampleSpring,
  springTransition,
  stagger,
  tween,
} from "./index.js";

/** A spring that reaches its target and retargets without losing velocity. */
export const springExample = (): number => {
  const mid = sampleSpring(layoutSpring, 0, 1, 0, 80);
  const seed = retarget(mid, 2);
  return sampleSpring(
    layoutSpring,
    seed.value,
    seed.target,
    seed.velocity,
    1000,
  ).value;
};

/** Reduced motion completes immediately at the target. */
export const reducedMotionExample = (): number => {
  const value = new MotionValue(0);
  value.animate(1, springTransition(continuitySpring));
  return value.sample(16, true).value;
};

/** A tween, staggered keyframe group, sequence, and an inertial coast. */
export const compositionExample = (): readonly number[] => {
  const eased = new MotionValue(0);
  eased.animate(1, tween(300, bezier(0.22, 1, 0.36, 1)));
  const delays = [0, 1, 2].map((index) => stagger(20, index, 3));

  const sequence = new Sequence<string>().stagger(["a", "b", "c"], 0, 20, 100);
  const keyed = sampleKeyframes(
    [
      { at: 0, value: 0 },
      { at: 1, value: 100 },
    ],
    0.5,
  );

  const coast = new MotionValue(0);
  coast.coast(inertia(350, { min: 0, max: 50 }), 100);

  return [
    eased.sample(150).value,
    ...delays,
    sequence.duration(),
    keyed,
    coast.sample(100).value,
  ];
};
