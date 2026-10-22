/**
 * Stars: a decorative field of twinkling lights.
 *
 * A star holds its place and changes brightness — the runtime has no `transform`
 * (upstream issue #102), and `opacity` is the one paint value it animates
 * natively. The layout is a pure function of the measured box and one seed
 * (`stars/logic.ts`), so the same seed paints the same sky on every mount.
 *
 * The runtime tweens a target once, so a twinkle is a **ping-pong**: a star
 * brightens to its own peak, and when that tween reports `onMotionComplete` it
 * dims back to its own floor. Each star runs its own time and waits its own share
 * before it starts, so the sky never blinks in unison. `@gpuixui/motion` owns the
 * timing policy through `internal/presence.tsx`, and `MotionProvider
 * preference="reduced"` paints every star at its floor instead of deleting them.
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
  starAt,
  starCount,
  starCountCap,
  starField,
  starMaxSize,
  starMinSize,
  starTwinkleCap,
  starTwinkleFloor,
  starTwinkleMs,
  type StarDirection,
  type StarSpec,
} from "./stars/logic.js";

/** What a field draws at one frame. */
export interface StarsState {
  /** The stars on screen; `0` before the box has been measured. */
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

/** {@link Stars} props. */
export interface StarsProps extends Omit<Props, "children" | "style"> {
  /** The stars to paint. Default `48`; `0` paints none and `200` is the cap. */
  readonly count?: number;
  /** The layout seed. Default `1`; the same seed paints the same sky. */
  readonly seed?: number;
  /** The smallest star, in pixels. Default `1`. */
  readonly minSize?: number;
  /** The largest star, in pixels. Default `3`. */
  readonly maxSize?: number;
  /** The star colour. Default the theme's `foreground` role. */
  readonly color?: string;
  /**
   * The base time for one twinkle, in milliseconds. Default `2_400`; every star
   * runs `0.7…1.3` of it and waits up to `0.6` of that first.
   */
  readonly twinkleMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the field. */
  readonly style?: StateStyle<StarsState>;
}

interface StarProps {
  readonly spec: StarSpec;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
}

/**
 * One star: born at its dim floor, twinkling to its own peak.
 *
 * A plain `div` with a `motion` prop rather than `motion.div`: the component owns
 * the turnaround, so the generation guard `motion.div` wraps around
 * `onMotionComplete` is not wanted here.
 */
const Star = ({ spec, ink, radius, still }: StarProps) => {
  const [direction, setDirection] = useState<StarDirection>(1);
  const motion: MotionProps = {
    initial: { opacity: spec.dim },
    animate: { opacity: starAt(spec, direction) },
    transition: {
      duration: spec.durationMs / 1000,
      delay: spec.delayMs / 1000,
      ease: "easeInOut",
    },
  };

  return (
    <div
      testId={`star-${spec.key}`}
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
        opacity: spec.dim,
        // A star is decoration too: a press lands on what is behind the field.
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * A bounded box of twinkling stars.
 *
 * Give it a height — directly or through a sized flex parent — because the field
 * positions itself from its own measured box and paints nothing before the first
 * layout.
 */
export const Stars = ({
  count,
  seed,
  minSize,
  maxSize,
  color,
  twinkleMs,
  level = "slow",
  className,
  style,
  ...rest
}: StarsProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const fieldCount = countOf(
    Option.fromNullishOr(count),
    starCount,
    starCountCap,
  );
  const sizes = sizeRangeOf(
    Option.fromNullishOr(minSize),
    Option.fromNullishOr(maxSize),
    starMinSize,
    starMaxSize,
  );
  const layoutSeed = seedOf(Option.fromNullishOr(seed));
  const twinkle = durationOf(
    Option.fromNullishOr(twinkleMs),
    starTwinkleMs,
    starTwinkleFloor,
    starTwinkleCap,
  );
  const ink = color ?? theme.colors.foreground;
  const still = preference === "reduced";
  // The box the field is laid out in. Reporting the same size again must not
  // churn the tree; a new size re-draws the sky from the same seed.
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

  const specs: ReadonlyArray<StarSpec> = Option.match(box, {
    onNone: () => [],
    onSome: (measured) =>
      starField({
        width: measured.width,
        height: measured.height,
        count: fieldCount,
        seed: layoutSeed,
        minSize: sizes.min,
        maxSize: sizes.max,
        twinkleMs: twinkle,
      }),
  });

  const state: StarsState = {
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
        <Star
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
export const starsMeta = {
  name: "Stars",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a star twinkles by tweening opacity in place: the runtime has no transform (upstream issue #102) and no filter, so a star never drifts, flares or blooms",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the runtime tweens a target once, so a twinkle is a ping-pong driven by onMotionComplete; a hidden field keeps running until it is unmounted or count is 0",
    "the field publishes no accessibility node and takes no pointer input: name the content it sits behind, never the field",
    "a size change re-draws the sky from the same seed, which restarts every twinkle (a tween cannot be resumed at an arbitrary progress)",
  ],
  docs: "docs/stars.mdx",
  example: "examples/stars.example.tsx",
  testFile: "src/behaviour/stars.test.tsx",
} as const;
