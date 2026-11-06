import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { ChartExample } from "../../examples/chart.example.js";
import {
  AreaChart,
  BarChart,
  ChartLegend,
  LineChart,
  PieChart,
  RadarChart,
  RadialChart,
} from "../chart/chart.js";
import {
  chartMarkupOf,
  paintedText,
  requireStyle,
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

const sourceOf = (tree: DataTestRoot, testId: string): string =>
  chartMarkupOf(tree, testId);

afterEach(() => {
  root?.unmount();
  root = undefined;
});

describe("the sharper chart types", () => {
  it("paints an area's fill and its edge as two layers of one series", () => {
    const tree = mount();

    expect(sourceOf(tree, "chart-area-layer-revenue")).toContain("<path");
    expect(sourceOf(tree, "chart-area-layer-revenue-line")).toContain(
      "stroke=",
    );
    expect(requireStyle(tree, "chart-area-layer-revenue").color).toBe(
      palette[0],
    );
  });

  it("fades the fill in nested bands, so the top is the darkest", () => {
    const tree = mount();

    expect(
      tree.renderer.findByTestId("chart-area-layer-revenue-fade-0"),
    ).toBeDefined();
    expect(
      tree.renderer.findByTestId("chart-area-layer-revenue-fade-1"),
    ).toBeDefined();
  });

  it("separates a pie's slices, so two neighbours are not one shape", () => {
    const tree = mount();

    const direct = sourceOf(tree, "chart-pie-layer-direct");
    const search = sourceOf(tree, "chart-pie-layer-search");
    expect(direct).toContain("<path");
    expect(search).toContain("<path");

    expect(direct).not.toBe(sourceOf(tree, "chart-donut-layer-direct"));
  });

  it("paints a composed chart's bars and its line in different layers", () => {
    const tree = mount();

    expect(sourceOf(tree, "chart-composed-layer-revenue")).toContain("<rect");
    expect(sourceOf(tree, "chart-composed-layer-cost")).toContain("stroke=");
    expect(requireStyle(tree, "chart-composed-layer-cost").color).toBe(
      palette[1],
    );
  });

  it("draws a circular radar grid with rings, not a polygon", () => {
    const tree = mount();

    const web = sourceOf(tree, "chart-radar-layer-team-web");
    expect(web).toContain("A");
  });

  it("keeps a zero datum's ring in the stack and paints no arc for it", () => {
    const tree = mount();

    expect(
      tree.renderer.findByTestId("chart-radial-layer-referral"),
    ).toBeDefined();
    expect(sourceOf(tree, "chart-radial-layer-referral")).not.toContain(
      "<path",
    );
    expect(sourceOf(tree, "chart-radial-layer-direct")).toContain("<path");
  });

  it("paints a radar web and each series' outline in separate layers", () => {
    const tree = mount();

    expect(sourceOf(tree, "chart-radar-layer-team-web")).toContain("stroke=");
    expect(sourceOf(tree, "chart-radar-layer-team")).toContain("<path");
    expect(requireStyle(tree, "chart-radar-layer-team").color).toBe(palette[0]);
  });

  it("paints a radial track and its guide rings when asked", () => {
    const tree = mount();

    expect(tree.renderer.findByTestId("chart-radial-layer-grid")).toBeDefined();
    expect(
      tree.renderer.findByTestId("chart-radial-layer-direct-track"),
    ).toBeDefined();
  });

  it("stacks a pie's data on concentric bands", () => {
    root = renderData(
      <PieChart
        aria-label="Stacked traffic"
        data={[
          { key: "direct", label: "Direct", value: 50 },
          { key: "search", label: "Search", value: 30 },
          { key: "social", label: "Social", value: 20 },
        ]}
        stacked
        testId="chart-stacked-pie"
      />,
    );
    settle(root);

    const radiusOf = (key: string): number => {
      const source = sourceOf(
        root as DataTestRoot,
        `chart-stacked-pie-layer-${key}`,
      );
      return Number(/A([\d.]+)/.exec(source)?.[1] ?? 0);
    };
    expect(radiusOf("direct")).toBeGreaterThan(radiusOf("search"));
    expect(radiusOf("search")).toBeGreaterThan(radiusOf("social"));
  });

  it("paints a pie slice's label with a leader when it sits outside", () => {
    const tree = mount();

    expect(paintedText(tree)).toContain("Direct");
    expect(sourceOf(tree, "chart-pie-layer-leaders")).toContain("<path");
  });

  it("paints an icon on each radar corner and each line point", () => {
    const tree = mount();

    expect(tree.renderer.findByTestId("chart-radar-dot-team-0")).toBeDefined();
    expect(tree.renderer.findByTestId("chart-line-dot-churn-1")).toBeDefined();
  });

  it("rounds a radial arc with a cap at each end", () => {
    const tree = mount();

    expect(sourceOf(tree, "chart-radial-layer-direct")).toContain("<circle");
  });

  it("paints a line point's value when asked", () => {
    const tree = mount();

    expect(tree.renderer.findByTestId("chart-line-value-churn")).toBeDefined();
  });

  it("paints a radial chart's centre label", () => {
    root = renderData(
      <RadialChart
        aria-label="Storage by service"
        data={[{ key: "used", label: "Used", value: 62 }]}
        max={100}
        centerLabel="62%"
        testId="chart-radial-label"
      />,
    );
    settle(root);

    expect(paintedText(root)).toContain("62%");
  });

  it("stands a negative bar below the axis instead of hiding it", () => {
    root = renderData(
      <BarChart
        aria-label="Change"
        labels={["a", "b"]}
        series={[{ key: "delta", label: "Delta", values: [-40, 20] }]}
        width={200}
        height={100}
        testId="chart-negative"
      />,
    );
    settle(root);

    const shapes = seriesShapesOf(
      root,
      "chart-negative",
      "delta",
      palette[0] ?? "",
    );

    const rects = [
      ...shapes.join(" ").matchAll(/<rect x="([\d.]+)" y="([\d.]+)"/g),
    ];
    expect(rects.length).toBe(2);
    const tops = Arr.map(rects, (match) => Number(match[2]));
    expect(Math.min(...tops)).toBeLessThan(70);
  });

  it("draws horizontal bars in their own rows", () => {
    root = renderData(
      <BarChart
        aria-label="Signups"
        labels={["a", "b"]}
        series={[{ key: "signups", label: "Signups", values: [10, 20] }]}
        orientation="horizontal"
        width={200}
        height={100}
        testId="chart-horizontal"
      />,
    );
    settle(root);

    const source = sourceOf(root, "chart-horizontal-layer-signups");
    const rects = [...source.matchAll(/<rect x="([\d.]+)" y="([\d.]+)"/g)];
    expect(rects.length).toBe(2);

    const rows = Arr.map(rects, (match) => Number(match[2]));
    expect(rows[1]).toBeGreaterThan(rows[0] ?? 0);
  });

  it("prints a bar's value when asked", () => {
    root = renderData(
      <BarChart
        aria-label="Signups"
        labels={["a", "b"]}
        series={[{ key: "signups", label: "Signups", values: [10, 20] }]}
        valueLabels
        width={200}
        height={100}
        testId="chart-labelled"
      />,
    );
    settle(root);

    expect(
      root.renderer.findByTestId("chart-labelled-value-signups"),
    ).toBeDefined();
  });

  it("paints a hover zone per category, so the readout can name the column", () => {
    const tree = mount();

    expect(tree.renderer.findByTestId("chart-bars-zone-0")).toBeDefined();
    expect(tree.renderer.findByTestId("chart-bars-zone-3")).toBeDefined();
    expect(tree.renderer.findByTestId("chart-bars-zone-4")).toBeUndefined();
  });

  it("prints a bar's label through its own formatter", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[{ key: "revenue", label: "Revenue", values: [32] }]}
        valueLabels
        valueLabelFormat={(value, one) => `${one.label} ${value}`}
        testId="chart-bar-labels"
      />,
    );
    settle(root);

    expect(paintedText(root)).toContain("Revenue 32");
  });

  it("prints a radial ring's value at the end of its arc", () => {
    const tree = mount();

    expect(
      tree.renderer.findByTestId("chart-radial-value-direct"),
    ).toBeDefined();
  });

  it("prints a radar axis label through its own formatter", () => {
    const tree = mount();

    expect(paintedText(tree)).toContain("SHIP");
  });

  it("moves the readout with the pointer inside a column", () => {
    const tree = mount();
    const zone = tree.renderer.findByTestId("chart-bars-zone-1");
    if (zone === undefined) throw new Error("behaviour: no zone 1");
    const bounds = tree.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no zone bounds");

    tree.renderer.nativeSimulateMouseMove(bounds.x + 4, bounds.y + 10);
    tree.renderer.dispatchNativeEvents();
    const first = root?.renderer.findByTestId("chart-bars-tooltip");
    if (first === undefined) throw new Error("behaviour: no tooltip");

    tree.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width - 4,
      bounds.y + 60,
    );
    tree.renderer.dispatchNativeEvents();
    const second = root?.renderer.findByTestId("chart-bars-tooltip");
    if (second === undefined) throw new Error("behaviour: no tooltip");

    expect(second.style.left).not.toBe(first.style.left);
    expect(second.style.top).not.toBe(first.style.top);
  });

  it("activates a slice a press lands on", () => {
    const presses: Array<number> = [];
    const Controlled = () => {
      const [active, setActive] = useState<number | undefined>(undefined);
      return (
        <PieChart
          aria-label="Traffic"
          data={[
            { key: "direct", label: "Direct", value: 48 },
            { key: "search", label: "Search", value: 32 },
          ]}
          activeIndex={active}
          onSliceActivate={(_, index) => {
            presses.push(index);
            setActive(index);
          }}
          testId="chart-pie-active"
        />
      );
    };
    root = renderData(<Controlled />);
    settle(root);

    const before = sourceOf(root, "chart-pie-active-layer-search");
    const slice = root.renderer.findByTestId("chart-pie-active-slice-search");
    if (slice === undefined) throw new Error("behaviour: no slice zone");
    const bounds = root.renderer.getElementBounds(slice.id);
    if (bounds === null) throw new Error("behaviour: no slice bounds");
    root.renderer.nativeSimulateMouseDown(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.nativeSimulateMouseUp(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    expect(presses).toEqual([1]);
    expect(sourceOf(root, "chart-pie-active-layer-search")).not.toBe(before);
  });

  it("windows the categories a drag across the brush selects", () => {
    const domains: Array<readonly [number, number]> = [];
    const Brushed = () => {
      const [domain, setDomain] = useState<readonly [number, number]>([0, 4]);
      return (
        <BarChart
          aria-label="Revenue"
          labels={["Q1", "Q2", "Q3", "Q4"]}
          series={[{ key: "a", label: "A", values: [10, 20, 30, 40] }]}
          domain={domain}
          brush
          onDomainChange={(next) => {
            domains.push(next);
            setDomain(next);
          }}
          width={200}
          height={120}
          testId="chart-brush"
        />
      );
    };
    root = renderData(<Brushed />);
    settle(root);

    const brush = root.renderer.findByTestId("chart-brush-brush");
    if (brush === undefined) throw new Error("behaviour: no brush strip");
    const bounds = root.renderer.getElementBounds(brush.id);
    if (bounds === null) throw new Error("behaviour: no brush bounds");
    const xOf = (index: number): number =>
      bounds.x + (bounds.width / 4) * index + bounds.width / 8;
    const y = bounds.y + bounds.height / 2;

    root.renderer.nativeSimulateMouseDown(xOf(1), y);
    root.renderer.nativeSimulateMouseMove(xOf(2), y, 0);
    root.renderer.nativeSimulateMouseUp(xOf(2), y);
    root.renderer.dispatchNativeEvents();

    expect(domains.at(-1)).toEqual([1, 3]);
    const text = paintedText(root);
    expect(text).toContain("Q2");
    expect(text).toContain("Q3");
    expect(text).not.toContain("Q1");
    expect(text).not.toContain("Q4");
  });

  it("windows the categories a brush leaves", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1", "Q2", "Q3", "Q4"]}
        series={[{ key: "a", label: "A", values: [10, 20, 30, 40] }]}
        domain={[1, 3]}
        width={200}
        height={120}
        testId="chart-window"
      />,
    );
    settle(root);

    const text = paintedText(root);
    expect(text).toContain("Q2");
    expect(text).toContain("Q3");
    expect(text).not.toContain("Q1");
    expect(text).not.toContain("Q4");
    const shapes = seriesShapesOf(root, "chart-window", "a", palette[0] ?? "");
    expect(shapes.filter((shape) => shape.startsWith("<rect")).length).toBe(2);
  });

  it("shows a line point's datum under the pointer", () => {
    root = renderData(
      <LineChart
        aria-label="Churn"
        labels={["Q1", "Q2"]}
        series={[{ key: "churn", label: "Churn", values: [4, 3] }]}
        pointTooltip
        width={200}
        height={120}
        testId="chart-points"
      />,
    );
    settle(root);

    const zone = root.renderer.findByTestId("chart-points-point-churn-1");
    if (zone === undefined) throw new Error("behaviour: no point zone");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no point bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    expect(root.renderer.findByTestId("chart-points-point-tip")).toBeDefined();
    const text = paintedText(root);
    expect(text).toContain("Q2");
    expect(text).toContain("Churn");
    expect(text).toContain("3");
  });

  it("moves a point's card with the pointer inside its zone", () => {
    root = renderData(
      <LineChart
        aria-label="Churn"
        labels={["Q1", "Q2"]}
        series={[{ key: "churn", label: "Churn", values: [4, 3] }]}
        pointTooltip
        width={200}
        height={120}
        testId="chart-point-follow"
      />,
    );
    settle(root);

    const zone = root.renderer.findByTestId("chart-point-follow-point-churn-1");
    if (zone === undefined) throw new Error("behaviour: no point zone");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no point bounds");

    root.renderer.nativeSimulateMouseMove(bounds.x + 2, bounds.y + 2);
    root.renderer.dispatchNativeEvents();
    const first = root.renderer.findByTestId("chart-point-follow-point-tip");
    if (first === undefined) throw new Error("behaviour: no point card");

    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width - 2,
      bounds.y + bounds.height - 2,
    );
    root.renderer.dispatchNativeEvents();
    const second = root.renderer.findByTestId("chart-point-follow-point-tip");
    if (second === undefined) throw new Error("behaviour: no point card");

    expect(second.style.left).not.toBe(first.style.left);
    expect(second.style.top).not.toBe(first.style.top);
  });

  it("shows a radar corner's datum under the pointer", () => {
    root = renderData(
      <RadarChart
        aria-label="Coverage"
        labels={["Ship", "Review", "Test", "Design", "Docs"]}
        series={[{ key: "team", label: "Team", values: [8, 6, 7, 4, 5] }]}
        pointTooltip
        width={200}
        height={200}
        testId="chart-radar-points"
      />,
    );
    settle(root);

    const zone = root.renderer.findByTestId("chart-radar-points-point-team-0");
    if (zone === undefined) throw new Error("behaviour: no radar zone");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no radar bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    expect(
      root.renderer.findByTestId("chart-radar-points-point-tip"),
    ).toBeDefined();
    expect(paintedText(root)).toContain("Ship");
  });

  it("paints a series icon in the readout when the indicator asks", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[
          { key: "revenue", label: "Revenue", values: [10] },
          { key: "cost", label: "Cost", values: [6] },
        ]}
        tooltipIndicator="icon"
        tooltipIcons={["check", "bell"]}
        testId="chart-tooltip-icon"
      />,
    );
    settle(root);
    const zone = root.renderer.findByTestId("chart-tooltip-icon-zone-0");
    if (zone === undefined) throw new Error("behaviour: no zone");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    expect(
      root.renderer.findByTestId("chart-tooltip-icon-tooltip-icon-revenue"),
    ).toBeDefined();
    expect(
      root.renderer.findByTestId("chart-tooltip-icon-tooltip-icon-cost"),
    ).toBeDefined();
  });

  it("marks the readout's rows with the indicator it was given", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[{ key: "revenue", label: "Revenue", values: [10] }]}
        tooltipIndicator="line"
        testId="chart-indicator"
      />,
    );
    settle(root);

    const zone = root.renderer.findByTestId("chart-indicator-zone-0");
    if (zone === undefined) throw new Error("behaviour: no zone");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    const indicator = root.renderer.findByTestId(
      "chart-indicator-tooltip-indicator-revenue",
    );
    expect(indicator).toBeDefined();
    expect(indicator?.style.width).toBe(10);
  });

  it("draws no indicator when the readout asks for none", () => {
    root = renderData(
      <BarChart
        aria-label="Revenue"
        labels={["Q1"]}
        series={[{ key: "revenue", label: "Revenue", values: [10] }]}
        tooltipIndicator="none"
        testId="chart-no-indicator"
      />,
    );
    settle(root);
    const zone = root.renderer.findByTestId("chart-no-indicator-zone-0");
    if (zone === undefined) throw new Error("behaviour: no zone");
    const bounds = root.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no bounds");
    root.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    root.renderer.dispatchNativeEvents();

    expect(
      root.renderer.findByTestId("chart-no-indicator-tooltip"),
    ).toBeDefined();
    expect(
      root.renderer.findByTestId(
        "chart-no-indicator-tooltip-indicator-revenue",
      ),
    ).toBeUndefined();
  });

  it("paints a legend's marks in the shape it was asked for", () => {
    root = renderData(
      <div>
        <ChartLegend
          shape="dot"
          items={[{ key: "a", label: "A", color: "#3355FF" }]}
          testId="legend-dot"
        />
        <ChartLegend
          shape="line"
          items={[{ key: "b", label: "B", color: "#33AA55" }]}
          testId="legend-line"
        />
      </div>,
    );
    settle(root);

    expect(
      requireStyle(root, "legend-dot-swatch-a").borderRadius,
    ).toBeDefined();
    const line = requireStyle(root, "legend-line-swatch-b");
    expect(P.isNumber(line.width) ? line.width : 0).toBeGreaterThan(
      P.isNumber(line.height) ? line.height : 0,
    );
  });

  it("shows the hovered column's readout when the pointer enters it", () => {
    const tree = mount();
    const zone = tree.renderer.findByTestId("chart-bars-zone-1");
    if (zone === undefined) throw new Error("behaviour: no zone 1");
    const bounds = tree.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no zone bounds");
    tree.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    tree.renderer.dispatchNativeEvents();

    expect(tree.renderer.findByTestId("chart-bars-tooltip")).toBeDefined();
    expect(
      tree.renderer.findByTestId("chart-bars-tooltip-revenue"),
    ).toBeDefined();
    const text = paintedText(tree);
    expect(text).toContain("Q2");
    expect(text).toContain("48");
  });

  it("closes the readout when the pointer leaves the column", () => {
    const tree = mount();
    const zone = tree.renderer.findByTestId("chart-bars-zone-1");
    if (zone === undefined) throw new Error("behaviour: no zone 1");
    const bounds = tree.renderer.getElementBounds(zone.id);
    if (bounds === null) throw new Error("behaviour: no zone bounds");
    tree.renderer.nativeSimulateMouseMove(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    tree.renderer.dispatchNativeEvents();
    expect(paintedText(tree)).toContain("Q2");

    tree.renderer.nativeSimulateMouseMove(1, 1);
    tree.renderer.dispatchNativeEvents();
    expect(tree.renderer.findByTestId("chart-bars-tooltip")).toBeUndefined();
  });

  it("lays out an area chart with no labels without throwing", () => {
    root = renderData(
      <AreaChart
        aria-label="Nothing yet"
        labels={[]}
        series={[{ key: "a", label: "A", values: [] }]}
        testId="chart-empty-area"
      />,
    );
    settle(root);

    expect(root.renderer.findByTestId("chart-empty-area-plot")).toBeDefined();
  });

  it("keeps a pie and a radar mountable with a stored-absent list", () => {
    root = renderData(
      <div>
        <PieChart aria-label="Empty pie" data={[]} testId="chart-empty-pie" />
        <RadarChart
          aria-label="Empty radar"
          labels={[]}
          series={[]}
          testId="chart-empty-radar"
        />
        <RadialChart
          aria-label="Empty radial"
          data={[]}
          testId="chart-empty-radial"
        />
      </div>,
    );
    settle(root);

    expect(root.renderer.findByTestId("chart-empty-pie-plot")).toBeDefined();
    expect(root.renderer.findByTestId("chart-empty-radar-plot")).toBeDefined();
    expect(root.renderer.findByTestId("chart-empty-radial-plot")).toBeDefined();
  });
});
