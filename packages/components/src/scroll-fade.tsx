/**
 * ScrollFade: a scroll box that fades its top and bottom edges while there is
 * more content beyond them.
 *
 * The runtime paints a two-stop `linear-gradient` background, so the hint is a
 * real surface: an opaque strip on the edge dissolving into the content, painted
 * over the scroller with `pointerEvents: "none"` so presses still reach the
 * rows. The top strip appears once the reader has moved away from the start and
 * the bottom one disappears at the end; a box whose content fits paints neither,
 * because a fade over nothing is a lie about more to read.
 *
 * The gradient's opaque stop is the caller's surface — the theme's `background`
 * role by default. A scroller on a card passes `color={theme.colors.card}`, or
 * the fade would settle into a colour the surface does not have.
 *
 * This is state, not motion: the edges toggle with the offset in the frame it
 * changes, so `MotionProvider` has nothing to reduce and the reading never waits
 * on a tween. The measurement lives in `internal/scroll-surface.tsx`.
 */

import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { alpha, useTheme } from "./internal/theme.js";
import {
  edgeGradient,
  scrollSize,
  type ScrollEdge,
  type ScrollMetrics,
} from "./scroll/metrics.js";

/** {@link ScrollFade} props. */
export interface ScrollFadeProps {
  readonly children?: ReactNode;
  /** The scroller's locator, for a probe or an automation host. */
  readonly testId?: string;
  /** The scroll region's accessible name. Default: the primitives' "Scroll region". */
  readonly label?: string;
  /**
   * The colour a fading edge settles into — the surface behind the content.
   * Defaults to the theme's `background` role.
   */
  readonly color?: string;
  /** How tall the fade is, in pixels. Default `32`. */
  readonly edgeSize?: number;
  /** A Tailwind class string for the component's box, merged last. */
  readonly className?: string;
  /** A style for the component's box. Give it a bounded height. */
  readonly style?: StyleDesc;
}

/** One edge strip, painted from the measured state. */
const Edge = ({
  edge,
  size,
  gradient,
  testId,
}: {
  readonly edge: ScrollEdge;
  readonly size: number;
  readonly gradient: StyleDesc["background"];
  readonly testId: string;
}) => (
  <div
    testId={testId}
    style={{
      position: "absolute",
      ...(edge === "top" ? { top: 0 } : { bottom: 0 }),
      left: 0,
      right: 0,
      height: size,
      background: gradient,
      pointerEvents: "none",
    }}
  />
);

/** Whether one edge owes a fade at this reading. */
const fades = (edge: ScrollEdge, metrics: ScrollMetrics): boolean =>
  metrics.scrollable && (edge === "top" ? !metrics.atStart : !metrics.atEnd);

/**
 * A scroll box whose overflowing edges fade into the surface.
 *
 * The content's own height is what decides whether an edge fades, so a list that
 * grows or shrinks while it is open repaints the hint without the caller doing
 * anything.
 */
export const ScrollFade = ({
  children,
  color,
  edgeSize,
  className,
  style,
  testId,
  label,
}: ScrollFadeProps) => {
  const theme = useTheme();
  const base = testId ?? "scroll-fade";
  const size = scrollSize(Option.fromNullishOr(edgeSize), 32);
  const solid = color ?? theme.colors.background;
  const stops = { solid, clear: alpha(solid, 0) };

  return (
    <ScrollSurface
      testId={testId}
      label={label}
      className={className}
      style={style}
      chrome={(metrics) => (
        <>
          {fades("top", metrics) ? (
            <Edge
              edge="top"
              size={size}
              gradient={edgeGradient("top", stops)}
              testId={`${base}-top`}
            />
          ) : null}
          {fades("bottom", metrics) ? (
            <Edge
              edge="bottom"
              size={size}
              gradient={edgeGradient("bottom", stops)}
              testId={`${base}-bottom`}
            />
          ) : null}
        </>
      )}
    >
      {children}
    </ScrollSurface>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const scrollFadeMeta = {
  name: "Scroll fade",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the edges toggle with the offset instead of animating: a scroll position is a direct reading, and the runtime has no gradient animation",
    "the fade is vertical; a horizontal rail needs the gradient on the other axis",
    "the scrollbar's thumb takes no pointer input; the wheel and the keyboard region are the routes",
  ],
  docs: "docs/scroll-fade.mdx",
  example: "examples/scroll-fade.example.tsx",
  testFile: "src/behaviour/scroll-fade.test.tsx",
} as const;
