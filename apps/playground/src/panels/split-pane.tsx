/**
 * A two-pane split with a draggable divider, horizontal or vertical.
 *
 * Pointer capture is the whole trick: GPUI arms capture on the pressed element
 * for the left button, so a drag that leaves the 6px divider keeps sending
 * `onMouseMove` to it. The pane size is `nextSize(start, delta)` clamped to the
 * caller's bounds.
 *
 * The divider is also a keyboard control — `role="separator"`, `tabIndex={0}`,
 * arrows/Home/End — because a splitter that only resizes under a mouse is not a
 * panel primitive. GPUix 0.10.0 has no `aria-valuenow` and no
 * `aria-orientation`, so the size rides on `aria-valuetext` and the orientation
 * is only in the role's label.
 *
 * `max` is a prop, not measured at runtime: GPUix 0.10.0 has no `onLayout`
 * event, so the total width cannot be observed from the tree (see the app
 * README). The app knows its window width and passes it.
 */
import { useState, type ReactNode } from "react";
import { Match } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { nextSize } from "./resize.js";

/** Which axis the pane is sized on and the divider is dragged along. */
export type SplitOrientation = "horizontal" | "vertical";

/** A drag in progress: the pointer coordinate and pane size at button down. */
interface Press {
  readonly pointer: number;
  readonly size: number;
}

/** @internal */
export interface SplitPaneProps {
  /** Prefix for the generated `testId`s: `${id}-pane-a`, `${id}-divider`, `${id}-pane-b`. */
  readonly id: string;
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
  readonly initial: number;
  readonly min: number;
  readonly max: number;
  /** Called with each clamped size, so a scenario can read the split state. */
  readonly onResize?: (size: number) => void;
  /** Defaults to `"horizontal"` (a column of panes side by side). */
  readonly orientation?: SplitOrientation;
  /** Keyboard resize step in pixels. Defaults to 16. */
  readonly step?: number;
  /** Accessible name for the divider. */
  readonly label?: string;
}

/** The keyboard delta for a key, or `None` for a key this control ignores. */
const keyDelta = (
  key: string | undefined,
  step: number,
): Option.Option<number> =>
  Match.value(key).pipe(
    Match.when("left", () => Option.some(-step)),
    Match.when("up", () => Option.some(-step)),
    Match.when("right", () => Option.some(step)),
    Match.when("down", () => Option.some(step)),
    Match.orElse(() => Option.none()),
  );

/** Two panes and the divider between them. */
export const SplitPane = ({
  id,
  primary,
  secondary,
  initial,
  min,
  max,
  onResize,
  orientation = "horizontal",
  step = 16,
  label = "Resize panels",
}: SplitPaneProps) => {
  const theme = useTheme();
  const vertical = orientation === "vertical";
  const [size, setSize] = useState(initial);
  const [press, setPress] = useState<Option.Option<Press>>(Option.none());

  const resize = (next: number) => {
    setSize(next);
    onResize?.(next);
  };

  /** A click-drag step; the pointer may be outside the divider thanks to capture. */
  const drag = (event: { x?: number; y?: number }) => {
    Option.match(press, {
      onNone: () => {},
      onSome: (start) =>
        resize(
          nextSize({
            start: start.size,
            pointerDelta:
              (vertical ? (event.y ?? 0) : (event.x ?? 0)) - start.pointer,
            min,
            max,
          }),
        ),
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div
        testId={`${id}-pane-a`}
        style={
          vertical
            ? {
                height: size,
                flexShrink: 0,
                minHeight: 0,
                overflow: "hidden",
              }
            : { width: size, flexShrink: 0, minWidth: 0, overflow: "hidden" }
        }
      >
        {primary}
      </div>
      <div
        testId={`${id}-divider`}
        aria-id={`${id}-divider`}
        aria-label={label}
        aria-valuetext={`${size}px`}
        role="separator"
        style={{
          ...(vertical
            ? { height: 6, width: "100%" }
            : { width: 6, height: "100%" }),
          flexShrink: 0,
          cursor: vertical ? "row-resize" : "col-resize",
          backgroundColor: theme.colors.border,
          hover: { backgroundColor: theme.colors.primary },
        }}
        onMouseDown={(event) =>
          setPress(
            Option.some({
              pointer: vertical ? (event.y ?? 0) : (event.x ?? 0),
              size,
            }),
          )
        }
        onMouseMove={drag}
        onMouseUp={() => setPress(Option.none())}
        onKeyDown={(event) =>
          Match.value(event.key).pipe(
            Match.when("home", () => resize(min)),
            Match.when("end", () => resize(max)),
            Match.orElse((key) =>
              Option.match(keyDelta(key, step), {
                onNone: () => {},
                onSome: (delta) =>
                  resize(
                    nextSize({ start: size, pointerDelta: delta, min, max }),
                  ),
              }),
            ),
          )
        }
      />
      <div
        testId={`${id}-pane-b`}
        style={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {secondary}
      </div>
    </div>
  );
};
