import {
  axisTicks,
  chartBox,
  chartScale,
  chartBox as boxOf,
  groupedBarMarks,
  linePath,
  seriesColour,
  tickLabel,
  type ChartBox,
  type ChartMark,
  type ChartSeries,
} from "@gpuixui/data/chart/logic";
import {
  areaBands,
  areaPath,
  chartRange,
  curvePath,
  polygonPath,
  radarGrid,
  radarPoints,
  ringOutsideLabels,
  radarSpokes,
  radialArcs,
  fullRing,
  ringLabelPoints,
  ringSegments,
  seriesPoints,
} from "@gpuixui/data/chart/geometry";
import { easeOutCubic, interpolateValues } from "@gpuixui/data/chart/animation";
import { ChartGallery } from "./chart-gallery";
import { seriesColors, type Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useEffect, useState, type JSX, type ReactNode } from "react";
import { usePlatform } from "./platform-toggle";

const galleryColour = (theme: Theme, index: number): string =>
  seriesColour(seriesColors(theme), index);

export const CHART_LABELS: ReadonlyArray<string> = ["Q1", "Q2", "Q3", "Q4"];

export const CHART_SERIES: ReadonlyArray<ChartSeries> = [
  { key: "revenue", label: "Revenue", values: [32, 48, 41, 60] },
  { key: "cost", label: "Cost", values: [18, 22, 26, 24] },
];

export const CHART_WIDTH = 360;
export const CHART_HEIGHT = 160;

export const chartPlot: ChartBox = chartBox(CHART_WIDTH, CHART_HEIGHT, {
  width: 320,
  height: 160,
});

export const chartCeiling = chartScale(CHART_SERIES, CHART_LABELS.length);

export const chartTicks = axisTicks(chartCeiling, 4);

export const chartPalette = (theme: Theme): ReadonlyArray<string> =>
  seriesColors(theme);

export const chartBarGroups = (): ReadonlyArray<ReadonlyArray<ChartMark>> =>
  groupedBarMarks(CHART_SERIES, chartPlot, chartCeiling, CHART_LABELS.length);

export const seriesLine = (series: ChartSeries): Option.Option<string> =>
  linePath(series.values, chartPlot, chartCeiling, CHART_LABELS.length);

export const seriesArea = (
  series: ChartSeries,
): Option.Option<{ readonly line: string; readonly area: string }> => {
  const count = CHART_LABELS.length;
  const slot = count === 0 ? 0 : chartPlot.width / count;
  const points = Arr.map(series.values, (value, index) => ({
    x: slot * index + slot / 2,
    y:
      chartCeiling === 0
        ? chartPlot.height
        : chartPlot.height - (value / chartCeiling) * chartPlot.height,
  }));
  if (points.length === 0) return Option.none();
  const line = Option.getOrElse(curvePath(points, "smooth"), () => "");
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return Option.none();
  return Option.some({
    line,
    area: `${line} L${last.x.toFixed(1)},${chartPlot.height} L${first.x.toFixed(1)},${chartPlot.height} Z`,
  });
};

export type ChartMode =
  | "bars"
  | "lines"
  | "area"
  | "mixed"
  | "pie"
  | "pie-labels"
  | "pie-outside"
  | "line-labels"
  | "radar-icons"
  | "tooltip"
  | "legend"
  | "area-variants"
  | "bar-variants"
  | "line-variants"
  | "pie-interactive"
  | "radar-variants"
  | "radial-variants"
  | "tooltip-variants"
  | "area-interactive"
  | "line-interactive"
  | "animated"
  | "point-tooltip"
  | "brush"
  | "zoom"
  | "radar"
  | "radar-filled"
  | "radial"
  | "radial-rounded";

export interface ChartDrawing {
  readonly mode: ChartMode;
  readonly palette: ReadonlyArray<string>;
  readonly bars: ReadonlyArray<ReadonlyArray<ChartMark>>;
  readonly lines: ReadonlyArray<Option.Option<string>>;
}

export const chartDrawing = (theme: Theme, mode: ChartMode): ChartDrawing => ({
  mode,
  palette: chartPalette(theme),
  bars: chartBarGroups(),
  lines: Arr.map(CHART_SERIES, seriesLine),
});

export function ChartDemoBody({
  theme,
  mode,
}: {
  readonly theme: Theme;
  readonly mode: ChartMode;
}) {
  if (mode !== "bars" && mode !== "lines") {
    return <ChartTypeScene mode={mode} theme={theme} />;
  }
  const drawing = chartDrawing(theme, mode);
  const step = chartCeiling / 4;
  const slot = chartPlot.width / CHART_LABELS.length;

  const areas = Arr.map(CHART_SERIES, seriesArea);

  return (
    <div className="gx-dchart" data-demo="charts" data-mode={mode}>
      <div className="gx-dchart-row">
        {mode === "bars" ? (
          <div
            aria-hidden="true"
            className="gx-dchart-axis"
            style={{ height: chartPlot.height }}
          >
            {Arr.reverse(chartTicks).map((tick) => (
              <span key={tick}>{tickLabel(tick, step)}</span>
            ))}
          </div>
        ) : null}
        <svg
          aria-label="Revenue against cost by quarter"
          className="gx-dchart-plot"
          height={chartPlot.height}
          role="img"
          viewBox={`0 0 ${chartPlot.width} ${chartPlot.height}`}
          width={chartPlot.width}
        >
          {drawing.mode === "lines" ? (
            <defs>
              {CHART_SERIES.map((series, index) => (
                <linearGradient
                  id={`gx-dchart-${series.key}`}
                  key={series.key}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={seriesColour(drawing.palette, index)}
                    stopOpacity="0.75"
                  />
                  <stop
                    offset="95%"
                    stopColor={seriesColour(drawing.palette, index)}
                    stopOpacity="0.06"
                  />
                </linearGradient>
              ))}
            </defs>
          ) : null}
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
            : areas.map((area, index) =>
                Option.match(area, {
                  onNone: () => null,
                  onSome: (shape) => (
                    <g key={CHART_SERIES[index]?.key}>
                      <path
                        d={shape.area}
                        fill={`url(#gx-dchart-${CHART_SERIES[index]?.key ?? index})`}
                      />
                      <path
                        d={shape.line}
                        fill="none"
                        stroke={seriesColour(drawing.palette, index)}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </g>
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

const SCENE_WIDTH = 360;
const SCENE_HEIGHT = 180;

type SceneMode = Exclude<ChartMode, "bars" | "lines">;

const Mini = ({
  caption,
  children,
}: {
  readonly caption: string;
  readonly children: ReactNode;
}) => (
  <figure className="gx-dchart-cell">
    <figcaption>{caption}</figcaption>
    {children}
  </figure>
);

const Variants = ({ children }: { readonly children: ReactNode }) => (
  <div className="gx-dchart-variants">{children}</div>
);

function PointTooltipScene({ theme }: { readonly theme: Theme }) {
  const [hovered, setHovered] = useState<number | undefined>(undefined);
  const box = boxOf(SCENE_WIDTH, SCENE_HEIGHT, {
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
  });
  const range = chartRange(CHART_SERIES, CHART_LABELS.length);
  const one = CHART_SERIES[0];
  const points =
    one === undefined
      ? []
      : seriesPoints(one.values, box, range, CHART_LABELS.length);
  const point = hovered === undefined ? undefined : points[hovered];
  return (
    <figure className="gx-dchart-cell" data-mode="point-tooltip">
      <figcaption>point tooltip</figcaption>
      <div
        className="gx-dchart-interactive-frame"
        onMouseLeave={() => setHovered(undefined)}
      >
        <svg
          aria-label="Point tooltip"
          className="gx-dchart-plot"
          height={SCENE_HEIGHT}
          role="img"
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          width={SCENE_WIDTH}
        >
          {one === undefined ? null : (
            <path
              d={Option.getOrElse(curvePath(points, "linear"), () => "")}
              fill="none"
              stroke={galleryColour(theme, 0)}
              strokeWidth={2}
            />
          )}
          {points.map((dot, index) => (
            <circle
              cx={dot.x}
              cy={dot.y}
              fill={galleryColour(theme, 0)}
              key={`dot-${index}`}
              onMouseEnter={() => setHovered(index)}
              r={hovered === index ? 6 : 4}
            />
          ))}
        </svg>
        {point === undefined || one === undefined ? null : (
          <div
            className="gx-dchart-tip-card gx-dchart-tip-follow"
            style={{ left: point.x + 10, top: point.y - 30 }}
          >
            <span className="gx-dchart-tip-head">
              {CHART_LABELS[hovered ?? 0] ?? ""}
            </span>
            <span className="gx-dchart-tip-row">
              <i
                className="gx-dchart-tip-dot"
                style={{ backgroundColor: galleryColour(theme, 0) }}
              />
              {one.label} <b>{one.values[hovered ?? 0] ?? 0}</b>
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}

function ZoomScene({ theme }: { readonly theme: Theme }) {
  const [view, setView] = useState<readonly [number, number]>([0, 4]);
  const [drag, setDrag] = useState<
    { readonly x: number; readonly start: number } | undefined
  >(undefined);
  const [start, end] = view;
  const span = Math.max(1, end - start);
  const slot = SCENE_WIDTH / span;
  const one = CHART_SERIES[0];
  const clamp = (nextStart: number, nextSpan: number): void => {
    const spanNow = Math.max(1, Math.min(CHART_LABELS.length, nextSpan));
    const startNow = Math.max(
      0,
      Math.min(CHART_LABELS.length - spanNow, nextStart),
    );
    setView([startNow, startNow + spanNow]);
  };
  return (
    <figure className="gx-dchart-cell" data-mode="zoom">
      <figcaption>
        zoom · {start.toFixed(1)}–{end.toFixed(1)}
      </figcaption>
      <svg
        aria-label="Zoomed bars"
        className="gx-dchart-plot"
        height={SCENE_HEIGHT}
        onMouseDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setDrag({ x: event.clientX, start });
          void bounds;
        }}
        onMouseLeave={() => setDrag(undefined)}
        onMouseMove={(event) => {
          if (drag === undefined) return;
          const delta = ((drag.x - event.clientX) / SCENE_WIDTH) * span;
          clamp(drag.start + delta, span);
        }}
        onMouseUp={() => setDrag(undefined)}
        onWheel={(event) => {
          const factor = Math.max(
            0.5,
            Math.min(2, Math.exp(event.deltaY * 0.002)),
          );
          const centre = start + span / 2;
          const nextSpan = span * factor;
          clamp(centre - nextSpan / 2, nextSpan);
        }}
        role="img"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        width={SCENE_WIDTH}
      >
        {(one?.values ?? []).map((value, index) => {
          const height = (value / 100) * (SCENE_HEIGHT - 30);
          return (
            <rect
              fill={galleryColour(theme, 0)}
              height={height}
              key={`bar-${index}`}
              rx={3}
              width={slot * 0.8}
              x={(index + 0.1 - start) * slot}
              y={SCENE_HEIGHT - height}
            />
          );
        })}
        {CHART_LABELS.map((label, index) => (
          <text
            fill="var(--muted-foreground)"
            fontSize={10}
            key={`label-${index}`}
            textAnchor="middle"
            x={(index + 0.5 - start) * slot}
            y={SCENE_HEIGHT - 4}
          >
            {label}
          </text>
        ))}
      </svg>
      <button
        className="gx-btn gx-btn-sm"
        onClick={() => setView([0, CHART_LABELS.length])}
        type="button"
      >
        Reset
      </button>
    </figure>
  );
}

function BrushScene({ theme }: { readonly theme: Theme }) {
  const [window, setWindow] = useState<readonly [number, number]>([0, 4]);
  const [dragStart, setDragStart] = useState<number | undefined>(undefined);
  const [start, end] = window;
  const labels = CHART_LABELS.slice(start, end);
  const one = CHART_SERIES[0];
  const values = (one?.values ?? []).slice(start, end);
  const slot = SCENE_WIDTH / Math.max(1, labels.length);
  const indexAt = (clientX: number, target: HTMLElement): number => {
    const bounds = target.getBoundingClientRect();
    const ratio = (clientX - bounds.left) / Math.max(1, bounds.width);
    return Math.max(
      0,
      Math.min(
        CHART_LABELS.length - 1,
        Math.floor(ratio * CHART_LABELS.length),
      ),
    );
  };
  const select = (index: number): void => {
    if (dragStart === undefined) return;
    setWindow([Math.min(dragStart, index), Math.max(dragStart, index) + 1]);
  };
  return (
    <figure className="gx-dchart-cell" data-mode="brush">
      <figcaption>
        brush · {labels[0] ?? ""}–{labels[labels.length - 1] ?? ""}
      </figcaption>
      <svg
        aria-label="Brushed bars"
        className="gx-dchart-plot"
        height={SCENE_HEIGHT - 40}
        role="img"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT - 40}`}
        width={SCENE_WIDTH}
      >
        {values.map((value, index) => {
          const height = (value / 100) * (SCENE_HEIGHT - 50);
          return (
            <rect
              fill={galleryColour(theme, 0)}
              height={height}
              key={`bar-${index}`}
              rx={3}
              width={slot * 0.6}
              x={index * slot + slot * 0.2}
              y={SCENE_HEIGHT - 40 - height}
            />
          );
        })}
      </svg>
      <div
        aria-label="Brush"
        className="gx-dchart-brush-strip"
        onMouseDown={(event) => {
          const index = indexAt(event.clientX, event.currentTarget);
          setDragStart(index);
          setWindow([index, index + 1]);
        }}
        onMouseLeave={() => setDragStart(undefined)}
        onMouseMove={(event) =>
          select(indexAt(event.clientX, event.currentTarget))
        }
        onMouseUp={() => setDragStart(undefined)}
        role="slider"
      >
        <span
          className="gx-dchart-brush-band"
          style={{
            left: `${(start / CHART_LABELS.length) * 100}%`,
            width: `${((end - start) / CHART_LABELS.length) * 100}%`,
            backgroundColor: galleryColour(theme, 0),
          }}
        />
      </div>
    </figure>
  );
}

const ANIMATED_SETS: ReadonlyArray<ReadonlyArray<number>> = [
  [32, 48, 41, 60],
  [60, 38, 54, 44],
];

function AnimatedScene({ theme }: { readonly theme: Theme }) {
  const [values, setValues] = useState(ANIMATED_SETS[0] ?? []);
  const [next, setNext] = useState(0);
  useEffect(() => {
    const target = ANIMATED_SETS[next] ?? [];
    const from = values;
    const start = performance.now();
    const handle = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / 420);
      setValues(interpolateValues(from, target, easeOutCubic(t)));
      if (t >= 1) clearInterval(handle);
    }, 16);
    return () => clearInterval(handle);
  }, [next]);
  const slot = SCENE_WIDTH / Math.max(1, values.length);
  return (
    <figure className="gx-dchart-cell" data-mode="animated">
      <figcaption>animated</figcaption>
      <svg
        aria-label="Animated bars"
        className="gx-dchart-plot"
        height={SCENE_HEIGHT}
        role="img"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        width={SCENE_WIDTH}
      >
        {values.map((value, index) => {
          const height = (Math.max(0, value) / 100) * (SCENE_HEIGHT - 10);
          return (
            <rect
              fill={galleryColour(theme, 0)}
              height={height}
              key={`bar-${index}`}
              rx={3}
              width={slot * 0.6}
              x={index * slot + slot * 0.2}
              y={SCENE_HEIGHT - height}
            />
          );
        })}
      </svg>
      <div className="gx-data-row">
        <button
          className="gx-btn gx-btn-sm"
          onClick={() =>
            setNext((previous) => (previous + 1) % ANIMATED_SETS.length)
          }
          type="button"
        >
          Replay
        </button>
      </div>
    </figure>
  );
}

function InteractiveScene({
  kind,
  theme,
}: {
  readonly kind: "area" | "line";
  readonly theme: Theme;
}) {
  const [hovered, setHovered] = useState<number | undefined>(undefined);
  const box = boxOf(SCENE_WIDTH, SCENE_HEIGHT, {
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
  });
  const range = chartRange(CHART_SERIES, CHART_LABELS.length);
  const one = CHART_SERIES[0];
  const points =
    one === undefined
      ? []
      : seriesPoints(one.values, box, range, CHART_LABELS.length);
  const slot = SCENE_WIDTH / Math.max(1, CHART_LABELS.length);
  const hoveredPoint = hovered === undefined ? undefined : points[hovered];
  return (
    <figure className="gx-dchart-cell gx-dchart-interactive" data-mode={kind}>
      <figcaption>{kind} interactive</figcaption>
      <div
        className="gx-dchart-interactive-frame"
        onMouseLeave={() => setHovered(undefined)}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const local = event.clientX - bounds.left;
          const index = Math.max(
            0,
            Math.min(CHART_LABELS.length - 1, Math.floor(local / slot)),
          );
          setHovered(index);
        }}
      >
        <svg
          aria-label={`${kind} interactive`}
          className="gx-dchart-plot"
          height={SCENE_HEIGHT}
          role="img"
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          width={SCENE_WIDTH}
        >
          {kind === "area" && one !== undefined ? (
            <path
              d={Option.getOrElse(
                areaPath(points, box, range, "smooth"),
                () => "",
              )}
              fill={galleryColour(theme, 0)}
              opacity={0.25}
            />
          ) : null}
          <path
            d={Option.getOrElse(curvePath(points, "smooth"), () => "")}
            fill="none"
            stroke={galleryColour(theme, 0)}
            strokeWidth={2}
          />
          {hoveredPoint === undefined ? null : (
            <>
              <line
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                x1={hoveredPoint.x}
                x2={hoveredPoint.x}
                y1={0}
                y2={SCENE_HEIGHT}
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                fill={galleryColour(theme, 0)}
                r={4}
              />
            </>
          )}
        </svg>
        {hoveredPoint === undefined || one === undefined ? null : (
          <div
            className="gx-dchart-tip-card gx-dchart-tip-follow"
            style={{ left: hoveredPoint.x + 12 }}
          >
            <span className="gx-dchart-tip-head">
              {hovered === undefined ? "" : (CHART_LABELS[hovered] ?? "")}
            </span>
            <span className="gx-dchart-tip-row">
              <i
                className="gx-dchart-tip-line"
                style={{ backgroundColor: galleryColour(theme, 0) }}
              />
              {one.label} <b>{one.values[hovered ?? 0] ?? 0}</b>
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}

function ChartTypeScene({
  mode,
  theme,
}: {
  readonly mode: SceneMode;
  readonly theme: Theme;
}) {
  if (mode === "animated") {
    return <AnimatedScene theme={theme} />;
  }
  if (mode === "point-tooltip") {
    return <PointTooltipScene theme={theme} />;
  }
  if (mode === "brush") {
    return <BrushScene theme={theme} />;
  }
  if (mode === "zoom") {
    return <ZoomScene theme={theme} />;
  }
  if (mode === "area-interactive" || mode === "line-interactive") {
    return (
      <InteractiveScene
        kind={mode === "area-interactive" ? "area" : "line"}
        theme={theme}
      />
    );
  }
  const box = boxOf(SCENE_WIDTH, SCENE_HEIGHT, {
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
  });
  const square = boxOf(160, 160, { width: 160, height: 160 });
  const range = chartRange(CHART_SERIES, CHART_LABELS.length);
  const scenes: Readonly<Record<SceneMode, JSX.Element>> = {
    area: (
      <svg
        aria-label="Area"
        className="gx-dchart-plot"
        height={SCENE_HEIGHT}
        role="img"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        width={SCENE_WIDTH}
      >
        {Arr.map(CHART_SERIES, (one, index) => {
          const points = seriesPoints(
            one.values,
            box,
            range,
            CHART_LABELS.length,
          );
          return (
            <g key={one.key}>
              {areaBands(points, box, range, 3).map((d, band) => (
                <path
                  d={d}
                  fill={galleryColour(theme, index)}
                  key={`band-${band}`}
                  opacity={0.12 + band * 0.12}
                />
              ))}
              <path
                d={Option.getOrElse(curvePath(points, "smooth"), () => "")}
                fill="none"
                stroke={galleryColour(theme, index)}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
    ),
    mixed: (
      <svg
        aria-label="Mixed bars and line"
        className="gx-dchart-plot"
        height={SCENE_HEIGHT}
        role="img"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        width={SCENE_WIDTH}
      >
        {groupedBarMarks(
          Arr.take(CHART_SERIES, 1),
          box,
          chartCeiling,
          CHART_LABELS.length,
        ).map((marks) =>
          marks.map((mark, at) =>
            mark.kind === "rect" ? (
              <rect
                fill={galleryColour(theme, 0)}
                height={mark.height}
                key={`bar-${at}`}
                rx={3}
                width={mark.width}
                x={mark.x}
                y={mark.y}
              />
            ) : null,
          ),
        )}
        <path
          d={Option.getOrElse(
            Option.flatMap(Arr.get(CHART_SERIES, 1), (one) =>
              linePath(one.values, box, chartCeiling, CHART_LABELS.length),
            ),
            () => "",
          )}
          fill="none"
          stroke={galleryColour(theme, 1)}
          strokeWidth={2}
        />
      </svg>
    ),
    pie: (
      <svg
        aria-label="Pie"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {ringSegments([48, 32, 20], square, 0, 0.03).map((marks, index) =>
          marks.map((mark) =>
            mark.kind === "path" ? (
              <path
                d={mark.d}
                fill={galleryColour(theme, index)}
                key={`${index}-${mark.d.length}`}
              />
            ) : null,
          ),
        )}
      </svg>
    ),
    radar: (
      <svg
        aria-label="Radar"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {}
        {[...radarGrid(4, 5, square, 100), ...radarSpokes(5, square, 100)].map(
          (d, index) => (
            <path
              d={d}
              fill="none"
              key={`web-${index}`}
              stroke={galleryColour(theme, 0)}
              strokeOpacity={0.28}
              strokeWidth={1}
            />
          ),
        )}
        {[1, 0].map((index) => (
          <path
            d={Option.getOrElse(
              polygonPath(
                radarPoints(
                  index === 0 ? [32, 48, 41, 60, 36] : [48, 34, 55, 42, 50],
                  5,
                  square,
                  100,
                ),
              ),
              () => "",
            )}
            fill={galleryColour(theme, index)}
            fillOpacity={index === 0 ? 0.34 : 0.16}
            key={`series-${index}`}
            stroke={galleryColour(theme, index)}
            strokeWidth={index === 0 ? 2 : 1.5}
          />
        ))}
        {Arr.map(radarPoints([32, 48, 41, 60, 36], 5, square, 100), (dot) => (
          <circle
            cx={dot.x}
            cy={dot.y}
            fill={galleryColour(theme, 0)}
            key={`dot-${dot.x}-${dot.y}`}
            r={2.4}
            stroke="var(--card)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
    ),
    radial: (
      <svg
        aria-label="Radial"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {Arr.map([48, 32, 20], (value, index) => {
          const outer = 79 - index * 14;
          return (
            <g key={`ring-${index}`}>
              <path
                d={fullRing(80, 80, outer, outer - 10)}
                fill="var(--muted-foreground)"
                key={`track-${index}`}
                opacity={0.18}
              />
              {radialArcs([value], square, 60, 10, 4).flatMap((marks) =>
                marks.map((mark) =>
                  mark.kind === "path" ? (
                    <path
                      d={mark.d}
                      fill={galleryColour(theme, index)}
                      key={`arc-${index}-${mark.d.length}`}
                    />
                  ) : null,
                ),
              )}
            </g>
          );
        })}
      </svg>
    ),
    "pie-labels": (
      <svg
        aria-label="Pie with labels"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {ringSegments([48, 32, 20], square, 0, 0.03).map((marks, index) =>
          marks.map((mark) =>
            mark.kind === "path" ? (
              <path
                d={mark.d}
                fill={galleryColour(theme, index)}
                key={`${index}-${mark.d.length}`}
              />
            ) : null,
          ),
        )}
        {ringLabelPoints([48, 32, 20], square, 0).map((point, index) =>
          Option.match(point, {
            onNone: () => null,
            onSome: (at) => (
              <text
                fill="#0B0D12"
                fontSize={10}
                key={`label-${index}`}
                textAnchor="middle"
                x={at.x}
                y={at.y + 3}
              >
                {["Direct", "Search", "Social"][index]}
              </text>
            ),
          }),
        )}
      </svg>
    ),
    "line-labels": (
      <svg
        aria-label="Line with labels"
        className="gx-dchart-plot"
        height={SCENE_HEIGHT}
        role="img"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        width={SCENE_WIDTH}
      >
        <path
          d={Option.getOrElse(
            Option.flatMap(Arr.head(CHART_SERIES), (one) =>
              linePath(one.values, box, chartCeiling, CHART_LABELS.length),
            ),
            () => "",
          )}
          fill="none"
          stroke={galleryColour(theme, 0)}
          strokeWidth={2}
        />
        {Option.match(Arr.head(CHART_SERIES), {
          onNone: () => null,
          onSome: (one) =>
            seriesPoints(
              one.values,
              box,
              chartRange(CHART_SERIES, CHART_LABELS.length),
              CHART_LABELS.length,
            ).map((point, index) => (
              <text
                fill={galleryColour(theme, 0)}
                fontSize={10}
                key={`value-${index}`}
                textAnchor="middle"
                x={point.x}
                y={Math.max(10, point.y - 8)}
              >
                {one.values[index]}
              </text>
            )),
        })}
      </svg>
    ),
    "radar-filled": (
      <svg
        aria-label="Radar with a filled grid"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {radarGrid(4, 5, square, 100).map((d, index) => (
          <path
            d={d}
            fill={galleryColour(theme, 0)}
            fillOpacity={0.06}
            key={`fill-${index}`}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
          />
        ))}
        {radarSpokes(5, square, 100).map((d, index) => (
          <path
            d={d}
            fill="none"
            key={`spoke-${index}`}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
          />
        ))}
        <path
          d={Option.getOrElse(
            polygonPath(radarPoints([32, 48, 41, 60, 36], 5, square, 100)),
            () => "",
          )}
          fill={galleryColour(theme, 0)}
          fillOpacity={0.25}
          stroke={galleryColour(theme, 0)}
          strokeWidth={2}
        />
      </svg>
    ),
    "radial-rounded": (
      <svg
        aria-label="Rounded radial"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {Arr.map([48, 32, 20], (value, index) => {
          const outer = 79 - index * 14;
          const span = (value / 60) * Math.PI * 2;
          const mid = outer - 5;
          const cap = (angle: number): JSX.Element => (
            <circle
              cx={80 + mid * Math.cos(angle)}
              cy={80 + mid * Math.sin(angle)}
              fill={galleryColour(theme, index)}
              key={`cap-${index}-${angle}`}
              r={5}
            />
          );
          return (
            <g key={`ring-${index}`}>
              {radialArcs([value], square, 60, 10, 4).flatMap((marks) =>
                marks.map((mark) =>
                  mark.kind === "path" ? (
                    <path
                      d={mark.d}
                      fill={galleryColour(theme, index)}
                      key={`arc-${index}-${mark.d.length}`}
                    />
                  ) : null,
                ),
              )}
              {cap(-Math.PI / 2)}
              {cap(-Math.PI / 2 + span)}
            </g>
          );
        })}
      </svg>
    ),
    "pie-outside": (
      <svg
        aria-label="Pie with outside labels"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="-40 0 240 160"
        width={240}
      >
        {ringSegments([48, 32, 20], square, 0, 0.03).map((marks, index) =>
          marks.map((mark) =>
            mark.kind === "path" ? (
              <path
                d={mark.d}
                fill={galleryColour(theme, index)}
                key={`${index}-${mark.d.length}`}
              />
            ) : null,
          ),
        )}
        {ringOutsideLabels([48, 32, 20], square).map((label, index) =>
          Option.match(label, {
            onNone: () => null,
            onSome: (found) => (
              <g key={`outside-${index}`}>
                <path
                  d={found.leader}
                  fill="none"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                />
                <text
                  fill="var(--muted-foreground)"
                  fontSize={10}
                  textAnchor={found.right ? "start" : "end"}
                  x={found.point.x + (found.right ? 4 : -4)}
                  y={found.point.y + 3}
                >
                  {["Direct", "Search", "Social"][index]}
                </text>
              </g>
            ),
          }),
        )}
      </svg>
    ),
    "radar-icons": (
      <svg
        aria-label="Radar with icon dots"
        className="gx-dchart-plot"
        height={160}
        role="img"
        viewBox="0 0 160 160"
        width={160}
      >
        {}
        {[...radarGrid(4, 5, square, 100), ...radarSpokes(5, square, 100)].map(
          (d, index) => (
            <path
              d={d}
              fill="none"
              key={`web-${index}`}
              stroke={galleryColour(theme, 0)}
              strokeOpacity={0.28}
              strokeWidth={1}
            />
          ),
        )}
        {[1, 0].map((index) => (
          <path
            d={Option.getOrElse(
              polygonPath(
                radarPoints(
                  index === 0 ? [32, 48, 41, 60, 36] : [48, 34, 55, 42, 50],
                  5,
                  square,
                  100,
                ),
              ),
              () => "",
            )}
            fill={galleryColour(theme, index)}
            fillOpacity={index === 0 ? 0.34 : 0.16}
            key={`series-${index}`}
            stroke={galleryColour(theme, index)}
            strokeWidth={index === 0 ? 2 : 1.5}
          />
        ))}
        {Arr.map(radarPoints([32, 48, 41, 60, 36], 5, square, 100), (dot) => (
          <circle
            cx={dot.x}
            cy={dot.y}
            fill={galleryColour(theme, 0)}
            key={`dot-${dot.x}-${dot.y}`}
            r={2.4}
            stroke="var(--card)"
            strokeWidth={1.5}
          />
        ))}
        {radarPoints([32, 48, 41, 60, 36], 5, square, 100).map(
          (point, index) => (
            <text
              fill={galleryColour(theme, 0)}
              fontSize={12}
              key={`icon-${index}`}
              textAnchor="middle"
              x={point.x}
              y={point.y + 4}
            >
              {["✓", "●", "i", "!"][index % 4]}
            </text>
          ),
        )}
      </svg>
    ),
    tooltip: (
      <div className="gx-dchart-tooltip-scene">
        <svg
          aria-label="Tooltip"
          className="gx-dchart-plot"
          height={160}
          role="img"
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          width={SCENE_WIDTH}
        >
          {groupedBarMarks(
            Arr.take(CHART_SERIES, 2),
            box,
            chartCeiling,
            CHART_LABELS.length,
          ).map((marks, index) =>
            marks.map((mark, at) =>
              mark.kind === "rect" ? (
                <rect
                  fill={galleryColour(theme, index)}
                  height={mark.height}
                  key={`bar-${at}`}
                  rx={3}
                  width={mark.width}
                  x={mark.x}
                  y={mark.y}
                />
              ) : null,
            ),
          )}
        </svg>
        <div className="gx-dchart-tip-card">
          <span className="gx-dchart-tip-head">Q2</span>
          <span className="gx-dchart-tip-row">
            <i
              className="gx-dchart-tip-line"
              style={{ backgroundColor: galleryColour(theme, 0) }}
            />
            Revenue <b>48</b>
          </span>
          <span className="gx-dchart-tip-row">
            <i
              className="gx-dchart-tip-line"
              style={{ backgroundColor: galleryColour(theme, 1) }}
            />
            Cost <b>22</b>
          </span>
        </div>
      </div>
    ),
    legend: (
      <div className="gx-dchart-legend-scene">
        {["square", "dot", "line"].map((shape, index) => (
          <span className="gx-dchart-legend-row" key={shape}>
            <i
              className={`gx-dchart-legend-mark gx-dchart-legend-${shape}`}
              style={{ backgroundColor: galleryColour(theme, index) }}
            />
            {shape}
            <b>{["181k", "90k", "24k"][index]}</b>
          </span>
        ))}
      </div>
    ),
    "area-variants": (
      <Variants>
        {(["linear", "step"] as const).map((curve) => (
          <Mini caption={curve} key={curve}>
            <svg
              aria-label={`Area ${curve}`}
              className="gx-dchart-plot"
              height={110}
              role="img"
              viewBox="0 0 180 110"
              width={180}
            >
              {Arr.map(CHART_SERIES, (one, index) => {
                const small = boxOf(180, 110, { width: 180, height: 110 });
                const points = seriesPoints(
                  one.values,
                  small,
                  range,
                  CHART_LABELS.length,
                );
                return (
                  <g key={one.key}>
                    <path
                      d={Option.getOrElse(
                        areaPath(points, small, range, curve),
                        () => "",
                      )}
                      fill={galleryColour(theme, index)}
                      opacity={0.25}
                    />
                    <path
                      d={Option.getOrElse(curvePath(points, curve), () => "")}
                      fill="none"
                      stroke={galleryColour(theme, index)}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}
            </svg>
          </Mini>
        ))}
        <Mini caption="legend top">
          <div className="gx-dchart-legend-scene">
            {CHART_SERIES.map((one, index) => (
              <span className="gx-dchart-legend-row" key={one.key}>
                <i
                  className="gx-dchart-legend-mark"
                  style={{ backgroundColor: galleryColour(theme, index) }}
                />
                {one.label}
              </span>
            ))}
          </div>
        </Mini>
      </Variants>
    ),
    "bar-variants": (
      <Variants>
        <Mini caption="active">
          <svg
            aria-label="Active bar"
            className="gx-dchart-plot"
            height={110}
            role="img"
            viewBox="0 0 180 110"
            width={180}
          >
            <rect
              fill="var(--muted-foreground)"
              height={100}
              opacity={0.18}
              width={44}
              x={46}
              y={5}
            />
            {groupedBarMarks(
              Arr.take(CHART_SERIES, 1),
              boxOf(180, 110, { width: 180, height: 110 }),
              chartCeiling,
              CHART_LABELS.length,
            ).map((marks) =>
              marks.map((mark, at) =>
                mark.kind === "rect" ? (
                  <rect
                    fill={galleryColour(theme, 0)}
                    height={mark.height}
                    key={`bar-${at}`}
                    rx={3}
                    width={mark.width}
                    x={mark.x}
                    y={mark.y}
                  />
                ) : null,
              ),
            )}
          </svg>
        </Mini>
        <Mini caption="custom labels">
          <div className="gx-dchart-label-scene">
            {CHART_LABELS.map((label, index) => (
              <span key={label}>
                {label} <b>{(CHART_SERIES[0]?.values[index] ?? 0) + "k"}</b>
              </span>
            ))}
          </div>
        </Mini>
      </Variants>
    ),
    "line-variants": (
      <Variants>
        {(["linear", "step"] as const).map((curve) => (
          <Mini caption={curve} key={curve}>
            <svg
              aria-label={`Line ${curve}`}
              className="gx-dchart-plot"
              height={110}
              role="img"
              viewBox="0 0 180 110"
              width={180}
            >
              {Option.match(Arr.head(CHART_SERIES), {
                onNone: () => null,
                onSome: (one) => (
                  <path
                    d={Option.getOrElse(
                      curvePath(
                        seriesPoints(
                          one.values,
                          boxOf(180, 110, { width: 180, height: 110 }),
                          range,
                          CHART_LABELS.length,
                        ),
                        curve,
                      ),
                      () => "",
                    )}
                    fill="none"
                    stroke={galleryColour(theme, 0)}
                    strokeWidth={2}
                  />
                ),
              })}
            </svg>
          </Mini>
        ))}
      </Variants>
    ),
    "pie-interactive": (
      <Variants>
        {[
          { caption: "rest", emphasis: undefined },
          { caption: "active", emphasis: 1 },
        ].map((variant) => (
          <Mini caption={variant.caption} key={variant.caption}>
            <svg
              aria-label={`Pie ${variant.caption}`}
              className="gx-dchart-plot"
              height={140}
              role="img"
              viewBox="0 0 140 140"
              width={140}
            >
              {ringSegments(
                [48, 32, 20],
                boxOf(140, 140, { width: 140, height: 140 }),
                0,
                0.03,
                variant.emphasis,
              ).map((marks, index) =>
                marks.map((mark) =>
                  mark.kind === "path" ? (
                    <path
                      d={mark.d}
                      fill={galleryColour(theme, index)}
                      key={`${index}-${mark.d.length}`}
                    />
                  ) : null,
                ),
              )}
            </svg>
          </Mini>
        ))}
      </Variants>
    ),
    "radar-variants": (
      <Variants>
        {[
          { caption: "no grid", webs: false, fill: true, labels: false },
          { caption: "lines only", webs: true, fill: false, labels: false },
          { caption: "custom labels", webs: true, fill: true, labels: true },
        ].map((variant) => (
          <Mini caption={variant.caption} key={variant.caption}>
            <svg
              aria-label={`Radar ${variant.caption}`}
              className="gx-dchart-plot"
              height={120}
              role="img"
              viewBox="0 0 120 120"
              width={120}
            >
              {variant.webs
                ? [
                    ...radarGrid(
                      4,
                      5,
                      boxOf(120, 120, { width: 120, height: 120 }),
                      100,
                    ),
                    ...radarSpokes(
                      5,
                      boxOf(120, 120, { width: 120, height: 120 }),
                      100,
                    ),
                  ].map((d, index) => (
                    <path
                      d={d}
                      fill="none"
                      key={`web-${index}`}
                      stroke="var(--muted-foreground)"
                      strokeWidth={1}
                    />
                  ))
                : null}
              {variant.fill ? (
                <path
                  d={Option.getOrElse(
                    polygonPath(
                      radarPoints(
                        [32, 48, 41, 60, 36],
                        5,
                        boxOf(120, 120, { width: 120, height: 120 }),
                        100,
                      ),
                    ),
                    () => "",
                  )}
                  fill={galleryColour(theme, 0)}
                  fillOpacity={0.25}
                />
              ) : null}
              <path
                d={Option.getOrElse(
                  polygonPath(
                    radarPoints(
                      [32, 48, 41, 60, 36],
                      5,
                      boxOf(120, 120, { width: 120, height: 120 }),
                      100,
                    ),
                  ),
                  () => "",
                )}
                fill="none"
                stroke={galleryColour(theme, 0)}
                strokeWidth={2}
              />
              {variant.labels
                ? ["S", "R", "T", "D", "D"].map((letter, index) => {
                    const point = radarPoints(
                      [100, 100, 100, 100, 100],
                      5,
                      boxOf(120, 120, { width: 120, height: 120 }),
                      100,
                    )[index];
                    return point === undefined ? null : (
                      <text
                        fill="var(--muted-foreground)"
                        fontSize={9}
                        key={`label-${index}`}
                        textAnchor="middle"
                        x={point.x}
                        y={point.y}
                      >
                        {letter}
                      </text>
                    );
                  })
                : null}
            </svg>
          </Mini>
        ))}
      </Variants>
    ),
    "radial-variants": (
      <Variants>
        {[
          { caption: "labels", showTrack: false },
          { caption: "track + grid", showTrack: true },
        ].map((variant) => (
          <Mini caption={variant.caption} key={variant.caption}>
            <svg
              aria-label={`Radial ${variant.caption}`}
              className="gx-dchart-plot"
              height={140}
              role="img"
              viewBox="0 0 140 140"
              width={140}
            >
              {[48, 32, 20].map((value, index) => {
                const outer = 68 - index * 14;
                const span = (value / 60) * Math.PI * 2;
                return (
                  <g key={`ring-${index}`}>
                    {variant.showTrack ? (
                      <path
                        d={fullRing(70, 70, outer, outer - 10)}
                        fill="var(--muted-foreground)"
                        opacity={0.18}
                      />
                    ) : null}
                    {radialArcs(
                      [value],
                      boxOf(140, 140, { width: 140, height: 140 }),
                      60,
                      10,
                      4,
                    ).flatMap((marks) =>
                      marks.map((mark) =>
                        mark.kind === "path" ? (
                          <path
                            d={mark.d}
                            fill={galleryColour(theme, index)}
                            key={`arc-${index}-${mark.d.length}`}
                          />
                        ) : null,
                      ),
                    )}
                    <text
                      fill="var(--muted-foreground)"
                      fontSize={9}
                      x={70 + (outer - 5) * Math.cos(-Math.PI / 2 + span) + 6}
                      y={70 + (outer - 5) * Math.sin(-Math.PI / 2 + span) + 3}
                    >
                      {value}
                    </text>
                  </g>
                );
              })}
              <text
                fill="var(--muted-foreground)"
                fontSize={10}
                textAnchor="middle"
                x={70}
                y={74}
              >
                100
              </text>
            </svg>
          </Mini>
        ))}
      </Variants>
    ),
    "area-interactive": <></>,
    "line-interactive": <></>,
    animated: <></>,
    "point-tooltip": <></>,
    brush: <></>,
    zoom: <></>,
    "tooltip-variants": (
      <Variants>
        {[
          { caption: "line", kind: "line", value: "48" },
          { caption: "formatter", kind: "dot", value: "$48" },
          { caption: "label custom", kind: "none", value: "48k" },
        ].map((variant) => (
          <Mini caption={variant.caption} key={variant.caption}>
            <div className="gx-dchart-tip-card gx-dchart-tip-static">
              <span className="gx-dchart-tip-head">
                {variant.caption === "label custom" ? "Quarter 2" : "Q2"}
              </span>
              <span className="gx-dchart-tip-row">
                {variant.kind === "none" ? null : (
                  <i
                    className={
                      variant.kind === "line"
                        ? "gx-dchart-tip-line"
                        : "gx-dchart-tip-dot"
                    }
                    style={{ backgroundColor: galleryColour(theme, 0) }}
                  />
                )}
                Revenue <b>{variant.value}</b>
              </span>
            </div>
          </Mini>
        ))}
      </Variants>
    ),
  };
  return (
    <figure className="gx-dchart-cell" data-mode={mode}>
      <figcaption>{mode}</figcaption>
      {scenes[mode]}
    </figure>
  );
}

export function ChartDemo() {
  const { platform, look, theme } = usePlatform();
  const [mode, setMode] = useState<ChartMode>("bars");

  return (
    <div className="gx-data-scene" data-platform={platform} data-wide="">
      <ChartDemoBody
        key={`${platform}-${look}-${mode}`}
        mode={mode}
        theme={theme}
      />
      <ChartGallery theme={theme} />
      <div aria-label="Read as" className="gx-data-row" role="group">
        {(
          [
            "bars",
            "lines",
            "area",
            "mixed",
            "pie",
            "pie-labels",
            "pie-outside",
            "line-labels",
            "radar-icons",
            "tooltip",
            "legend",
            "radar",
            "radar-filled",
            "radial",
            "radial-rounded",
            "area-variants",
            "bar-variants",
            "line-variants",
            "pie-interactive",
            "radar-variants",
            "radial-variants",
            "tooltip-variants",
            "area-interactive",
            "line-interactive",
            "animated",
            "point-tooltip",
            "brush",
            "zoom",
          ] as const
        ).map((candidate) => (
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

export const chartsDemoSource = `import {
  AreaChart,
  BarChart,
  PieChart,
  RadarChart,
  RadialChart,
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

<AreaChart aria-label="Revenue" labels={QUARTERS} series={[revenue]} stacked />;
<PieChart aria-label="Traffic" data={SOURCES} innerRadius={0} />;
<RadarChart aria-label="Coverage" labels={AREAS} series={[team]} levels={4} />;
<RadialChart aria-label="Storage" data={STORAGE} max={100} centerLabel="62%" />;`;
