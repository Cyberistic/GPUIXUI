import { Badge } from "@gpuixui/components/badge";
import { examples as componentExamples } from "@gpuixui/components/examples";
import { Tabs, TabsList, TabsTrigger } from "@gpuixui/components/tabs";
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
import {
  Button,
  Checkbox,
  Input,
  RadioGroup,
  Slider,
  Switch,
  ToggleGroup,
} from "@gpuixui/primitives";
import {
  darkTheme,
  lightTheme,
  platformTheme,
  type Theme,
} from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import {
  cloneElement,
  createElement,
  isValidElement,
  type ComponentType,
  type ReactNode,
} from "react";
import type { Take } from "./take.js";

/** One wall tile's canvas, in points; captured at the rig's 2× scale. */
export const TILE = { width: 400, height: 267 };
/** One chart card in the chart scene. */
export const CARD = { width: 560, height: 380 };

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
const RINGS = [
  { key: "whale", label: "Whale Island", value: 86 },
  { key: "yorknew", label: "Yorknew", value: 72 },
  { key: "greed", label: "Greed Island", value: 61 },
  { key: "arena", label: "Heavens Arena", value: 48 },
  { key: "chimera", label: "Chimera Ant", value: 90 },
];
const SHARE = [
  { key: "enhancer", label: "Enhancer", value: 42 },
  { key: "transmuter", label: "Transmuter", value: 28 },
  { key: "conjurer", label: "Conjurer", value: 18 },
  { key: "emitter", label: "Emitter", value: 12 },
  { key: "specialist", label: "Specialist", value: 9 },
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
  { path: "hunter" },
  { path: "hunter/yorknew" },
  { path: "hunter/yorknew/auction", value: 40 },
  { path: "hunter/yorknew/troupe", value: 26 },
  { path: "hunter/greed-island" },
  { path: "hunter/greed-island/cards", value: 30 },
  { path: "hunter/greed-island/dodgeball", value: 18 },
  { path: "hunter/heavens-arena" },
  { path: "hunter/heavens-arena/floors", value: 22 },
];
const ARCS = [
  { path: "Yorknew", value: 40 },
  { path: "Greed Island", value: 30 },
  { path: "Chimera Ant", value: 26 },
  { path: "Heavens Arena", value: 18 },
  { path: "Whale Island", value: 12 },
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
      curve="natural"
    />
  ),
  area: (
    <AreaChart
      aria-label="Output"
      labels={LABELS}
      series={[COST, REVENUE]}
      stacked
      axis={false}
    />
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
    <ScatterChart
      aria-label="Load"
      labels={LABELS}
      series={[REVENUE, COST]}
      radius={5}
    />
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
  pie: (
    <PieChart aria-label="Nen types" data={SHARE} size={205} legend={false} />
  ),
  donut: (
    <DonutChart
      aria-label="Nen types"
      data={SHARE}
      size={205}
      legend={false}
      activeIndex={0}
      centerLabel="42"
    />
  ),
  radar: (
    <RadarChart
      aria-label="Discipline"
      labels={["Ten", "Zetsu", "Ren", "Hatsu", "Gyo"]}
      series={[{ key: "gon", label: "Gon", values: [70, 52, 88, 64, 40] }]}
      width={320}
      height={225}
      radius={82}
    />
  ),
  radial: (
    <RadialChart
      aria-label="Readers"
      data={RINGS}
      max={100}
      thickness={13}
      gap={5}
      track
      size={205}
      legend={false}
    />
  ),
  "radial-bar": (
    <RadialBarChart
      aria-label="Nen types"
      data={SHARE}
      size={205}
      legend={false}
    />
  ),
  treemap: (
    <TreemapChart
      aria-label="The arcs"
      nodes={ARCS}
      size={340}
      height={210}
      legend={false}
    />
  ),
  sankey: (
    <SankeyChart
      aria-label="The exam"
      {...FLOW}
      size={340}
      height={210}
      legend={false}
    />
  ),
  sunburst: (
    <SunburstChart
      aria-label="The arcs"
      nodes={TREE}
      size={205}
      legend={false}
    />
  ),
  sparkline: (
    <Sparkline
      aria-label="Aura trend"
      filled
      values={REVENUE.values}
      width={340}
      height={170}
    />
  ),
};

const mac = platformTheme(lightTheme, "darwin");
const macDark = platformTheme(darkTheme, "darwin");

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
        // An example's bare <text> inherits this, or it paints black on dark.
        color: theme.colors.foreground,
      }}
    >
      {children}
    </div>
  );
};

const tile = (child: () => ReactNode, theme: Theme = mac): Take => ({
  width: TILE.width,
  height: TILE.height,
  frames: TILE_FRAMES,
  view: () => (
    <ThemeProvider theme={theme}>
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

const STACK = { display: "flex", flexDirection: "column", gap: 14 } as const;
const ROW = {
  display: "flex",
  flexDirection: "row",
  gap: 10,
  flexWrap: "wrap",
} as const;

/** The everyday controls, each a tile of its own at a size that reads on the wall. */
const controls: Readonly<Record<string, () => ReactNode>> = {
  buttons: () => (
    <div style={ROW}>
      <Button variant="primary">Deploy</Button>
      <Button variant="secondary">Preview</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  ),
  switches: () => (
    <div style={STACK}>
      <Switch label="Wi-Fi" defaultChecked />
      <Switch label="Bluetooth" />
      <Switch label="Focus mode" defaultChecked />
    </div>
  ),
  checks: () => (
    <div style={STACK}>
      <Checkbox label="Hunter License" defaultChecked />
      <Checkbox label="Restricted areas" defaultChecked />
      <Checkbox label="Public records" />
    </div>
  ),
  radios: () => (
    <RadioGroup
      label="Nen type"
      defaultValue="enhancer"
      options={[
        { value: "enhancer", label: "Enhancer" },
        { value: "transmuter", label: "Transmuter" },
        { value: "conjurer", label: "Conjurer" },
      ]}
    />
  ),
  sliders: () => (
    <div style={STACK}>
      <Slider label="Volume" defaultValue={70} style={{ width: 300 }} />
      <Slider label="Aura" defaultValue={35} style={{ width: 300 }} />
    </div>
  ),
  toggles: () => (
    <ToggleGroup
      type="single"
      label="Range"
      defaultValue="week"
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ]}
    />
  ),
  views: () => (
    <ToggleGroup
      type="single"
      label="View"
      defaultValue="board"
      options={[
        { value: "list", label: "List" },
        { value: "board", label: "Board" },
        { value: "calendar", label: "Calendar" },
      ]}
    />
  ),
  "tab-strip": () => (
    <Tabs defaultValue="arena">
      <TabsList label="Venue">
        <TabsTrigger value="arena">Arena</TabsTrigger>
        <TabsTrigger value="island">Island</TabsTrigger>
        <TabsTrigger value="exam">Exam</TabsTrigger>
      </TabsList>
    </Tabs>
  ),
  badges: () => (
    <div style={ROW}>
      <Badge variant="success">Live</Badge>
      <Badge variant="danger">Failed</Badge>
      <Badge variant="outline">Draft</Badge>
      <Badge>Hunter</Badge>
    </div>
  ),
  inputs: () => (
    <div style={STACK}>
      <Input label="Name" placeholder="Gon Freecss" style={{ width: 300 }} />
      <Input label="Island" placeholder="Whale Island" style={{ width: 300 }} />
    </div>
  ),
};

const both = (
  prefix: string,
  id: string,
  child: () => ReactNode,
): ReadonlyArray<readonly [string, Take]> => [
  [`${prefix}-${id}`, tile(child)],
  [`dark-${prefix}-${id}`, tile(child, macDark)],
];

/** Every chart type and shipped example, as one capture each, in both modes. */
export const wallTakes: Readonly<Record<string, Take>> = R.fromEntries([
  // A fast draw: the film gives each chart under two seconds to land and read.
  ...Arr.flatMap(R.toEntries(charts), ([id, node]) =>
    both("chart", id, () =>
      isValidElement<{ animationDuration?: number }>(node)
        ? cloneElement(node, { animationDuration: 800 })
        : node,
    ),
  ),
  ...Arr.flatMap(R.toEntries(controls), ([id, child]) =>
    both("tile", id, child),
  ),
  ...Arr.flatMap(R.toEntries(registry), ([id, example]) =>
    both("tile", id, () => createElement(example)),
  ),
]);
