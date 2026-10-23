/**
 * The measured scroll box behind `ScrollProgress` and `ScrollFade`.
 *
 * One place owns the three signals a scroll reading needs: the clamped offset
 * from `onScrollChange`, the viewport's painted height from its own `onLayout`,
 * and the content's painted height from the box it wraps. The component asks
 * `scrollMetrics` what that means and paints its chrome from the result.
 *
 * The viewport is `@gpuixui/primitives`' `ScrollArea`, reached through its
 * `./scroll-area` subpath: the primitive already publishes the scroller's own
 * `onLayout` and its keyboard contract (a tab stop, arrows, PageUp/PageDown,
 * Home/End through the renderer's `scrollTo`). The root frame stays here because
 * the chrome paints over the box at its edges, so the frame is one positioned
 * column holding the area and the chrome.
 *
 * The content box keeps `flexShrink: 0`, so an overflowing list is laid out at
 * its full height inside the smaller viewport instead of being squeezed to it —
 * which is the height the fade and the bar are computed from.
 */

import type { EventPayload, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { ScrollArea } from "@gpuixui/primitives/scroll-area";
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
export interface ScrollSurfaceProps {
  readonly children?: ReactNode;
  /** Painted over the box, from the measurement `chrome` is handed. */
  readonly chrome?: (metrics: ScrollMetrics) => ReactNode;
  /** The scroller's locator: the element a reader actually moves. */
  readonly testId?: string;
  /** The scroll region's accessible name. Default: the primitives' "Scroll region". */
  readonly label?: string;
  /** A wheel scroll, forwarded to the scroller. */
  readonly onScroll?: (event: EventPayload) => void;
  /** The absolute offset after any move, measured before the caller's handler. */
  readonly onScrollChange?: (event: EventPayload) => void;
  /** The viewport's painted box, measured before the caller's handler. */
  readonly onLayout?: (event: EventPayload) => void;
  /** A Tailwind class string for the component's box, merged last. */
  readonly className?: string;
  /** A style for the component's box. Give it a bounded height. */
  readonly style?: StyleDesc;
}

/**
 * A bounded scroll box whose offset and two heights are measured.
 *
 * The caller's `testId` locates the scroller, so a probe or an automation host
 * finds the element a reader moves. `style` and `className` style the
 * component's box: give it a height (or a flex parent), because a scroller with
 * nothing to clip has nothing to report.
 */
export const ScrollSurface = ({
  children,
  chrome,
  testId,
  label,
  onScroll,
  onScrollChange,
  onLayout,
  className,
  style,
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
      <ScrollArea
        axis="vertical"
        viewportTestId={testId}
        label={label}
        scrollbarColor={theme.colors.scrollbar}
        onScroll={onScroll}
        onScrollChange={(event) => {
          reading.noteScroll(event);
          onScrollChange?.(event);
        }}
        onLayout={(event) => {
          reading.noteViewport(event);
          onLayout?.(event);
        }}
        style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }}
      >
        <div onLayout={reading.noteContent} style={{ flexShrink: 0 }}>
          {children}
        </div>
      </ScrollArea>
      {chrome === undefined ? null : chrome(reading.metrics)}
    </div>
  );
};
