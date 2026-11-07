/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";
import { cn } from "@gpuixui/tw";
import { Divider } from "./divider.js";
import { dragSize, resizeByKey, sizeBounds } from "./logic.js";
import { PANE, PANEL_ROOT, mergeStyle, recipeStyle } from "./recipe.js";
import { useTheme } from "./theme.js";

export interface SplitPaneProps {
  readonly orientation?: "horizontal" | "vertical";

  readonly size: number;

  readonly onResize?: (size: number) => void;

  readonly min?: number;

  readonly max?: number;

  readonly first: ReactNode;

  readonly second: ReactNode;

  readonly dividerLabel?: string;
  readonly disabled?: boolean;

  readonly className?: string;

  readonly testId?: string;
}

export const SplitPane = ({
  orientation = "horizontal",
  size,
  onResize,
  min,
  max,
  first,
  second,
  dividerLabel,
  disabled,
  className,
  testId,
}: SplitPaneProps): ReactElement => {
  const theme = useTheme();
  const bounds = sizeBounds(min, max);
  const dragStart = useRef(size);

  const root = mergeStyle(recipeStyle(cn(PANEL_ROOT, className), theme), {
    flexDirection: orientation === "horizontal" ? "row" : "column",
    alignItems: "stretch",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  });

  const firstPane = mergeStyle(recipeStyle(PANE, theme), {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: size,
  });
  const secondPane = mergeStyle(recipeStyle(PANE, theme), {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  });

  return (
    <div testId={testId} style={root}>
      <div style={firstPane}>{first}</div>
      <Divider
        orientation={orientation}
        valueText={`${Math.round(size)} px`}
        label={dividerLabel}
        disabled={disabled}
        testId={testId === undefined ? undefined : `${testId}-divider`}
        onDragStart={() => {
          dragStart.current = size;
        }}
        onDragDelta={(delta) => {
          onResize?.(dragSize(dragStart.current, delta, bounds));
        }}
        onKey={(key) => {
          onResize?.(resizeByKey(size, key, bounds));
        }}
      />
      <div style={secondPane}>{second}</div>
    </div>
  );
};
