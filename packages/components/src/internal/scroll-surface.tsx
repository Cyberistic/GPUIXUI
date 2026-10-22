/**
 * The measured scroll box behind `ScrollProgress` and `ScrollFade`.
 *
 * One place owns the three signals a scroll reading needs: the clamped offset
 * from `onScrollChange`, the viewport's painted height from its own `onLayout`,
 * and the content's painted height from the box it wraps. The component asks
 * `scrollMetrics` what that means and paints its chrome from the result.
 *
 * The box is the package's own viewport rather than `@gpuixui/primitives`'
 * `ScrollArea`, because a scroll *reading* must measure the very element that
 * scrolls and `ScrollArea` does not publish its viewport's `onLayout`. The price
 * is the keyboard contract: a scrollbar and a wheel move this box, arrow keys do
 * not. That limitation is recorded on both components and in `COMPONENTS.md`;
 * a reader who needs a keyboard scroll region uses `ScrollArea` from the
 * primitives package and wires its `onScrollChange` to `ScrollProgress`'
 * presentational parts.
 *
 * The content box keeps `flexShrink: 0`, so an overflowing list is laid out at
 * its full height inside the smaller viewport instead of being squeezed to it —
 * which is the height the fade and the bar are computed from.
 */

import type { EventPayload, Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { useState, type ReactNode } from "react";
import { scrollMetrics, type ScrollMetrics } from "../scroll/metrics.js";
import { recipeStyle } from "./recipe.js";
import { useTheme } from "./theme.js";

/** The measurement state one scroll box reports. */
interface ScrollReading {
  readonly metrics: ScrollMetrics;
  readonly noteScroll: (event: EventPayload) => void;
  readonly noteViewport: (event: EventPayload) => void;
  readonly noteContent: (event: EventPayload) => void;
}

const useScrollReading = (): ScrollReading => {
  const [offsetY, setOffsetY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  return {
    metrics: scrollMetrics({ offsetY, viewportHeight, contentHeight }),
    noteScroll: (event) => setOffsetY(event.scrollY ?? 0),
    noteViewport: (event) => setViewportHeight(event.height ?? 0),
    noteContent: (event) => setContentHeight(event.height ?? 0),
  };
};

/** {@link ScrollSurface} props. */
export interface ScrollSurfaceProps extends Omit<Props, "children"> {
  readonly children?: ReactNode;
  /** Painted over the box, from the measurement `chrome` is handed. */
  readonly chrome?: (metrics: ScrollMetrics) => ReactNode;
  /** A Tailwind class string for the component's box, merged last. */
  readonly className?: string;
}

/**
 * A bounded scroll box whose offset and two heights are measured.
 *
 * The caller's host props (`testId`, `aria-*`, `onClick`) land on the scroller,
 * so `testId` locates the element a reader actually moves. `style` and
 * `className` style the component's box: give it a height (or a flex parent),
 * because a scroller with nothing to clip has nothing to report.
 */
export const ScrollSurface = ({
  children,
  chrome,
  className,
  style,
  ...rest
}: ScrollSurfaceProps) => {
  const theme = useTheme();
  const reading = useScrollReading();

  return (
    <div
      style={mergeStyles(
        recipeStyle(cn("relative flex flex-col min-h-0", className), theme),
        style,
      )}
    >
      <div
        {...rest}
        onScrollChange={(event) => {
          reading.noteScroll(event);
          rest.onScrollChange?.(event);
        }}
        onLayout={(event) => {
          reading.noteViewport(event);
          rest.onLayout?.(event);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          flexShrink: 1,
          minHeight: 0,
          width: "100%",
          overflowY: "scroll",
          overflowX: "hidden",
          scrollbarColor: theme.colors.scrollbar,
        }}
      >
        <div onLayout={reading.noteContent} style={{ flexShrink: 0 }}>
          {children}
        </div>
      </div>
      {chrome === undefined ? null : chrome(reading.metrics)}
    </div>
  );
};
