/**
 * The window state a virtualized table holds.
 *
 * This is the app-side half of `<virtual-list>`'s `itemCount` mode: the runtime
 * paints the children it is given and positions them from `windowStart`, so the
 * app owns the window (`virtual-list-windowed`). The hook keeps the scroll
 * offset the window is computed from, moves the window when the runtime's
 * scroll anchor says it must, and answers a reveal with the window that must
 * commit before the scroll.
 *
 * The window itself is `@tanstack/virtual-core`'s arithmetic (see
 * {@link createWindowCalculator}); this hook is the state around it. A consumer
 * driving the window from Effect or a store calls the calculator directly.
 */

import * as Option from "effect/Option";
import { useCallback, useMemo, useState } from "react";
import {
  clampScrollOffset,
  createWindowCalculator,
  type VirtualWindow,
  type WindowSpec,
} from "./window.js";

/**
 * A reveal request.
 *
 * The object's identity is the request: a second reveal of the same row is a
 * new object, so a repeated press moves the window again.
 */
export interface VirtualReveal {
  readonly index: number;
}

/** {@link useVirtualRows} options. */
export interface UseVirtualRowsOptions extends WindowSpec {
  /** The scroll offset the window starts at, in pixels. Defaults to `0`. */
  readonly initialOffset?: number;
  /** A reveal to perform in this render, before the caller scrolls. */
  readonly reveal?: VirtualReveal;
}

/** The window a table body reads. */
export interface VirtualRowsController {
  /** The mounted window, in absolute row indices. */
  readonly window: VirtualWindow;
  /** The clamped first mounted row — the list's `windowStart`. */
  readonly windowStart: number;
  /** Every mounted absolute index, in paint order. */
  readonly mounted: ReadonlyArray<number>;
  /** The rows a scroll offset would mount — the window a scroll is about to take. */
  readonly mountedAt: (offset: number) => ReadonlyArray<number>;
  /** The scroll offset the window is computed from, in pixels. */
  readonly scrollOffset: number;
  /** Move the window to the offset the runtime's scroll anchor reports. */
  readonly setScrollOffset: (offset: number) => void;
  /**
   * Move the window to a row and report the row the caller must scroll to.
   *
   * The state change commits with this render; the caller scrolls in a layout
   * effect afterwards, which is the order the runtime needs.
   */
  readonly reveal: (index: number) => VirtualWindow;
  /**
   * The row a reveal asked for, until the caller has scrolled to it.
   *
   * `VirtualTableBody` consumes it; a controlled grid scrolls and clears it.
   */
  readonly scrollTarget: Option.Option<number>;
  readonly consumeScrollTarget: () => void;
}

/**
 * Hold a windowed table's mounted range.
 *
 * `reveal` performs a render-phase update — the documented way to adjust state
 * from a prop — so the window and the request commit in the same paint, and the
 * caller's layout effect scrolls after that commit.
 */
export const useVirtualRows = ({
  count,
  rowHeight,
  viewportHeight,
  overdraw,
  initialOffset,
  reveal,
}: UseVirtualRowsOptions): VirtualRowsController => {
  const calculator = useMemo(
    () =>
      createWindowCalculator({ count, rowHeight, viewportHeight, overdraw }),
    [count, rowHeight, viewportHeight, overdraw],
  );
  const [scrollOffset, setScrollOffset] = useState(initialOffset ?? 0);
  const [lastReveal, setLastReveal] = useState<VirtualReveal | undefined>(
    undefined,
  );
  const [scrollTarget, setScrollTarget] = useState<Option.Option<number>>(
    Option.none(),
  );

  const spec = { count, rowHeight, viewportHeight, overdraw };
  const offset = clampScrollOffset(spec, scrollOffset);
  // A narrowed set makes the offset the reader left unreachable. The runtime
  // clamps its own scroll to the new content, so the window commits that clamp
  // in this render rather than holding rows the set no longer has.
  if (offset !== scrollOffset) setScrollOffset(offset);

  const window = calculator.at(offset);
  const mounted = calculator.indicesAt(offset);

  const revealTo = useCallback(
    (index: number) => {
      const target = calculator.around(index);
      // The window moves to the row's own position, so the scroll that follows
      // lands on the offset the window was computed from.
      setScrollOffset(Math.max(0, Math.floor(index)) * rowHeight);
      return target;
    },
    [calculator, rowHeight],
  );

  if (reveal !== undefined && reveal !== lastReveal) {
    setLastReveal(reveal);
    revealTo(reveal.index);
    setScrollTarget(Option.some(reveal.index));
  }

  return {
    window,
    windowStart: window.start,
    mounted,
    mountedAt: calculator.indicesAt,
    scrollOffset: offset,
    setScrollOffset,
    reveal: revealTo,
    scrollTarget,
    consumeScrollTarget: useCallback(() => setScrollTarget(Option.none()), []),
  };
};
