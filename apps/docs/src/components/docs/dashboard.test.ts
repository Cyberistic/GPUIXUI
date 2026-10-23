import { describe, expect, it } from "vitest";
import { hourlyBars } from "./dashboard";

/**
 * The `HourlyStack` alignment invariant.
 *
 * The chart used to stack top-down from a per-column `y`, so a short column's
 * segments floated off the shared baseline and the tallest column did not reach
 * the plot top. `hourlyBars` must instead stack every column from `plot.bottom`
 * upward and scale the tallest column to fill the plot exactly.
 *
 * The negative control proves the "shared baseline" check is sensitive: shifting
 * one column's baseline must break it, so the positive assertion cannot pass on
 * a column that hangs.
 */

const FIXTURE: ReadonlyArray<{
  readonly label: string;
  readonly values: ReadonlyArray<number>;
}> = [
  { label: "A", values: [50, 30, 20] },
  { label: "B", values: [20, 20, 20, 20] },
  { label: "C", values: [100] },
];

const plot = { top: 0, bottom: 100 };

describe("hourlyBars", () => {
  const bars = hourlyBars(FIXTURE, plot);

  it("sits every column on the shared baseline", () => {
    expect(bars.map((column) => column.bottom)).toEqual([
      plot.bottom,
      plot.bottom,
      plot.bottom,
    ]);
  });

  it("fills the plot exactly with the tallest column", () => {
    expect(Math.min(...bars.map((column) => column.top))).toBe(plot.top);
  });

  it("stacks each column's segments contiguously from the baseline", () => {
    for (const column of bars) {
      let top = plot.bottom;
      for (const segment of column.segments) {
        expect(segment.y + segment.height).toBe(top);
        top = segment.y;
      }
      expect(top).toBe(column.top);
    }
  });

  it("flags a column shifted off the baseline (negative control)", () => {
    const shifted = bars.map((column, index) =>
      index === 0
        ? { ...column, top: column.top + 12, bottom: column.bottom + 12 }
        : column,
    );
    expect(shifted.every((column) => column.bottom === plot.bottom)).toBe(
      false,
    );
  });
});
