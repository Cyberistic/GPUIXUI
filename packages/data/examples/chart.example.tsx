/** @jsxImportSource @gpuix/react */
import { StatCard } from "../src/surfaces/stat-card.js";
import {
  AreaChart,
  BarChart,
  ComposedChart,
  DonutChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialChart,
  Sparkline,
  StackedBar,
} from "../src/chart/chart.js";
import { textStyle, useTheme } from "../src/theme.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

const revenue = {
  key: "revenue",
  label: "Revenue",
  values: [32, 48, 41, 60],
};

const cost = {
  key: "cost",
  label: "Cost",
  values: [18, 22, 26, 24],
};

const churn = {
  key: "churn",
  label: "Churn",
  values: [4, 3, 5, 2],
};

const sources = [
  { key: "direct", label: "Direct", value: 48 },
  { key: "search", label: "Search", value: 32 },
  { key: "social", label: "Social", value: 20 },

  { key: "referral", label: "Referral", value: 0 },
];

export const ChartExample = () => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        width: 560,
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.md }}
      >
        <StatCard
          label="Revenue"
          value="181"
          unit="k"
          hint="This year"
          testId="chart-stat"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: theme.spacing.xs,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            Revenue trend
          </text>
          <Sparkline
            aria-label="Revenue trend"
            values={revenue.values}
            width={160}
            height={40}
            testId="chart-sparkline"
          />
        </div>
      </div>

      {}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
          }}
        >
          Revenue against cost
        </text>
        <BarChart
          aria-label="Revenue against cost by quarter"
          labels={QUARTERS}
          series={[revenue, cost]}
          valueLabels
          valueLabelFormat={(value, one) => `${one.label} ${value}`}
          width={320}
          height={140}
          testId="chart-bars"
        />
      </div>

      <LineChart
        aria-label="Churn by quarter"
        labels={QUARTERS}
        series={[churn]}
        showLabels
        dotIcons={["check", "info", "bell", "circle"]}
        width={360}
        height={120}
        testId="chart-line"
      />

      <StackedBar
        aria-label="Revenue and cost stacked by quarter"
        labels={QUARTERS}
        series={[revenue, cost]}
        width={360}
        height={140}
        testId="chart-stacked"
      />

      <AreaChart
        aria-label="Revenue and cost as areas"
        labels={QUARTERS}
        series={[revenue, cost]}
        width={360}
        height={140}
        testId="chart-area"
      />

      <DonutChart
        aria-label="Traffic by source"
        data={sources}
        size={160}
        testId="chart-donut"
      />

      <PieChart
        aria-label="Traffic by source as a pie"
        data={sources}
        size={160}
        showLabels
        labelPosition="outside"
        activeIndex={1}
        testId="chart-pie"
      />

      <ComposedChart
        aria-label="Revenue as bars, cost as a line"
        labels={QUARTERS}
        series={[revenue, cost]}
        lineKeys={["cost"]}
        width={360}
        height={140}
        testId="chart-composed"
      />

      <RadarChart
        aria-label="Coverage by discipline"
        labels={["Ship", "Review", "Test", "Design", "Docs"]}
        series={[{ key: "team", label: "Team", values: [8, 6, 7, 4, 5] }]}
        width={220}
        height={180}
        gridShape="circle"
        gridFill
        gridAt={[0.25, 0.5, 0.75, 1]}
        dotIcons={["check", "circle", "info", "bell", "eye"]}
        axisLabelFormat={(label) => label.toUpperCase()}
        testId="chart-radar"
      />

      <RadialChart
        aria-label="Storage by service"
        data={sources}
        max={100}
        size={160}
        centerLabel="100"
        track
        grid
        rounded
        showLabels
        testId="chart-radial"
      />
    </div>
  );
};
