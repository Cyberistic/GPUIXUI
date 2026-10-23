/**
 * Chart geometry: the arithmetic a bar, line, stack, ring and sparkline paint.
 *
 * The bugs these guard are the ones a chart ships with:
 *
 * - a scale that divides by zero, or an axis labelled with raw maxima;
 * - a zero or a negative value painting a bar of one pixel, which claims a
 *   value the data does not have;
 * - a stacked series standing on the floor instead of on the series before it;
 * - a series longer than the labelled slots painting past the last label, where
 *   no category exists and the grid has no column — or raising the axis, so the
 *   labelled bars shrink under a value that draws nowhere;
 * - a chart that names **no** category painting one unnamed slot, because the
 *   array helper floors a count to one: the axis then names a value no label can
 *   reach and the stack measures a total the plot cannot show;
 * - a single-point line painting a zero-length path the rasteriser drops;
 * - a ring of one value painting nothing, because an arc from an angle to
 *   itself is empty;
 * - markup that carries `NaN` or `undefined`, which paints nothing at all.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  AXIS_STEP_LIMIT,
  axisTicks,
  barMarks,
  barSlot,
  chartBox,
  chartMarkup,
  chartScale,
  donutMarks,
  drawableValue,
  groupedBarMarks,
  linePath,
  niceCeiling,
  seriesColour,
  seriesDescription,
  stackedBarMarks,
  stackedScale,
  tickLabel,
  type ChartBox,
  type ChartMark,
  type ChartSeries,
} from "./logic.js";

const box: ChartBox = { width: 200, height: 100 };

const series = (key: string, values: ReadonlyArray<number>): ChartSeries => ({
  key,
  label: key,
  values,
});

/** A mark that must be a rect, failing the case rather than skipping it. */
const rectOf = (
  mark: ChartMark | undefined,
): Extract<ChartMark, { kind: "rect" }> => {
  if (mark === undefined || mark.kind !== "rect") {
    throw new Error("chart: expected a rect mark, got a path or nothing");
  }
  return mark;
};

describe("the chart scale", () => {
  it("rounds a maximum up to 1, 2 or 5 times a power of ten", () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(1)).toBe(1);
    expect(niceCeiling(2)).toBe(2);
    expect(niceCeiling(3)).toBe(5);
    expect(niceCeiling(8)).toBe(10);
    expect(niceCeiling(12)).toBe(20);
    expect(niceCeiling(93)).toBe(100);
    // A value that cannot be drawn reads as zero, and a zero still scales.
    expect(niceCeiling(Number.NaN)).toBe(1);
    expect(niceCeiling(-4)).toBe(1);
  });

  it("measures every series, and labels the axis evenly", () => {
    expect(chartScale([series("a", [10, 50]), series("b", [93])])).toBe(100);
    expect(axisTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(100, 0)).toEqual([0, 100]);
  });

  it("keeps a tick's label as precise as its step", () => {
    // A chart of rates over `0.005` used to print 0, 0, 0, 0, 0.01: the fixed
    // two decimals rounded three of the four steps away, so the bars had no
    // number to be read against.
    const small = axisTicks(0.005, 4);
    const smallStep = 0.005 / 4;
    expect(Arr.map(small, (tick) => tickLabel(tick, smallStep))).toEqual([
      "0",
      "0.0013",
      "0.0025",
      "0.0037",
      "0.005",
    ]);
    // The ordinary scale is unchanged: the guard digit is dropped when the
    // step is a whole number and trailing zeros never paint.
    expect(Arr.map(axisTicks(100, 4), (tick) => tickLabel(tick, 25))).toEqual([
      "0",
      "25",
      "50",
      "75",
      "100",
    ]);
    expect(tickLabel(0.5, 0.25)).toBe("0.5");
    // A step below the last finite decimal keeps a readable exponential label
    // rather than rounding every tick to zero.
    expect(tickLabel(2.5e-22, 1e-22)).toBe("2.50e-22");
    // An unreadable tick never paints `NaN`.
    expect(tickLabel(Number.NaN, 1)).toBe("0");
  });

  it("reads an unreadable or unbounded tick count as a chart can paint it", () => {
    // `ticks` is often computed. `NaN` used to mount no tick at all and a huge
    // count mounted one text host per step.
    expect(axisTicks(100, Number.NaN)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(100, Number.POSITIVE_INFINITY)).toEqual([
      0, 25, 50, 75, 100,
    ]);
    expect(axisTicks(100, 1_000_000_000)).toHaveLength(AXIS_STEP_LIMIT + 1);
    expect(axisTicks(100, 3.7)).toEqual([0, 100 / 3, 200 / 3, 100]);
  });

  it("measures only the slots the chart paints", () => {
    // A value past the last label draws nowhere, so it cannot raise the axis
    // and shrink every painted bar: measured, a stray 999 under two labels left
    // the labelled 3 and 6 as 0.3px and 0.6px slivers.
    const ragged = [series("a", [3, 6, 999])];
    expect(chartScale(ragged)).toBe(1000);
    expect(chartScale(ragged, 2)).toBe(10);
    // The painted bar is read against the axis it is drawn on.
    const marks = groupedBarMarks(ragged, box, chartScale(ragged, 2), 2);
    expect(rectOf(marks[0]?.[1]).height).toBe(60);
  });

  it("reads a stack's axis against the totals, not its widest series", () => {
    const two = [series("a", [60]), series("b", [60])];
    // The widest single value is 60; the bar a reader sees is the 120 total.
    expect(chartScale(two)).toBe(100);
    expect(stackedScale(two)).toBe(200);
    // The tallest category is what the axis is rounded from, wherever it sits,
    // and a ragged series is measured over the categories it does not span.
    expect(stackedScale([series("a", [60, 10]), series("b", [60, 10])])).toBe(
      200,
    );
    expect(stackedScale([series("a", [5, 12]), series("b", [5])])).toBe(20);
    // A value past the last painted category draws nowhere, so it cannot raise
    // the axis the painted bars are read against.
    expect(stackedScale([series("a", [5, 500])], 1)).toBe(5);
    expect(stackedScale([series("a", [5, 500])])).toBe(500);
    expect(stackedScale([series("a", [0]), series("b", [0])])).toBe(1);
    expect(stackedScale([])).toBe(1);
  });

  it("gives a value no bar when it is zero, negative or not a number", () => {
    expect(drawableValue(0)).toBe(0);
    expect(drawableValue(-2)).toBe(0);
    expect(drawableValue(Number.NaN)).toBe(0);
    expect(drawableValue(Infinity)).toBe(0);
  });
});

describe("the bar marks", () => {
  it("keeps a slot for every category and stands each bar on the floor", () => {
    expect(barSlot(4, 200)).toEqual({ slot: 50, barWidth: 30 });

    const marks = barMarks([50, 100, 0], box, 100, 4);
    // The zero paints no bar, but it still occupies the third slot.
    expect(marks).toHaveLength(2);
    const first = marks[0];
    const second = marks[1];
    expect(first).toMatchObject({ kind: "rect", width: 30, height: 50 });
    expect(first).toMatchObject({ y: 50 });
    expect(second).toMatchObject({ height: 100, y: 0 });
    // The third slot's bar would have started at x = 100; nothing paints there.
    expect(
      Arr.map(marks, (mark) => (mark.kind === "rect" ? mark.x : -1)),
    ).toEqual([10, 60]);
  });

  it("paints only the labelled slots when a series runs past them", () => {
    // One label means one slot. The 500 is a value the axis does not name and
    // the plot has no column for; it used to paint a second bar at x = 240,
    // past the box's 200px right edge.
    const marks = barMarks([5, 500], box, 100, 1);
    expect(marks).toHaveLength(1);
    const bar = rectOf(marks[0]);
    expect(bar).toMatchObject({ x: 40, width: 120, height: 5 });
    expect(bar.x + bar.width).toBeLessThanOrEqual(box.width);
  });

  it("truncates a grouped series to the labelled slots too", () => {
    const grouped = groupedBarMarks([series("a", [5, 500])], box, 100, 1);
    expect(Arr.length(grouped[0] ?? [])).toBe(1);
    const bar = rectOf(grouped[0]?.[0]);
    expect(bar).toMatchObject({ x: 20, width: 160, height: 5 });
    expect(bar.x + bar.width).toBeLessThanOrEqual(box.width);
  });

  it("paints no mark for a chart that names no category", () => {
    // The bug: `Arr.makeBy(0, …)` yields one element, so `stackedScale` and
    // every mark builder treated "no labels" as "one unnamed column" — an empty
    // chart whose axis named the ceiling of a value it never painted. Zero is
    // zero; only a count the geometry cannot read is no count.
    const one = [series("a", [5])];
    expect(barMarks([5], box, 5, 0)).toEqual([]);
    expect(groupedBarMarks(one, box, 5, 0)).toEqual([[]]);
    expect(stackedBarMarks(one, box, 5, 0)).toEqual([[]]);
    expect(linePath([5], box, 5, 0)).toEqual(Option.none());
    expect(chartScale(one, 0)).toBe(1);
    expect(stackedScale(one, 0)).toBe(1);
    // A negative count names no slot either.
    expect(barMarks([5], box, 5, -1)).toEqual([]);

    // An unreadable count is not zero: it measures the whole series, so a
    // caller that computed `NaN` still paints the values it holds.
    expect(barMarks([5], box, 5, Number.NaN)).toHaveLength(1);
    expect(Option.getOrElse(linePath([5], box, 5, Number.NaN), () => "")).toBe(
      "M100 0h1",
    );
    expect(stackedScale(one, Number.NaN)).toBe(5);
  });

  it("groups several series inside one category slot", () => {
    const grouped = groupedBarMarks(
      [series("a", [100, 50]), series("b", [50, 100])],
      box,
      100,
    );
    expect(grouped).toHaveLength(2);
    const [first, second] = grouped;
    expect(Arr.length(first ?? [])).toBe(2);
    expect(Arr.length(second ?? [])).toBe(2);
    // Within a slot the two series stand side by side and share the floor.
    const a0 = rectOf(first?.[0]);
    const b0 = rectOf(second?.[0]);
    expect(a0).toMatchObject({ y: 0, height: 100 });
    expect(b0).toMatchObject({ y: 50, height: 50 });
    expect(b0.x).toBeGreaterThan(a0.x);
    expect(b0.y + b0.height).toBe(box.height);
  });

  it("stacks each series on the one before it", () => {
    const two = [series("a", [50]), series("b", [50])];
    const stacked = stackedBarMarks(two, box, stackedScale(two));
    const lower = rectOf(stacked[0]?.[0]);
    const upper = rectOf(stacked[1]?.[0]);
    // The stack's scale is its total (100), so each half is half the height and
    // the upper half starts where the lower one ends.
    expect(lower).toMatchObject({ height: 50, y: 50 });
    expect(upper).toMatchObject({ height: 50, y: 0 });
    expect(upper.y + upper.height).toBe(lower.y);
    // A series with nothing in a slot paints no segment there.
    expect(
      stackedBarMarks([series("a", [50]), series("b", [0])], box, 100)[1],
    ).toEqual([]);
  });

  it("draws a stack the axis it publishes actually reads", () => {
    const two = [series("a", [60]), series("b", [60])];
    const scale = stackedScale(two);
    const stacked = stackedBarMarks(two, box, scale);
    const lower = rectOf(stacked[0]?.[0]);
    const upper = rectOf(stacked[1]?.[0]);
    const total = 120;
    // Every layer draws against the scale the axis prints, so the top of the
    // stack lands where the topmost datum says it does.
    expect(axisTicks(scale, 4)).toEqual([0, 50, 100, 150, 200]);
    expect(Math.min(lower.y, upper.y)).toBe(box.height * (1 - total / scale));
    // Drawn against the widest single value instead, the stack reports a full
    // plot for a total the axis does not name: the top of the stack reaches y=0
    // while the axis stops at 100.
    const widest = stackedBarMarks(two, box, chartScale(two));
    expect(rectOf(widest[1]?.[0]).y).toBe(0);
    expect(Math.min(lower.y, upper.y)).toBe(40);
  });
});

describe("the line and ring marks", () => {
  it("runs a path through every point, over the labelled slots", () => {
    // The points stand at the centre of each of the three category slots
    // (`200 / 3` wide), which is where the labels and the bars are centred.
    const path = linePath([100, 50, 0], box, 100);
    expect(Option.getOrElse(path, () => "")).toBe("M33.33 0L100 50L166.67 100");
    // One point paints a short run rather than a zero-length path.
    expect(Option.getOrElse(linePath([50], box, 100), () => "")).toBe(
      "M100 50h1",
    );
    expect(linePath([], box, 100)).toEqual(Option.none());
  });

  it("keeps a ragged series in its own categories", () => {
    // Two values against four labels used to span the whole plot (`0 … 200`),
    // drawing the second point under the fourth label; they belong in the first
    // two of four 50px slots.
    expect(Option.getOrElse(linePath([10, 20], box, 100, 4), () => "")).toBe(
      "M25 90L75 80",
    );
    // A value past the last label draws nowhere — the rule `barMarks` follows.
    expect(
      Option.getOrElse(linePath([1, 2, 3, 4], box, 100, 2), () => ""),
    ).toBe("M50 99L150 98");
  });

  it("paints one ring segment per positive value", () => {
    const marks = donutMarks([50, 50], box);
    expect(marks).toHaveLength(2);
    expect(
      Arr.every(marks, (mark) =>
        mark.kind === "path"
          ? mark.d.startsWith("M") && mark.d.includes("A")
          : false,
      ),
    ).toBe(true);
    // A full ring is two halves: an arc from an angle to itself paints nothing.
    expect(donutMarks([100], box)).toHaveLength(2);
    expect(donutMarks([0, 0], box)).toEqual([]);
  });
});

describe("the plot box", () => {
  const fallback: ChartBox = { width: 320, height: 160 };

  it("keeps the size the caller gave, fractional pixels included", () => {
    expect(chartBox(200, 100, fallback)).toEqual({ width: 200, height: 100 });
    expect(chartBox(200.5, 100.25, fallback)).toEqual({
      width: 200.5,
      height: 100.25,
    });
  });

  it("reads a side it cannot lay out as the default that side", () => {
    // A size is often computed — a share of a pane, a measurement taken before
    // the first layout — and `Math.max(1, NaN)` is `NaN`: it reached the
    // viewBox, the axis and every label's slot width, so the plot collapsed to
    // 0×0 while the chart kept its name.
    Arr.forEach(
      [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -12],
      (side) =>
        expect(chartBox(side, side, fallback)).toEqual({
          width: 320,
          height: 160,
        }),
    );
    expect(chartBox(Number.NaN, 90, fallback)).toEqual({
      width: 320,
      height: 90,
    });
  });

  it("never falls back to a side that cannot paint either", () => {
    // The fallback is a component's own default, but it arrives through a
    // public helper: an unreadable one must still lay out a pixel rather than
    // hand `NaN` back to the caller.
    expect(
      chartBox(Number.NaN, Number.NaN, { width: Number.NaN, height: 0 }),
    ).toEqual({ width: 1, height: 1 });
  });
});

describe("the chart markup", () => {
  it("writes one tinted mask with no unreadable number", () => {
    const svg = chartMarkup(barMarks([50, 100], box, 100), box);
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg).toContain('fill="#000"');
    expect(svg).toContain("<rect");
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
  });

  it("cycles the categorical palette and refuses an empty one", () => {
    const palette = ["#111111", "#222222"];
    expect(seriesColour(palette, 0)).toBe("#111111");
    expect(seriesColour(palette, 2)).toBe("#111111");
    expect(seriesColour(palette, -1)).toBe("#222222");
    expect(seriesColour([], 0)).toBe("#000000");
  });
});

describe("the words a series announces", () => {
  it("reads a value under the label it stands on", () => {
    expect(seriesDescription([3, 6], ["Q1", "Q2"])).toBe("Q1 3, Q2 6");
  });

  it("announces no category the plot leaves unpainted", () => {
    // Three values against two labels: the third draws nowhere, so naming it
    // would describe a datum the picture does not show.
    expect(seriesDescription([3, 6, 9], ["Q1", "Q2"])).toBe("Q1 3, Q2 6");
    expect(seriesDescription([3], ["Q1", "Q2"])).toBe("Q1 3");
  });

  it("reads an unreadable value as no value, not the geometry's zero", () => {
    expect(seriesDescription([3, Number.NaN], ["Q1", "Q2"])).toBe(
      "Q1 3, Q2 no value",
    );
  });

  it("reads a word-sized series with no labels as its values", () => {
    expect(seriesDescription([3, 6, 2])).toBe("3, 6, 2");
    expect(seriesDescription([])).toBe("");
  });
});
