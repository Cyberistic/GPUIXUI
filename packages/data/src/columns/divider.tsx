/** @jsxImportSource @gpuix/react */
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

interface ResizePress {
  readonly x: number;
  readonly width: number;
}

export const DEFAULT_RESIZE_LABEL = "Resize column";

export interface TableColumnDividerProps {
  readonly width: number;

  readonly minWidth?: number;

  readonly maxWidth?: number;

  readonly onResize: (width: number) => void;

  readonly label: string;

  readonly step?: number;

  readonly className?: string;
  readonly testId?: string;
}

export type TableColumnResizeProps = Omit<TableColumnDividerProps, "width">;

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
          onResize(resizeWidthByKey(track, event.key, bounds, step));
        }
      }}
    />
  );
};
