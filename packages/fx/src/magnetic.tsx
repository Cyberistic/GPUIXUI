/** @jsxImportSource @gpuix/react */
import type { EventPayload, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  measuredPoint,
  send,
  useLocalState,
  useLocalStore,
  useMotionPreference,
  useSurfaceTiming,
  recipeStyle,
  surfaceOriginStyle,
  useSurfaceBox,
  useTheme,
} from "@gpuixui/components/authoring";
import {
  magneticFrames,
  magneticPull,
  magneticRest,
  samePull,
} from "./magnetic/logic.js";
import { makeMagneticStore } from "./magnetic/store.js";

export interface MagneticState {
  readonly pulled: boolean;
  readonly reducedMotion: boolean;
}

export interface MagneticProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;

  readonly strength?: number;

  readonly maxOffset?: number;

  readonly level?: MotionLevel;

  readonly className?: string;

  readonly style?: StateStyle<MagneticState>;
}

export const Magnetic = ({
  children,
  strength,
  maxOffset,
  level = "fast",
  className,
  style,
  onMouseMove,
  onMouseLeave,
  onLayout,
  ...rest
}: MagneticProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level).enter;
  const surface = useSurfaceBox();
  const store = useLocalStore(makeMagneticStore);
  const pointer = useLocalState(store.local);
  const reduced = preference === "reduced";

  const pull = reduced
    ? magneticRest
    : Option.match(Option.all({ surface: surface.box, point: pointer }), {
        onNone: () => magneticRest,
        onSome: ({ surface, point }) =>
          magneticPull(
            point,
            surface,
            strength ?? undefined,
            maxOffset ?? undefined,
          ),
      });

  useEffect(() => {
    if (reduced) send(store.release);
  }, [reduced, store]);

  const measure = (event: EventPayload) => {
    surface.measure(event);
    onLayout?.(event);
  };

  const follow = (event: EventPayload) => {
    onMouseMove?.(event);
    if (reduced) return;
    surface.read();
    send(store.follow(measuredPoint(event)));
  };

  const leave = (event: EventPayload) => {
    onMouseLeave?.(event);
    send(store.release);
  };

  const state: MagneticState = {
    pulled: !samePull(pull, magneticRest),
    reducedMotion: reduced,
  };

  return (
    <div
      {...rest}
      onMouseMove={follow}
      onMouseLeave={leave}
      onLayout={measure}
      style={mergeStyles(
        mergeStyles(
          { position: "relative" },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <div
        style={surfaceOriginStyle(surface.nudge)}
        onLayout={surface.noteOrigin}
      />
      <div
        testId="magnetic-plate"
        motion={{
          initial: false,
          animate: magneticFrames(pull),
          transition: timing,
        }}
        style={{ position: "relative" }}
      >
        {children}
      </div>
    </div>
  );
};

export const magneticMeta = {
  name: "Magnetic",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the lean is a relative left/top offset on an inner plate, not a translate: the runtime has no transform (upstream issue #102)",
    "the outer box deliberately stays still, so the pointer cannot leave the surface it is pulling; the content moves inside it",
    "a reduced-motion reader and a keyboard reader get no lean; the hover fill and the focus ring are the feedback that remains",
    "the pull follows the centre of the measured box; a 1px probe at the surface's origin re-reports it on every pointer read, because onLayout reports a size change and not a move",
    "nothing moves until the surface and its probe have both reported a box",
  ],
  docs: "docs/magnetic.mdx",
  example: "examples/magnetic.example.tsx",
  testFile: "src/behaviour/magnetic.test.tsx",
} as const;
