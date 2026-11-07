import type { MeasuredBox } from "../internal/measure.js";

export type TabBox = MeasuredBox;

export interface IndicatorBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export { measuredBox } from "../internal/measure.js";

export const indicatorBox = (
  origin: TabBox,
  selected: TabBox,
): IndicatorBox => ({
  left: selected.x - origin.x,
  top: selected.y - origin.y,
  width: selected.width,
  height: selected.height,
});
