import {
  axisTicks,
  chartBox,
  chartScale,
  groupedBarMarks,
  linePath,
  seriesColour,
  tickLabel,
  type ChartBox,
  type ChartMark,
  type ChartSeries,
} from "@gpuixui/data/chart/logic";
import { seriesColors, type Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useState } from "react";
import { usePlatform } from "./platform-toggle";

/**
 * Browser preview for the Charts page.
 *
 * The shipped charts are GPUix trees painted as one `<svg>` mask per series, so
 * the page cannot mount them and this drawing is a labelled approximation. The
 * geometry is not approximated: `@gpuixui/data`'s `chartBox`, `chartScale`,
 * `axisTicks`, `groupedBarMarks` and `linePath` place every shape, and the
 * swatches are the theme's own `seriesColors` order, so a series' colour and
 * the bar, path and tick it paints cannot drift from the component.
 */

/** The quarters both series are read across. */
export const CHART_LABELS: ReadonlyArray<string> = ["Q1", "Q2", "Q3", "Q4"];

/** The two series the page's own usage snippet draws. */
export const CHART_SERIES: ReadonlyArray<ChartSeries> = [
  { key: "revenue", label: "Revenue", values: [32, 48, 41, 60] },
  { key: "cost", label: "Cost", values: [18, 22, 26, 24] },
];

/** The plot's box, and the axis column the drawing adds to its left. */
export const CHART_WIDTH = 360;
export const CHART_HEIGHT = 160;
export const CHART_AXIS = 40;
export const CHART_LABEL_ROW = 24;

/** The plot box the package lays out for these sides. */
export const chartPlot: ChartBox = chartBox(CHART_WIDTH, CHART_HEIGHT, {
  width: 320,
  height: 160,
});

/** The ceiling every bar and path is read against. */
export const chartCeiling = chartScale(CHART_SERIES, CHART_LABELS.length);

/** The axis steps, from zero to the ceiling. */
export const chartTicks = axisTicks(chartCeiling, 4);

/** The palette the drawing paints: the theme's categorical order. */
export const chartPalette = (theme: Theme): ReadonlyArray<string> =>
  seriesColors(theme);

/** Every series' grouped bars, one list per series, in paint order. */
export const chartBarGroups = (): ReadonlyArray<ReadonlyArray<ChartMark>> =>
  groupedBarMarks(CHART_SERIES, chartPlot, chartCeiling, CHART_LABELS.length);

/** One series' line through its category centres. */
export const seriesLine = (series: ChartSeries): Option.Option<string> =>
  linePath(series.values, chartPlot, chartCeiling, CHART_LABELS.length);

/** How a reader chose to read the same series. */
export type ChartMode = "bars" | "lines";

/** The geometry the drawing paints, as data. */
export interface ChartDrawing {
  readonly mode: ChartMode;
  readonly palette: ReadonlyArray<string>;
  readonly bars: ReadonlyArray<ReadonlyArray<ChartMark>>;
  readonly lines: ReadonlyArray<Option.Option<string>>;
}

/** Everything the drawing paints, resolved from the theme and the mode. */
export const chartDrawing = (theme: Theme, mode: ChartMode): ChartDrawing => ({
  mode,
  palette: chartPalette(theme),
  bars: chartBarGroups(),
  lines: Arr.map(CHART_SERIES, seriesLine),
});

/** The drawing with its markup; the wrapper below adds the mode control. */
export function ChartDemoBody({
  theme,
  mode,
}: {
  readonly theme: Theme;
  readonly mode: ChartMode;
}) {
  const drawing = chartDrawing(theme, mode);
  const step = chartCeiling / 4;

  return (
    <div className="gx-chart-demo" data-demo="charts" data-mode={mode}>
      <svg
        aria-label="Revenue against cost by quarter"
        className="gx-chart-plot"
        role="img"
        viewBox={`0 0 ${CHART_WIDTH + CHART_AXIS} ${
          CHART_HEIGHT + CHART_LABEL_ROW
        }`}
      >
        <g transform={`translate(${CHART_AXIS} 0)`}>
          {chartTicks.map((tick) => {
            const y =
              chartPlot.height - (tick / chartCeiling) * chartPlot.height;
            return (
              <g key={tick}>
                <line
                  className="gx-chart-grid"
                  x1={0}
                  x2={chartPlot.width}
                  y1={y}
                  y2={y}
                />
                <text
                  className="gx-chart-tick"
                  textAnchor="end"
                  x={-8}
                  y={y + 3}
                >
                  {tickLabel(tick, step)}
                </text>
              </g>
            );
          })}
          {CHART_LABELS.map((label, index) => (
            <text
              className="gx-chart-tick"
              key={label}
              textAnchor="middle"
              x={(index + 0.5) * (chartPlot.width / CHART_LABELS.length)}
              y={chartPlot.height + 16}
            >
              {label}
            </text>
          ))}
          {drawing.bars.map((marks, index) =>
            drawing.mode === "bars" ? (
              <g key={CHART_SERIES[index]?.key}>
                {marks.map((mark, at) =>
                  mark.kind === "rect" ? (
                    <rect
                      fill={seriesColour(drawing.palette, index)}
                      height={mark.height}
                      key={at}
                      width={mark.width}
                      x={mark.x}
                      y={mark.y}
                    />
                  ) : null,
                )}
              </g>
            ) : null,
          )}
          {drawing.mode === "lines"
            ? drawing.lines.map((path, index) =>
                Option.match(path, {
                  onNone: () => null,
                  onSome: (d) => (
                    <path
                      d={d}
                      fill="none"
                      key={CHART_SERIES[index]?.key}
                      stroke={seriesColour(drawing.palette, index)}
                      strokeWidth={2}
                    />
                  ),
                }),
              )
            : null}
        </g>
      </svg>
      <ul className="gx-chart-legend">
        {CHART_SERIES.map((series, index) => (
          <li key={series.key}>
            <span
              aria-hidden="true"
              className="gx-chart-swatch"
              style={{ backgroundColor: seriesColour(drawing.palette, index) }}
            />
            {series.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The page's preview: one series list read as bars or as a line. */
export function ChartDemo() {
  const { platform, look, theme } = usePlatform();
  const [mode, setMode] = useState<ChartMode>("bars");

  return (
    <div className="gx-chart-frame" data-platform={platform}>
      <ChartDemoBody
        key={`${platform}-${look}-${mode}`}
        mode={mode}
        theme={theme}
      />
      <div className="gx-filter-controls">
        <span className="gx-filter-caption">Read as</span>
        <button
          aria-pressed={mode === "bars"}
          className="gx-filter-toggle"
          onClick={() => setMode("bars")}
          type="button"
        >
          bars
        </button>
        <button
          aria-pressed={mode === "lines"}
          className="gx-filter-toggle"
          onClick={() => setMode("lines")}
          type="button"
        >
          lines
        </button>
      </div>
      <p className="gx-trule-hint">
        Two series over four labelled quarters. The ceiling is the package’s
        rounded scale ({chartCeiling}), both readings sit on the same category
        centres, and a zero paints no bar while keeping its slot. The real
        charts paint one tinted layer per series, which is why the swatches are
        the theme’s categorical order.
      </p>
    </div>
  );
}

/** The page's copyable native usage, shown in the preview's Code tab. */
export const chartsDemoSource = `import {
  BarChart,
  ChartLegend,
  LineChart,
} from "@gpuixui/data";

<BarChart
  aria-label="Revenue against cost by quarter"
  labels={["Q1", "Q2", "Q3", "Q4"]}
  series={[
    { key: "revenue", label: "Revenue", values: [32, 48, 41, 60] },
    { key: "cost", label: "Cost", values: [18, 22, 26, 24] },
  ]}
  width={320}
  height={140}
/>;

<LineChart aria-label="Revenue against cost" labels={QUARTERS} series={SERIES} />;`;
