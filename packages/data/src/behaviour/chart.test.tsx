/**
 * Charts in the real GPUix renderer, mounted through the shipped example.
 *
 * The bugs these guard are the ones a chart drawn as `<svg>` masks ships with:
 *
 * - every series painted in one colour, because the masks were stacked into one
 *   element instead of one element per series;
 * - a legend that names colours the plot does not paint;
 * - a layer that does not cover the plot, so a mark is clipped or offset;
 * - a zero value painting a slice (a layer that claims a value the data does
 *   not have);
 * - an axis that prints raw maxima instead of its ticks;
 * - an axis whose numbers descend down the page (its floor at the top), so a
 *   reader takes the bar's top for the smallest value;
 * - a stacked bar's axis measured over the widest series rather than the
 *   totals, so every stack claims a value the axis does not name;
 * - a scale measured over values that draw nowhere, so a stray value past the
 *   last label flattens every painted bar;
 * - a sparkline drawn from a different colour than the chart's first series.
 */

import { afterEach, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { ChartExample } from "../../examples/chart.example.js";
import { BarChart, LineChart, StackedBar } from "../chart/chart.js";
import {
  paintedText,
  requireBounds,
  requireStyle,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

/** Mount the example; `afterEach` tears it down even when an assertion fails. */
const mount = (): DataTestRoot => {
  root = renderData(<ChartExample />);
  settle(root);
  return root;
};

const palette = seriesColors(darkTheme);

/** One swatch of the scale, failing the case when the theme has fewer. */
const colourAt = (index: number): string => {
  const colour = palette[index];
  if (colour === undefined) {
    throw new Error(`the theme has no series colour ${index}`);
  }
  return colour;
};

/**
 * The top edge of a layer's marks, in plot pixels.
 *
 * A chart's geometry lives in the `<svg source>` document the layer paints, so
 * a claim about where a mark lands has to be read from the markup it paints
 * rather than from the layer's own box (which covers the whole plot).
 */
const topOfLayer = (root: DataTestRoot, testId: string): number => {
  const source = root.renderer.findByTestId(testId)?.customProps?.source;
  if (typeof source !== "string") {
    throw new Error(`behaviour: no SVG source on "${testId}"`);
  }
  const tops = Arr.filter(
    Arr.map([...source.matchAll(/<rect\b[^>]*\by="(-?[\d.]+)"/g)], (match) =>
      Number(match[1]),
    ),
    Number.isFinite,
  );
  const top = Option.getOrUndefined(Arr.head(Arr.sort(tops, Order.Number)));
  if (top === undefined) {
    throw new Error(`behaviour: "${testId}" paints no rect`);
  }
  return top;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the charts", () => {
  it("paints one mask per series, each in its own categorical colour", () => {
    const root = mount();

    const revenue = requireStyle(root, "chart-bars-layer-revenue");
    const cost = requireStyle(root, "chart-bars-layer-cost");

    expect(revenue.color).toBe(colourAt(0));
    expect(cost.color).toBe(colourAt(1));
    // The two series are different masks: one element painting both would show
    // a single colour and one image in the accessibility tree.
    expect(revenue.color).not.toBe(cost.color);
  });

  it("stretches every layer over the plot it belongs to", () => {
    const root = mount();

    const plot = requireBounds(root, "chart-bars-plot");
    const layer = requireBounds(root, "chart-bars-layer-revenue");

    expect(layer.x).toBe(plot.x);
    expect(layer.y).toBe(plot.y);
    expect(layer.width).toBe(plot.width);
    expect(layer.height).toBe(plot.height);
    expect(plot.width).toBe(320);
    expect(plot.height).toBe(140);
  });

  it("names the colour each legend swatch paints, and paints it there", () => {
    const root = mount();

    expect(
      requireStyle(root, "chart-bars-legend-swatch-revenue").backgroundColor,
    ).toBe(colourAt(0));
    expect(
      requireStyle(root, "chart-bars-legend-swatch-cost").backgroundColor,
    ).toBe(colourAt(1));
  });

  it("labels every category and divides the axis into ticks", () => {
    const root = mount();

    // The example's largest value is 60, so the scale reads to 100.
    expect(paintedText(root)).toContain("Q1");
    expect(paintedText(root)).toContain("Q4");
    expect(root.renderer.findByTestId("chart-bars-tick-0")).toBeDefined();
    expect(root.renderer.findByTestId("chart-bars-tick-100")).toBeDefined();
    expect(requireStyle(root, "chart-bars-plot").height).toBe(140);
  });

  it("puts the top of the scale at the top of the axis", () => {
    const root = mount();

    const floor = requireBounds(root, "chart-bars-tick-0");
    const ceiling = requireBounds(root, "chart-bars-tick-100");
    const plot = requireBounds(root, "chart-bars-plot");

    // A column reads top to bottom, so the scale's ceiling is the topmost
    // label and its floor sits on the plot's floor — the same edge the bars
    // stand on. Ascending order paints the axis upside down: every bar's top
    // is then read against a value below it.
    expect(ceiling.y).toBeLessThan(floor.y);
    expect(floor.y - ceiling.y).toBeGreaterThan(plot.height / 2);
  });

  it("labels a small scale with the precision its ticks need", () => {
    // A chart of rates over 0.005 used to print 0, 0, 0, 0, 0.01: a fixed two
    // decimals rounded the axis away, so the bars had no number to be read
    // against. The labels take their precision from the step between them.
    root = renderData(
      <BarChart
        aria-label="Fractional rates"
        labels={["one", "two", "three"]}
        series={[
          { key: "rate", label: "Rate", values: [0.0012, 0.0034, 0.0021] },
        ]}
        width={200}
        height={100}
        testId="chart-small"
      />,
    );
    settle(root);

    const text = paintedText(root);
    expect(text).toContain("0.0013");
    expect(text).toContain("0.0025");
    expect(text).toContain("0.0037");
    expect(text).toContain("0.005");
  });

  it("paints one slice per datum and skips a value of zero", () => {
    const root = mount();

    expect(
      root.renderer.findByTestId("chart-donut-layer-direct"),
    ).toBeDefined();
    expect(
      root.renderer.findByTestId("chart-donut-layer-social"),
    ).toBeDefined();
    // A datum with nothing to show paints no layer at all, so nothing claims it.
    expect(
      root.renderer.findByTestId("chart-donut-layer-referral"),
    ).toBeUndefined();
  });

  it("draws a sparkline in the first series colour", () => {
    const root = mount();

    const line = requireStyle(root, "chart-sparkline-layer-sparkline");
    expect(line.color).toBe(colourAt(0));
    expect(requireBounds(root, "chart-sparkline").width).toBe(160);
  });

  it("paints a line chart's single series over its whole plot", () => {
    const root = mount();

    const plot = requireBounds(root, "chart-line-plot");
    const layer = requireBounds(root, "chart-line-layer-churn");
    expect(layer.width).toBe(plot.width);
    expect(layer.height).toBe(plot.height);
    expect(requireStyle(root, "chart-line-layer-churn").color).toBe(
      colourAt(0),
    );
  });

  it("labels a stack's axis with the totals its bars are drawn against", () => {
    // The example's two series happen to share a ceiling (60 -> 100 for the
    // widest value, 84 -> 100 for the totals), so a mount of it cannot see the
    // bug this guards. Two series that each fill the plot do.
    root = renderData(
      <StackedBar
        aria-label="Two halves of one total"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [60] },
          { key: "b", label: "B", values: [60] },
        ]}
        width={200}
        height={100}
        testId="chart-totals"
      />,
    );
    settle(root);

    // The stack is 120 tall, so the axis must reach 200 rather than the 100 the
    // widest single series would round to — its ticks are 0, 50, 100, 150, 200,
    // not the 0, 25, 50, 75, 100 the per-series ceiling would print.
    expect(root.renderer.findByTestId("chart-totals-tick-200")).toBeDefined();
    expect(root.renderer.findByTestId("chart-totals-tick-150")).toBeDefined();
    expect(root.renderer.findByTestId("chart-totals-tick-25")).toBeUndefined();
    // …and the top of the stack lands where that axis says it does: 120 of 200
    // leaves the stack 40px down from the plot's ceiling.
    expect(topOfLayer(root, "chart-totals-layer-b")).toBe(40);
  });

  it("paints no bar in a column the labels do not name", () => {
    // A series longer than its labels used to paint a bar over a category that
    // does not exist — past the plot's right edge, and against an axis that
    // never names it. One label means one column; the 500 draws nowhere.
    root = renderData(
      <BarChart
        aria-label="A series past its labels"
        labels={["Q1"]}
        series={[{ key: "revenue", label: "Revenue", values: [5, 500] }]}
        width={200}
        height={100}
        testId="chart-past-labels"
      />,
    );
    settle(root);

    const source = root.renderer.findByTestId("chart-past-labels-layer-revenue")
      ?.customProps?.source;
    if (typeof source !== "string") {
      throw new Error("behaviour: no SVG source on the bar layer");
    }
    expect([...source.matchAll(/<rect\b/g)]).toHaveLength(1);
    // The discarded 500 draws nowhere, so it cannot raise the axis either: the
    // scale is the labelled 5, and its bar stands the whole plot at y = 0. A
    // scale that still read the tail would paint the same bar one pixel tall
    // under a 500 ceiling, which reads as a value of almost nothing.
    expect(topOfLayer(root, "chart-past-labels-layer-revenue")).toBe(0);
  });

  it("measures the axis over the slots the labels name", () => {
    // A series ten times longer than its labels: only the first two values are
    // painted, so a 999 tail that draws nowhere must not flatten them.
    root = renderData(
      <BarChart
        aria-label="A ragged series"
        labels={["Q1", "Q2"]}
        series={[{ key: "revenue", label: "Revenue", values: [3, 6, 999] }]}
        width={200}
        height={100}
        testId="chart-ragged-bars"
      />,
    );
    settle(root);

    // The painted maximum is 6, whose ceiling is 10 — not the 1000 the stray
    // value would round to.
    expect(
      root.renderer.findByTestId("chart-ragged-bars-tick-10"),
    ).toBeDefined();
    expect(
      root.renderer.findByTestId("chart-ragged-bars-tick-1000"),
    ).toBeUndefined();
    // The 6 of a 10 ceiling leaves the bar 40px down the plot.
    expect(topOfLayer(root, "chart-ragged-bars-layer-revenue")).toBe(40);
  });

  it("lays out the default plot when a computed size cannot paint", () => {
    // A size is often computed — a share of a pane, a measurement taken before
    // the first layout. `Math.max(1, NaN)` is `NaN`, so the unreadable side
    // reached the viewBox, the axis and every label's slot width: the plot
    // collapsed to 0×0 and the labels lost their tracks while the chart kept
    // its name.
    root = renderData(
      <BarChart
        aria-label="Revenue by quarter"
        labels={["Q1", "Q2"]}
        series={[{ key: "revenue", label: "Revenue", values: [3, 6] }]}
        width={Number.NaN}
        height={Number.POSITIVE_INFINITY}
        testId="chart-unreadable"
      />,
    );
    settle(root);

    const plot = requireBounds(root, "chart-unreadable-plot");
    expect(plot.width).toBe(320);
    expect(plot.height).toBe(160);

    const source = root.renderer.findByTestId("chart-unreadable-layer-revenue")
      ?.customProps?.source;
    if (typeof source !== "string") {
      throw new Error("behaviour: no SVG source on the layer");
    }
    expect(source).toContain('viewBox="0 0 320 160"');
    // The labels keep their slots: 320 / two categories.
    expect(requireBounds(root, "chart-unreadable-label-0").width).toBe(160);
    // The axis column is laid out from the same box as the plot. It used to
    // take the caller's raw `height`, so a computed infinity made the plot
    // 160px tall and its tick column infinite — the numbers a reader compares
    // a bar against were spread over a box the plot does not have.
    expect(requireStyle(root, "chart-unreadable-axis").height).toBe(
      plot.height,
    );
    expect(requireBounds(root, "chart-unreadable-axis").height).toBe(
      plot.height,
    );
  });

  it("puts a line's points over the labels it draws under", () => {
    // The labels (and the bars) are centred in `width / labels.length` slots,
    // so a path spaced edge to edge stood its first and last points half a slot
    // off and a two-value series under four labels stretched across the whole
    // plot. Two of four 50px slots put the points at x = 25 and 75.
    root = renderData(
      <LineChart
        aria-label="Churn"
        labels={["Q1", "Q2", "Q3", "Q4"]}
        series={[{ key: "churn", label: "Churn", values: [10, 20] }]}
        width={200}
        height={100}
        testId="chart-ragged-line"
      />,
    );
    settle(root);

    const source = root.renderer.findByTestId("chart-ragged-line-layer-churn")
      ?.customProps?.source;
    if (typeof source !== "string") {
      throw new Error("behaviour: no SVG source on the line layer");
    }
    // The scale is the widest value (20), so y = 50 and 0.
    expect(source).toContain("M25 50L75 0");
    expect(source).not.toContain("M0");
  });
});
