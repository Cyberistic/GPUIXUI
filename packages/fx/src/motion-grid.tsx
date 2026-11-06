/** @jsxImportSource @gpuix/react */
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
import {
  useMotionPreference,
  useSurfaceTiming,
  recipeStyle,
  nameOf,
  useTheme,
} from "@gpuixui/components/authoring";
import {
  motionGridHeight,
  itemsOf,
  motionGridLayout,
  motionGridRows,
  motionGridSlot,
  motionGridWidth,
} from "./motion-grid/logic.js";

export interface MotionGridItem {
  readonly id: string;

  readonly content: ReactNode;
}

export interface MotionGridState {
  readonly count: number;

  readonly columns: number;

  readonly rows: number;
  readonly reducedMotion: boolean;
}

export interface MotionGridProps extends Omit<Props, "children" | "style"> {
  readonly items: ReadonlyArray<MotionGridItem>;

  readonly columns?: number;

  readonly cellWidth?: number;

  readonly rowHeight?: number;

  readonly gap?: number;

  readonly level?: MotionLevel;

  readonly label?: string;

  readonly className?: string;

  readonly style?: StateStyle<MotionGridState>;
}

export const MotionGrid = ({
  items: storedItems,
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
  const items = itemsOf(storedItems);
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
  const gridName = nameOf(label);
  const state: MotionGridState = {
    count,
    columns: layout.columns,
    rows,
    reducedMotion: reduced,
  };

  return (
    <div
      {...rest}
      {...(gridName === undefined
        ? {}
        : { role: "group", "aria-label": gridName })}
      motion={{
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
