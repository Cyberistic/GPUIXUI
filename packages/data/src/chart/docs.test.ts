import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/charts/charts.mdx");

const sources = {
  chart: `${read("./chart.tsx")}\n${read("./frame.tsx")}`,
  legend: read("./legend.tsx"),
  structure: read("./structure.tsx"),
} as const;

const source = sources.chart;
const recipe = read("./recipe.ts");
const inventory = read("../../../../.agents/slop/COMPONENTS.md");

const recipeConstant = (name: string): string => {
  const body = new RegExp(`export const ${name} =\\s*([\\s\\S]*?);\\n`).exec(
    recipe,
  );
  if (body?.[1] === undefined) throw new Error(`no ${name} in recipe.ts`);
  return body[1];
};

const chartsRow = (): string => {
  const row = inventory
    .split("\n")
    .find((line) => line.startsWith("| Charts |"));
  if (row === undefined)
    throw new Error(".agents/slop/COMPONENTS.md has no Charts row");
  return row;
};

interface Section {
  readonly heading: string;

  readonly type: string;

  readonly module: "chart" | "legend" | "structure";
}

const sections: ReadonlyArray<Section> = [
  { heading: "`BarChart`", type: "BarChartProps", module: "chart" },
  { heading: "`StackedBar`", type: "StackedBarProps", module: "chart" },
  { heading: "`LineChart`", type: "LineChartProps", module: "chart" },
  { heading: "`ComposedChart`", type: "ComposedChartProps", module: "chart" },
  { heading: "`ScatterChart`", type: "ScatterChartProps", module: "chart" },
  { heading: "`CandleChart`", type: "CandleChartProps", module: "chart" },
  { heading: "`FunnelChart`", type: "FunnelChartProps", module: "chart" },
  { heading: "`AreaChart`", type: "AreaChartProps", module: "chart" },
  {
    heading: "`PieChart` · `DonutChart`",
    type: "PieChartProps",
    module: "chart",
  },
  { heading: "`RadarChart`", type: "RadarChartProps", module: "chart" },
  { heading: "`RadialChart`", type: "RadialChartProps", module: "chart" },
  { heading: "`Sparkline`", type: "SparklineProps", module: "chart" },
  {
    heading: "`RadialBarChart`",
    type: "RadialBarChartProps",
    module: "structure",
  },
  {
    heading: "`TreemapChart`",
    type: "TreemapChartProps",
    module: "structure",
  },
  {
    heading: "`SankeyChart`",
    type: "SankeyChartProps",
    module: "structure",
  },
  {
    heading: "`SunburstChart`",
    type: "SunburstChartProps",
    module: "structure",
  },
  {
    heading: "`ChartLegend`",
    type: "ChartLegendProps",
    module: "legend",
  },
  { heading: "The shared frame", type: "ChartProps", module: "chart" },
];

const hostProps: ReadonlyArray<string> = ["aria-label", "style", "ref"];

const sectionOf = (site: string, heading: string): string => {
  const start = site.indexOf(`### ${heading}\n`);
  if (start === -1) throw new Error(`no ${heading} section`);
  const body = site.slice(start + heading.length + 5);
  const next = body.search(/^#{2,3} /m);
  return next === -1 ? body : body.slice(0, next);
};

const declaredProps = (
  type: string,
  module: Section["module"],
): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${type}[^{]*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(sources[module]);
  if (body?.[1] === undefined) throw new Error(`no ${type}`);
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const documentedProps = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\| `([^`]+)` \|/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

const undocumented = (section: Section): ReadonlyArray<string> => {
  const documented = documentedProps(sectionOf(page, section.heading));
  return Arr.map(
    Arr.filter(
      declaredProps(section.type, section.module),
      (prop) => !documented.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );
};

const invented = (section: Section): ReadonlyArray<string> => {
  const declared = declaredProps(section.type, section.module);
  return Arr.map(
    Arr.filter(
      documentedProps(sectionOf(page, section.heading)),
      (prop) => !declared.includes(prop) && !hostProps.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );
};

describe("the charts page's API tables", () => {
  it("documents every prop each chart part declares", () => {
    expect(sections).toHaveLength(18);
    expect(
      Arr.length(
        Arr.flatMap(sections, (section) =>
          declaredProps(section.type, section.module),
        ),
      ),
    ).toBeGreaterThan(20);

    expect(Arr.flatMap(sections, undocumented)).toEqual([]);
  });

  it("names only props the chart part takes", () => {
    expect(Arr.flatMap(sections, invented)).toEqual([]);
  });

  it("gives every shipped chart part a table", () => {
    expect(
      Arr.flatMap(sections, (section) => section.heading.split(" · ")),
    ).toEqual([
      "`BarChart`",
      "`StackedBar`",
      "`LineChart`",
      "`ComposedChart`",
      "`ScatterChart`",
      "`CandleChart`",
      "`FunnelChart`",
      "`AreaChart`",
      "`PieChart`",
      "`DonutChart`",
      "`RadarChart`",
      "`RadialChart`",
      "`Sparkline`",
      "`RadialBarChart`",
      "`TreemapChart`",
      "`SankeyChart`",
      "`SunburstChart`",
      "`ChartLegend`",
      "The shared frame",
    ]);
    expect(
      Arr.filter(
        sections,
        (section) =>
          Arr.length(documentedProps(sectionOf(page, section.heading))) === 0,
      ),
    ).toEqual([]);
  });

  it("clips a category label to its slot, and says so", () => {
    expect(recipeConstant("CHART_CATEGORY")).toContain("overflow-hidden");
    expect(recipeConstant("CHART_CATEGORY_LABEL")).toContain("text-ellipsis");
    expect(recipeConstant("CHART_CATEGORY_LABEL")).toContain(
      "whitespace-nowrap",
    );

    expect(source).toContain("CHART_CATEGORY_LABEL");
    expect(source).toMatch(/width: slot,\s*\n\s*textAlign: "center"/);
    expect(page).toContain("clipped at the slot's edge");
    expect(chartsRow()).toContain("clipped");
  });

  it("names the scene compiler and the subpaths the chart depends on", () => {
    const bridge = read("./scene.ts");
    expect(bridge).toContain("@tanstack/charts/scene");
    expect(bridge).toContain("@tanstack/charts/scales/linear");
    expect(page).toContain("TanStack Charts");
    expect(page).toContain("/scales/*");

    expect(bridge).not.toContain("@tanstack/charts/canvas");
    expect(bridge).not.toContain("@tanstack/charts/dom");
  });

  it("says that a chart is one element with every series' colour", () => {
    expect(page).toContain("every series' own colour");
    expect(page).toContain("one element");
    expect(page).toContain("real gradient");
  });
});
