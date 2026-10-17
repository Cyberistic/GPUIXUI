/**
 * A two-pane horizontal split with a draggable divider.
 *
 * Pointer capture is the whole trick: GPUI arms capture on the pressed element
 * for the left button, so a drag that leaves the 6px divider keeps sending
 * `onMouseMove` to it. The pane width is `nextSize(start, delta)` clamped to the
 * caller's bounds.
 *
 * `max` is a prop, not measured at runtime: GPUix 0.10.0 has no `onLayout`
 * event, so the total width cannot be observed from the tree (see the app
 * README). The app knows its window width and passes it.
 */
import { useState, type ReactNode } from "react";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { nextSize } from "./resize.js";

/** A drag in progress: the pointer x and pane width when the button went down. */
interface Press {
  readonly x: number;
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
  /** Called with each clamped width, so a scenario can read the split state. */
  readonly onResize?: (size: number) => void;
}

/** Two panes and the divider between them. */
export const SplitPane = ({
  id,
  primary,
  secondary,
  initial,
  min,
  max,
  onResize,
}: SplitPaneProps) => {
  const theme = useTheme();
  const [size, setSize] = useState(initial);
  const [press, setPress] = useState<Option.Option<Press>>(Option.none());

  const resize = (next: number) => {
    setSize(next);
    onResize?.(next);
  };

  return (
    <div
      style={{ display: "flex", width: "100%", height: "100%", minHeight: 0 }}
    >
      <div
        testId={`${id}-pane-a`}
        style={{ width: size, flexShrink: 0, minWidth: 0, overflow: "hidden" }}
      >
        {primary}
      </div>
      <div
        testId={`${id}-divider`}
        style={{
          width: 6,
          flexShrink: 0,
          cursor: "col-resize",
          backgroundColor: theme.colors.border,
          hover: { backgroundColor: theme.colors.primary },
        }}
        onMouseDown={(event) =>
          setPress(Option.some({ x: event.x ?? 0, size }))
        }
        onMouseMove={(event) =>
          Option.match(press, {
            onNone: () => {},
            onSome: (start) =>
              resize(
                nextSize({
                  start: start.size,
                  pointerDelta: (event.x ?? 0) - start.x,
                  min,
                  max,
                }),
              ),
          })
        }
        onMouseUp={() => setPress(Option.none())}
      />
      <div
        testId={`${id}-pane-b`}
        style={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}
      >
        {secondary}
      </div>
    </div>
  );
};
