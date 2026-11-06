import { Virtualizer } from "@tanstack/virtual-core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const DEFAULT_OVERDRAW = 4;

export const DEFAULT_ROW_HEIGHT = 37;

export interface VirtualWindow {
  readonly start: number;
  readonly end: number;
}

export interface WindowSpec {
  readonly count: number;

  readonly rowHeight: number;

  readonly viewportHeight: number;

  readonly overdraw?: number;
}

export interface WindowCalculator {
  readonly indicesAt: (scrollOffset: number) => ReadonlyArray<number>;

  readonly at: (scrollOffset: number) => VirtualWindow;

  readonly around: (index: number) => VirtualWindow;
}

export const rowHeightOf = (
  height: number | undefined,
  fallback: number = DEFAULT_ROW_HEIGHT,
): number =>
  height !== undefined && Number.isFinite(height) && height > 0
    ? height
    : fallback;

const viewportOf = (spec: WindowSpec): number =>
  Number.isFinite(spec.viewportHeight) && spec.viewportHeight > 0
    ? spec.viewportHeight
    : rowHeightOf(spec.rowHeight);

export const overdrawRows = (overdraw: number | undefined): number =>
  overdraw === undefined || !Number.isFinite(overdraw)
    ? DEFAULT_OVERDRAW
    : Math.max(0, Math.floor(overdraw));

export const rowCount = (count: number): number =>
  Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

export const maxScrollOffset = (spec: WindowSpec): number =>
  Math.max(
    0,
    rowCount(spec.count) * rowHeightOf(spec.rowHeight) - viewportOf(spec),
  );

export const clampScrollOffset = (
  spec: WindowSpec,
  scrollOffset: number,
): number => {
  const offset = Number.isFinite(scrollOffset) ? Math.max(0, scrollOffset) : 0;
  return Math.min(offset, maxScrollOffset(spec));
};

export const createWindowCalculator = (spec: WindowSpec): WindowCalculator => {
  const rowHeight = rowHeightOf(spec.rowHeight);
  const virtualizer = new Virtualizer<never, never>({
    count: rowCount(spec.count),
    estimateSize: () => rowHeight,
    getScrollElement: () => null,
    observeElementRect: () => undefined,
    observeElementOffset: () => undefined,
    scrollToFn: () => undefined,
    overscan: overdrawRows(spec.overdraw),
  });

  const indicesAt = (scrollOffset: number): ReadonlyArray<number> => {
    virtualizer.scrollRect = { width: 0, height: viewportOf(spec) };
    virtualizer.scrollOffset = clampScrollOffset(spec, scrollOffset);
    return Arr.filter(
      virtualizer.getVirtualIndexes(),
      (index) => index >= 0 && index < rowCount(spec.count),
    );
  };

  const at = (scrollOffset: number): VirtualWindow => {
    const indices = indicesAt(scrollOffset);
    const first = Option.getOrUndefined(Arr.head(indices));
    const last = Option.getOrUndefined(Arr.last(indices));
    return first === undefined || last === undefined
      ? { start: 0, end: 0 }
      : { start: first, end: last + 1 };
  };

  return {
    indicesAt,
    at,
    around: (index) => at(rowIndex(index) * rowHeight),
  };
};

export const rowIndex = (index: number): number =>
  Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;

export const anchorOffset = (
  anchor: Option.Option<ReadonlyArray<number>>,
  rowHeight: number,
): Option.Option<number> =>
  Option.flatMap(anchor, (values) => {
    const index = values[0];
    const offsetInItem = values[1];
    if (index === undefined || offsetInItem === undefined) return Option.none();
    const into = Number.isFinite(offsetInItem) ? Math.max(0, offsetInItem) : 0;
    return Option.some(rowIndex(index) * rowHeightOf(rowHeight) + into);
  });
