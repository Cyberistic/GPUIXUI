/**
 * The divider that resizes the column it ends.
 *
 * It is the drag `column-resize-lifecycle` measured in a window, and the three
 * facts that make it work are not decoration:
 *
 * - **The press is a ref.** A window delivers the press and every move before
 *   React commits the press's render, so the starting width cannot live in
 *   state.
 * - **It listens to `onMouseDown` and `onMouseMove`.** `@gpuix/native@0.11.0`
 *   arms pointer capture only for an element that declares both, so a divider
 *   with the move half alone hears one move of eight and never resizes.
 * - **The width is read at each press.** A second gesture starts from the width
 *   the first one ended at, not from the width at mount.
 *
 * It is positioned inside its header cell at the cell's right edge, so the
 * body's tracks do not need a spacer column to stay aligned. A control that
 * paints a fill is where GPUI's hit test stops, which is what makes the strip
 * pressable at all; `pointerEvents: "none"` would hand the press back to the
 * sort button underneath.
 *
 * It is a control, not a decoration: it is a tab stop, the arrows step it, Home
 * and End name its bounds, and `aria-valuetext` announces the width because
 * 0.11.0 has no `aria-valuenow`.
 */

import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useRef } from "react";
import { recipeStyle } from "../recipe.js";
import { TABLE_COLUMN_DIVIDER } from "../table/recipe.js";
import { controlFocusRing, useTheme } from "../theme.js";
import {
  COLUMN_KEY_STEP,
  clampWidth,
  isColumnResizeKey,
  resizeWidthByKey,
  widthBounds,
} from "./logic.js";

/** Where a drag started: the pointer's `x` and the width at that press. */
interface ResizePress {
  readonly x: number;
  readonly width: number;
}

/** {@link TableColumnDivider} props. */
export interface TableColumnDividerProps {
  /** The column's current width, in pixels. */
  readonly width: number;
  /** The narrowest width the drag may reach. Defaults to 80. */
  readonly minWidth?: number;
  /** The widest width the drag may reach. Defaults to 640. */
  readonly maxWidth?: number;
  /** Receives every width the gesture produces, already clamped. */
  readonly onResize: (width: number) => void;
  /** The divider's accessible name, e.g. `Resize the name column`. */
  readonly label: string;
  /** Pixels one arrow press moves the divider. Defaults to 16. */
  readonly step?: number;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/**
 * The divider's props minus the width a header part already owns.
 *
 * A sortable header cell knows its track width, so it forwards only the bounds
 * and the callback rather than repeating a number that could drift.
 */
export type TableColumnResizeProps = Omit<TableColumnDividerProps, "width">;

/**
 * A divider a pointer drags and a keyboard steps.
 *
 * Place it inside the header cell whose right edge it marks; the cell is
 * `position: "relative"`, so the strip sits on the track boundary without
 * adding a column to every row.
 */
export const TableColumnDivider = ({
  width,
  minWidth,
  maxWidth,
  onResize,
  label,
  step = COLUMN_KEY_STEP,
  className,
  testId,
}: TableColumnDividerProps) => {
  const theme = useTheme();
  const bounds = widthBounds(minWidth, maxWidth);
  const press = useRef<Option.Option<ResizePress>>(Option.none());

  return (
    <div
      testId={testId}
      role="separator"
      aria-label={label}
      aria-valuetext={`${width} pixels`}
      tabIndex={0}
      style={mergeStyles(
        recipeStyle(cn(TABLE_COLUMN_DIVIDER, className), theme),
        {
          cursor: "col-resize",
          ...controlFocusRing(theme),
        },
      )}
      onMouseDown={(event: EventPayload) => {
        press.current = Option.some({ x: event.x ?? 0, width });
      }}
      onMouseMove={(event: EventPayload) =>
        Option.match(press.current, {
          onNone: () => {},
          onSome: (start) =>
            onResize(
              clampWidth(start.width + (event.x ?? 0) - start.x, bounds),
            ),
        })
      }
      onMouseUp={() => {
        press.current = Option.none();
      }}
      onKeyDown={(event: EventPayload) => {
        if (isColumnResizeKey(event.key)) {
          onResize(resizeWidthByKey(width, event.key, bounds, step));
        }
      }}
    />
  );
};
