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
 * - a sparkline drawn from a different colour than the chart's first series.
 */

import { afterEach, describe, expect, it } from "vitest";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { ChartExample } from "../../examples/chart.example.js";
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
});
