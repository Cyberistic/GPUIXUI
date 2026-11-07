import { afterEach, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { ChartExample } from "../../examples/chart.example.js";
import {
  AreaChart,
  BarChart,
  LineChart,
  Sparkline,
  StackedBar,
} from "../chart/chart.js";
import {
  chartMarkupOf,
  paintedText,
  requireBounds,
  requireStyle,
  seriesMarkupOf,
  seriesShapesOf,
} from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

const mount = (): DataTestRoot => {
  root = renderData(<ChartExample />);
  settle(root);
  return root;
};

const palette = seriesColors(darkTheme);

const colourAt = (index: number): string => {
  const colour = palette[index];
  if (colour === undefined) {
    throw new Error(`the theme has no series colour ${index}`);
  }
  return colour;
};

const topOfLayer = (
  root: DataTestRoot,
  testId: string,
  key: string,
  colour: string,
): number => {
  const tops = Arr.filter(
    Arr.map(
      [
        ...seriesShapesOf(root, testId, key, colour)
          .join(" ")
          .matchAll(/<rect\b[^>]*\by="(-?[\d.]+)"/g),
      ],
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

const shapesOf = (
  root: DataTestRoot,
  testId: string,
  key: string,
  colour: string,
): ReadonlyArray<string> => seriesShapesOf(root, testId, key, colour);

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

    expect(ceiling.y).toBeLessThan(floor.y);
    expect(floor.y - ceiling.y).toBeGreaterThan(plot.height / 2);
  });

  it("labels a small scale with the precision its ticks need", () => {
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

  it("paints one slice per datum and no slice for a value of zero", () => {
    const root = mount();

    const slices = ["direct", "social", "referral"] as const;
    Arr.forEach(slices, (key) => {
      expect(
        root.renderer.findByTestId(`chart-donut-layer-${key}`),
      ).toBeDefined();
    });

    const sourceOf = (key: string, colour: string): string =>
      seriesMarkupOf(root, "chart-donut", key, colour);
    expect(sourceOf("direct", colourAt(0))).toContain("<path");
    expect(sourceOf("social", colourAt(2))).toContain("<path");
    expect(sourceOf("referral", colourAt(3))).not.toContain("<path");
  });

  it("draws a sparkline in the first series colour", () => {
    const root = mount();

    const line = requireStyle(root, "chart-sparkline-layer-sparkline");
    expect(line.color).toBe(colourAt(0));
    expect(requireBounds(root, "chart-sparkline").width).toBe(160);
  });

  it("draws a sparkline whose stored colour is blank in the first series colour", () => {
    root = renderData(
      <div>
        <Sparkline testId="blank-spark" values={[4, 8, 6]} color="" />
        <Sparkline testId="spaces-spark" values={[4, 8, 6]} color="   " />
      </div>,
    );
    settle(root);

    expect(requireStyle(root, "blank-spark-layer-sparkline").color).toBe(
      colourAt(0),
    );
    expect(requireStyle(root, "spaces-spark-layer-sparkline").color).toBe(
      colourAt(0),
    );
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

    expect(root.renderer.findByTestId("chart-totals-tick-200")).toBeDefined();
    expect(root.renderer.findByTestId("chart-totals-tick-150")).toBeDefined();
    expect(root.renderer.findByTestId("chart-totals-tick-25")).toBeUndefined();

    expect(topOfLayer(root, "chart-totals", "b", colourAt(1))).toBe(40);
  });

  it("paints no bar in a column the labels do not name", () => {
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

    expect(
      shapesOf(root, "chart-past-labels", "revenue", colourAt(0)),
    ).toHaveLength(1);

    expect(topOfLayer(root, "chart-past-labels", "revenue", colourAt(0))).toBe(
      0,
    );
  });

  it("measures the axis over the slots the labels name", () => {
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

    expect(
      root.renderer.findByTestId("chart-ragged-bars-tick-10"),
    ).toBeDefined();
    expect(
      root.renderer.findByTestId("chart-ragged-bars-tick-1000"),
    ).toBeUndefined();

    expect(topOfLayer(root, "chart-ragged-bars", "revenue", colourAt(0))).toBe(
      40,
    );
  });

  it("lays out the default plot when a computed size cannot paint", () => {
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

    const source = chartMarkupOf(root, "chart-unreadable-layer-revenue");
    expect(source).toContain('viewBox="0 0 320 160"');

    expect(requireBounds(root, "chart-unreadable-label-0").width).toBe(160);

    expect(requireStyle(root, "chart-unreadable-axis").height).toBe(
      plot.height,
    );
    expect(requireBounds(root, "chart-unreadable-axis").height).toBe(
      plot.height,
    );
  });

  it("labels an axis measured in thousands", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue in thousands"
        labels={["Q1", "Q2"]}
        series={[{ key: "revenue", label: "Revenue", values: [4200, 3800] }]}
        width={200}
        height={100}
        testId="chart-thousands"
      />,
    );
    settle(root);

    expect(
      root.renderer.findByTestId("chart-thousands-tick-5000"),
    ).toBeDefined();
    expect(
      root.renderer.findByTestId("chart-thousands-tick-1250"),
    ).toBeDefined();
    const text = paintedText(root);
    expect(text).toContain("1250");
    expect(text).toContain("5000");
  });

  it("clips a category label to the slot it is given", () => {
    root = renderData(
      <BarChart
        aria-label="Long category names"
        labels={["September", "October", "November", "December"]}
        series={[{ key: "revenue", label: "Revenue", values: [3, 6, 4, 8] }]}
        width={200}
        height={100}
        testId="chart-clipped-labels"
      />,
    );
    settle(root);

    const slot = requireBounds(root, "chart-clipped-labels-label-0");
    const next = requireBounds(root, "chart-clipped-labels-label-1");
    expect(slot.width).toBe(50);
    expect(next.x).toBe(slot.x + slot.width);

    const text = root.renderer.findByTestId("chart-clipped-labels-label-0");
    if (text === null || text === undefined) {
      throw new Error("behaviour: no first category slot");
    }
    const labelId = text.children[0];
    if (labelId === undefined) {
      throw new Error("behaviour: the category slot paints no label");
    }
    const label = root.renderer.getElementBounds(labelId);
    expect(label).toMatchObject({ x: slot.x, width: slot.width });

    expect(requireStyle(root, "chart-clipped-labels-label-0").overflow).toBe(
      "hidden",
    );

    expect(paintedText(root)).toContain("September");
  });

  it("puts a line's points over the labels it draws under", () => {
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

    const source = chartMarkupOf(root, "chart-ragged-line-layer-churn");

    expect(source).toContain("M25 50L75 0");
    expect(source).not.toContain("M0");
  });

  it("paints the series a config and a data make, in the config's colours", () => {
    root = renderData(
      <BarChart
        aria-label="Visitors"
        config={{
          desktop: { label: "Desktop", color: "#2563eb" },
          mobile: { label: "Mobile", color: "#60a5fa" },
        }}
        data={[
          { month: "January", desktop: 186, mobile: 80 },
          { month: "February", desktop: 305, mobile: 200 },
        ]}
        width={200}
        height={100}
        testId="chart-configured"
      />,
    );
    settle(root);

    expect(requireStyle(root, "chart-configured-layer-desktop").color).toBe(
      "#2563eb",
    );
    expect(requireStyle(root, "chart-configured-layer-mobile").color).toBe(
      "#60a5fa",
    );

    expect(paintedText(root)).toContain("January");
    expect(paintedText(root)).toContain("February");
    expect(
      requireStyle(root, "chart-configured-legend-swatch-desktop")
        .backgroundColor,
    ).toBe("#2563eb");
  });

  it("keeps the caller's own series when no config is named", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[{ key: "revenue", label: "Revenue", values: [3] }]}
        width={200}
        height={100}
        testId="chart-unconfigured"
      />,
    );
    settle(root);

    expect(requireStyle(root, "chart-unconfigured-layer-revenue").color).toBe(
      colourAt(0),
    );
  });
});

/** Guards: a 30-day axis painted thirty clipped "Apr…" labels instead of a readable few. */
describe("a long category axis", () => {
  it("thins its labels so each reads whole", () => {
    root = renderData(
      <AreaChart
        aria-label="Thirty days"
        labels={Arr.makeBy(30, (i) => `Apr ${i + 1}`)}
        series={[{ key: "a", label: "A", values: Arr.makeBy(30, (i) => i) }]}
        width={600}
        height={100}
        testId="long-axis"
      />,
    );
    settle(root);
    const first = requireBounds(root, "long-axis-label-0");
    expect(first.width).toBeGreaterThanOrEqual(40);
    expect(root.renderer.findByTestId("long-axis-label-1")).toBeFalsy();
  });
});
