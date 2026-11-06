import {
  clampScrollOffset,
  rowCount,
  rowHeightOf,
  type VirtualWindow,
  type WindowSpec,
} from "@gpuixui/data/virtual/window";

export const rowsInView = (
  spec: WindowSpec,
  scrollOffset: number,
): VirtualWindow => {
  const count = rowCount(spec.count);
  const height = rowHeightOf(spec.rowHeight);
  const top = clampScrollOffset(spec, scrollOffset);
  return {
    start: Math.min(count, Math.floor(top / height)),
    end: Math.min(count, Math.ceil((top + spec.viewportHeight) / height)),
  };
};

export const viewReadout = (
  spec: WindowSpec,
  scrollOffset: number,
  mounted: number,
): string => {
  const view = rowsInView(spec, scrollOffset);
  return `${view.start + 1}–${view.end} in view · ${mounted} mounted of ${rowCount(
    spec.count,
  )}`;
};
