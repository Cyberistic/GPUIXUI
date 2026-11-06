import {
  MotionValue,
  Sequence,
  bezier,
  continuitySpring,
  inertia,
  layoutSpring,
  motionLevelOf,
  motionTiming,
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

export const reducedMotionExample = (): number => {
  const value = new MotionValue(0);
  value.animate(1, springTransition(continuitySpring));
  return value.sample(16, true).value;
};

export const preferenceExample = (): readonly boolean[] => [
  reducedMotionOf(undefined, "reduced"),
  reducedMotionOf(undefined, "animated"),
  reducedMotionOf(false, "reduced"),
  reducedMotionOf(true, "animated"),
  reducedMotionOf(undefined, "Reduced"),
  reducedMotionOf(undefined, null),
];

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

export const presenceWindowExample = (): readonly number[] => [
  exitWindowMs(presenceTiming("normal")),
  transitionWindowMs({ duration: 0.32, delay: -0.1 }),
  exitWindowMs(presenceTimingOf(null)),
];

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

export const storedLevelExample = (): {
  readonly saved: ReturnType<typeof motionTiming>;
  readonly dropped: ReturnType<typeof motionTiming>;
  readonly empty: ReturnType<typeof motionTiming>;
  readonly nested: ReturnType<typeof motionTiming>;
  readonly reduced: ReturnType<typeof motionTiming>;
  readonly timed: ReturnType<typeof presenceTiming>;
} => {
  const saved: unknown = "slow";
  const dropped: unknown = "elapsed";
  const empty: unknown = "";
  const nested: unknown = { speed: "fast" };
  return {
    saved: motionTiming(motionLevelOf(saved)),
    dropped: motionTiming(motionLevelOf(dropped)),
    empty: motionTiming(motionLevelOf(empty)),
    nested: motionTiming(motionLevelOf(nested)),
    reduced: motionTiming(motionLevelOf(dropped), { preference: "reduced" }),
    timed: presenceTiming(motionLevelOf(null)),
  };
};

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
