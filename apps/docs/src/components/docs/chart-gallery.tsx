import {
  chartBox,
  groupedBarMarks,
  seriesColour,
  stackedBarMarks,
  type ChartBox,
  type ChartMark,
  type ChartSeries,
} from "@gpuixui/data/chart/logic";
import {
  areaPath,
  chartRange,
  curvePath,
  fullRing,
  pointMarks,
  polygonPath,
  radarGrid,
  radarPoints,
  radarSpokes,
  radialArcs,
  ringArc,
  ringSegments,
  seriesPoints,
} from "@gpuixui/data/chart/geometry";
import { seriesColors, type Theme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { JSX } from "react";

const CELL: ChartBox = chartBox(160, 100, { width: 160, height: 100 });

const SQUARE: ChartBox = chartBox(100, 100, { width: 100, height: 100 });

const REVENUE: ChartSeries = {
  key: "revenue",
  label: "Revenue",
  values: [32, 48, 41, 60],
};

const COST: ChartSeries = {
  key: "cost",
  label: "Cost",
  values: [18, 22, 26, 24],
};

const SERIES: ReadonlyArray<ChartSeries> = [REVENUE, COST];

const CATEGORIES = 4;

const RANGE = chartRange(SERIES, CATEGORIES);

const STACK_RANGE = chartRange(SERIES, CATEGORIES, true);

const colourOf = (theme: Theme, index: number): string =>
  seriesColour(seriesColors(theme), index);

function Painted({
  marks,
  colour,
}: {
  readonly marks: ReadonlyArray<ChartMark>;
  readonly colour: string;
}): JSX.Element {
  return (
    <>
      {Arr.map(marks, (mark, index) => {
        const fill = mark.fill?.color ?? colour;
        if (mark.kind === "rect") {
          return (
            <rect
              fill={fill}
              height={mark.height}
              key={index}
              rx={mark.rx}
              width={mark.width}
              x={mark.x}
              y={mark.y}
            />
          );
        }
        if (mark.kind === "path") {
          return <path d={mark.d} fill={fill} key={index} />;
        }
        if (mark.kind === "circle") {
          return (
            <circle
              cx={mark.cx}
              cy={mark.cy}
              fill={fill}
              key={index}
              r={mark.r}
            />
          );
        }
        return null;
      })}
    </>
  );
}

function Cell({
  label,
  children,
}: {
  readonly label: string;
  readonly children: JSX.Element;
}): JSX.Element {
  return (
    <figure className="gx-dchart-cell">
      <figcaption>{label}</figcaption>
      {children}
    </figure>
  );
}

function Plot({
  label,
  children,
  square = false,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly square?: boolean;
}): JSX.Element {
  const width = square ? 100 : 160;
  return (
    <svg
      aria-label={label}
      className="gx-dchart-plot"
      height={100}
      role="img"
      viewBox={`0 0 ${width} 100`}
      width={width}
    >
      {children}
    </svg>
  );
}

const pointsOf = (series: ChartSeries) =>
  seriesPoints(series.values, CELL, RANGE, CATEGORIES);

const edgeOf = (series: ChartSeries): string =>
  Option.getOrElse(curvePath(pointsOf(series), "smooth"), () => "");

const areaOf = (series: ChartSeries): string =>
  Option.getOrElse(areaPath(pointsOf(series), CELL, RANGE, "smooth"), () => "");

const SANKEY = {
  from: [
    { name: "Visits", value: 100 },
    { name: "Referral", value: 40 },
  ],
  to: [
    { name: "Trial", value: 84 },
    { name: "Exit", value: 56 },
  ],
  links: [
    { from: 0, to: 0, value: 64 },
    { from: 0, to: 1, value: 36 },
    { from: 1, to: 0, value: 20 },
    { from: 1, to: 1, value: 20 },
  ],
} as const;

const CANDLES = [
  { open: 34, high: 56, low: 26, close: 50 },
  { open: 50, high: 62, low: 42, close: 44 },
  { open: 44, high: 54, low: 30, close: 33 },
  { open: 33, high: 72, low: 28, close: 68 },
] as const;

const FUNNEL = [100, 74, 48, 24] as const;

const SUNBURST = {
  inner: [58, 42],
  outer: [
    [30, 28],
    [18, 24],
  ],
} as const;

export function ChartGallery({
  theme,
}: {
  readonly theme: Theme;
}): JSX.Element {
  const bars = groupedBarMarks(SERIES, CELL, RANGE.max, CATEGORIES);
  const stacks = stackedBarMarks(SERIES, CELL, STACK_RANGE.max, CATEGORIES);
  const pie = ringSegments(
    SERIES.map((one) => one.values[3] ?? 0),
    SQUARE,
    0,
    0.03,
  );
  const donut = ringSegments(
    SERIES.map((one) => one.values[3] ?? 0),
    SQUARE,
    0.58,
    0.03,
  );
  const radarSeries = radarPoints([32, 48, 41, 60, 36], 5, SQUARE, 60);
  const gauge = radialArcs([62], SQUARE, 100, 12, 0);
  const radialBars = radialArcs([48, 32, 20], SQUARE, 60, 8, 4);
  const scatter = SERIES.map((one) => pointMarks(pointsOf(one), 3));

  return (
    <div className="gx-dchart-gallery" data-demo="charts-gallery">
      <Cell label="BarChart">
        <Plot label="Revenue and cost by quarter, grouped bars">
          {bars.map((marks, index) => (
            <Painted
              colour={colourOf(theme, index)}
              key={index}
              marks={marks}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="StackedBar">
        <Plot label="Revenue on cost, stacked">
          {stacks.map((marks, index) => (
            <Painted
              colour={colourOf(theme, index)}
              key={index}
              marks={marks}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="LineChart">
        <Plot label="Revenue and cost as lines">
          {SERIES.map((one, index) => (
            <path
              d={edgeOf(one)}
              fill="none"
              key={one.key}
              stroke={colourOf(theme, index)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="AreaChart">
        <Plot label="Revenue and cost as filled trends">
          {SERIES.map((one, index) => (
            <g key={one.key}>
              <path
                d={areaOf(one)}
                fill={colourOf(theme, index)}
                opacity={0.2}
              />
              <path
                d={edgeOf(one)}
                fill="none"
                stroke={colourOf(theme, index)}
                strokeWidth={2}
              />
            </g>
          ))}
        </Plot>
      </Cell>

      <Cell label="ComposedChart">
        <Plot label="Revenue as bars, cost as a line">
          <Painted colour={colourOf(theme, 0)} marks={bars[0] ?? []} />
          <path
            d={edgeOf(COST)}
            fill="none"
            stroke={colourOf(theme, 1)}
            strokeLinecap="round"
            strokeWidth={2}
          />
        </Plot>
      </Cell>

      <Cell label="ScatterChart">
        <Plot label="Two series as points">
          <line
            stroke="var(--muted-foreground)"
            strokeOpacity={0.25}
            x1={0}
            x2={160}
            y1={100}
            y2={100}
          />
          {scatter.map((marks, index) => (
            <Painted
              colour={colourOf(theme, index)}
              key={index}
              marks={marks}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="CandleChart">
        <Plot label="Open, high, low and close per quarter">
          {CANDLES.map((candle, index) => {
            const slot = 160 / CANDLES.length;
            const x = index * slot + slot / 2;
            const y = (value: number) => 96 - (value / 80) * 88;
            const up = candle.close >= candle.open;
            const body = Math.abs(y(candle.close) - y(candle.open));
            return (
              <g key={index}>
                <line
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.6}
                  x1={x}
                  x2={x}
                  y1={y(candle.high)}
                  y2={y(candle.low)}
                />
                <rect
                  fill={up ? colourOf(theme, 2) : "var(--destructive)"}
                  height={Math.max(2, body)}
                  rx={1.5}
                  width={14}
                  x={x - 7}
                  y={y(Math.max(candle.open, candle.close))}
                />
              </g>
            );
          })}
        </Plot>
      </Cell>

      <Cell label="FunnelChart">
        <Plot label="A funnel narrowing to its result">
          {FUNNEL.map((value, index) => {
            const top = 6 + index * 23;
            const wide = (value / 100) * 62;
            const next = (FUNNEL[index + 1] ?? value * 0.6) / 100;
            const narrow = next * 62;
            return (
              <path
                d={`M${80 - wide} ${top}L${80 + wide} ${top}L${80 + narrow} ${top + 18}L${80 - narrow} ${top + 18}Z`}
                fill={colourOf(theme, index)}
                key={index}
                opacity={0.9 - index * 0.15}
              />
            );
          })}
        </Plot>
      </Cell>

      <Cell label="PieChart">
        <Plot label="Traffic by source as a pie" square>
          {pie.map((marks, index) => (
            <Painted
              colour={colourOf(theme, index)}
              key={index}
              marks={marks}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="DonutChart">
        <Plot label="Traffic by source as a ring" square>
          {donut.map((marks, index) => (
            <Painted
              colour={colourOf(theme, index)}
              key={index}
              marks={marks}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="RadarChart">
        <Plot label="Coverage across five axes" square>
          {[...radarGrid(4, 5, SQUARE, 60), ...radarSpokes(5, SQUARE, 60)].map(
            (d, index) => (
              <path
                d={d}
                fill="none"
                key={`web-${index}`}
                stroke={colourOf(theme, 0)}
                strokeOpacity={0.28}
                strokeWidth={1}
              />
            ),
          )}
          <path
            d={Option.getOrElse(polygonPath(radarSeries), () => "")}
            fill={colourOf(theme, 0)}
            fillOpacity={0.3}
            stroke={colourOf(theme, 0)}
            strokeWidth={1.5}
          />
        </Plot>
      </Cell>

      <Cell label="RadialChart">
        <Plot label="Storage as a gauge at sixty-two percent" square>
          <path
            d={fullRing(50, 50, 40, 28)}
            fill="var(--muted-foreground)"
            opacity={0.18}
          />
          {gauge.map((marks, index) => (
            <Painted colour={colourOf(theme, 0)} key={index} marks={marks} />
          ))}
          <text
            fill="var(--foreground)"
            fontSize={15}
            fontWeight={600}
            textAnchor="middle"
            x={50}
            y={55}
          >
            62%
          </text>
        </Plot>
      </Cell>

      <Cell label="RadialBarChart">
        <Plot label="Three measures as concentric bars" square>
          {[40, 33, 26].map((radius) => (
            <path
              d={fullRing(50, 50, radius, radius - 8)}
              fill="var(--muted-foreground)"
              key={radius}
              opacity={0.16}
            />
          ))}
          {radialBars.map((marks, index) => (
            <Painted
              colour={colourOf(theme, index)}
              key={index}
              marks={marks}
            />
          ))}
        </Plot>
      </Cell>

      <Cell label="TreemapChart">
        <Plot label="Traffic by source, by area">
          <Treemap theme={theme} />
        </Plot>
      </Cell>

      <Cell label="SankeyChart">
        <Plot label="Visits flowing to trials and exits">
          <Sankey theme={theme} />
        </Plot>
      </Cell>

      <Cell label="SunburstChart">
        <Plot label="Traffic as two bands of arcs" square>
          <Sunburst theme={theme} />
        </Plot>
      </Cell>

      <Cell label="Sparkline">
        <Plot label="A single trend in one line">
          <path
            d={edgeOf(REVENUE)}
            fill="none"
            stroke={colourOf(theme, 0)}
            strokeLinecap="round"
            strokeWidth={2}
          />
          {Option.match(Arr.last(pointsOf(REVENUE)), {
            onNone: () => null,
            onSome: (point) => (
              <circle
                cx={point.x}
                cy={point.y}
                fill={colourOf(theme, 0)}
                r={3}
              />
            ),
          })}
        </Plot>
      </Cell>

      <Cell label="ChartLegend">
        <div className="gx-dchart-legend-scene">
          {(["square", "dot", "line"] as const).map((mark, index) => (
            <span className="gx-dchart-legend-row" key={mark}>
              <i
                className={`gx-dchart-legend-mark gx-dchart-legend-${mark}`}
                style={{ backgroundColor: colourOf(theme, index) }}
              />
              {["Revenue", "Cost", "Margin"][index]}
              <b>{["181k", "90k", "24k"][index]}</b>
            </span>
          ))}
        </div>
      </Cell>
    </div>
  );
}

function Treemap({ theme }: { readonly theme: Theme }): JSX.Element {
  const sources = [
    { name: "Organic", value: 42 },
    { name: "Direct", value: 26 },
    { name: "Referral", value: 18 },
    { name: "Social", value: 14 },
  ] as const;
  const gap = 3;
  const leftW = ((sources[0]?.value ?? 0) / 100) * (160 - gap);
  const rightX = leftW + gap;
  const rightW = 160 - rightX;
  const rest = 26 + 18 + 14;
  const directH = (26 / rest) * 100;
  const bottomY = directH + gap;
  const referralW = (18 / (18 + 14)) * (rightW - gap);
  const cells = [
    { x: 0, y: 0, w: leftW - gap, h: 100 },
    { x: rightX, y: 0, w: rightW, h: directH - gap },
    { x: rightX, y: bottomY, w: referralW, h: 100 - bottomY },
    {
      x: rightX + referralW + gap,
      y: bottomY,
      w: rightW - referralW - gap,
      h: 100 - bottomY,
    },
  ];
  return (
    <>
      {cells.map((cell, index) => (
        <rect
          fill={colourOf(theme, index)}
          height={Math.max(0, cell.h)}
          key={sources[index]?.name}
          rx={2}
          width={Math.max(0, cell.w)}
          x={cell.x}
          y={cell.y}
        />
      ))}
    </>
  );
}

function Sankey({ theme }: { readonly theme: Theme }): JSX.Element {
  const nodeW = 8;
  const total = 140;
  const leftX = 4;
  const rightX = 148;
  const leftFrom = (value: number) => 10 + (value / total) * 80;
  const rightFrom = (value: number) => 10 + (value / total) * 80;
  let leftRun = 0;
  let rightRun = 0;
  return (
    <>
      {SANKEY.from.map((node, index) => {
        const y = leftFrom(leftRun);
        leftRun += node.value;
        return (
          <rect
            fill={colourOf(theme, index)}
            height={(node.value / total) * 80}
            key={node.name}
            rx={2}
            width={nodeW}
            x={leftX}
            y={y}
          />
        );
      })}
      {SANKEY.to.map((node, index) => {
        const y = rightFrom(rightRun);
        rightRun += node.value;
        return (
          <rect
            fill={colourOf(theme, index + 1)}
            height={(node.value / total) * 80}
            key={node.name}
            rx={2}
            width={nodeW}
            x={rightX}
            y={y}
          />
        );
      })}
      {SANKEY.links.map((link, index) => {
        const from = Arr.reduce(
          Arr.take(SANKEY.from, link.from),
          0,
          (sum, node) => sum + node.value,
        );
        const to = Arr.reduce(
          Arr.take(SANKEY.to, link.to),
          0,
          (sum, node) => sum + node.value,
        );
        const topFrom = leftFrom(from) + (from / total) * 8;
        const topTo = rightFrom(to) + (to / total) * 8;
        const thick = (link.value / total) * 62;
        return (
          <path
            d={`M${leftX + nodeW} ${topFrom}C${(leftX + rightX) / 2} ${topFrom} ${(leftX + rightX) / 2} ${topTo} ${rightX} ${topTo}L${rightX} ${topTo + thick}C${(leftX + rightX) / 2} ${topTo + thick} ${(leftX + rightX) / 2} ${topFrom + thick} ${leftX + nodeW} ${topFrom + thick}Z`}
            fill={colourOf(theme, link.from)}
            key={index}
            opacity={0.4}
          />
        );
      })}
    </>
  );
}

function Sunburst({ theme }: { readonly theme: Theme }): JSX.Element {
  const innerTotal = Arr.reduce(SUNBURST.inner, 0, (sum, value) => sum + value);
  let innerStart = -Math.PI / 2;
  const inner = SUNBURST.inner.map((value, index) => {
    const span = (value / innerTotal) * Math.PI * 2;
    const d = ringArc(50, 50, 34, 18, innerStart, innerStart + span);
    innerStart += span;
    return (
      <path d={d} fill={colourOf(theme, index)} key={index} opacity={0.85} />
    );
  });
  return (
    <>
      {inner}
      {SUNBURST.outer.map((band, bandIndex) => {
        const totalOfBand = Arr.reduce(band, 0, (sum, value) => sum + value);
        let start = -Math.PI / 2;
        return band.map((value, index) => {
          const span = (value / totalOfBand) * Math.PI * 2;
          const d = ringArc(
            50,
            50,
            48 - bandIndex * 12,
            36 - bandIndex * 12,
            start,
            start + span,
          );
          start += span;
          return (
            <path
              d={d}
              fill={colourOf(theme, bandIndex + index + 1)}
              key={`${bandIndex}-${index}`}
              opacity={0.55}
            />
          );
        });
      })}
    </>
  );
}
