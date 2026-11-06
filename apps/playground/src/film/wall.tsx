import { examples as componentExamples } from "@gpuixui/components/examples";
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
  RadialBarChart,
  RadialChart,
  SankeyChart,
  ScatterChart,
  Sparkline,
  StackedBar,
  SunburstChart,
  TreemapChart,
} from "@gpuixui/data";
import { examples as dataExamples } from "@gpuixui/data/examples";
import { examples as editorExamples } from "@gpuixui/editor/examples";
import { examples as fileExamples } from "@gpuixui/files/examples";
import { examples as fxExamples } from "@gpuixui/fx/examples";
import { examples as mediaExamples } from "@gpuixui/media/examples";
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import { createElement, type ComponentType, type ReactNode } from "react";
import type { Take } from "./take.js";

/** One wall tile's canvas, in points; captured at the rig's 2× scale. */
export const TILE = { width: 480, height: 320 };

/** Long enough for a chart's mount animation to finish and settle. */
const TILE_FRAMES = 54;

const LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const REVENUE = {
  key: "aura",
  label: "Aura",
  values: [32, 48, 41, 60, 52, 74, 68, 88],
};
const COST = {
  key: "nen",
  label: "Nen",
  values: [18, 22, 26, 24, 34, 30, 42, 39],
};
const SHARE = [
  { key: "enhancer", label: "Enhancer", value: 42 },
  { key: "transmuter", label: "Transmuter", value: 28 },
  { key: "conjurer", label: "Conjurer", value: 18 },
  { key: "emitter", label: "Emitter", value: 12 },
];
const FLOW = {
  nodes: [
    { id: "exam", label: "Exam" },
    { id: "pass", label: "Pass" },
    { id: "fail", label: "Fail" },
    { id: "hunter", label: "Hunter" },
  ],
  links: [
    { source: "exam", target: "pass", value: 40 },
    { source: "exam", target: "fail", value: 60 },
    { source: "pass", target: "hunter", value: 40 },
  ],
};
const TREE = [
  { path: "yorknew/auction", value: 40 },
  { path: "yorknew/troupe", value: 26 },
  { path: "greed-island/cards", value: 30 },
  { path: "greed-island/dodgeball", value: 18 },
  { path: "heavens-arena", value: 22 },
];
const CANDLES = Arr.makeBy(14, (i) => {
  const open = 50 + 14 * Math.sin(i / 2);
  const close = 50 + 14 * Math.sin((i + 1) / 2);
  return {
    open,
    close,
    high: Math.max(open, close) + 5,
    low: Math.min(open, close) - 5,
  };
});

const charts: Readonly<Record<string, ReactNode>> = {
  bar: <BarChart aria-label="Bouts" labels={LABELS} series={[REVENUE, COST]} />,
  stacked: (
    <StackedBar aria-label="Aura" labels={LABELS} series={[REVENUE, COST]} />
  ),
  line: (
    <LineChart
      aria-label="Trend"
      labels={LABELS}
      series={[REVENUE, COST]}
      curve="smooth"
    />
  ),
  area: (
    <AreaChart aria-label="Output" labels={LABELS} series={[REVENUE, COST]} />
  ),
  composed: (
    <ComposedChart
      aria-label="Bouts and aura"
      labels={LABELS}
      series={[REVENUE, COST]}
      lineKeys={["nen"]}
    />
  ),
  scatter: (
    <ScatterChart aria-label="Load" labels={LABELS} series={[REVENUE, COST]} />
  ),
  candle: (
    <CandleChart
      aria-label="Card prices"
      labels={Arr.makeBy(14, String)}
      series={[]}
      candles={CANDLES}
    />
  ),
  funnel: (
    <FunnelChart
      aria-label="The exam"
      labels={["Applied", "Phase one", "Phase two", "Licensed"]}
      series={[]}
      stages={[404, 148, 42, 9]}
    />
  ),
  pie: <PieChart aria-label="Nen types" data={SHARE} size={210} />,
  donut: <DonutChart aria-label="Nen types" data={SHARE} size={210} />,
  radar: (
    <RadarChart
      aria-label="Discipline"
      labels={["Ten", "Zetsu", "Ren", "Hatsu", "Gyo"]}
      series={[{ key: "gon", label: "Gon", values: [70, 52, 88, 64, 40] }]}
      radius={110}
    />
  ),
  radial: (
    <RadialChart
      aria-label="Aura"
      data={SHARE}
      max={50}
      centerLabel="62%"
      thickness={12}
    />
  ),
  "radial-bar": <RadialBarChart aria-label="Nen types" data={SHARE} />,
  treemap: <TreemapChart aria-label="The arcs" nodes={TREE} />,
  sankey: <SankeyChart aria-label="The exam" {...FLOW} />,
  sunburst: <SunburstChart aria-label="The arcs" nodes={TREE} />,
  sparkline: (
    <Sparkline
      aria-label="Aura trend"
      values={REVENUE.values}
      width={400}
      height={180}
    />
  ),
};

const mac = platformTheme(lightTheme, "darwin");

const Canvas = ({ children }: { readonly children: ReactNode }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        width: TILE.width,
        height: TILE.height,
        padding: theme.spacing.lg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: theme.colors.card,
      }}
    >
      {children}
    </div>
  );
};

const tile = (child: () => ReactNode): Take => ({
  width: TILE.width,
  height: TILE.height,
  frames: TILE_FRAMES,
  view: () => (
    <ThemeProvider theme={mac}>
      <Canvas>{child()}</Canvas>
    </ThemeProvider>
  ),
});

const registry: Readonly<Record<string, ComponentType>> = {
  ...componentExamples,
  ...dataExamples,
  ...editorExamples,
  ...fileExamples,
  ...fxExamples,
  ...mediaExamples,
};

const chartTakes = R.fromEntries(
  Arr.map(R.toEntries(charts), ([id, node]) => [`chart-${id}`, tile(() => node)]),
);

const exampleTakes = R.fromEntries(
  Arr.map(R.toEntries(registry), ([id, example]) => [
    `tile-${id}`,
    tile(() => createElement(example)),
  ]),
);

/** Every chart type and every shipped example, as one capture each. */
export const wallTakes: Readonly<Record<string, Take>> = {
  ...chartTakes,
  ...exampleTakes,
};
