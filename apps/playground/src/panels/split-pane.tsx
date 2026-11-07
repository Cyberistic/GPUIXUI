import { useRef, useState, type ReactNode } from "react";
import * as Option from "effect/Option";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { isResizeKey, keySize, nextSize } from "./resize.js";

export const SPLIT_DIVIDER_WIDTH = 6;

export const SPLIT_KEYBOARD_STEP = 16;

interface Press {
  readonly x: number;
  readonly size: number;
}

export interface SplitPaneProps {
  readonly id: string;
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
  readonly initial: number;

  readonly size?: number;
  readonly min: number;
  readonly max: number;

  readonly step?: number;

  readonly label?: string;

  readonly onResize?: (size: number) => void;
}

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
