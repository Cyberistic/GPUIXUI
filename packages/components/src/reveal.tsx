/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import {
  delayedTiming,
  PresenceShield,
  presenceMotion,
  presenceStyle,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import { revealFrames, type RevealFrom } from "./reveal/frames.js";

export interface RevealState {
  readonly open: boolean;
  readonly from: RevealFrom;
  readonly reducedMotion: boolean;
}

export interface RevealProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;

  readonly open?: boolean;

  readonly from?: RevealFrom;

  readonly distance?: number;

  readonly level?: MotionLevel;

  readonly delayMs?: number;

  readonly className?: string;

  readonly style?: StateStyle<RevealState>;
}

export const Reveal = ({
  children,
  open,
  from = "below",
  distance,
  level = "normal",
  delayMs,
  className,
  style,
  ...rest
}: RevealProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const delay = Option.getOrElse(Option.fromNullishOr(delayMs), () => 0);
  const travel = Option.getOrElse(Option.fromNullishOr(distance), () => 8);
  const presence = useSurfacePresence(open ?? true, {
    enter: delayedTiming(timing.enter, delay),
    exit: timing.exit,
  });

  if (!presence.mounted) return null;

  const state: RevealState = {
    open: open ?? true,
    from,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      motion={presenceMotion(revealFrames(from, travel), presence)}
      style={mergeStyles(
        mergeStyles(
          { position: "relative" },
          recipeStyle(cn(className), theme),
        ),
        mergeStyles(
          presenceStyle(presence.present, "wrapper"),
          resolveStyle(style, state),
        ),
      )}
    >
      {children}
      <PresenceShield present={presence.present} />
    </div>
  );
};

export const revealMeta = {
  name: "Reveal",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "fade plus a top/left offset: the runtime has no transform, so there is no zoom or scale",
    "no blur: StyleDesc has no filter",
    "the travel does not reflow, so the content's final layout is the one it is laid out in",
  ],
  docs: "docs/reveal.mdx",
  example: "examples/reveal.example.tsx",
  testFile: "src/behaviour/reveal.test.tsx",
} as const;
