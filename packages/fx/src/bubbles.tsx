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

export interface BubblesState {
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

export interface BubblesProps extends Omit<Props, "children" | "style"> {
  readonly count?: number;

  readonly seed?: number;

  readonly minSize?: number;

  readonly maxSize?: number;

  readonly color?: string;

  readonly riseMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<BubblesState>;
}

interface BubbleLapProps {
  readonly spec: BubbleSpec;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
  readonly box: BubbleBox;
}

const BubbleLap = ({ spec, ink, radius, still, box }: BubbleLapProps) => {
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

        pointerEvents: "none",
      }}
    />
  );
};

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

          pointerEvents: "none",
        }),
        resolveStyle(style, state),
      )}
    >
      {Arr.map(specs, (spec) => (
        <BubbleLap
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
