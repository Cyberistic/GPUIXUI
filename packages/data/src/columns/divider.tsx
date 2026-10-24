/** @jsxImportSource @gpuix/react */
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
 * - **A move that holds no primary button ends the gesture.** The runtime
 *   reports the button a move holds (`pressedButton`, `0` for the primary one),
 *   and a window the pointer left never hears the release: the strip would stay
 *   armed and the reader's **next hover** over it would resize the column by
 *   however far the pointer travelled. The rule is the dock divider's
 *   (`packages/dock/src/divider.tsx`).
 *
 * It is positioned inside its header cell at the cell's right edge, so the
 * body's tracks do not need a spacer column to stay aligned. A control that
 * paints a fill is where GPUI's hit test stops, which is what makes the strip
 * pressable at all; `pointerEvents: "none"` would hand the press back to the
 * sort button underneath.
 *
 * It is a control, not a decoration: it is a tab stop, the arrows step it, Home
 * and End name its bounds, and `aria-valuetext` announces the width because
 * 0.11.0 has no `aria-valuenow`. One number drives all three: the width read
 * through the column's own bounds. A width the track cannot measure (`NaN`) is
 * the column's floor, and a width outside the bounds is the bound itself — the
 * number the announcement names is the one a drag starts from and the one the
 * arrows step from, so a consumer that does not clamp still resizes by a step
 * rather than landing back on the bound it was already shown.
 *
 * Its **name** is content the same way: a blank label reads as
 * {@link DEFAULT_RESIZE_LABEL}, and a name that says which column is composed
 * from the column's own words (`columnName(column.label, column.id)`), the
 * reading the header and the menu share.
 *
 * Only the **primary** button arms the drag: the runtime delivers `mouseDown`
 * for all three buttons while `onClick` is the primary one's, so a right press —
 * the context-menu gesture — and a middle press would otherwise start a resize
 * the caller never saw. The rule is the primitives' `primaryButton`.
 */

import type { EventPayload } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { primaryButton, spokenText } from "@gpuixui/primitives/core";
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
  readableWidth,
  resizeWidthByKey,
  widthBounds,
} from "./logic.js";

/** Where a drag started: the pointer's `x` and the width at that press. */
interface ResizePress {
  readonly x: number;
  readonly width: number;
}

/**
 * The divider's name when the caller hands over no words.
 *
 * A name is copy before it is a literal: a locale table missing its row and a
 * saved label both answer `""`, and a default written in the destructuring only
 * covers an **absent** prop. Without the reading the one control that resizes a
 * column was a nameless `separator` tab stop (measured: the tree held a
 * `Splitter` with no label) while its width stayed announced.
 */
export const DEFAULT_RESIZE_LABEL = "Resize column";

/** {@link TableColumnDivider} props. */
export interface TableColumnDividerProps {
  /**
   * The column's current width, in pixels.
   *
   * The announcement, a drag's starting width and an arrow's step all read it
   * through the column's bounds: a width the divider cannot measure (`NaN`)
   * reads as the floor, and one outside the bounds as the bound, so a consumer
   * that does not clamp still steps.
   */
  readonly width: number;
  /** The narrowest width the drag may reach. Defaults to 80. */
  readonly minWidth?: number;
  /** The widest width the drag may reach. Defaults to 640. */
  readonly maxWidth?: number;
  /** Receives every width the gesture produces, already clamped. */
  readonly onResize: (width: number) => void;
  /**
   * The divider's accessible name, e.g. `Resize the name column`.
   *
   * A blank name reads as {@link DEFAULT_RESIZE_LABEL}, because a default only
   * covers an absent prop.
   */
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
  // The width the divider can read: a computed `NaN` is announced and dragged
  // from as the column's floor, the number its keys already step from.
  const track = clampWidth(readableWidth(width, bounds), bounds);
  const name = spokenText(Option.fromNullishOr(label), DEFAULT_RESIZE_LABEL);
  const press = useRef<Option.Option<ResizePress>>(Option.none());

  return (
    <div
      testId={testId}
      role="separator"
      aria-label={name}
      aria-valuetext={`${track} pixels`}
      tabIndex={0}
      style={mergeStyles(
        recipeStyle(cn(TABLE_COLUMN_DIVIDER, className), theme),
        {
          cursor: "col-resize",
          ...controlFocusRing(theme),
        },
      )}
      onMouseDown={(event: EventPayload) => {
        if (!primaryButton(event)) return;
        press.current = Option.some({ x: event.x ?? 0, width: track });
      }}
      onMouseMove={(event: EventPayload) =>
        Option.match(press.current, {
          // A move that reports no held primary button is not part of the
          // gesture: the window lost the release (the pointer left it), and a
          // hover must never resize the column.
          onNone: () => {},
          onSome: (start) => {
            if (event.pressedButton !== 0) {
              press.current = Option.none();
              return;
            }
            onResize(
              clampWidth(start.width + (event.x ?? 0) - start.x, bounds),
            );
          },
        })
      }
      onMouseUp={() => {
        press.current = Option.none();
      }}
      onKeyDown={(event: EventPayload) => {
        if (isColumnResizeKey(event.key)) {
          // The same number the divider announces and a drag starts from: a
          // consumer that does not clamp hands over a width past its own
          // bounds, and stepping from it would clamp every press back to the
          // bound the reader is already standing on.
          onResize(resizeWidthByKey(track, event.key, bounds, step));
        }
      }}
    />
  );
};
