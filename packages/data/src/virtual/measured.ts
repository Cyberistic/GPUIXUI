/**
 * The height a windowed surface paints for itself.
 *
 * A windowed table or tree takes a definite viewport height from its caller, or
 * measures the frame it sits in. When neither can paint, the caller's layout
 * owns the box — and the window still needs the number it took: handed `0`,
 * `useVirtualRows` mounts only the overdraw, so an unbound grid paints a
 * handful of rows in a pane that holds dozens (`paintable-height`).
 *
 * The list's own `onLayout` reports the painted height, so the window reads back
 * the box its layout gave it. A height the layout cannot paint is not a
 * measurement (`paintableSize`), and a caller's own `onLayout` still receives
 * every event.
 */

import type { EventPayload, StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { useCallback, useState } from "react";
import { paintableSize } from "../internal/size.js";

/** What {@link usePaintedHeight} reads and reports. */
export interface PaintedHeight {
  /** The height the box painted, once a layout event carried one. */
  readonly measured: Option.Option<number>;
  /** Reports the box's height and forwards the caller's own handler. */
  readonly onLayout: (event: EventPayload) => void;
}

/** The height a windowed surface's own box painted. */
export const usePaintedHeight = (
  onLayout: ((event: EventPayload) => void) | undefined,
): PaintedHeight => {
  const [measured, setMeasured] = useState<Option.Option<number>>(
    Option.none(),
  );
  const report = useCallback(
    (event: EventPayload) => {
      onLayout?.(event);
      Option.match(paintableSize(event.height), {
        onNone: () => {},
        onSome: (height) =>
          setMeasured((current) =>
            Option.contains(current, height) ? current : Option.some(height),
          ),
      });
    },
    [onLayout],
  );
  return { measured, onLayout: report };
};

/**
 * The box a windowed surface takes when no height can paint.
 *
 * A windowed surface has no natural height: its rows are a window over a set it
 * does not paint, so a content-sized box would report a height, mount more rows
 * and grow again. Basis `0` and a zero minimum give it the share of the pane its
 * layout hands out instead of its content, which is what makes the measured
 * height stable. A caller's `style` is merged after this, so an explicit size
 * still wins.
 *
 * It is a column as well as a flex item because the unbound tree measures this
 * box and puts its list inside it — the runtime's `<virtual-list>` paints no
 * surface and reports no `onLayout` of its own (measured on 0.11.0).
 */
export const paneFill: (height: Option.Option<number>) => StyleDesc =
  Option.match({
    onNone: () => ({
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minHeight: 0,
    }),
    onSome: () => ({}),
  });
