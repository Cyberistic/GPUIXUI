/**
 * Bubbles: a decorative field of bubbles rising through a clipped box.
 *
 * The runtime has no `transform` (upstream issue #102) and no 2D canvas, so a
 * bubble is an absolutely positioned circle whose `top` — and a few pixels of
 * `left` sway — the runtime tweens, while its fade is the one paint value the
 * runtime animates natively. The layout is a pure function of the measured box
 * and one seed (`bubbles/logic.ts`), so the same seed paints the same field on
 * every mount.
 *
 * The runtime tweens a target once, so a rise is a **lap**: the bubble starts
 * with its top edge at the box's bottom and ends with its bottom edge above the
 * box; when that tween reports `onMotionComplete` the element is re-keyed, which
 * puts a fresh bubble back at the bottom. Both ends are off-stage, so the restart
 * has no frame a reader can see. Each bubble runs its own time and waits its own
 * share first, so the field never rises in unison. `@gpuixui/motion` owns the
 * timing policy through `internal/presence.tsx`, and `MotionProvider
 * preference="reduced"` paints the field at its seeded resting places instead of
 * deleting it.
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
  bubbleCount,
  bubbleCountCap,
  bubbleField,
  bubbleJourney,
  bubbleMaxSize,
  bubbleMinSize,
  bubbleRiseCap,
  bubbleRiseFloor,
  bubbleRiseMs,
  type BubbleBox,
  type BubbleSpec,
} from "./bubbles/logic.js";

/** What a field draws at one frame. */
export interface BubblesState {
  /** The bubbles on screen; `0` before the box has been measured. */
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

/** {@link Bubbles} props. */
export interface BubblesProps extends Omit<Props, "children" | "style"> {
  /** The bubbles to paint. Default `24`; `0` paints none and `60` is the cap. */
  readonly count?: number;
  /** The layout seed. Default `1`; the same seed paints the same field. */
  readonly seed?: number;
  /** The smallest bubble, in pixels. Default `6`. */
  readonly minSize?: number;
  /** The largest bubble, in pixels. Default `28`. */
  readonly maxSize?: number;
  /** The bubble colour. Default the theme's `primary` role. */
  readonly color?: string;
  /**
   * The base time for one rise, in milliseconds. Default `7_000`; every bubble
   * runs `0.7…1.3` of it and waits up to `0.9` of that first.
   */
  readonly riseMs?: number;
  /** The entrance level. Default `"slow"` (320 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the box, merged last. */
  readonly className?: string;
  /** A style for the box, or a function of the field. */
  readonly style?: StateStyle<BubblesState>;
}

interface BubbleProps {
  readonly spec: BubbleSpec;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
  readonly box: BubbleBox;
}

/**
 * One bubble: born below the box, rising out of the top, then another lap.
 *
 * The root element is keyed by the lap so a completed rise mounts a fresh
 * element at the bottom; the component's own state survives that remount, which
 * is what lets the next lap start without a caller-driven timer.
 */
const Bubble = ({ spec, ink, radius, still, box }: BubbleProps) => {
  const [lap, setLap] = useState(0);
  const journey = bubbleJourney(spec, box);
  const motion: MotionProps = {
    initial: { left: journey.fromLeft, top: journey.fromTop, opacity: 0 },
    animate: {
      left: journey.toLeft,
      top: journey.toTop,
      opacity: spec.peak,
    },
    transition: {
      duration: spec.durationMs / 1000,
      delay: spec.delayMs / 1000,
      ease: "easeInOut",
    },
  };

  return (
    <div
      key={lap}
      testId={`bubble-${spec.key}`}
      {...(still
        ? {}
        : {
            motion,
            onMotionComplete: () => setLap((current) => current + 1),
          })}
      style={{
        position: "absolute",
        left: still ? spec.x : journey.fromLeft,
        top: still ? spec.y : journey.fromTop,
        width: spec.size,
        height: spec.size,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: ink,
        backgroundColor: ink,
        opacity: still ? spec.peak : 0,
        // A bubble is decoration too: a press lands on what is behind the field.
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * A bounded box of rising bubbles.
 *
 * Give it a height — directly or through a sized flex parent — because the field
 * positions itself from its own measured box and paints nothing before the first
 * layout.
 */
export const Bubbles = ({
  count,
  seed,
  minSize,
  maxSize,
  color,
  riseMs,
  level = "slow",
  className,
  style,
  ...rest
}: BubblesProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const fieldCount = countOf(
    Option.fromNullishOr(count),
    bubbleCount,
    bubbleCountCap,
  );
  const sizes = sizeRangeOf(
    Option.fromNullishOr(minSize),
    Option.fromNullishOr(maxSize),
    bubbleMinSize,
    bubbleMaxSize,
  );
  const layoutSeed = seedOf(Option.fromNullishOr(seed));
  const rise = durationOf(
    Option.fromNullishOr(riseMs),
    bubbleRiseMs,
    bubbleRiseFloor,
    bubbleRiseCap,
  );
  const ink = color ?? theme.colors.primary;
  const still = preference === "reduced";
  // The box the field is laid out in. Reporting the same size again must not
  // churn the tree; a new size re-draws the field from the same seed.
  const [box, setBox] = useState<Option.Option<BubbleBox>>(Option.none());

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

  const measured: BubbleBox = Option.getOrElse(box, () => ({
    width: 0,
    height: 0,
  }));
  const specs: ReadonlyArray<BubbleSpec> =
    measured.width > 0 && measured.height > 0
      ? bubbleField({
          width: measured.width,
          height: measured.height,
          count: fieldCount,
          seed: layoutSeed,
          minSize: sizes.min,
          maxSize: sizes.max,
          riseMs: rise,
        })
      : [];

  const state: BubblesState = {
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
        <Bubble
          key={spec.key}
          spec={spec}
          ink={ink}
          radius={theme.radius.full}
          still={still}
          box={measured}
        />
      ))}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const bubblesMeta = {
  name: "Bubbles",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a bubble rises by tweening top and left: the runtime has no transform (upstream issue #102), so it cannot scale, wobble or warp on its way up",
    "a rise is a lap re-keyed when the tween completes, so a bubble restarts at the bottom rather than turning around; both ends are off-stage, so the restart is not visible",
    "the field measures its own box, so the caller must bound it; before the first layout it paints nothing",
    "the field publishes no accessibility node and takes no pointer input: name the content it sits behind, never the field",
    "a size change re-draws the field from the same seed, which restarts every rise (a tween cannot be resumed at an arbitrary progress)",
  ],
  docs: "docs/bubbles.mdx",
  example: "examples/bubbles.example.tsx",
  testFile: "src/behaviour/bubbles.test.tsx",
} as const;
