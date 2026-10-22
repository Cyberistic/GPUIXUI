/**
 * Particles: a decorative field of drifting motes.
 *
 * Each mote is a small absolutely positioned circle inside a clipped box, and
 * the drift is a tween of `left`/`top` — inset geometry, because the runtime has
 * no `transform` (upstream issue #102) and no 2D canvas. The layout is a pure
 * function of the measured box and one seed (`particles/logic.ts`), so the same
 * seed paints the same field on every mount.
 *
 * The runtime tweens a target once, so a floating field is a **ping-pong**: each
 * mote travels out on its own leg and, when that tween reports `onMotionComplete`,
 * turns around. `@gpuixui/motion` owns the timing policy through
 * `internal/presence.tsx`, and `MotionProvider preference="reduced"` paints the
 * seeded field still instead of deleting it.
 *
 * The field is decoration: it publishes no accessibility node and takes no
 * pointer input, so the content it sits behind owns the name and the presses.
 * It also measures itself, so the caller must bound it — a box with no height
 * has no field.
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
import { useTheme } from "./internal/theme.js";
import {
  countOf,
  durationOf,
  seedOf,
  sizeRangeOf,
} from "./internal/scatter.js";
import {
  particleCount,
  particleCountCap,
  particleDriftCap,
  particleDriftFloor,
  particleDriftMs,
  particleField,
  particleMaxSize,
  particleMinSize,
  particleTravel,
  type ParticleDirection,
  type ParticleSpec,
} from "./particles/logic.js";

/** What a field draws at one frame. */
export interface ParticlesState {
  /** The motes on screen; `0` before the box has been measured. */
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

/** {@link Particles} props. */
export interface ParticlesProps extends Omit<Props, "children" | "style"> {
  /** The motes to paint. Default `24`; `0` paints none and `120` is the cap. */
  readonly count?: number;
  /** The layout seed. Default `1`; the same seed paints the same field. */
  readonly seed?: number;
  /** The smallest mote, in pixels. Default `2`. */
  readonly minSize?: number;
  /** The largest mote, in pixels. Default `5`. */
  readonly maxSize?: number;
  /** The mote colour. Default the theme's `primary` role. */
  readonly color?: string;
  /**
   * The time for one leg of the drift, in milliseconds. Default `14_000`; every
   * mote runs `0.75…1.25` of it, so the field never breathes in unison.
   */
  readonly driftMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the field. */
  readonly style?: StateStyle<ParticlesState>;
}

interface MoteProps {
  readonly spec: ParticleSpec;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
}

/**
 * One mote: born at its seeded place, drifting to the far end of its leg.
 *
 * A plain `div` with a `motion` prop rather than `motion.div`: the component
 * owns the turnaround, so the generation guard `motion.div` wraps around
 * `onMotionComplete` is not wanted here.
 */
const Mote = ({ spec, ink, radius, still }: MoteProps) => {
  const [direction, setDirection] = useState<ParticleDirection>(1);
  const travel = particleTravel(spec, direction);
  const motion: MotionProps = {
    initial: { left: spec.x, top: spec.y },
    animate: { left: travel.left, top: travel.top },
    transition: { duration: spec.durationMs / 1000, ease: "easeInOut" },
  };

  return (
    <div
      testId={`particle-${spec.key}`}
      {...(still
        ? {}
        : {
            motion,
            onMotionComplete: () =>
              setDirection((current) => (current === 1 ? -1 : 1)),
          })}
      style={{
        position: "absolute",
        left: spec.x,
        top: spec.y,
        width: spec.size,
        height: spec.size,
        borderRadius: radius,
        backgroundColor: ink,
        opacity: spec.opacity,
        // A mote is decoration too: a press lands on what is behind the field.
        pointerEvents: "none" as const,
      }}
    />
  );
};

/**
 * A bounded box of drifting motes.
 *
 * Give it a height — directly or through a sized flex parent — because the field
 * positions itself from its own measured box and paints nothing before the first
 * layout.
 */
export const Particles = ({
  count,
  seed,
  minSize,
  maxSize,
  color,
  driftMs,
  level = "slow",
  className,
  style,
  ...rest
}: ParticlesProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const fieldCount = countOf(
    Option.fromNullishOr(count),
    particleCount,
    particleCountCap,
  );
  const sizes = sizeRangeOf(
    Option.fromNullishOr(minSize),
    Option.fromNullishOr(maxSize),
    particleMinSize,
    particleMaxSize,
  );
  const layoutSeed = seedOf(Option.fromNullishOr(seed));
  const drift = durationOf(
    Option.fromNullishOr(driftMs),
    particleDriftMs,
    particleDriftFloor,
    particleDriftCap,
  );
  const ink = color ?? theme.colors.primary;
  const still = preference === "reduced";
  // The box the field is laid out in. A size that changes re-draws the field from
  // the same seed; reporting the same size again must not churn the tree.
  const [box, setBox] = useState<
    Option.Option<{
      readonly width: number;
      readonly height: number;
    }>
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

  const specs: ReadonlyArray<ParticleSpec> = Option.match(box, {
    onNone: () => [],
    onSome: (measured) =>
      particleField({
        width: measured.width,
        height: measured.height,
        count: fieldCount,
        seed: layoutSeed,
        minSize: sizes.min,
        maxSize: sizes.max,
        driftMs: drift,
      }),
  });

  const state: ParticlesState = {
    count: Arr.length(specs),
    reducedMotion: still,
    width: Option.match(box, {
      onNone: () => 0,
      onSome: (measured) => measured.width,
    }),
    height: Option.match(box, {
      onNone: () => 0,
      onSome: (measured) => measured.height,
    }),
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
        <Mote
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
export const particlesMeta = {
  name: "Particles",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a mote drifts by tweening left/top inside a clipped box: the runtime has no transform (upstream issue #102) and no 2D canvas, so it never translates or scales a layer",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the runtime tweens a target once, so a float is a ping-pong driven by onMotionComplete; a hidden field keeps running until it is unmounted or count is 0",
    "the field publishes no accessibility node and takes no pointer input: name the content it sits behind, never the field",
    "a size change re-draws the field from the same seed, which restarts every leg (a tween cannot be resumed at an arbitrary progress)",
  ],
  docs: "docs/particles.mdx",
  example: "examples/particles.example.tsx",
  testFile: "src/behaviour/particles.test.tsx",
} as const;
