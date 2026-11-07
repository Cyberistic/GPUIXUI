/** @jsxImportSource @gpuix/react */
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { ScrollArea } from "@gpuixui/primitives/scroll-area";
import { cn } from "@gpuixui/tw";
import { useState, type ReactNode } from "react";
import { scrollMetrics, type ScrollMetrics } from "../scroll/metrics.js";
import { recipeStyle } from "./recipe.js";
import { useTheme } from "./theme.js";

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

export interface ScrollSurfaceProps {
  readonly children?: ReactNode;

  readonly chrome?: (metrics: ScrollMetrics) => ReactNode;

  readonly testId?: string;

  readonly label?: string;

  readonly onScroll?: (event: EventPayload) => void;

  readonly onScrollChange?: (event: EventPayload) => void;

  readonly onLayout?: (event: EventPayload) => void;

  readonly className?: string;

  readonly style?: StyleDesc;
}

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
