/**
 * MotionGrid: a grid whose cells travel to their new slots when the order
 * changes.
 *
 * Every cell is absolutely positioned, and its position is a motion target:
 * reordering `items` retargets the cells that moved, so the runtime tweens their
 * `left`/`top` insets from the slot on screen to the new one. There is no
 * `transform` in the runtime (upstream issue #102), so a reorder is box geometry
 * rather than a translated layer — and that is also why no cell sizes its row:
 * the grid's cell size is the caller's (`cellWidth`, `rowHeight`, `gap`,
 * `columns`) and its frame is arithmetic over them (`motion-grid/logic.ts`).
 *
 * A cell's key is its `id`, so an appended cell mounts on its own — it fades in
 * where its slot is — while the cells around it travel; a removed one does not
 * remount the rest. The frame's own height is a motion target too, so a grid
 * that gains a row grows with the cells instead of jumping a row ahead of them.
 *
 * `MotionProvider preference="reduced"` paints every target in the frame it
 * changes: a reorder is an assignment rather than a journey, and a newly mounted
 * cell is already opaque.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import type { MotionLevel } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { useMotionPreference, useSurfaceTiming } from "./internal/presence.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import {
  motionGridHeight,
  motionGridLayout,
  motionGridRows,
  motionGridSlot,
  motionGridWidth,
} from "./motion-grid/logic.js";

/** One cell: an identity and the node it paints. */
export interface MotionGridItem {
  /**
   * The cell's key, so a reordered cell keeps its element (and therefore tweens
   * from where it was). Two cells sharing an id cannot both animate.
   */
  readonly id: string;
  /** The cell's content. It is given the slot's box; the grid paints nothing. */
  readonly content: ReactNode;
}

/** What a grid draws at one frame. */
export interface MotionGridState {
  /** The cells on screen. */
  readonly count: number;
  /** The columns the frame reserves, whether or not the last row is full. */
  readonly columns: number;
  /** The rows the cells need. */
  readonly rows: number;
  readonly reducedMotion: boolean;
}

/** {@link MotionGrid} props. */
export interface MotionGridProps extends Omit<Props, "children" | "style"> {
  /** The cells, in reading order. A cell's key is its `id`. */
  readonly items: ReadonlyArray<MotionGridItem>;
  /** Columns across the frame. Default `3`; floored and at least `1`. */
  readonly columns?: number;
  /** The painted width of one cell, in pixels. Default `160`. */
  readonly cellWidth?: number;
  /** The painted height of one row, in pixels. Default `120`. */
  readonly rowHeight?: number;
  /** The gap between two columns and between two rows, in pixels. Default `12`. */
  readonly gap?: number;
  /** The reorder's duration. Default `"normal"` (200 ms). */
  readonly level?: MotionLevel;
  /**
   * The frame's accessible name. Omit it and the grid publishes no node: a
   * layout grouping is not worth a stop in the accessibility tree, and the
   * cells' own content keeps its names.
   */
  readonly label?: string;
  /** A Tailwind class string for the frame, joined after the resting style. */
  readonly className?: string;
  /** A style for the frame, or a function of the grid. */
  readonly style?: StateStyle<MotionGridState>;
}

/**
 * A grid that tweens its cells between slots.
 *
 * The frame owns the geometry; a cell owns only its content. A caller that needs
 * a cell to look different paints it inside `content` — the cell wrapper is a
 * transparent box with no radius and no clip, so a card's shadow is not cut off
 * at the slot's edge.
 */
export const MotionGrid = ({
  items,
  columns,
  cellWidth,
  rowHeight,
  gap,
  level = "normal",
  label,
  className,
  style,
  ...rest
}: MotionGridProps) => {
  const theme = useTheme();
  const preference = useMotionPreference();
  const timing = useSurfaceTiming(level).enter;
  const layout = motionGridLayout({
    columns: Option.fromNullishOr(columns),
    cellWidth: Option.fromNullishOr(cellWidth),
    rowHeight: Option.fromNullishOr(rowHeight),
    gap: Option.fromNullishOr(gap),
  });
  const count = Arr.length(items);
  const rows = motionGridRows(count, layout.columns);
  const reduced = preference === "reduced";
  const state: MotionGridState = {
    count,
    columns: layout.columns,
    rows,
    reducedMotion: reduced,
  };

  return (
    <div
      {...rest}
      {...(label === undefined ? {} : { role: "group", "aria-label": label })}
      motion={{
        // The frame is painted at its height on mount, and retargets from the
        // height on screen when a reorder needs another row.
        initial: false,
        animate: { height: motionGridHeight(layout, rows) },
        transition: timing,
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          position: "relative",
          width: motionGridWidth(layout),
        }),
        resolveStyle(style, state),
      )}
    >
      {items.map((item, index) => {
        const slot = motionGridSlot(layout, index);
        return (
          <div
            key={item.id}
            testId={`motion-grid-cell-${item.id}`}
            motion={{
              // A mounted cell fades in where its slot is; a cell already on
              // screen retargets from its own box, which is the reorder.
              initial: reduced ? false : { opacity: 0 },
              animate: { opacity: 1, left: slot.left, top: slot.top },
              transition: timing,
            }}
            style={{
              position: "absolute",
              width: slot.width,
              height: slot.height,
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 600). */
export const motionGridMeta = {
  name: "Motion grid",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no cell sizes its row: every cell is absolutely positioned so its inset can be tweened, so the caller names cellWidth and rowHeight instead of the content measuring",
    "a reorder moves a cell's left/top inset, not a transform: the runtime has no transform (upstream issue #102), so there is no scale or rotate on the way",
    "a cell's key is its id, so two cells sharing an id cannot both animate",
    "the wrapper paints nothing and clips nothing, because a caller's card or shadow owns its own look",
  ],
  docs: "docs/motion-grid.mdx",
  example: "examples/motion-grid.example.tsx",
  testFile: "src/behaviour/motion-grid.test.tsx",
} as const;
