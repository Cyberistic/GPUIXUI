/**
 * The draggable, keyboard-operable divider between two panes.
 *
 * This is the one control the whole package builds on: `SplitPane` places one,
 * and `PanelGroup` and `DockLayout` place one between every adjacent pair. It
 * owns the measured runtime rules a divider must honour:
 *
 * - **pointer capture arms only on the pair** — the runtime captures the pointer
 *   for an element subscribed to both `onMouseDown` and `onMouseMove`
 *   (`pointer-capture`), so the divider declares both and keeps all of a drag's
 *   moves even 80 px outside its 6 px box (`split-pane-lifecycle`);
 * - **it is a control, not only a handle** — a `role="separator"` tab stop that
 *   declares the keyboard ring at rest, announces `aria-valuetext` (there is no
 *   `aria-valuenow` in 0.11.0), and answers the arrows and Home/End
 *   (`split-pane-lifecycle`, WCAG 2.1.1);
 * - **no `transform`** — the runtime has none (upstream issue #102), so the
 *   pressed feedback is an opacity fade of a highlight layer, timed by
 *   `@gpuixui/motion`, never a scaled or translated surface.
 *
 * The divider reports **deltas and keys**, never a size: the parent owns the
 * units (pixels for a split, fractions for a group) and the clamp, so one
 * gesture feeds a split and a dock without a second copy of the arithmetic.
 */

import { useRef, useState, type ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { motionTiming } from "@gpuixui/motion/timing";
import { controlFocusRing } from "./theme.js";
import { DIVIDER, mergeStyle, recipeStyle } from "./recipe.js";
import { DIVIDER_WIDTH, isDividerKey, type DividerKey } from "./logic.js";
import { useTheme } from "./theme.js";

export interface DividerProps {
  /** `"horizontal"` lays the panes left/right (a vertical divider, X axis). */
  readonly orientation: "horizontal" | "vertical";
  /** The size this divider announces, in the parent's units. */
  readonly valueText: string;
  /** The divider's accessible name. */
  readonly label?: string;
  readonly disabled?: boolean;
  /** Stable locator for automation. */
  readonly testId?: string;
  /** A press armed the capture; the parent records its starting size. */
  readonly onDragStart: () => void;
  /** A captured move, as a cumulative pixel delta from the press point. */
  readonly onDragDelta: (delta: number) => void;
  /** The pointer released (or left the box with no button). */
  readonly onDragEnd?: () => void;
  /** A divider key; the parent decides the step and the clamp. */
  readonly onKey: (key: DividerKey) => void;
}

/** The draggable, keyboard-operable divider between two panes. */
export const Divider = ({
  orientation,
  valueText,
  label,
  disabled,
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

  const style = mergeStyle(
    mergeStyle(mergeStyle(recipeStyle(DIVIDER, theme), geometry), {
      flexShrink: 0,
      flexGrow: 0,
      position: "relative",
    }),
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
      <div
        style={highlight}
        motion={{
          animate: { opacity: dragging ? 1 : 0 },
          transition: motionTiming("fast", { phase: "enter" }),
        }}
      />
    </div>
  );
};
