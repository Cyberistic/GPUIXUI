/**
 * ScrollProgress: a reading line over a scroll box, at the fraction the reader
 * has travelled.
 *
 * The bar is measured from the same three signals as `ScrollFade`: the clamped
 * offset, the viewport's painted height and the content's full height. It is
 * painted over the box at the top or bottom edge, in the `primary` role on a
 * `muted` track, and takes no pointer input, so it never stands between the
 * reader and a row. A box whose content fits reads zero rather than inventing a
 * journey.
 *
 * The fraction is the runtime's own arithmetic, `travelled / overflow` where
 * `overflow = contentHeight - viewportHeight`; it does not assume a page height,
 * a scrollbar width or an item count. `onLayout` supplies both heights, so a
 * list that grows or a window that resizes moves the reading without the caller
 * setting anything.
 *
 * This is state, not motion: the line follows the offset in the frame it
 * changes, and `MotionProvider` has nothing to reduce. The measurement lives in
 * `internal/scroll-surface.tsx`.
 */

import type { Props, StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { ScrollSurface } from "./internal/scroll-surface.js";
import { useTheme } from "./internal/theme.js";
import { scrollSize, type ScrollMetrics } from "./scroll/metrics.js";

/** Which edge the reading line sits on. */
export type ScrollProgressSide = "top" | "bottom";

/** {@link ScrollProgress} props. */
export interface ScrollProgressProps extends Omit<Props, "children" | "style"> {
  readonly children?: ReactNode;
  /** The edge the line sits on. Default `"bottom"`. */
  readonly side?: ScrollProgressSide;
  /** The line's thickness in pixels. Default `3`. */
  readonly thickness?: number;
  /** The travelled portion. Defaults to the theme's `primary` role. */
  readonly color?: string;
  /** The untravelled track. Defaults to the theme's `muted` role. */
  readonly trackColor?: string;
  /**
   * The reading's accessible name. The line is a `progressbar` whose
   * `aria-valuetext` is the percentage; unnamed it is announced by value only.
   */
  readonly label?: string;
  /** A Tailwind class string for the component's box, merged last. */
  readonly className?: string;
  /** A style for the component's box. Give it a bounded height. */
  readonly style?: StyleDesc;
}

/** The percentage a bar paints, rounded to the pixel a reader can see. */
const percent = (metrics: ScrollMetrics): number =>
  Math.round(metrics.progress * 100);

/** The reading line, from the measured state. */
const Line = ({
  metrics,
  side,
  thickness,
  color,
  trackColor,
  label,
  base,
}: {
  readonly metrics: ScrollMetrics;
  readonly side: ScrollProgressSide;
  readonly thickness: number;
  readonly color: string;
  readonly trackColor: string;
  readonly label: string | undefined;
  readonly base: string;
}) => (
  <div
    testId={`${base}-track`}
    role="progressbar"
    {...(label === undefined ? {} : { "aria-label": label })}
    aria-valuetext={`${percent(metrics)}%`}
    style={{
      position: "absolute",
      ...(side === "top" ? { top: 0 } : { bottom: 0 }),
      left: 0,
      right: 0,
      height: thickness,
      backgroundColor: trackColor,
      overflow: "hidden",
      pointerEvents: "none",
    }}
  >
    <div
      testId={`${base}-bar`}
      style={{
        height: "100%",
        width: `${percent(metrics)}%`,
        backgroundColor: color,
      }}
    />
  </div>
);

/**
 * A scroll box with a reading line for how far through its content it is.
 *
 * Give it a bounded height (or put it in a flex parent): the line describes the
 * travel inside that box, and a box that fits its content has no travel.
 */
export const ScrollProgress = ({
  children,
  side = "bottom",
  thickness,
  color,
  trackColor,
  label,
  className,
  style,
  testId,
  ...rest
}: ScrollProgressProps) => {
  const theme = useTheme();
  const base = testId ?? "scroll-progress";

  return (
    <ScrollSurface
      {...rest}
      testId={testId}
      className={className}
      style={style}
      chrome={(metrics) => (
        <Line
          metrics={metrics}
          side={side}
          thickness={scrollSize(Option.fromNullishOr(thickness), 3)}
          color={color ?? theme.colors.primary}
          trackColor={trackColor ?? theme.colors.muted}
          label={label}
          base={base}
        />
      )}
    >
      {children}
    </ScrollSurface>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const scrollProgressMeta = {
  name: "Scroll progress",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "the line follows the offset instead of tweening to it: a scroll position is a direct reading",
    "the box scrolls by wheel and scrollbar only; it is not a keyboard scroll region (use ScrollArea for that)",
    "the runtime exposes no aria-valuenow, so the reading is announced through aria-valuetext",
  ],
  docs: "docs/scroll-progress.mdx",
  example: "examples/scroll-progress.example.tsx",
  testFile: "src/behaviour/scroll-progress.test.tsx",
} as const;
