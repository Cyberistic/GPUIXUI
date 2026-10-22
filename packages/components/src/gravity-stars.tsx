/**
 * GravityStars: a decorative field of stars falling toward a seeded well.
 *
 * The runtime has no `transform` (upstream issue #102) and no paths, so a star
 * cannot orbit: its fall is two straight legs of inset geometry. One seeded well
 * sits inside the box, every star is born on the box's own edge along its own
 * evenly spaced angle, and it falls inward — an **approach** that brightens to
 * its own peak, then a **plunge** that fades out at the well. When the plunge
 * completes the element is re-keyed onto the edge as a fresh star, so the field
 * keeps falling; both ends of the journey are invisible, so the restart has no
 * frame a reader can see.
 *
 * The acceleration is the runtime's `easeIn` curve, not a simulated force: the
 * nearer a star is to the well the shorter its fall, so the field never collapses
 * in unison. `@gpuixui/motion` owns the entrance through
 * `internal/presence.tsx`, and `MotionProvider preference="reduced"` paints every
 * star held on its approach frame instead of deleting the field.
 *
 * The field is decoration: it publishes no accessibility node (a div per star,
 * never text) and takes no pointer input, so the content it sits behind owns the
 * name and the presses. It measures itself, so the caller must bound it.
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
  gravityField,
  gravityFallCapMs,
  gravityFallFloor,
  gravityFallMs,
  gravityMaxSize,
  gravityMinSize,
  gravityPhases,
  gravityRest,
  gravityStars,
  gravityStarsCap,
  type GravityBox,
  type GravityStar,
} from "./gravity-stars/logic.js";

/** What a field draws at one frame. */
export interface GravityStarsState {
  /** The stars on screen; `0` before the box has been measured. */
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

/** {@link GravityStars} props. */
export interface GravityStarsProps extends Omit<Props, "children" | "style"> {
  /** The stars to paint. Default `36`; `0` paints none and `160` is the cap. */
  readonly count?: number;
  /** The layout seed. Default `1`; the same seed paints the same fall. */
  readonly seed?: number;
  /** The smallest star, in pixels. Default `1`. */
  readonly minSize?: number;
  /** The largest star, in pixels. Default `3`. */
  readonly maxSize?: number;
  /** The star colour. Default the theme's `primary` role. */
  readonly color?: string;
  /**
   * The base time for one fall, in milliseconds. Default `3_000`; a star nearer
   * the well lands sooner.
   */
  readonly fallMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the field. */
  readonly style?: StateStyle<GravityStarsState>;
}

interface StarProps {
  readonly spec: GravityStar;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
}

/**
 * One star: brightening toward the well, fading into it, then reborn on the edge.
 *
 * The element is keyed by the lap so a landed star mounts fresh; the phase lives
 * here so the two targets are handed over without a timer.
 */
const Star = ({ spec, ink, radius, still }: StarProps) => {
  const [life, setLife] = useState({ lap: 0, landing: false });
  const phases = gravityPhases(spec);
  const rest = gravityRest(spec);
  const phase = life.landing ? phases.plunge : phases.approach;
  const motion: MotionProps = {
    // A plunge retargets from where the approach left it; only a new lap starts
    // on the edge.
    initial: life.landing ? false : { left: spec.x, top: spec.y, opacity: 0 },
    animate: { left: phase.left, top: phase.top, opacity: phase.opacity },
    transition: {
      duration: phase.durationMs / 1000,
      ...(life.landing ? {} : { delay: phases.approach.delayMs / 1000 }),
      // The runtime's ease is the acceleration: a fall speeds up inward.
      ease: "easeIn",
    },
  };

  return (
    <div
      key={life.lap}
      testId={`gravity-star-${spec.key}`}
      {...(still
        ? {}
        : {
            motion,
            onMotionComplete: () =>
              setLife((current) =>
                current.landing
                  ? { lap: current.lap + 1, landing: false }
                  : { lap: current.lap, landing: true },
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
        opacity: still ? rest.opacity : 0,
        // Decoration: a press lands on what is behind the field.
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * A bounded box of stars falling into a seeded well.
 *
 * Give it a height — directly or through a sized flex parent — because the field
 * positions itself from its own measured box and paints nothing before the first
 * layout.
 */
export const GravityStars = ({
  count,
  seed,
  minSize,
  maxSize,
  color,
  fallMs,
  level = "slow",
  className,
  style,
  ...rest
}: GravityStarsProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const fieldCount = countOf(
    Option.fromNullishOr(count),
    gravityStars,
    gravityStarsCap,
  );
  const sizes = sizeRangeOf(
    Option.fromNullishOr(minSize),
    Option.fromNullishOr(maxSize),
    gravityMinSize,
    gravityMaxSize,
  );
  const layoutSeed = seedOf(Option.fromNullishOr(seed));
  const fall = durationOf(
    Option.fromNullishOr(fallMs),
    gravityFallMs,
    gravityFallFloor,
    gravityFallCapMs,
  );
  const ink = color ?? theme.colors.primary;
  const still = preference === "reduced";
  // The box the field is laid out in. Reporting the same size again must not
  // churn the tree; a new size re-draws the field from the same seed.
  const [box, setBox] = useState<Option.Option<GravityBox>>(Option.none());

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

  const measured: GravityBox = Option.getOrElse(box, () => ({
    width: 0,
    height: 0,
  }));
  const specs: ReadonlyArray<GravityStar> =
    measured.width > 0 && measured.height > 0
      ? gravityField({
          width: measured.width,
          height: measured.height,
          count: fieldCount,
          seed: layoutSeed,
          minSize: sizes.min,
          maxSize: sizes.max,
          fallMs: fall,
        })
      : [];

  const state: GravityStarsState = {
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
export const gravityStarsMeta = {
  name: "Gravity stars",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a star falls in two straight legs of inset geometry: the runtime has no transform (upstream issue #102) and no paths, so it cannot orbit, curve or trail",
    "the acceleration is the runtime's easeIn curve, not a simulated force, and a star's speed is fixed when the field is laid out",
    "a landed star is re-keyed onto the box's edge as a fresh star; both ends of the journey are invisible, so the restart is not visible",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the field publishes no accessibility node and takes no pointer input: name the content it sits behind, never the field",
    "a size change re-draws the field from the same seed, which restarts every fall (a tween cannot be resumed at an arbitrary progress)",
    "the well is seeded inside the middle 30–70% of the box and cannot follow a pointer, because decoration cannot take the presses a pointer handler would need",
  ],
  docs: "docs/gravity-stars.mdx",
  example: "examples/gravity-stars.example.tsx",
  testFile: "src/behaviour/gravity-stars.test.tsx",
} as const;
