/** @jsxImportSource @gpuix/react */
import type { Props, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { measuredHeight } from "./internal/measure.js";
import {
  PresenceShield,
  delayedTiming,
  presenceMotion,
  presenceStyle,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
  type SurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

const FADE_LEAD_MS = 20;

export interface AutoHeightState {
  readonly height: number;

  readonly open: boolean;

  readonly reducedMotion: boolean;
}

export interface AutoHeightProps extends Omit<Props, "children" | "style"> {
  readonly open: boolean;
  readonly children?: ReactNode;

  readonly level?: MotionLevel;

  readonly timing?: SurfaceTiming;

  readonly className?: string;

  readonly contentClassName?: string;

  readonly style?: StateStyle<AutoHeightState>;
}

export const AutoHeight = ({
  open,
  level = "normal",
  timing: ownTiming,
  className,
  contentClassName,
  testId,
  style,
  children,
  ...rest
}: AutoHeightProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const preference = useMotionPreference();
  const levelTiming = useSurfaceTiming(level);
  const timing = ownTiming ?? levelTiming;
  const presence = useSurfacePresence(open, timing);
  const [measured, setMeasured] = useState(Option.none<number>());
  const content = useRef<PublicInstance | null>(null);

  const fade = {
    enter: delayedTiming(timing.enter, FADE_LEAD_MS),
    exit: timing.exit,
  };

  useEffect(() => {
    if (presence.mounted) return;
    setMeasured((current) =>
      Option.isSome(current) ? Option.none() : current,
    );
  }, [presence.mounted]);

  useLayoutEffect(() => {
    if (!presence.mounted) return;
    const instance = content.current;
    if (instance === null) return;
    const bounds = renderer?.getElementBounds?.(instance.id) ?? null;
    if (bounds === null) return;
    setMeasured((current) =>
      Option.isSome(current) ? current : Option.some(bounds.height),
    );
  }, [presence.mounted, renderer]);

  if (!presence.mounted) return null;

  const height = Option.getOrElse(measured, () => 0);
  const state: AutoHeightState = {
    height,
    open,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      testId={testId}
      motion={presenceMotion(
        {
          initial: { height: 0 },
          animate: { height: open ? height : 0 },
          exit: { height: 0 },
        },
        presence,
      )}
      style={mergeStyles(
        mergeStyles(
          {
            width: "100%",
            overflow: "hidden",

            position: "relative",
            ...presenceStyle(presence.present, "wrapper"),
          },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <div
        ref={content}
        testId={testId === undefined ? undefined : `${testId}-measured`}
        motion={presenceMotion(
          {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          },
          presence,
          fade,
        )}
        onLayout={(event) => {
          Option.match(measuredHeight(event), {
            onNone: () => undefined,
            onSome: (next) => setMeasured(Option.some(next)),
          });
        }}
        style={recipeStyle(cn(contentClassName), theme)}
      >
        {children}
      </div>
      <PresenceShield present={presence.present} />
    </div>
  );
};

export const autoHeightMeta = {
  name: "Auto height",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the first measurement is read through the renderer's optional `getElementBounds`; a host without it starts the growth on the `onLayout` report a frame later",
    "the clipped box does not reflow its content: a percentage height inside it measures against the content box",
    "the reveal unmounts its subtree after the collapse, so state inside it does not survive a close and the next open measures the body again — a measurement is retired with the subtree it came from, never reused as a stale target",
  ],
  docs: "docs/auto-height.mdx",
  example: "examples/auto-height.example.tsx",
  testFile: "src/behaviour/auto-height.test.tsx",
} as const;
