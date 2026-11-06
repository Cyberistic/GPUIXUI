import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { MotionProvider } from "@gpuixui/motion/react";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import type { ReactNode } from "react";
import {
  AreaChart,
  BarChart,
  CandleChart,
  ComposedChart,
  DonutChart,
  FunnelChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialChart,
  ScatterChart,
  Sparkline,
  StackedBar,
} from "../chart/chart.js";
import {
  RadialBarChart,
  SankeyChart,
  SunburstChart,
  TreemapChart,
} from "../chart/structure.js";
import {
  chartMarkupOf,
  seriesMarkupOf,
  seriesShapesOf,
} from "../internal/interaction.js";
import { decodeA11yTree, withRole } from "../internal/a11y.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

const temporal = Reflect.get(globalThis, "Temporal");
Reflect.deleteProperty(globalThis, "Temporal");

const fakeTimers = (): void => {
  vi.useFakeTimers();
};

afterAll(() => {
  if (temporal !== undefined) Reflect.set(globalThis, "Temporal", temporal);
});

const colourAt = (index: number): string =>
  seriesColors(darkTheme)[index] ?? "#000000";

afterEach(() => {
  root?.unmount();
  root = undefined;
  vi.useRealTimers();
});

const firstBarHeight = (tree: DataTestRoot, testId: string): number => {
  const shapes = seriesShapesOf(tree, testId, "a", colourAt(0));
  const match = /<rect[^>]*height="([\d.]+)"/.exec(shapes.join(" "));
  if (match?.[1] === undefined)
    throw new Error(`behaviour: no bar in ${testId}`);
  return Number(match[1]);
};

describe("a chart's data change", () => {
  it("paints the frames between the two data sets", async () => {
    fakeTimers();
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [10] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={160}
        width={200}
        height={160}
        testId="chart-anim"
      />,
      "dark",
      { motion: "animated" },
    );
    settle(root);
    await vi.advanceTimersByTimeAsync(220);
    settle(root);
    const start = firstBarHeight(root, "chart-anim");

    root.rerender(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [100] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={160}
        width={200}
        height={160}
        testId="chart-anim"
      />,
    );
    settle(root);
    await vi.advanceTimersByTimeAsync(48);
    settle(root);
    const middle = firstBarHeight(root, "chart-anim");
    await vi.advanceTimersByTimeAsync(200);
    settle(root);
    const end = firstBarHeight(root, "chart-anim");

    expect(start).toBe(16);
    expect(end).toBe(160);
    expect(middle).toBeGreaterThan(start);
    expect(middle).toBeLessThan(end);
  });

  it("lands exactly on the target when the tween ends", async () => {
    fakeTimers();
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [100] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={40}
        width={200}
        height={160}
        testId="chart-anim-end"
      />,
      "dark",
      { motion: "animated" },
    );
    settle(root);
    root.rerender(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "a", label: "A", values: [10] },
          { key: "b", label: "B", values: [100] },
        ]}
        animate
        animationDuration={40}
        width={200}
        height={160}
        testId="chart-anim-end"
      />,
    );
    settle(root);
    await vi.advanceTimersByTimeAsync(120);
    settle(root);

    expect(firstBarHeight(root, "chart-anim-end")).toBe(16);
  });

  it("paints the target at once when the reader asked for less motion", async () => {
    const chart = (value: number) => (
      <MotionProvider preference="reduced">
        <BarChart
          aria-label="Revenue"
          labels={["Q1"]}
          series={[
            { key: "a", label: "A", values: [value] },
            { key: "b", label: "B", values: [100] },
          ]}
          animate
          animationDuration={160}
          width={200}
          height={160}
          testId="chart-reduced"
        />
      </MotionProvider>
    );
    root = renderData(chart(10));
    settle(root);
    expect(firstBarHeight(root, "chart-reduced")).toBe(16);

    root.rerender(chart(100));
    settle(root);
    expect(firstBarHeight(root, "chart-reduced")).toBe(160);
  });
});

interface MountCase {
  readonly id: string;
  readonly node: (testId: string) => ReactNode;

  readonly read: (root: DataTestRoot, testId: string) => string;

  readonly legend?: boolean;
}

const documentOf = (root: DataTestRoot, testId: string): string =>
  chartMarkupOf(root, testId);

const ringOf = (root: DataTestRoot, testId: string): string =>
  seriesShapesOf(root, testId, "a", colourAt(0)).join(" ");

const sparklineOf = (root: DataTestRoot, testId: string): string =>
  seriesMarkupOf(root, testId, "sparkline", colourAt(0));

const card = (_id: string) => ({
  key: "a",
  label: "A",
  values: [10, 20],
});

const mountCases: ReadonlyArray<MountCase> = [
  {
    id: "mount-bar",
    node: (testId) => (
      <BarChart
        aria-label="Bar"
        legend
        labels={["Q1", "Q2"]}
        series={[card(testId)]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-stacked",
    node: (testId) => (
      <StackedBar
        aria-label="Stacked"
        labels={["Q1", "Q2"]}
        series={[card(testId), { key: "b", label: "B", values: [4, 8] }]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-line",
    node: (testId) => (
      <LineChart
        aria-label="Line"
        legend
        labels={["Q1", "Q2"]}
        series={[card(testId)]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-area",
    node: (testId) => (
      <AreaChart
        aria-label="Area"
        legend
        labels={["Q1", "Q2"]}
        series={[card(testId)]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-composed",
    node: (testId) => (
      <ComposedChart
        aria-label="Composed"
        labels={["Q1", "Q2"]}
        series={[card(testId), { key: "b", label: "B", values: [4, 8] }]}
        lineKeys={["b"]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-scatter",
    node: (testId) => (
      <ScatterChart
        aria-label="Scatter"
        legend
        labels={["Q1", "Q2"]}
        series={[card(testId)]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-candle",
    node: (testId) => (
      <CandleChart
        aria-label="Candle"
        legend
        labels={["Q1", "Q2"]}
        candles={[
          { open: 2, high: 6, low: 1, close: 5 },
          { open: 5, high: 8, low: 4, close: 6 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-funnel",
    node: (testId) => (
      <FunnelChart
        aria-label="Funnel"
        legend
        stages={[100, 60]}
        stageLabels={["A", "B"]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-pie",
    node: (testId) => (
      <PieChart
        aria-label="Pie"
        data={[
          { key: "a", label: "A", value: 10 },
          { key: "b", label: "B", value: 20 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: ringOf,
  },
  {
    id: "mount-donut",
    node: (testId) => (
      <DonutChart
        aria-label="Donut"
        data={[
          { key: "a", label: "A", value: 10 },
          { key: "b", label: "B", value: 20 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: ringOf,
  },
  {
    id: "mount-radar",
    node: (testId) => (
      <RadarChart
        aria-label="Radar"
        legend
        labels={["Q1", "Q2", "Q3"]}
        series={[{ key: "a", label: "A", values: [10, 20, 15] }]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-radial",
    node: (testId) => (
      <RadialChart
        aria-label="Radial"
        data={[
          { key: "a", label: "A", value: 10 },
          { key: "b", label: "B", value: 20 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: ringOf,
  },
  {
    id: "mount-sparkline",
    node: (testId) => (
      <Sparkline
        aria-label="Sparkline"
        values={[3, 6, 2, 8]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: sparklineOf,
    legend: false,
  },
  {
    id: "mount-treemap",
    node: (testId) => (
      <TreemapChart
        aria-label="Treemap"
        nodes={[
          { path: "engineering", value: 60 },
          { path: "design", value: 40 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-sankey",
    node: (testId) => (
      <SankeyChart
        aria-label="Sankey"
        nodes={[
          { id: "visits", name: "Visits" },
          { id: "signups", name: "Signups" },
        ]}
        links={[{ source: "visits", target: "signups", value: 60 }]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-sunburst",
    node: (testId) => (
      <SunburstChart
        aria-label="Sunburst"
        nodes={[
          { path: "root/engineering", value: 60 },
          { path: "root/design", value: 40 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
  {
    id: "mount-radial-bar",
    node: (testId) => (
      <RadialBarChart
        aria-label="Radial bar"
        data={[
          { key: "a", label: "A", value: 10 },
          { key: "b", label: "B", value: 20 },
        ]}
        animationDuration={32}
        testId={testId}
      />
    ),
    read: documentOf,
  },
];

describe("a chart's first paint", () => {
  it("starts a bar at zero and reaches the data within the duration", async () => {
    fakeTimers();
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[{ key: "a", label: "A", values: [100] }]}
        animationDuration={80}
        width={200}
        height={160}
        testId="chart-mount"
      />,
      "dark",
      { motion: "animated" },
    );
    settle(root);
    expect(seriesShapesOf(root, "chart-mount", "a", colourAt(0))).toEqual([]);

    await vi.advanceTimersByTimeAsync(120);
    settle(root);
    expect(firstBarHeight(root, "chart-mount")).toBe(160);
  });

  it("names the series and its legend from the first frame", async () => {
    fakeTimers();
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[{ key: "a", label: "A", values: [100] }]}
        legend
        animationDuration={80}
        width={200}
        height={160}
        testId="chart-mount-words"
      />,
      "dark",
      { motion: "animated" },
    );
    settle(root);

    const tree = decodeA11yTree(root.renderer.getA11yTree());
    expect(
      withRole(tree, tree.root, "Image").map(
        (id) => tree.nodes[id]?.aria.label ?? "",
      ),
    ).toContain("A");
    expect(
      root.renderer.findByTestId("chart-mount-words-legend"),
    ).toBeDefined();
  });

  it("gives every shipped type a zero first frame and its data at rest", async () => {
    fakeTimers();
    for (const one of mountCases) {
      root = renderData(one.node(one.id), "dark", { motion: "animated" });
      settle(root);

      if (one.legend !== false) {
        expect(
          root.renderer.findByTestId(`${one.id}-legend`),
          `${one.id} has no legend on its first frame`,
        ).toBeDefined();
      }
      const first = one.read(root, one.id);

      await vi.advanceTimersByTimeAsync(64);
      settle(root);
      const settled = one.read(root, one.id);
      expect(settled.length, `${one.id} settles on nothing`).toBeGreaterThan(0);
      expect(settled, `${one.id} did not animate its first paint`).not.toEqual(
        first,
      );

      root.unmount();
      root = undefined;
    }
  });
});
