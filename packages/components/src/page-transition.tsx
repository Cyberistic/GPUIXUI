/** @jsxImportSource @gpuix/react */
import type { MotionProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
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
import { surfaceLevelOf, type SurfaceLevel } from "./motion.js";
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

export interface PageTransitionPaint {
  readonly view: string;

  readonly phase: PagePhase;
  readonly direction: PageDirection;
  readonly reducedMotion: boolean;
}

export interface PageTransitionProps extends Omit<Props, "children" | "style"> {
  readonly viewKey: string;

  readonly children?: ReactNode;

  readonly direction?: PageDirection;

  readonly distance?: number;

  readonly level?: SurfaceLevel;

  readonly className?: string;

  readonly style?: StateStyle<PageTransitionPaint>;
}

export const PageTransition = ({
  viewKey,
  children,
  direction = "forward",
  distance,
  level: storedLevel = "normal",
  className,
  style,
  testId,
  ...rest
}: PageTransitionProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const level = surfaceLevelOf(storedLevel);
  const timing = useSurfaceTiming(level === "none" ? "normal" : level);
  const instant = preference === "reduced" || level === "none";
  const [transition, setTransition] = useState(() =>
    initialPageTransition(viewKey),
  );

  const latest = useRef(children);

  const outgoing = useRef(children);

  useLayoutEffect(() => {
    latest.current = children;
  });

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

          presenceStyle(transition.phase !== "leaving", "wrapper"),
        )}
      >
        {painted}
        <PresenceShield present={transition.phase !== "leaving"} />
      </div>
    </div>
  );
};

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
