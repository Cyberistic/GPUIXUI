/**
 * The height a bounded surface paints for itself.
 *
 * A windowed table, a windowed tree and the frozen composition all take a
 * definite viewport height from their caller, or measure the frame they sit in.
 * When neither can paint, the caller's layout owns the box — and each surface
 * still needs the number it took: the window mounts only the overdraw against
 * `0`, and a frozen composition hands `0` to both row scrollers
 * (`behaviour/paintable-height.test.tsx`).
 *
 * The box's own `onLayout` reports the painted height, so the surface reads
 * back the box its layout gave it. A height the layout cannot paint is not a
 * measurement (`paintableSize`), and a caller's own `onLayout` still receives
 * every event.
 */

import type { EventPayload, StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { useCallback, useState } from "react";
import { paintableSize } from "./size.js";

/** What {@link usePaintedHeight} reads and reports. */
export interface PaintedHeight {
  /** The height the box painted, once a layout event carried one. */
  readonly measured: Option.Option<number>;
  /** Reports the box's height and forwards the caller's own handler. */
  readonly onLayout: (event: EventPayload) => void;
}

/** The height a surface's own box painted. */
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
 * The box a surface takes when no height can paint.
 *
 * A windowed surface has no natural height: its rows are a window over a set it
 * does not paint, so a content-sized box would report a height, mount more rows
 * and grow again. The frozen composition has the same problem from the other
 * side — two scrollers have no height of their own. Basis `0` and a zero
 * minimum give the box the share of the pane its layout hands out instead of
 * its content, which is what makes the measured height stable. A caller's
 * `style` is merged after this, so an explicit size still wins.
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
