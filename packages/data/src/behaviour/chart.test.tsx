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
 * - a stacked bar's axis measured over the widest series rather than the
 *   totals, so every stack claims a value the axis does not name;
 * - a sparkline drawn from a different colour than the chart's first series.
 */

import { afterEach, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { ChartExample } from "../../examples/chart.example.js";
import { StackedBar } from "../chart/chart.js";
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
    Arr.map(
      [...source.matchAll(/<rect\b[^>]*\by="(-?[\d.]+)"/g)],
      (match) => Number(match[1]),
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
});
