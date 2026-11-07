import { afterEach, describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { darkTheme, seriesColors } from "@gpuixui/tokens";
import { FunnelChart } from "../chart/chart.js";
import {
  RadialBarChart,
  SankeyChart,
  SunburstChart,
  TreemapChart,
} from "../chart/structure.js";
import { chartMarkupOf } from "../internal/interaction.js";
import {
  renderData,
  settle,
  type DataTestRoot,
} from "../internal/test-root.js";

let root: DataTestRoot | undefined;

const palette = seriesColors(darkTheme);

afterEach(() => {
  root?.unmount();
  root = undefined;
});

const coloursOf = (markup: string): ReadonlyArray<string> =>
  Arr.map(
    [...markup.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)],
    (match) => match[1] ?? "",
  );

describe("the radial bar", () => {
  it("paints one bar per category, each in proportion to its value", () => {
    root = renderData(
      <RadialBarChart
        aria-label="The letters"
        testId="radial"
        colors={[palette[0] ?? "#B14AFF"]}
        data={[
          { key: "E", value: 40 },
          { key: "T", value: 30 },
          { key: "A", value: 20 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "radial");

    const radii = Arr.map(
      [...markup.matchAll(/<path[^>]*d="M[\d.-]+,[\d.-]+A([\d.]+),/g)],
      (match) => Number(match[1]),
    );
    expect(radii.length).toBe(3);

    expect(Math.max(...radii)).toBeGreaterThan(Math.min(...radii));

    expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThan(1.5);
  });
});

describe("the treemap", () => {
  it("paints each cell in its own colour", () => {
    root = renderData(
      <TreemapChart
        aria-label="Where the time goes"
        testId="treemap"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "engineering", value: 60 },
          { path: "design", value: 40 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "treemap");
    const colours = coloursOf(markup);

    expect(new Set(colours).size).toBe(2);
    expect(colours).toContain(palette[0] ?? "#B14AFF");
    expect(colours).toContain(palette[1] ?? "#00A893");
  });

  it("paints each cell in proportion to its value", () => {
    root = renderData(
      <TreemapChart
        aria-label="Where the time goes"
        testId="treemap"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "engineering", value: 75 },
          { path: "design", value: 25 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "treemap");
    const areas = Arr.map(
      [...markup.matchAll(/<rect[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/g)],
      (match) => Number(match[1]) * Number(match[2]),
    );
    expect(areas.length).toBe(2);
    const total = areas.reduce((sum, area) => sum + area, 0);
    const larger = Math.max(...areas);

    expect(larger / total).toBeGreaterThan(0.7);
    expect(larger / total).toBeLessThan(0.8);
  });

  it("gives a list of leaves a root of its own", () => {
    root = renderData(
      <TreemapChart
        aria-label="Where the time goes"
        testId="treemap"
        colors={[palette[0] ?? "#B14AFF"]}
        nodes={[
          { path: "engineering", value: 60 },
          { path: "design", value: 40 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "treemap");
    expect(coloursOf(markup).length).toBeGreaterThan(0);
  });
});

describe("the sankey", () => {
  it("paints the nodes and the ribbons", () => {
    root = renderData(
      <SankeyChart
        aria-label="The pipeline"
        testId="sankey"
        colors={[palette[0] ?? "#B14AFF"]}
        nodeColors={
          new Map([
            ["visits", palette[0] ?? "#B14AFF"],
            ["buys", palette[1] ?? "#00A893"],
          ])
        }
        nodes={[
          { id: "visits", name: "Visits" },
          { id: "buys", name: "Buys" },
        ]}
        links={[{ source: "visits", target: "buys", value: 40 }]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sankey");

    expect((markup.match(/<rect/g) ?? []).length).toBe(2);
    expect((markup.match(/<line/g) ?? []).length).toBe(1);

    expect(new Set(coloursOf(markup)).size).toBe(2);
  });

  it("drops a link naming a node the graph does not hold", () => {
    root = renderData(
      <SankeyChart
        aria-label="The pipeline"
        testId="sankey"
        colors={[palette[0] ?? "#B14AFF"]}
        nodes={[
          { id: "visits", name: "Visits" },
          { id: "buys", name: "Buys" },
        ]}
        links={[
          { source: "visits", target: "buys", value: 40 },
          { source: "visits", target: "nowhere", value: 10 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sankey");
    expect((markup.match(/<line/g) ?? []).length).toBe(1);
  });
});

describe("the sunburst", () => {
  it("paints each arc in its own colour", () => {
    root = renderData(
      <SunburstChart
        aria-label="The store"
        testId="sunburst"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "root/engineering", value: 60 },
          { path: "root/design", value: 40 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sunburst");
    const colours = coloursOf(markup);
    expect(new Set(colours).size).toBeGreaterThan(1);
    expect(colours).toContain(palette[0] ?? "#B14AFF");
    expect(colours).toContain(palette[1] ?? "#00A893");
  });

  it("paints each arc in proportion to its value", () => {
    root = renderData(
      <SunburstChart
        aria-label="The store"
        testId="sunburst"
        colors={[palette[0] ?? "#B14AFF", palette[1] ?? "#00A893"]}
        nodes={[
          { path: "root/engineering", value: 75 },
          { path: "root/design", value: 25 },
        ]}
      />,
    );
    settle(root);

    const markup = chartMarkupOf(root, "sunburst");

    const angles = Arr.map(
      [
        ...markup.matchAll(
          /<path[^>]*d="M([\d.-]+),([\d.-]+)A[^"]*?([\d.-]+),([\d.-]+)L/g,
        ),
      ],
      (match) => {
        const start: readonly [number, number] = [
          Number(match[1]),
          Number(match[2]),
        ];
        const end: readonly [number, number] = [
          Number(match[3]),
          Number(match[4]),
        ];
        const at = (point: readonly [number, number]): number =>
          Math.atan2(point[0], point[1]);
        let sweep = at(end) - at(start);
        if (sweep < 0) sweep += Math.PI * 2;
        return sweep;
      },
    );
    expect(angles.length).toBe(2);
    const total = angles.reduce((sum, angle) => sum + angle, 0);

    expect(Math.max(...angles) / total).toBeGreaterThan(0.7);
    expect(Math.max(...angles) / total).toBeLessThan(0.8);
  });
});

describe("a structural chart given no colours", () => {
  const nodes = [
    { path: "root/a", value: 40 },
    { path: "root/b", value: 20 },
  ];
  it.each([
    ["treemap", <TreemapChart testId="chart" nodes={nodes} animate={false} />],
    [
      "sunburst",
      <SunburstChart testId="chart" nodes={nodes} animate={false} />,
    ],
    [
      "radial bar",
      <RadialBarChart
        testId="chart"
        data={[{ key: "a", value: 40 }]}
        animate={false}
      />,
    ],
    [
      "sankey",
      <SankeyChart
        testId="chart"
        nodes={[{ id: "a" }, { id: "b" }]}
        links={[{ source: "a", target: "b", value: 10 }]}
        animate={false}
      />,
    ],
  ])("the %s paints the theme's series, not black", (_, chart) => {
    root = renderData(chart);
    settle(root);
    const painted = coloursOf(chartMarkupOf(root, "chart"));
    expect(painted.length).toBeGreaterThan(0);
    expect(painted).not.toContain("#000000");
  });
});

describe("a structural chart in layout", () => {
  it("holds the box it paints in", () => {
    root = renderData(
      <TreemapChart
        testId="held"
        nodes={[{ path: "a", value: 1 }]}
        size={120}
        height={80}
        legend={false}
      />,
    );
    settle(root);
    const element = root.renderer.findByTestId("held-document");
    const bounds =
      element === undefined || element === null
        ? null
        : root.renderer.getElementBounds(element.id);
    expect(bounds?.width).toBe(120);
    expect(bounds?.height).toBe(80);
  });
});

describe("a funnel's labels", () => {
  it("stand beside a bar too narrow to hold them, in the surface's colour", () => {
    root = renderData(
      <FunnelChart
        aria-label="Exam"
        testId="funnel"
        labels={["Applied", "Licensed"]}
        series={[]}
        stages={[400, 9]}
        width={300}
        height={120}
      />,
    );
    settle(root);
    const labels =
      root.renderer
        .findByType("text")
        .filter((node) => node.style.position === "absolute") ?? [];
    expect(labels[0]?.style.color).toBe(darkTheme.colors.primaryForeground);
    expect(labels[1]?.style.color).toBe(darkTheme.colors.foreground);
  });
});
