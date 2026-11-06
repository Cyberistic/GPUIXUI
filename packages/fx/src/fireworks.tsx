/** @jsxImportSource @gpuix/react */
import type { EventPayload, MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import {
  measuredBox,
  fadeOnly,
  useMotionPreference,
  useSurfaceTiming,
  recipeStyle,
  countOf,
  durationOf,
  seedOf,
  sizeRangeOf,
  useTheme,
} from "@gpuixui/components/authoring";
import {
  fireworkBurstCap,
  fireworkBurstFloor,
  fireworkBurstMs,
  fireworkBurstCapMs,
  fireworkBursts,
  fireworkField,
  fireworkMaxSize,
  fireworkMinSize,
  fireworkSparks,
  fireworkSparksCap,
  sparkPhases,
  sparkRest,
  type FireworkSpark,
} from "./fireworks/logic.js";

export interface FireworksState {
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

export interface FireworksProps extends Omit<Props, "children" | "style"> {
  readonly bursts?: number;

  readonly sparks?: number;

  readonly seed?: number;

  readonly minSize?: number;

  readonly maxSize?: number;

  readonly color?: string;

  readonly burstMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<FireworksState>;
}

interface SparkProps {
  readonly spec: FireworkSpark;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
}

const Spark = ({ spec, ink, radius, still }: SparkProps) => {
  const [life, setLife] = useState({ lap: 0, fading: false });
  const phases = sparkPhases(spec);
  const rest = sparkRest(spec);
  const phase = life.fading ? phases.fade : phases.fly;
  const motion: MotionProps = {
    initial: life.fading ? false : { left: spec.x, top: spec.y, opacity: 0 },
    animate: { left: phase.left, top: phase.top, opacity: phase.opacity },
    transition: {
      duration: phase.durationMs / 1000,
      delay: phase.delayMs / 1000,
      ease: "easeOut",
    },
  };

  return (
    <div
      key={life.lap}
      testId={`spark-${spec.key}`}
      {...(still
        ? {}
        : {
            motion,
            onMotionComplete: () =>
              setLife((current) =>
                current.fading
                  ? { lap: current.lap + 1, fading: false }
                  : { lap: current.lap, fading: true },
              ),
          })}
      style={{
        position: "absolute",
        left: still ? rest.left : spec.x,
        top: still ? rest.top : spec.y,
        width: spec.size,
        height: spec.size,
        borderRadius: radius,
        backgroundColor: ink,
        opacity: still ? spec.peak : 0,

        pointerEvents: "none",
      }}
    />
  );
};

export const Fireworks = ({
  bursts,
  sparks,
  seed,
  minSize,
  maxSize,
  color,
  burstMs,
  level = "slow",
  className,
  style,
  ...rest
}: FireworksProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const burstCount = countOf(
    Option.fromNullishOr(bursts),
    fireworkBursts,
    fireworkBurstCap,
  );
  const sparkCount = countOf(
    Option.fromNullishOr(sparks),
    fireworkSparks,
    fireworkSparksCap,
  );
  const sizes = sizeRangeOf(
    Option.fromNullishOr(minSize),
    Option.fromNullishOr(maxSize),
    fireworkMinSize,
    fireworkMaxSize,
  );
  const layoutSeed = seedOf(Option.fromNullishOr(seed));
  const burst = durationOf(
    Option.fromNullishOr(burstMs),
    fireworkBurstMs,
    fireworkBurstFloor,
    fireworkBurstCapMs,
  );
  const ink = color ?? theme.colors.primary;
  const still = preference === "reduced";

  const [box, setBox] = useState<
    Option.Option<{ readonly width: number; readonly height: number }>
  >(Option.none());

  const noteBox = (event: EventPayload): void => {
    Option.match(measuredBox(event), {
      onNone: () => undefined,
      onSome: (next) =>
        setBox((held) =>
          Option.match(held, {
            onNone: () => Option.some(next),
            onSome: (current) =>
              current.width === next.width && current.height === next.height
                ? held
                : Option.some(next),
          }),
        ),
    });
  };

  const measured = Option.getOrElse(box, () => ({ width: 0, height: 0 }));
  const specs: ReadonlyArray<FireworkSpark> =
    measured.width > 0 && measured.height > 0
      ? fireworkField({
          width: measured.width,
          height: measured.height,
          bursts: burstCount,
          sparks: sparkCount,
          seed: layoutSeed,
          minSize: sizes.min,
          maxSize: sizes.max,
          burstMs: burst,
        })
      : [];

  const state: FireworksState = {
    count: Arr.length(specs),
    reducedMotion: still,
    width: measured.width,
    height: measured.height,
  };

  return (
    <div
      {...rest}
      onLayout={noteBox}
      motion={{ ...fadeOnly, transition: timing.enter }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          position: "relative",
          overflow: "hidden",

          pointerEvents: "none",
        }),
        resolveStyle(style, state),
      )}
    >
      {Arr.map(specs, (spec) => (
        <Spark
          key={spec.key}
          spec={spec}
          ink={ink}
          radius={theme.radius.full}
          still={still}
        />
      ))}
    </div>
  );
};

export const fireworksMeta = {
  name: "Fireworks",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a spark is a dot that travels a straight line: the runtime has no transform (upstream issue #102), no canvas and no blur, so a spark cannot stretch into a streak, trail behind itself or arc under gravity",
    "a spark's life is two phases — fly brightening, then fade at the ring — because the runtime tweens one opacity target at a time",
    "a fade completed by the tween re-keys the element into a fresh spark at the centre; the restart is invisible because the spark is at zero opacity both before the fly and after the fade",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the field publishes no accessibility node and takes no pointer input: name the content it sits behind, never the field",
    "a size change re-draws the sequence from the same seed, which restarts every burst (a tween cannot be resumed at an arbitrary progress)",
  ],
  docs: "docs/fireworks.mdx",
  example: "examples/fireworks.example.tsx",
  testFile: "src/behaviour/fireworks.test.tsx",
} as const;
