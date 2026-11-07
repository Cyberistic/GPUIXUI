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
  seriesName,
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

const rectOf = (
  mark: ChartMark | undefined,
): Extract<ChartMark, { kind: "rect" }> => {
  if (mark === undefined || mark.kind !== "rect") {
    throw new Error("chart: expected a rect mark, got a path or nothing");
  }
  return mark;
};

describe("the chart scale", () => {
  it("rounds a maximum up to a step its four intervals divide cleanly", () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(1)).toBe(1);
    expect(niceCeiling(2)).toBe(2);
    expect(niceCeiling(3)).toBe(3);
    expect(niceCeiling(7)).toBe(8);
    expect(niceCeiling(13)).toBe(16);
    expect(niceCeiling(1240)).toBe(1600);
    expect(niceCeiling(93)).toBe(100);

    expect(niceCeiling(Number.NaN)).toBe(1);
    expect(niceCeiling(-4)).toBe(1);
  });

  it("measures every series, and labels the axis evenly", () => {
    expect(chartScale([series("a", [10, 50]), series("b", [93])])).toBe(100);
    expect(axisTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(100, 0)).toEqual([0, 100]);
  });

  it("keeps a tick's label as precise as its step", () => {
    const small = axisTicks(0.005, 4);
    const smallStep = 0.005 / 4;
    expect(Arr.map(small, (tick) => tickLabel(tick, smallStep))).toEqual([
      "0",
      "0.0013",
      "0.0025",
      "0.0037",
      "0.005",
    ]);

    expect(Arr.map(axisTicks(100, 4), (tick) => tickLabel(tick, 25))).toEqual([
      "0",
      "25",
      "50",
      "75",
      "100",
    ]);
    expect(tickLabel(0.5, 0.25)).toBe("0.5");

    expect(tickLabel(2.5e-22, 1e-22)).toBe("2.50e-22");

    expect(tickLabel(Number.NaN, 1)).toBe("0");
  });

  it("prints a whole scale whose step is a hundred or more", () => {
    const thousands = axisTicks(1000, 4);
    expect(Arr.map(thousands, (tick) => tickLabel(tick, 1000 / 4))).toEqual([
      "0",
      "250",
      "500",
      "750",
      "1000",
    ]);

    expect(Arr.map(axisTicks(400, 4), (tick) => tickLabel(tick, 100))).toEqual([
      "0",
      "100",
      "200",
      "300",
      "400",
    ]);

    expect(tickLabel(1250, 250)).toBe("1250");
  });

  it("reads an unreadable or unbounded tick count as a chart can paint it", () => {
    expect(axisTicks(100, Number.NaN)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(100, Number.POSITIVE_INFINITY)).toEqual([
      0, 25, 50, 75, 100,
    ]);
    expect(axisTicks(100, 1_000_000_000)).toHaveLength(AXIS_STEP_LIMIT + 1);
    expect(axisTicks(100, 3.7)).toEqual([0, 100 / 3, 200 / 3, 100]);
  });

  it("measures only the slots the chart paints", () => {
    const ragged = [series("a", [3, 6, 999])];
    expect(chartScale(ragged)).toBe(1000);
    expect(chartScale(ragged, 2)).toBe(6);
    const marks = groupedBarMarks(ragged, box, chartScale(ragged, 2), 2);
    expect(rectOf(marks[0]?.[1]).height).toBe(100);
  });

  it("reads a stack's axis against the totals, not its widest series", () => {
    const two = [series("a", [60]), series("b", [60])];
    expect(chartScale(two)).toBe(60);
    expect(stackedScale(two)).toBe(120);
    expect(stackedScale([series("a", [60, 10]), series("b", [60, 10])])).toBe(
      120,
    );
    expect(stackedScale([series("a", [5, 12]), series("b", [5])])).toBe(12);
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

    expect(marks).toHaveLength(2);
    const first = marks[0];
    const second = marks[1];
    expect(first).toMatchObject({ kind: "rect", width: 30, height: 50 });
    expect(first).toMatchObject({ y: 50 });
    expect(second).toMatchObject({ height: 100, y: 0 });

    expect(
      Arr.map(marks, (mark) => (mark.kind === "rect" ? mark.x : -1)),
    ).toEqual([10, 60]);
  });

  it("paints only the labelled slots when a series runs past them", () => {
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
    const one = [series("a", [5])];
    expect(barMarks([5], box, 5, 0)).toEqual([]);
    expect(groupedBarMarks(one, box, 5, 0)).toEqual([[]]);
    expect(stackedBarMarks(one, box, 5, 0)).toEqual([[]]);
    expect(linePath([5], box, 5, 0)).toEqual(Option.none());
    expect(chartScale(one, 0)).toBe(1);
    expect(stackedScale(one, 0)).toBe(1);

    expect(barMarks([5], box, 5, -1)).toEqual([]);

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

    expect(lower).toMatchObject({ height: 50, y: 50 });
    expect(upper).toMatchObject({ height: 50, y: 0 });
    expect(upper.y + upper.height).toBe(lower.y);

    expect(
      stackedBarMarks([series("a", [50]), series("b", [0])], box, 100)[1],
    ).toEqual([]);
  });

  it("draws a stack the axis it publishes actually reads", () => {
    const two = [series("a", [55]), series("b", [55])];
    const scale = stackedScale(two);
    const stacked = stackedBarMarks(two, box, scale);
    const lower = rectOf(stacked[0]?.[0]);
    const upper = rectOf(stacked[1]?.[0]);
    const total = 110;
    // stack lands where the topmost datum says it does.
    expect(axisTicks(scale, 4)).toEqual([0, 30, 60, 90, 120]);
    expect(Math.min(lower.y, upper.y)).toBeCloseTo(
      box.height * (1 - total / scale),
    );
    // plot for a total the axis does not name: the top of the stack reaches y=0
    const widest = stackedBarMarks(two, box, chartScale(two));
    expect(rectOf(widest[1]?.[0]).y).toBe(0);
    expect(Math.min(lower.y, upper.y)).toBeGreaterThan(0);
  });
});

describe("the line and ring marks", () => {
  it("runs a path through every point, over the labelled slots", () => {
    const path = linePath([100, 50, 0], box, 100);
    expect(Option.getOrElse(path, () => "")).toBe("M33.33 0L100 50L166.67 100");

    expect(Option.getOrElse(linePath([50], box, 100), () => "")).toBe(
      "M100 50h1",
    );
    expect(linePath([], box, 100)).toEqual(Option.none());
  });

  it("keeps a ragged series in its own categories", () => {
    expect(Option.getOrElse(linePath([10, 20], box, 100, 4), () => "")).toBe(
      "M25 90L75 80",
    );

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

  it("reads a label a store wrote as a hole as no label, not the word null", () => {
    // @ts-expect-error — a label list a store wrote with a hole.
    expect(seriesDescription([3, 6], ["Q1", null])).toBe("Q1 3, 6");
    expect(seriesDescription([3, 6], ["Q1", "   "])).toBe("Q1 3, 6");
    expect(seriesDescription([3, 6], ["", "Q2"])).toBe("3, Q2 6");
  });

  it("reads a blank series name as the key it is stored by", () => {
    expect(seriesName("", "revenue")).toBe("revenue");
    expect(seriesName("   ", "cost")).toBe("cost");
    expect(seriesName("  Revenue  ", "revenue")).toBe("Revenue");
  });
});

/** Guards: a stroked line went to the mask with a fill, and a sparkline painted a wedge. */
describe("the mask's markup", () => {
  it("leaves a stroked line unfilled", () => {
    const markup = chartMarkup(
      [{ kind: "path", d: "M0,0L10,10", stroke: { color: "#000", width: 1 } }],
      { width: 10, height: 10 },
    );
    expect(markup).toContain('fill="none"');
  });
});
