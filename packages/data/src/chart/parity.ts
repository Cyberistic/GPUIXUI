export type ParityStatus = "native" | "approximated" | "unsupported";

export interface ParityEntry {
  readonly example: string;

  readonly native: string;

  readonly option: string;

  readonly mode: string;
  readonly status: ParityStatus;

  readonly note?: string;
}

const e = (
  example: string,
  native: string,
  option: string,
  mode: string,
  status: ParityStatus = "native",
  note?: string,
): ParityEntry => ({ example, native, option, mode, status, note });

export const parity: ReadonlyArray<ParityEntry> = [
  e("chart-area-axes", "AreaChart", "axis", "area-variants"),
  e("chart-area-default", "AreaChart", "gradient", "area"),
  e("chart-area-gradient", "AreaChart", "gradient", "area"),
  e(
    "chart-area-icons",
    "AreaChart",
    "dotIcons",
    "area-variants",
    "native",
    "icons paint as a native overlay on each point",
  ),
  e("chart-area-interactive", "AreaChart", "tooltip", "area-interactive"),
  e("chart-area-legend", "AreaChart", "legend", "area-variants"),
  e("chart-area-linear", "AreaChart", "curve", "area-variants"),
  e("chart-area-stacked", "AreaChart", "stacked", "area"),
  e("chart-area-stacked-expand", "AreaChart", "stacked", "area"),
  e("chart-area-step", "AreaChart", "curve", "area-variants"),

  e("chart-bar-active", "BarChart", "activeBand", "bar-variants"),
  e("chart-bar-default", "BarChart", "radius", "bars"),
  e("chart-bar-horizontal", "BarChart", "orientation", "bar-variants"),
  e("chart-bar-interactive", "BarChart", "tooltip", "bars"),
  e("chart-bar-label", "BarChart", "valueLabels", "bar-variants"),
  e("chart-bar-label-custom", "BarChart", "valueLabelFormat", "bar-variants"),
  e("chart-bar-mixed", "ComposedChart", "lineKeys", "mixed"),
  e("chart-bar-multiple", "BarChart", "series", "bars"),
  e("chart-bar-negative", "BarChart", "series", "bar-variants"),
  e("chart-bar-stacked", "StackedBar", "percent", "bars"),

  e("chart-line-default", "LineChart", "lineWidth", "lines"),
  e("chart-line-dots", "LineChart", "dots", "line-variants"),
  e("chart-line-dots-colors", "LineChart", "colors", "line-variants"),
  e("chart-line-dots-custom", "LineChart", "dotIcons", "line-variants"),
  e("chart-line-interactive", "LineChart", "tooltip", "line-interactive"),
  e("chart-line-label", "LineChart", "showLabels", "line-labels"),
  e("chart-line-label-custom", "LineChart", "valueFormat", "line-labels"),
  e("chart-line-linear", "LineChart", "curve", "line-variants"),
  e("chart-line-multiple", "LineChart", "series", "lines"),
  e("chart-line-step", "LineChart", "curve", "line-variants"),

  e("chart-pie-donut", "DonutChart", "innerRadius", "pie"),
  e("chart-pie-donut-active", "DonutChart", "activeIndex", "pie-interactive"),
  e("chart-pie-donut-text", "DonutChart", "centerLabel", "pie"),
  e("chart-pie-interactive", "PieChart", "onSliceActivate", "pie-interactive"),
  e("chart-pie-label", "PieChart", "showLabels", "pie-labels"),
  e("chart-pie-label-custom", "PieChart", "labelFormat", "pie-labels"),
  e("chart-pie-label-list", "PieChart", "labelPosition", "pie-outside"),
  e("chart-pie-legend", "PieChart", "legendValues", "pie"),
  e("chart-pie-separator-none", "PieChart", "padAngle", "pie"),
  e("chart-pie-simple", "PieChart", "data", "pie"),
  e(
    "chart-pie-stacked",
    "PieChart",
    "stacked",
    "pie",
    "native",
    "each datum owns a concentric band",
  ),

  e("chart-radar-default", "RadarChart", "fill", "radar"),
  e("chart-radar-dots", "RadarChart", "dots", "radar"),
  e("chart-radar-grid-circle", "RadarChart", "gridShape", "radar"),
  e("chart-radar-grid-circle-fill", "RadarChart", "gridFill", "radar-filled"),
  e("chart-radar-grid-circle-no-lines", "RadarChart", "webs", "radar-variants"),
  e("chart-radar-grid-custom", "RadarChart", "gridAt", "radar-variants"),
  e("chart-radar-grid-fill", "RadarChart", "gridFill", "radar-filled"),
  e("chart-radar-grid-none", "RadarChart", "webs", "radar-variants"),
  e("chart-radar-icons", "RadarChart", "dotIcons", "radar-icons"),
  e(
    "chart-radar-label-custom",
    "RadarChart",
    "axisLabelFormat",
    "radar-variants",
  ),
  e("chart-radar-legend", "RadarChart", "legend", "radar"),
  e("chart-radar-lines-only", "RadarChart", "fill", "radar-variants"),
  e("chart-radar-multiple", "RadarChart", "series", "radar"),
  e("chart-radar-radius", "RadarChart", "radius", "radar"),

  e("chart-radial-grid", "RadialChart", "grid", "radial-variants"),
  e("chart-radial-label", "RadialChart", "showLabels", "radial-variants"),
  e("chart-radial-shape", "RadialChart", "rounded", "radial-rounded"),
  e("chart-radial-simple", "RadialChart", "data", "radial"),
  e("chart-radial-stacked", "RadialChart", "data", "radial"),
  e("chart-radial-text", "RadialChart", "centerLabel", "radial"),

  e("chart-tooltip-advanced", "BarChart", "tooltip", "tooltip"),
  e("chart-tooltip-default", "BarChart", "tooltip", "tooltip"),
  e("chart-tooltip-formatter", "BarChart", "valueFormat", "tooltip-variants"),
  e(
    "chart-tooltip-icons",
    "BarChart",
    "tooltipIcons",
    "tooltip-variants",
    "native",
    "each readout row paints its series' icon",
  ),
  e(
    "chart-tooltip-indicator-line",
    "BarChart",
    "tooltipIndicator",
    "tooltip-variants",
  ),
  e(
    "chart-tooltip-indicator-none",
    "BarChart",
    "tooltipIndicator",
    "tooltip-variants",
  ),
  e(
    "chart-tooltip-label-custom",
    "BarChart",
    "labelFormat",
    "tooltip-variants",
  ),
  e(
    "chart-tooltip-label-formatter",
    "BarChart",
    "labelFormat",
    "tooltip-variants",
  ),
  e("chart-legend-default", "ChartLegend", "items", "legend"),
  e("chart-legend-shapes", "ChartLegend", "shape", "legend"),
];
