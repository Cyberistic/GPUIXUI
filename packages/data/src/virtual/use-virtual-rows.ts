import * as Option from "effect/Option";
import { useCallback, useMemo, useState } from "react";
import {
  clampScrollOffset,
  createWindowCalculator,
  rowCount,
  rowHeightOf,
  rowIndex,
  type VirtualWindow,
  type WindowSpec,
} from "./window.js";

export interface VirtualReveal {
  readonly index: number;
}

export interface UseVirtualRowsOptions extends WindowSpec {
  readonly initialOffset?: number;

  readonly reveal?: VirtualReveal;
}

export interface VirtualRowsController {
  readonly window: VirtualWindow;

  readonly windowStart: number;

  readonly mounted: ReadonlyArray<number>;

  readonly mountedAt: (offset: number) => ReadonlyArray<number>;

  readonly scrollOffset: number;

  readonly setScrollOffset: (offset: number) => void;

  readonly reveal: (index: number) => VirtualWindow;

  readonly scrollTarget: Option.Option<number>;
  readonly consumeScrollTarget: () => void;
}

export const useVirtualRows = ({
  count,
  rowHeight,
  viewportHeight,
  overdraw,
  initialOffset,
  reveal,
}: UseVirtualRowsOptions): VirtualRowsController => {
  const height = rowHeightOf(rowHeight);
  const calculator = useMemo(
    () =>
      createWindowCalculator({
        count,
        rowHeight: height,
        viewportHeight,
        overdraw,
      }),
    [count, height, viewportHeight, overdraw],
  );
  const [scrollOffset, setScrollOffset] = useState(initialOffset ?? 0);
  const [lastReveal, setLastReveal] = useState<VirtualReveal | undefined>(
    undefined,
  );
  const [scrollTarget, setScrollTarget] = useState<Option.Option<number>>(
    Option.none(),
  );

  const spec = { count, rowHeight: height, viewportHeight, overdraw };
  const offset = clampScrollOffset(spec, scrollOffset);

  if (offset !== scrollOffset) setScrollOffset(offset);

  const window = calculator.at(offset);
  const mounted = calculator.indicesAt(offset);

  const revealTo = useCallback(
    (index: number) => {
      const target = calculator.around(index);

      setScrollOffset(rowIndex(index) * height);
      return target;
    },
    [calculator, height],
  );

  if (reveal !== undefined && reveal !== lastReveal) {
    setLastReveal(reveal);
    revealTo(reveal.index);

    const row = Math.min(rowCount(count) - 1, rowIndex(reveal.index));
    if (row >= 0) setScrollTarget(Option.some(row));
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
