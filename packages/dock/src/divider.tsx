import { useRef, useState, type ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { motionTiming } from "@gpuixui/motion/timing";
import { controlFocusRing } from "./theme.js";
import { DIVIDER, mergeStyle, recipeStyle } from "./recipe.js";
import { DIVIDER_WIDTH, isDividerKey, type DividerKey } from "./logic.js";
import { useTheme } from "./theme.js";

export interface DividerProps {
  readonly orientation: "horizontal" | "vertical";

  readonly valueText: string;

  readonly label?: string;
  readonly disabled?: boolean;

  readonly seam?: boolean;

  readonly testId?: string;

  readonly onDragStart: () => void;

  readonly onDragDelta: (delta: number) => void;

  readonly onDragEnd?: () => void;

  readonly onKey: (key: DividerKey) => void;
}

export const Divider = ({
  orientation,
  valueText,
  label,
  disabled,
  seam = false,
  testId,
  onDragStart,
  onDragDelta,
  onDragEnd,
  onKey,
}: DividerProps): ReactElement => {
  const theme = useTheme();
  const origin = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const axis = (event: EventPayload): number =>
    orientation === "horizontal" ? (event.x ?? 0) : (event.y ?? 0);

  const geometry: StyleDesc =
    orientation === "horizontal"
      ? { width: DIVIDER_WIDTH, cursor: "col-resize" }
      : { height: DIVIDER_WIDTH, cursor: "row-resize" };

  const placement: StyleDesc = seam
    ? { position: "absolute", top: 0, right: 0, bottom: 0 }
    : mergeStyle(mergeStyle(recipeStyle(DIVIDER, theme), geometry), {
        flexShrink: 0,
        flexGrow: 0,
        position: "relative",
      });
  const style = mergeStyle(
    mergeStyle(placement, geometry),
    controlFocusRing(theme, { disabled }),
  );

  const highlight: StyleDesc = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.primary,
    pointerEvents: "none",
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-valuetext={valueText}
      tabIndex={disabled === true ? undefined : 0}
      testId={testId}
      style={style}
      onMouseDown={(event) => {
        if (disabled === true) return;
        origin.current = axis(event);
        setDragging(true);
        onDragStart();
      }}
      onMouseMove={(event) => {
        if (disabled === true || origin.current === null) return;
        if (event.pressedButton !== 0) {
          origin.current = null;
          setDragging(false);
          onDragEnd?.();
          return;
        }
        onDragDelta(axis(event) - origin.current);
      }}
      onMouseUp={() => {
        if (origin.current === null) return;
        origin.current = null;
        setDragging(false);
        onDragEnd?.();
      }}
      onKeyDown={(event) => {
        if (disabled === true) return;
        const key = event.key;
        if (key !== undefined && isDividerKey(key)) onKey(key);
      }}
    >
      {seam ? null : (
        <div
          style={highlight}
          motion={{
            animate: { opacity: dragging ? 1 : 0 },
            transition: motionTiming("fast", { phase: "enter" }),
          }}
        />
      )}
    </div>
  );
};
