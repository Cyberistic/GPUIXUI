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
  gravityField,
  gravityFallCapMs,
  gravityFallFloor,
  gravityFallMs,
  gravityLifeOf,
  gravityMaxSize,
  gravityMinSize,
  gravityPhases,
  gravityRest,
  gravityStars,
  gravityStarsCap,
  type GravityBox,
  type GravityLife,
  type GravityStar,
} from "./gravity-stars/logic.js";
import { makeGravityStore, type GravityStore } from "./gravity-stars/store.js";

export interface GravityStarsState {
  readonly count: number;
  readonly reducedMotion: boolean;
  readonly width: number;
  readonly height: number;
}

export interface GravityStarsProps extends Omit<Props, "children" | "style"> {
  readonly count?: number;

  readonly seed?: number;

  readonly minSize?: number;

  readonly maxSize?: number;

  readonly color?: string;

  readonly fallMs?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<GravityStarsState>;
}

interface StarProps {
  readonly spec: GravityStar;
  readonly ink: string;
  readonly radius: number;
  readonly still: boolean;
  readonly store: GravityStore;
}

const Star = ({ spec, ink, radius, still, store }: StarProps) => {
  const life: GravityLife = useLocalSlice(store.local, (state) =>
    gravityLifeOf(state.lives, spec.key),
  );
  const phases = gravityPhases(spec);
  const rest = gravityRest(spec);
  const phase = life.landing ? phases.plunge : phases.approach;
  const motion: MotionProps = {
    initial: life.landing ? false : { left: spec.x, top: spec.y, opacity: 0 },
    animate: { left: phase.left, top: phase.top, opacity: phase.opacity },
    transition: {
      duration: phase.durationMs / 1000,
      ...(life.landing ? {} : { delay: phases.approach.delayMs / 1000 }),

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
            onMotionComplete: () => send(store.advance(spec.key)),
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

        pointerEvents: "none",
      }}
    />
  );
};

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
  const store = useLocalStore(makeGravityStore);

  const box = useLocalSlice(store.local, (current) => current.box);

  const noteBox = (event: EventPayload): void => {
    send(store.measure(measuredBox(event)));
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
