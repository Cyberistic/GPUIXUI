/**
 * A two-pane horizontal split with a draggable, keyboard-operable divider.
 *
 * Pointer capture is the whole trick for the pointer path: GPUI arms capture on
 * the pressed element for the left button, so a drag that leaves the 6px divider
 * keeps sending `onMouseMove` to it. The pane width is `nextSize(start, delta)`
 * clamped to the caller's bounds.
 *
 * The press is a **ref**, not state. A window's automation delivers the press and
 * every move before React commits the press's render, so a drag gated on state
 * reads no press on the first move and the pane never follows — the same rule the
 * `drag-between-panes` probe measured.
 *
 * The divider is a control, so it is also a tab stop with a `role="separator"`:
 * arrows move it a `step` and Home/End jump to the bounds (`keySize`), it
 * announces its width through `aria-valuetext` (the runtime has no
 * `aria-valuenow`), and it declares the keyboard ring at rest so the runtime
 * paints it when Tab arrives. A pointer-only splitter fails WCAG 2.1.1.
 *
 * `size` makes the width the caller's: a layout that collapses a sidebar to zero
 * or restores a saved arrangement cannot reach internal state, so it passes the
 * width and takes every change through `onResize`. Without it the split owns the
 * width and `initial` is the starting point.
 *
 * `max` is a prop, not measured: the split's container is the caller's layout,
 * so the caller passes the width it must not exceed.
 */
import { useRef, useState, type ReactNode } from "react";
import * as Option from "effect/Option";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { isResizeKey, keySize, nextSize } from "./resize.js";

/** The divider's width, so a probe that measures the gap reads the same number. */
export const SPLIT_DIVIDER_WIDTH = 6;

/** Pixels one arrow press moves the divider unless the caller says otherwise. */
export const SPLIT_KEYBOARD_STEP = 16;

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
  /** The width when the caller owns it; omit to let the split own it. */
  readonly size?: number;
  readonly min: number;
  readonly max: number;
  /** Pixels one arrow press moves the divider. */
  readonly step?: number;
  /** The divider's accessible name. */
  readonly label?: string;
  /** Called with each clamped width, so a scenario can read the split state. */
  readonly onResize?: (size: number) => void;
}

/** Two panes and the divider between them. */
export const SplitPane = ({
  id,
  primary,
  secondary,
  initial,
  size: sizeProp,
  min,
  max,
  step = SPLIT_KEYBOARD_STEP,
  label = "Resize panes",
  onResize,
}: SplitPaneProps) => {
  const theme = useTheme();
  const [owned, setOwned] = useState(initial);
  const press = useRef<Option.Option<Press>>(Option.none());
  const size = sizeProp ?? owned;

  const resize = (next: number) => {
    setOwned(next);
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
        role="separator"
        aria-label={label}
        aria-valuetext={`${size} pixels`}
        tabIndex={0}
        style={{
          width: SPLIT_DIVIDER_WIDTH,
          flexShrink: 0,
          cursor: "col-resize",
          backgroundColor: theme.colors.border,
          hover: { backgroundColor: theme.colors.primary },
          ...keyboardFocusRing(theme),
        }}
        onMouseDown={(event) =>
          (press.current = Option.some({ x: event.x ?? 0, size }))
        }
        onMouseMove={(event) =>
          Option.match(press.current, {
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
        onMouseUp={() => (press.current = Option.none())}
        onKeyDown={(event) => {
          const key = event.key;
          if (!isResizeKey(key)) return;
          event.preventDefault();
          resize(keySize({ size, key, step, min, max }));
        }}
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
