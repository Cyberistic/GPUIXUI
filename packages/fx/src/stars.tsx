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
import {
  measuredBox,
  send,
  useLocalSlice,
  useLocalStore,
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
  directionOf,
  starAt,
  starCount,
  starCountCap,
  starField,
  starMaxSize,
  starMinSize,
  starTwinkleCap,
  starTwinkleFloor,
  starTwinkleMs,
  type StarSpec,
} from "./stars/logic.js";
import { makeStarsStore, type StarsStore } from "./stars/store.js";

export interface StarsState {
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

export interface StarsProps extends Omit<Props, "children" | "style"> {
  readonly count?: number;

  readonly seed?: number;

  readonly minSize?: number;

  readonly maxSize?: number;

  readonly color?: string;

  readonly twinkleMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<StarsState>;
}

interface StarProps {
  readonly spec: StarSpec;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
  readonly store: StarsStore;
}

const Star = ({ spec, ink, radius, still, store }: StarProps) => {
  const direction = useLocalSlice(store.local, (state) =>
    directionOf(state.directions, spec.key),
  );
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
            onMotionComplete: () => send(store.turn(spec.key)),
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

        pointerEvents: "none",
      }}
    />
  );
};

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
  const store = useLocalStore(makeStarsStore);

  const box = useLocalSlice(store.local, (current) => current.box);

  const noteBox = (event: EventPayload): void => {
    send(store.measure(measuredBox(event)));
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
          store={store}
        />
      ))}
    </div>
  );
};

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
