/**
 * AutoHeight: a reveal that grows to what its content measures.
 *
 * The runtime can tween a numeric height, but it cannot tween "auto": a
 * collapsing sidebar, a disclosure panel and a settings section all need the
 * height of a box that has not been laid out yet. So the inner box reports its
 * own painted height through `onLayout` and the clipped outer box tweens to that
 * number — the outer box clips, it does not shrink what it contains.
 *
 * Presence is a duration, not a frame callback: the content stays mounted for
 * its exit tween and unmounts after it, and a reopen during the exit retargets
 * the same run. Under the reduced preference the tween is a zero-duration
 * assignment, so the content still paints at its measured height.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useState, type ReactNode } from "react";
import {
  presenceMotion,
  presenceStyle,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

/** What a reveal draws at one frame. */
export interface AutoHeightState {
  /** The measured height the reveal is heading for, in pixels. */
  readonly height: number;
  /** Whether the content is revealed. */
  readonly open: boolean;
  /** Whether the reader asked for less motion, which paints the full height. */
  readonly reducedMotion: boolean;
}

/** {@link AutoHeight} props. */
export interface AutoHeightProps extends Omit<Props, "children" | "style"> {
  /** Whether the content is revealed. */
  readonly open: boolean;
  readonly children?: ReactNode;
  /** The motion level of the reveal. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /** A Tailwind class string for the clipping box, joined after the resting style. */
  readonly className?: string;
  /** A Tailwind class string for the measured content box. */
  readonly contentClassName?: string;
  /** A style, or a function of the reveal. */
  readonly style?: StateStyle<AutoHeightState>;
}

/**
 * A box that grows to its content's measured height and fades with it.
 *
 * A closed reveal paints nothing at all — the subtree is unmounted, so nothing
 * inside it keeps running. A caller that needs the state to survive a close
 * keeps it outside the reveal.
 */
export const AutoHeight = ({
  open,
  level = "normal",
  className,
  contentClassName,
  style,
  children,
  ...rest
}: AutoHeightProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level);
  const presence = useSurfacePresence(open, timing);
  const [measured, setMeasured] = useState(Option.none<number>());

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
      motion={presenceMotion(
        {
          initial: { height: 0, opacity: 0 },
          animate: { height: open ? height : 0, opacity: open ? 1 : 0 },
          exit: { height: 0, opacity: 0 },
        },
        presence,
      )}
      style={mergeStyles(
        mergeStyles(
          {
            width: "100%",
            overflow: "hidden",
            ...presenceStyle(presence.present, "wrapper"),
          },
          recipeStyle(cn(className), theme),
        ),
        resolveStyle(style, state),
      )}
    >
      <div
        onLayout={(event) => {
          Option.match(Option.fromNullishOr(event.height), {
            onNone: () => undefined,
            onSome: (next) => setMeasured(Option.some(next)),
          });
        }}
        style={recipeStyle(cn(contentClassName), theme)}
      >
        {children}
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const autoHeightMeta = {
  name: "Auto height",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the first reveal paints the box at zero and retargets once the content reports its height",
    "the clipped box does not reflow its content: a percentage height inside it measures against the content box",
    "the reveal unmounts its subtree after the collapse, so state inside it does not survive a close",
  ],
  docs: "docs/auto-height.mdx",
  example: "examples/auto-height.example.tsx",
  testFile: "src/behaviour/auto-height.test.tsx",
} as const;
