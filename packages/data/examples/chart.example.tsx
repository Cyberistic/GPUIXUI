/**
 * A metrics screen: every chart the package ships, on one card surface.
 *
 * Each chart is one `<svg>` per series, tinted from the theme's categorical
 * scale, with its labels as text beside the plot. Nothing paints a surface, so
 * the same charts sit on a card, a page or a dialog without a second palette.
 *
 * The sizes are definite on purpose: a chart draws at the size it was given,
 * and a caller that wants a chart to follow a splitter passes the width it
 * measured. There is no `onLayout`-driven auto-size here, because a chart that
 * re-draws its masks on every layout pass is a cost this example does not need.
 */

import { StatCard } from "../src/surfaces/stat-card.js";
import {
  BarChart,
  DonutChart,
  LineChart,
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
  // A source nobody arrived from paints no slice: a zero is not a tiny slice.
  { key: "referral", label: "Referral", value: 0 },
];

/** A screen of charts over one card surface. */
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

      {/* A bar chart with two series, as the runtime paints it: one tinted mask
          per series over the same plot box. */}
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
          width={320}
          height={140}
          testId="chart-bars"
        />
      </div>

      <LineChart
        aria-label="Churn by quarter"
        labels={QUARTERS}
        series={[churn]}
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

      <DonutChart
        aria-label="Traffic by source"
        data={sources}
        size={160}
        testId="chart-donut"
      />
    </div>
  );
};
