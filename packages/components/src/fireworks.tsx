/**
 * Fireworks: a decorative field of small bursts.
 *
 * A burst is a seeded centre with sparks flying out on evenly spaced angles. The
 * runtime has no `transform` (upstream issue #102) and no canvas, so a spark is
 * an absolutely positioned dot whose `left`/`top` the runtime tweens and whose
 * brightness is `opacity`, the one paint value it animates natively. The layout
 * is a pure function of the measured box and one seed (`fireworks/logic.ts`), so
 * the same seed paints the same sequence on every mount.
 *
 * One tween cannot brighten and dim, so a spark's life is two phases: it flies
 * out to `0.7` of its ring while fading in, then on to the last pixel while
 * fading out. When the fade reports `onMotionComplete` the element is re-keyed
 * into a fresh spark at the centre, so the field keeps bursting. Bursts are
 * staggered by index, so the field is a sequence of explosions rather than one
 * ring of light. `@gpuixui/motion` owns the timing policy through
 * `internal/presence.tsx`, and `MotionProvider preference="reduced"` paints the
 * sparks held at their ring instead of deleting the field.
 *
 * The field is decoration: it publishes no accessibility node and takes no
 * pointer input, so the content it sits behind owns the name and the presses. It
 * also measures itself, so the caller must bound it.
 */

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
import { measuredBox } from "./internal/measure.js";
import {
  fadeOnly,
  useMotionPreference,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  countOf,
  durationOf,
  seedOf,
  sizeRangeOf,
} from "./internal/scatter.js";
import { useTheme } from "./internal/theme.js";
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

/** What a field draws at one frame. */
export interface FireworksState {
  /** The sparks on screen; `0` before the box has been measured. */
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

/** {@link Fireworks} props. */
export interface FireworksProps extends Omit<Props, "children" | "style"> {
  /** The bursts to paint. Default `3`; `0` paints none and `6` is the cap. */
  readonly bursts?: number;
  /** The sparks in one burst. Default `18`; `0` paints none and `40` is the cap. */
  readonly sparks?: number;
  /** The layout seed. Default `1`; the same seed paints the same sequence. */
  readonly seed?: number;
  /** The smallest spark, in pixels. Default `2`. */
  readonly minSize?: number;
  /** The largest spark, in pixels. Default `4`. */
  readonly maxSize?: number;
  /** The spark colour. Default the theme's `primary` role. */
  readonly color?: string;
  /**
   * The base time for one burst, in milliseconds. Default `1_400`; every spark
   * runs `0.6…1` of it, split `0.7` flying and `0.3` fading.
   */
  readonly burstMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the field. */
  readonly style?: StateStyle<FireworksState>;
}

interface SparkProps {
  readonly spec: FireworkSpark;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
}

/**
 * One spark: flies out brightening, fades at the ring, then another lap.
 *
 * The root element is keyed by the lap, so the completed fade mounts a fresh
 * spark at the centre; the phase lives in this component so the two targets are
 * handed over without a caller-driven timer.
 */
const Spark = ({ spec, ink, radius, still }: SparkProps) => {
  const [life, setLife] = useState({ lap: 0, fading: false });
  const phases = sparkPhases(spec);
  const rest = sparkRest(spec);
  const phase = life.fading ? phases.fade : phases.fly;
  const motion: MotionProps = {
    // The fade retargets from where the fly left the spark; only a new lap
    // starts from the centre.
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
        // A spark is decoration too: a press lands on what is behind the field.
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * A bounded box of bursting sparks.
 *
 * Give it a height — directly or through a sized flex parent — because the field
 * positions itself from its own measured box and paints nothing before the first
 * layout.
 */
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
  // The box the field is laid out in. Reporting the same size again must not
  // churn the tree; a new size re-draws the sequence from the same seed.
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
          // Decoration: the content in front of the field keeps every press.
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
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
