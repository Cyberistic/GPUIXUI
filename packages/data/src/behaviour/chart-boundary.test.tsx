import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { paintedText } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";
import {
  BarChart,
  ChartLegend,
  DonutChart,
  LineChart,
  Sparkline,
  StackedBar,
} from "../chart/chart.js";

let root: DataTestRoot | undefined;

const mount = (node: ReactNode): DataTestRoot => {
  root = renderData(node);
  settle(root);
  return root;
};

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("a chart whose stored list is null", () => {
  it("paints a series chart with no series list", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a list a store wrote as absent. */}
        <BarChart aria-label="Revenue" labels={["Q1", "Q2"]} series={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a stacked bar and a line with no series list", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a list a store wrote as absent. */}
        <StackedBar aria-label="Cost" labels={["Q1"]} series={null} />
        {/* @ts-expect-error — a list a store wrote as absent. */}
        <LineChart aria-label="Churn" labels={["Q1"]} series={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a series chart with no label list", () => {
    const mounted = mount(
      <div>
        <BarChart
          aria-label="Revenue"
          // @ts-expect-error — a list a store wrote as absent.
          labels={null}
          series={[{ key: "revenue", label: "Revenue", values: [3, 6] }]}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a series whose stored values are null", () => {
    const mounted = mount(
      <div>
        <BarChart
          aria-label="Revenue"
          labels={["Q1"]}
          // @ts-expect-error — a list a store wrote as absent.
          series={[{ key: "revenue", label: "Revenue", values: null }]}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a ring with no data list", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a list a store wrote as absent. */}
        <DonutChart aria-label="Traffic" data={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a legend with no item list", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a list a store wrote as absent. */}
        <ChartLegend items={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints a sparkline with no value list", () => {
    const mounted = mount(
      <div>
        {/* @ts-expect-error — a list a store wrote as absent. */}
        <Sparkline values={null} />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
  });

  it("paints the series of a stored list whose first entry is a hole", () => {
    const mounted = mount(
      <div>
        <BarChart
          testId="chart"
          aria-label="Revenue"
          labels={["Q1"]}
          // @ts-expect-error — a hole a store wrote inside the list.
          series={[null, { key: "revenue", label: "Revenue", values: [8] }]}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(mounted.renderer.findByTestId("chart-layer-revenue")).not.toBe(
      undefined,
    );
  });

  it("paints the rows of a legend whose stored entry is a hole", () => {
    const mounted = mount(
      <div>
        <ChartLegend
          // @ts-expect-error — a hole a store wrote inside the list.
          items={[null, { key: "revenue", label: "Revenue", color: "#5F4BDB" }]}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("Revenue");
  });

  it("paints the slices of a ring whose stored datum is a hole", () => {
    const mounted = mount(
      <div>
        <DonutChart
          testId="ring"
          aria-label="Traffic"
          // @ts-expect-error — a hole a store wrote inside the list.
          data={[null, { key: "direct", label: "Direct", value: 3 }]}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(mounted.renderer.findByTestId("ring-layer-direct")).not.toBe(
      undefined,
    );
  });

  it("paints no series for an entry that is not a record", () => {
    const mounted = mount(
      <div>
        <BarChart
          testId="chart"
          aria-label="Revenue"
          labels={["Q1"]}
          // @ts-expect-error — an entry a store wrote as something else.
          series={[42, { key: "revenue", label: "Revenue", values: [8] }]}
        />
        <text>after</text>
      </div>,
    );
    expect(paintedText(mounted)).toContain("after");
    expect(mounted.renderer.findByTestId("chart-layer-revenue")).not.toBe(
      undefined,
    );
  });
});
