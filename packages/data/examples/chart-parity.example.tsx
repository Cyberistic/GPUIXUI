/** @jsxImportSource @gpuix/react */
/**
 * One native chart per reference example.
 *
 * `parity.ts` names every example shadcn's charts app plays and the option that
 * answers it; this file renders that answer as a real GPUix tree, so the map is
 * executable rather than a table. A behaviour suite mounts the gallery once and
 * asserts a named chart for every row.
 */

import type { ReactElement } from "react";
import { Match } from "effect";
import * as Arr from "effect/Array";
import {
  AreaChart,
  BarChart,
  ChartLegend,
  ComposedChart,
  DonutChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialChart,
  StackedBar,
} from "../src/chart/chart.js";
import { parity, type ParityEntry } from "../src/chart/parity.js";

const LABELS = ["Q1", "Q2", "Q3", "Q4"] as const;
const SERIES = [
  { key: "revenue", label: "Revenue", values: [32, 48, 41, 60] },
  { key: "cost", label: "Cost", values: [18, 22, 26, 24] },
] as const;
const NEGATIVE = [
  { key: "delta", label: "Delta", values: [-18, 24, -12, 30] },
] as const;
const RING = [
  { key: "direct", label: "Direct", value: 48 },
  { key: "search", label: "Search", value: 32 },
  { key: "social", label: "Social", value: 20 },
] as const;
const RADAR_LABELS = ["Ship", "Review", "Test", "Design", "Docs"] as const;
const RADAR_SERIES = [
  { key: "team", label: "Team", values: [8, 6, 7, 4, 5] },
] as const;
const ICONS = ["check", "info", "bell", "circle"] as const;
const RADAR_ICONS = ["check", "circle", "info", "bell", "eye"] as const;

const size = (id: string) => ({ width: 260, height: 140, testId: id });

const area = (row: ParityEntry): ReactElement =>
  Match.value(row.option).pipe(
    Match.when("axis", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        axis={false}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("gradient", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        gradient
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("dotIcons", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        dotIcons={ICONS}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("tooltip", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        pointTooltip
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("legend", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        legend="top"
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("curve", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        curve={row.example.includes("step") ? "step" : "linear"}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("stacked", () => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        stacked
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.orElse(() => (
      <AreaChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={LABELS}
        series={SERIES}
      />
    )),
  );

const bar = (row: ParityEntry): ReactElement =>
  Match.value(row.option).pipe(
    Match.when("activeBand", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        activeBand
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("orientation", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        orientation="horizontal"
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("tooltip", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        tooltip
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("valueLabels", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        valueLabels
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("valueLabelFormat", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        valueLabels
        valueLabelFormat={(value, one) => `${one.label} ${value}`}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("series", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={LABELS}
        series={row.example.includes("negative") ? NEGATIVE : SERIES}
      />
    )),
    Match.when("radius", () => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        radius={6}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.orElse(() => (
      <BarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={LABELS}
        series={SERIES}
      />
    )),
  );

const line = (row: ParityEntry): ReactElement =>
  Match.value(row.option).pipe(
    Match.when("dots", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        dots
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("colors", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        dots
        colors={["#7C5CFF", "#22A06B"]}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("dotIcons", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        dotIcons={ICONS}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("tooltip", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        pointTooltip
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("showLabels", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        showLabels
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("valueFormat", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        showLabels
        valueFormat={(value) => `${value}k`}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("curve", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        curve={row.example.includes("step") ? "step" : "linear"}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("series", () => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.orElse(() => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={LABELS}
        series={SERIES}
      />
    )),
  );

const ring = (row: ParityEntry, donut: boolean): ReactElement => {
  const Ring = donut ? DonutChart : PieChart;
  return Match.value(row.option).pipe(
    Match.when("innerRadius", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        innerRadius={0.6}
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("activeIndex", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        activeIndex={1}
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("centerLabel", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        centerLabel="100"
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("onSliceActivate", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        onSliceActivate={() => {}}
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("showLabels", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        showLabels
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("labelFormat", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        showLabels
        labelFormat={(datum, share) =>
          `${datum.key} ${Math.round(share * 100)}%`
        }
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("labelPosition", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        showLabels
        labelPosition="outside"
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("legendValues", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        legendValues
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("padAngle", () => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        padAngle={0}
        testId={`parity-${row.example}`}
      />
    )),
    Match.orElse(() => (
      <Ring
        aria-label={row.example}
        size={160}
        data={RING}
        testId={`parity-${row.example}`}
      />
    )),
  );
};

const radar = (row: ParityEntry): ReactElement =>
  Match.value(row.option).pipe(
    Match.when("fill", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        fill={!row.example.includes("lines")}
      />
    )),
    Match.when("dots", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        dots
      />
    )),
    Match.when("gridShape", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        gridShape="circle"
      />
    )),
    Match.when("gridFill", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        gridFill
      />
    )),
    Match.when("gridAt", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        gridAt={[0.25, 0.5, 0.75, 1]}
      />
    )),
    Match.when("webs", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        webs={row.example.includes("none")}
      />
    )),
    Match.when("dotIcons", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        dotIcons={RADAR_ICONS}
      />
    )),
    Match.when("axisLabelFormat", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        axisLabelFormat={(label) => label.toUpperCase()}
      />
    )),
    Match.when("legend", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        legend="top"
      />
    )),
    Match.when("radius", () => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
        radius={70}
      />
    )),
    Match.orElse(() => (
      <RadarChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={RADAR_LABELS}
        series={RADAR_SERIES}
      />
    )),
  );

const radial = (row: ParityEntry): ReactElement =>
  Match.value(row.option).pipe(
    Match.when("grid", () => (
      <RadialChart
        aria-label={row.example}
        size={160}
        data={RING}
        grid
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("showLabels", () => (
      <RadialChart
        aria-label={row.example}
        size={160}
        data={RING}
        showLabels
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("rounded", () => (
      <RadialChart
        aria-label={row.example}
        size={160}
        data={RING}
        rounded
        testId={`parity-${row.example}`}
      />
    )),
    Match.when("centerLabel", () => (
      <RadialChart
        aria-label={row.example}
        size={160}
        data={RING}
        centerLabel="100"
        testId={`parity-${row.example}`}
      />
    )),
    Match.orElse(() => (
      <RadialChart
        aria-label={row.example}
        size={160}
        data={RING}
        testId={`parity-${row.example}`}
      />
    )),
  );

/** The native chart one parity row names. */
export const chartForParity = (row: ParityEntry): ReactElement =>
  Match.value(row.native).pipe(
    Match.when("AreaChart", () => area(row)),
    Match.when("BarChart", () => bar(row)),
    Match.when("StackedBar", () => (
      <StackedBar
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        percent
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("ComposedChart", () => (
      <ComposedChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        lineKeys={["cost"]}
        labels={LABELS}
        series={SERIES}
      />
    )),
    Match.when("LineChart", () => line(row)),
    Match.when("PieChart", () => ring(row, false)),
    Match.when("DonutChart", () => ring(row, true)),
    Match.when("RadarChart", () => radar(row)),
    Match.when("RadialChart", () => radial(row)),
    Match.when("ChartLegend", () => (
      <ChartLegend
        items={[
          { key: "revenue", label: "Revenue", color: "#7C5CFF", value: "181k" },
        ]}
        testId={`parity-${row.example}`}
        shape={row.option === "shape" ? "dot" : "square"}
      />
    )),
    Match.orElse(() => (
      <LineChart
        aria-label={row.example}
        {...size(`parity-${row.example}`)}
        labels={LABELS}
        series={SERIES}
      />
    )),
  );

/** Every reference example as a native chart, in the map's order. */
export const PARITY_CHARTS: ReadonlyArray<{
  readonly id: string;
  readonly view: ReactElement;
}> = Arr.map(parity, (row) => ({
  id: row.example,
  view: chartForParity(row),
}));

/** All of them at once, for a renderer or a gallery. */
export const ParityGallery = () => (
  <div
    testId="chart-parity-gallery"
    style={{ display: "flex", flexDirection: "column", gap: 12, width: 300 }}
  >
    {Arr.map(PARITY_CHARTS, (row) => (
      <div key={row.id} testId={`parity-slot-${row.id}`}>
        {row.view}
      </div>
    ))}
  </div>
);
