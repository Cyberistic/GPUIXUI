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
  useTheme,
  countOf,
  durationOf,
  seedOf,
  sizeRangeOf,
} from "@gpuixui/components/authoring";
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

export interface ParticlesState {
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

export interface ParticlesProps extends Omit<Props, "children" | "style"> {
  readonly count?: number;

  readonly seed?: number;

  readonly minSize?: number;

  readonly maxSize?: number;

  readonly color?: string;

  readonly driftMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<ParticlesState>;
}

interface MoteProps {
  readonly spec: ParticleSpec;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
}

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

        pointerEvents: "none" as const,
      }}
    />
  );
};

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
