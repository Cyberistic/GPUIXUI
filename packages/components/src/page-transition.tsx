/**
 * PageTransition: one region that swaps between views on the house entrance.
 *
 * The library has no router, so this is the transition a router would own: the
 * caller names the view on screen with `viewKey` and passes that view's
 * children, and the region runs the swap the way the overlays open — a fade plus
 * a few pixels of travel, because the runtime has no `transform` (upstream issue
 * #102).
 *
 * A swap is two halves, not a cross-fade. `@gpuix/native@0.11.0` has no
 * `aria-hidden`, so keeping the outgoing view mounted beside the incoming one
 * would put both in the accessibility tree and leave the old page's controls
 * focusable while it fades (the rule `RollingText` follows for a value). So the
 * view on screen leaves, the region is empty for no longer than one exit, and
 * the new view arrives: exactly one view is mounted at every point.
 *
 * The region clips its view, because the travel is a relative `left` on the
 * view box and would otherwise paint outside the region it belongs to. A view
 * that is leaving is a ghost: it keeps its box for the exit half but paints the
 * seam's no-press guard, so an action inside the old page cannot answer the
 * press the reader meant for the page arriving. Under
 * `MotionProvider preference="reduced"` or `level="none"` the swap happens in
 * the frame it changes, with no travel at all.
 */

import type { MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  PresenceShield,
  presenceStyle,
  useMotionPreference,
  useSurfaceTiming,
  transitionWindowMs,
} from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import {
  PAGE_TRAVEL,
  finishPage,
  initialPageTransition,
  pageFrames,
  requestPage,
  settlePage,
  type PageDirection,
  type PagePhase,
} from "./page-transition/logic.js";

/** What a page region paints at one frame. */
export interface PageTransitionPaint {
  /** The view on screen. */
  readonly view: string;
  /** `"leaving"` while the old view leaves, `"entering"` as the new one arrives. */
  readonly phase: PagePhase;
  readonly direction: PageDirection;
  readonly reducedMotion: boolean;
}

/** {@link PageTransition} props. */
export interface PageTransitionProps extends Omit<Props, "children" | "style"> {
  /**
   * The view on screen. A change starts the swap; the same key keeps the
   * mounted view, so a caller that re-renders a view does not replay it.
   */
  readonly viewKey: string;
  /** The current view's content. */
  readonly children?: ReactNode;
  /**
   * Which way the reader is moving. `"forward"` leaves toward the left and
   * arrives from the right. Default `"forward"`.
   */
  readonly direction?: PageDirection;
  /** Pixels travelled. Default `16`; a value that cannot run falls back to it. */
  readonly distance?: number;
  /**
   * The motion level of both halves, or `"none"` to swap in the frame it
   * changes. Default `"normal"` (200 ms each way).
   */
  readonly level?: MotionLevel | "none";
  /** A Tailwind class string for the region, joined after the resting style. */
  readonly className?: string;
  /** A style for the region, or a function of the swap. */
  readonly style?: StateStyle<PageTransitionPaint>;
}

/**
 * A region that swaps its view with the house exit and entrance.
 *
 * The swap is driven by `viewKey`: the caller owns which view is current and
 * passes its content, and the region owns only the painting. A key changed
 * mid-exit replaces the waiting view instead of queueing it, so a reader who
 * arrows through a list sees one exit, and returning to the view still on
 * screen cancels the swap.
 */
export const PageTransition = ({
  viewKey,
  children,
  direction = "forward",
  distance,
  level = "normal",
  className,
  style,
  testId,
  ...rest
}: PageTransitionProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level === "none" ? "normal" : level);
  const instant = preference === "reduced" || level === "none";
  const [transition, setTransition] = useState(() =>
    initialPageTransition(viewKey),
  );
  /** The newest content a caller passed, whether or not it is on screen yet. */
  const latest = useRef(children);
  /** The view on screen when the current exit started. */
  const outgoing = useRef(children);

  useLayoutEffect(() => {
    latest.current = children;
  });

  // A view change is applied in the render that delivers it, so the outgoing
  // view is what paints on that frame — an effect would show the new view for
  // one frame before the old one started leaving.
  const waitingForView = Option.exists(
    transition.pendingKey,
    (key) => key === viewKey,
  );
  const needsRequest = instant
    ? transition.shownKey !== viewKey
    : transition.phase === "leaving"
      ? !waitingForView
      : transition.shownKey !== viewKey;

  if (needsRequest) {
    if (transition.phase !== "leaving") outgoing.current = latest.current;
    setTransition(requestPage(transition, viewKey, instant));
  }

  /** The view stays painted for its half of the swap; a wait before it counts. */
  const exitWindow = transitionWindowMs(timing.exit);
  const enterWindow = transitionWindowMs(timing.enter);

  useLayoutEffect(() => {
    const ms = transition.phase === "leaving" ? exitWindow : enterWindow;

    if (transition.phase === "leaving") {
      if (ms <= 0) {
        setTransition(settlePage);
        return;
      }
      const handle = setTimeout(() => setTransition(settlePage), ms);
      return () => clearTimeout(handle);
    }

    if (transition.phase === "entering") {
      if (ms <= 0) {
        setTransition(finishPage);
        return;
      }
      const handle = setTimeout(() => setTransition(finishPage), ms);
      return () => clearTimeout(handle);
    }
  }, [transition.phase, transition.run, exitWindow, enterWindow]);

  const frames = pageFrames(
    direction,
    Option.getOrElse(Option.fromNullishOr(distance), () => PAGE_TRAVEL),
  );
  const motion: MotionProps = Match.value(transition.phase).pipe(
    Match.when(
      "leaving",
      (): MotionProps => ({
        initial: false,
        animate: frames.exitTo,
        transition: timing.exit,
      }),
    ),
    Match.when(
      "entering",
      (): MotionProps => ({
        initial: frames.enterFrom,
        animate: frames.rest,
        transition: timing.enter,
      }),
    ),
    Match.when(
      "rest",
      (): MotionProps => ({
        initial: false,
        animate: frames.rest,
        transition: { duration: 0 },
      }),
    ),
    Match.exhaustive,
  );
  const painted = Option.isNone(transition.pendingKey)
    ? children
    : outgoing.current;
  const base = testId ?? "page-transition";
  const state: PageTransitionPaint = {
    view: transition.shownKey,
    phase: transition.phase,
    direction,
    reducedMotion: preference === "reduced",
  };

  return (
    <div
      {...rest}
      testId={base}
      style={mergeStyles(
        mergeStyles({ overflow: "hidden" }, recipeStyle(cn(className), theme)),
        resolveStyle(style, state),
      )}
    >
      <div
        key={`${transition.shownKey}:${transition.run}`}
        testId={`${base}-view`}
        motion={motion}
        style={mergeStyles(
          { position: "relative" },
          // The view on screen is a wrapper, so it paints no pointer rule; the
          // one leaving is a ghost of the previous page and takes no presses
          // while it fades — its controls must not answer the press the reader
          // meant for the page arriving.
          presenceStyle(transition.phase !== "leaving", "wrapper"),
        )}
      >
        {painted}
        <PresenceShield present={transition.phase !== "leaving"} />
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const pageTransitionMeta = {
  name: "Page transition",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "one view is mounted at a time: the old view leaves before the new one arrives, because 0.11.0 has no aria-hidden to keep the outgoing page out of the accessibility tree",
    "the travel is a relative left on a clipped box, not a transform (upstream issue #102)",
    "the region clips its view, so a page that overflows sideways is cut at the region's edge",
    "the swap does not move the focus: a control inside the outgoing view unmounts, so the caller restores focus when the new view needs it",
    "forward/back on the horizontal axis only: a vertical slide reads as a scroll, not a page",
  ],
  docs: "docs/page-transition.mdx",
  example: "examples/page-transition.example.tsx",
  testFile: "src/behaviour/page-transition.test.tsx",
} as const;
