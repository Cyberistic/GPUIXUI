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
 *
 * The frame mirrors `BarChart`/`LineChart`: the axis column, the plot, the
 * category slots and the legend, with one layer per series and no grid the
 * component does not paint.
 */

/** The quarters both series are read across. */
export const CHART_LABELS: ReadonlyArray<string> = ["Q1", "Q2", "Q3", "Q4"];

/** The two series the page's own usage snippet draws. */
export const CHART_SERIES: ReadonlyArray<ChartSeries> = [
  { key: "revenue", label: "Revenue", values: [32, 48, 41, 60] },
  { key: "cost", label: "Cost", values: [18, 22, 26, 24] },
];

/** The plot's box: the sides the caller names, laid out by the package. */
export const CHART_WIDTH = 360;
export const CHART_HEIGHT = 160;

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
  const slot = chartPlot.width / CHART_LABELS.length;

  return (
    <div className="gx-dchart" data-demo="charts" data-mode={mode}>
      <div className="gx-dchart-row">
        <div
          aria-hidden="true"
          className="gx-dchart-axis"
          style={{ height: chartPlot.height }}
        >
          {Arr.reverse(chartTicks).map((tick) => (
            <span key={tick}>{tickLabel(tick, step)}</span>
          ))}
        </div>
        <svg
          aria-label="Revenue against cost by quarter"
          className="gx-dchart-plot"
          height={chartPlot.height}
          role="img"
          viewBox={`0 0 ${chartPlot.width} ${chartPlot.height}`}
          width={chartPlot.width}
        >
          {drawing.mode === "bars"
            ? drawing.bars.map((marks, index) => (
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
              ))
            : drawing.lines.map((path, index) =>
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
              )}
        </svg>
      </div>
      <div className="gx-dchart-categories">
        {CHART_LABELS.map((label) => (
          <div
            className="gx-dchart-category"
            key={label}
            style={{ width: slot }}
          >
            <span style={{ width: slot }}>{label}</span>
          </div>
        ))}
      </div>
      <ul className="gx-dchart-legend">
        {CHART_SERIES.map((series, index) => (
          <li key={series.key}>
            <span
              aria-hidden="true"
              className="gx-dchart-swatch"
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
    <div className="gx-data-scene" data-platform={platform}>
      <ChartDemoBody
        key={`${platform}-${look}-${mode}`}
        mode={mode}
        theme={theme}
      />
      <div aria-label="Read as" className="gx-data-row" role="group">
        {(["bars", "lines"] as const).map((candidate) => (
          <button
            aria-pressed={mode === candidate}
            className="gx-btn gx-btn-sm gx-toggle"
            data-pressed={mode === candidate ? "" : undefined}
            key={candidate}
            onClick={() => setMode(candidate)}
            type="button"
          >
            {candidate}
          </button>
        ))}
      </div>
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
