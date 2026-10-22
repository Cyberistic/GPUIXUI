/**
 * `SplitPane` — two panes and the draggable divider between them.
 *
 * The divider is {@link Divider}, the package's one resize control, and the two
 * panes share a flex box. The first pane takes a caller-owned pixel size and
 * the second fills the rest, so a drag or an arrow key changes one number and
 * nothing else. Sizing is `flexBasis`, never a `transform`: the runtime has no
 * transform (upstream issue #102), and the window probe `split-pane-lifecycle`
 * measured that a divider resized by width keeps every captured move, so the
 * layout reflows rather than scaling.
 *
 * The size is **controlled** — `size` in, `onResize` out — because a split's
 * `max` is the caller's number, not its container's width (`dock-reflow`), and
 * the caller owns the re-clamp when a sibling or the window reflows. The
 * divider reports cumulative deltas and the component clamps them to
 * `min`/`max`, so a drag that leaves the box still lands on a legal size.
 */

import type { ReactElement, ReactNode } from "react";
import { useRef } from "react";
import { cn } from "@gpuixui/tw";
import { Divider } from "./divider.js";
import { dragSize, resizeByKey, sizeBounds } from "./logic.js";
import { PANE, PANEL_ROOT, mergeStyle, recipeStyle } from "./recipe.js";
import { useTheme } from "./theme.js";

export interface SplitPaneProps {
  /** `"horizontal"` lays the panes left/right; `"vertical"` stacks them. */
  readonly orientation?: "horizontal" | "vertical";
  /** The first pane's size in pixels. Controlled. */
  readonly size: number;
  /** Reports the first pane's settled size after a drag step or a key. */
  readonly onResize?: (size: number) => void;
  /** The first pane's floor, in pixels. Default `0`. */
  readonly min?: number;
  /** The first pane's ceiling, in pixels. Default unbounded. */
  readonly max?: number;
  /** The first pane. */
  readonly first: ReactNode;
  /** The second pane, which fills the rest. */
  readonly second: ReactNode;
  /** The divider's accessible name, e.g. `"Sidebar width"`. */
  readonly dividerLabel?: string;
  readonly disabled?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for automation. */
  readonly testId?: string;
}

/** Two panes and the draggable divider between them. */
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
