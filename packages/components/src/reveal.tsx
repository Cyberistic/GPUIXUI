/**
 * Reveal: content that fades and travels into place when it is shown.
 *
 * The house entrance, extracted so a page section, a list and a notice all
 * arrive the same way the overlays do: an opacity run plus a few pixels of
 * travel, because the runtime has no `transform` (upstream issue #102) and no
 * filter, so a scale or a blur has no honest mapping. `@gpuixui/motion` owns the
 * timing and the reduced-motion policy; `internal/presence.tsx` owns the frames
 * and the mount window.
 *
 * Two uses, one contract: without `open` the reveal runs on mount and stays (a
 * section arriving), and with `open` it enters and leaves and unmounts after the
 * exit (a notice, a disclosure's contents).
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
import type { ReactNode } from "react";
import {
  presenceMotion,
  useMotionPreference,
  useSurfacePresence,
  useSurfaceTiming,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import { revealFrames, type RevealFrom } from "./reveal/frames.js";

/** What a reveal draws at one frame. */
export interface RevealState {
  /** Whether the content is meant to be shown. */
  readonly open: boolean;
  readonly from: RevealFrom;
  readonly reducedMotion: boolean;
}

/** {@link Reveal} props. */
export interface RevealProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;
  /**
   * Whether the content is shown. Omit it for a mount-time reveal; pass it to
   * enter and leave on a state change (the subtree unmounts after the exit).
   */
  readonly open?: boolean;
  /** The edge the content arrives from. Default `"below"`. */
  readonly from?: RevealFrom;
  /** Pixels travelled. Default `8`; a value that cannot run falls back to it. */
  readonly distance?: number;
  /** The motion level. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /** Milliseconds before the entry starts, for a stagger. Default `0`. */
  readonly delayMs?: number;
  /** A Tailwind class string, joined after the resting style so it wins. */
  readonly className?: string;
  /** A style, or a function of the reveal. */
  readonly style?: StateStyle<RevealState>;
}

/**
 * A box whose content fades and travels in.
 *
 * The travel is a relative `top` or `left`, so it moves the content without
 * reflowing what sits beside it. Under `MotionProvider preference="reduced"`
 * the duration is zero and the content paints at rest, but it still mounts and
 * unmounts on the same contract.
 */
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
  const delay = Option.getOrElse(
    Option.filter(
      Option.fromNullishOr(delayMs),
      (ms) => Number.isFinite(ms) && ms > 0,
    ),
    () => 0,
  );
  const travel = Option.getOrElse(Option.fromNullishOr(distance), () => 8);
  const presence = useSurfacePresence(open ?? true, {
    enter:
      delay === 0 ? timing.enter : { ...timing.enter, delay: delay / 1000 },
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
        resolveStyle(style, state),
      )}
    >
      {children}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
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
