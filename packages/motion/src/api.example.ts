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
  motionTimingOf,
  reducedMotionOf,
  retarget,
  sampleKeyframes,
  sampleSpring,
  springTransition,
  stagger,
  tween,
} from "./index.js";
import {
  exitWindowMs,
  fadeFromAnchor,
  presenceMotion,
  presenceStyle,
  presenceTiming,
  presenceTimingOf,
  transitionWindowMs,
} from "./presence.js";

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

/**
 * The preference a run resolves, from the provider and a caller's override.
 *
 * The application states the flag once, at the root of the tree, and every hook
 * below it reads that preference: the first pair is a hook that names no option
 * under a reduced and an animated provider. A caller's own option is the
 * per-run override and wins both ways — the second pair is a decorative run
 * silenced in an animated tree and one that must move under a reduced provider.
 * The last pair is the rule a composing package reuses with its own stored
 * setting: a value this release does not name is the reduced policy, and an
 * absent one is the house `"animated"`.
 */
export const preferenceExample = (): readonly boolean[] => [
  reducedMotionOf(undefined, "reduced"),
  reducedMotionOf(undefined, "animated"),
  reducedMotionOf(false, "reduced"),
  reducedMotionOf(true, "animated"),
  reducedMotionOf(undefined, "Reduced"),
  reducedMotionOf(undefined, null),
];

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

/**
 * The window a leaving surface stays mounted for, counted from the timing.
 *
 * A wait is part of the window, and a field that cannot be scheduled adds no
 * time to it: a negative wait never shortens the exit it precedes. A timing a
 * caller stored that names no exit is no journey at all, so it holds nothing.
 */
export const presenceWindowExample = (): readonly number[] => [
  exitWindowMs(presenceTiming("normal")),
  transitionWindowMs({ duration: 0.32, delay: -0.1 }),
  exitWindowMs(presenceTimingOf(null)),
];

/**
 * The frames, the timing and the pointer rule a surface hands the runtime.
 *
 * `presenceMotion` is the composition a consumer owns when it paints its own
 * surface: the entry frame first, the resting or exit frame the presence names,
 * and the phase's transition — a panel below its trigger starts toward the
 * trigger and moves away from it, while a leaving one takes no presses.
 *
 * A frame set and a timing a caller **stored** are read the same way: both are
 * `…Input` shapes, so a config that decoded with no phase (or with a coordinate
 * a measurement failed on) reaches the composition without an assertion, and the
 * phase it lost is no frame and no transition rather than `undefined` or `NaN`.
 */
export const presenceCompositionExample = (): {
  readonly entering: ReturnType<typeof presenceMotion>;
  readonly leaving: ReturnType<typeof presenceMotion>;
  readonly stored: ReturnType<typeof presenceMotion>;
  readonly pointsAtRest: boolean;
} => {
  const frames = fadeFromAnchor("bottom", 4);
  const timing = presenceTiming("normal");
  return {
    entering: presenceMotion(frames, true, timing),
    leaving: presenceMotion(frames, false, timing),
    stored: presenceMotion(
      { initial: { opacity: 0, top: Number.NaN }, animate: null },
      true,
      { enter: { duration: 0.2 } },
    ),
    pointsAtRest: presenceStyle(true).pointerEvents === "auto",
  };
};

/**
 * A decoded config reaching the ports that read it.
 *
 * A settings row and a saved layout come back as the values a decoder wrote — a
 * preference string, a phase name, an easing this release may have renamed — so
 * these entries take what the store wrote and the readers decide: a preference
 * this release does not name is the reduced policy, a phase it does not name
 * eases between two resting states, and an easing it cannot read is dropped
 * instead of refusing the whole description. No assertion stands between a
 * decoder and any call below.
 */
export const storedConfigExample = (): {
  readonly stockPreference: ReturnType<typeof presenceTiming>;
  readonly stockPhase: ReturnType<typeof motionTimingOf>;
  readonly droppedEasing: ReturnType<typeof presenceTimingOf>["enter"];
  readonly composition: ReturnType<typeof presenceMotion>;
} => {
  const frames = fadeFromAnchor("bottom", 4);
  return {
    stockPreference: presenceTiming("normal", "Reduced"),
    stockPhase: motionTimingOf(220, { phase: "settle" }),
    droppedEasing: presenceTimingOf({
      enter: { duration: 0.2, ease: "easeOutBack" },
    }).enter,
    composition: presenceMotion(frames, true, {
      enter: { duration: 0.2, delay: null, ease: "easeOutBack" },
    }),
  };
};
