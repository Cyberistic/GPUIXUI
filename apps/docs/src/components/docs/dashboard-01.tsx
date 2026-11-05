/**
 * Dashboard 01 — shadcn's dashboard, at `/blocks/dashboard-01`.
 *
 * The reference is shadcn/ui's `dashboard-01`: an inset sidebar with a
 * version switcher, five nav groups, a documents header, four stat cards, an
 * interactive area chart over thirty days of traffic, and a documents table.
 *
 * Two views of one composition, like every block: the browser drawing below
 * is a reproduction of the native geometry and palette (the shipped tree
 * renders through GPUix, not the DOM), and `dashboard01Source` is the
 * `@gpuixui/*` recipe a consumer copies.
 *
 * **The charts are the point.** The reference draws one area chart; this
 * drawing shows the whole chart family — an area over thirty days, a
 * treemap of the traffic sources, a sankey of the funnel, and a sunburst of
 * the device mix — because a showcase that shows one chart shows nothing.
 *
 * The categorical colours are the library's data series, never a palette of
 * the docs' own: `--series-*` arrives from the preview surface's theme (so the
 * platform and look switch repaint the charts) and `.gx-dash` falls back to
 * the dark theme's scale on the landing, which renders outside a preview
 * surface.
 */

import { useState } from "react";
import {
  SbAccount,
  SbBrand,
  SbGroup,
  SbIcon,
  SbInset,
  SbInsetHeader,
  SbPanel,
  SbRow,
  SbSearch,
  SbShell,
} from "./blocks/sidebar-kit";

/* -- the reference's data ---------------------------------------------- */

/** The reference's thirty days of traffic, in the two series it plots. */
const TRAFFIC = [
  { date: "Apr 01", desktop: 222, mobile: 150 },
  { date: "Apr 02", desktop: 97, mobile: 180 },
  { date: "Apr 03", desktop: 167, mobile: 120 },
  { date: "Apr 04", desktop: 242, mobile: 260 },
  { date: "Apr 05", desktop: 373, mobile: 290 },
  { date: "Apr 06", desktop: 301, mobile: 340 },
  { date: "Apr 07", desktop: 245, mobile: 180 },
  { date: "Apr 08", desktop: 409, mobile: 320 },
  { date: "Apr 09", desktop: 59, mobile: 110 },
  { date: "Apr 10", desktop: 261, mobile: 190 },
  { date: "Apr 11", desktop: 327, mobile: 350 },
  { date: "Apr 12", desktop: 292, mobile: 210 },
  { date: "Apr 13", desktop: 342, mobile: 380 },
  { date: "Apr 14", desktop: 137, mobile: 220 },
  { date: "Apr 15", desktop: 120, mobile: 170 },
  { date: "Apr 16", desktop: 138, mobile: 190 },
  { date: "Apr 17", desktop: 446, mobile: 360 },
  { date: "Apr 18", desktop: 364, mobile: 410 },
  { date: "Apr 19", desktop: 243, mobile: 180 },
  { date: "Apr 20", desktop: 89, mobile: 150 },
  { date: "Apr 21", desktop: 137, mobile: 200 },
  { date: "Apr 22", desktop: 224, mobile: 170 },
  { date: "Apr 23", desktop: 138, mobile: 230 },
  { date: "Apr 24", desktop: 387, mobile: 290 },
  { date: "Apr 25", desktop: 215, mobile: 250 },
  { date: "Apr 26", desktop: 75, mobile: 130 },
  { date: "Apr 27", desktop: 383, mobile: 420 },
  { date: "Apr 28", desktop: 122, mobile: 180 },
  { date: "Apr 29", desktop: 315, mobile: 240 },
  { date: "Apr 30", desktop: 454, mobile: 380 },
] as const;

/** The reference's four stat cards, in the order it lays them out. */
const STATS = [
  {
    label: "Total Revenue",
    value: "$1,250.00",
    trend: "+12.5%",
    up: true,
    note: "Trending up this month",
    sub: "Visitors for the last 6 months",
  },
  {
    label: "New Customers",
    value: "1,234",
    trend: "-20%",
    up: false,
    note: "Down 20% this period",
    sub: "Acquisition needs attention",
  },
  {
    label: "Active Accounts",
    value: "45,678",
    trend: "+12.5%",
    up: true,
    note: "Strong user retention",
    sub: "Engaged in the last 30 days",
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    trend: "+4.5%",
    up: true,
    note: "Steady growth",
    sub: "Compared to the last month",
  },
] as const;

/** The reference's documents table. */
const DOCUMENTS = [
  {
    header: "Cover page",
    type: "Cover page",
    status: "In Process",
    target: "18",
    limit: "5",
    reviewer: "Eddie Lake",
  },
  {
    header: "Table of contents",
    type: "Table of contents",
    status: "Done",
    target: "29",
    limit: "24",
    reviewer: "Eddie Lake",
  },
  {
    header: "Executive summary",
    type: "Narrative",
    status: "Done",
    target: "10",
    limit: "13",
    reviewer: "Eddie Lake",
  },
  {
    header: "Technical approach",
    type: "Narrative",
    status: "Done",
    target: "27",
    limit: "23",
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Design",
    type: "Narrative",
    status: "In Process",
    target: "2",
    limit: "16",
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Capabilities",
    type: "Narrative",
    status: "In Process",
    target: "20",
    limit: "8",
    reviewer: "Jamik Tashpulatov",
  },
] as const;

/** The nav the reference's sidebar carries. */
const NAV = [
  { title: "Dashboard", icon: "grid" },
  { title: "Lifecycle", icon: "list" },
  { title: "Analytics", icon: "table" },
  { title: "Projects", icon: "folder" },
  { title: "Team", icon: "user" },
] as const;

/** The reference's three cloud groups, each with two items. */
const CLOUDS = [
  { title: "Capture", active: true, items: ["Active Proposals", "Archived"] },
  { title: "Proposal", active: false, items: ["Active Proposals", "Archived"] },
  { title: "Prompts", active: false, items: ["Active Proposals", "Archived"] },
] as const;

/* -- the drawings -------------------------------------------------------- */

/**
 * A smooth path through points, the way a chart library draws one.
 *
 * A polyline puts a sharp vertex on every datum, which reads as noise when
 * two series are stacked. This is a **monotone cubic** interpolation — the
 * curve that passes through every point without overshooting between them —
 * so the line is calm and never invents a value the data does not have.
 */
const smoothPath = (points: ReadonlyArray<{ x: number; y: number }>): string => {
  const first = points[0];
  if (first === undefined) return "";
  if (points.length === 1) return `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;

  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) continue;
    const run = b.x - a.x;
    dx[i] = run;
    slope[i] = run === 0 ? 0 : (b.y - a.y) / run;
  }

  // The Fritsch–Carlson tangents: a slope that would overshoot is pulled back
  // to zero, so the curve stays inside its own data.
  const tangent: number[] = Array.from({ length: n }, () => 0);
  const head = slope[0] ?? 0;
  const tail = slope[n - 2] ?? 0;
  tangent[0] = head;
  tangent[n - 1] = tail;
  for (let i = 1; i < n - 1; i += 1) {
    const before = slope[i - 1] ?? 0;
    const after = slope[i] ?? 0;
    if (before * after <= 0) {
      tangent[i] = 0;
      continue;
    }
    const w1 = 2 * (dx[i] ?? 1) + (dx[i - 1] ?? 1);
    const w2 = (dx[i] ?? 1) + 2 * (dx[i - 1] ?? 1);
    tangent[i] = (w1 + w2) / (w1 / before + w2 / after);
  }

  let path = `M${first.x.toFixed(1)},${first.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) continue;
    const h = (b.x - a.x) / 3;
    path += ` C${(a.x + h).toFixed(1)},${(a.y + (tangent[i] ?? 0) * h).toFixed(1)} ${(b.x - h).toFixed(1)},${(b.y - (tangent[i + 1] ?? 0) * h).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }
  return path;
};

/** One row of a readout: a name, its value, and the colour it belongs to. */
interface TipRow {
  readonly name: string;
  readonly value: string;
  /** The swatch's colour. Defaults to the theme's primary. */
  readonly color?: string;
}

/** A readout card, placed where the pointer is. */
interface Tip {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly rows: ReadonlyArray<TipRow>;
}

/**
 * The readout for the mark under the pointer, in the plot's own CSS pixels.
 *
 * Every chart here follows the same rule the area chart does, because the
 * reference does: the card sits at the **pointer**, not at a fixed corner, and
 * flips across the plot's midline so it never runs past an edge.
 */
const tipFor = (
  event: React.MouseEvent<SVGElement>,
  title: string,
  rows: ReadonlyArray<TipRow>,
): Tip => {
  const svg =
    event.currentTarget.ownerSVGElement ??
    (event.currentTarget as unknown as SVGSVGElement);
  const box = svg.getBoundingClientRect();
  return {
    x: event.clientX - box.left,
    y: event.clientY - box.top,
    width: box.width,
    height: box.height,
    title,
    rows,
  };
};

/** The readout card, drawn at the pointer and flipped where it would overflow. */
const TipCard = ({ tip }: { readonly tip: Tip }) => (
  <div
    className="gx-dash01-tip"
    data-flip-x={tip.x > tip.width * 0.6}
    data-flip-y={tip.y > tip.height * 0.55}
    style={{ left: tip.x, top: tip.y }}
  >
    <p className="gx-dash01-tip-date">{tip.title}</p>
    <ul className="gx-dash01-tip-rows">
      {tip.rows.map((row) => (
        <li key={row.name}>
          <span
            aria-hidden="true"
            className="gx-dash01-tip-dot"
            style={row.color === undefined ? undefined : { background: row.color }}
          />
          <span className="gx-dash01-tip-name">{row.name}</span>
          <span className="gx-dash01-tip-value">{row.value}</span>
        </li>
      ))}
    </ul>
  </div>
);

/** The colour a cell or an arc paints in, by its slot on the series scale. */
const SLOT_COLOURS = [
  "var(--series-1, #a7a9ff)",
  "var(--series-2, #6e9cff)",
  "var(--series-3, #1fa968)",
  "var(--series-4, #ffde8a)",
] as const;

/**
 * The area chart over the thirty days.
 *
 * The reference is shadcn's `chart-area-interactive`: two series **stacked**
 * on one axis, a smooth edge, a fill that fades from the line to the axis,
 * horizontal grid rules and **no value axis** — the numbers live in the
 * readout, not in a column of ticks beside the plot.
 *
 * The readout is the reference's too: Recharts places its tooltip wrapper at
 * the pointer, so the card **follows the cursor** and flips when it would run
 * past an edge. `cursor={false}`, so there is no rule across the plot; the
 * datum under the pointer is marked by a dot on each series instead.
 */
function TrafficArea() {
  const w = 720;
  const h = 240;
  const plotLeft = 8;
  const plotRight = w - 8;
  const plotTop = 14;
  const plotBottom = 200;
  const plotH = plotBottom - plotTop;
  const plotW = plotRight - plotLeft;

  const series = [
    { key: "mobile", name: "Mobile", id: "mobile", top: 0.8 },
    { key: "desktop", name: "Desktop", id: "desktop", top: 1 },
  ] as const;

  const totals = TRAFFIC.map((row) => row.desktop + row.mobile);
  const ceiling = Math.max(...totals);
  const max = Math.ceil(ceiling / 200) * 200;
  const step = plotW / Math.max(1, TRAFFIC.length - 1);
  const at = (value: number): number => plotBottom - (value / max) * plotH;

  // One band per series: mobile on the axis, desktop above it.
  let floor = TRAFFIC.map(() => 0);
  const bands = series.map((one) => {
    const lower = floor;
    const upper = TRAFFIC.map((row, index) => (lower[index] ?? 0) + row[one.key]);
    floor = upper;
    return { ...one, lower, upper };
  });

  // The pointer, in the plot's own CSS pixels, so the card can sit where the
  // cursor is — the way Recharts places its tooltip wrapper.
  const [pointer, setPointer] = useState<{
    readonly x: number;
    readonly y: number;
    readonly index: number;
  } | null>(null);
  const shown = pointer === null ? undefined : TRAFFIC[pointer.index];

  return (
    <div className="gx-dash01-area-wrap">
      <div className="gx-dash01-area-plot">
        <svg
          aria-label="Desktop and mobile traffic over the last thirty days"
          className="gx-dash01-area"
          onMouseLeave={() => setPointer(null)}
          onMouseMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            if (box.width === 0) return;
            const scale = w / box.width;
            const x = (event.clientX - box.left) * scale;
            const index = Math.round((x - plotLeft) / step);
            if (index < 0 || index >= TRAFFIC.length) {
              setPointer(null);
              return;
            }
            setPointer({
              x: event.clientX - box.left,
              y: event.clientY - box.top,
              index,
            });
          }}
          role="img"
          viewBox={`0 0 ${w} ${h}`}
        >
          <defs>
            {bands.map((band) => (
              <linearGradient
                id={`gx-dash01-${band.id}`}
                key={band.id}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={band.top}
                />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity="0.1" />
              </linearGradient>
            ))}
          </defs>
          {/* The reference's grid is horizontal only: a vertical rule adds a
              column the reader has no value to read against. */}
          {[0, 0.25, 0.5, 0.75, 1].map((share) => {
            const y = at(share * max);
            return (
              <line
                className="gx-dash-axis"
                key={share}
                x1={plotLeft}
                x2={plotRight}
                y1={y}
                y2={y}
              />
            );
          })}
          {bands.map((band) => {
            const top = band.upper.map((value, index) => ({
              x: plotLeft + index * step,
              y: at(value),
            }));
            const bottom = band.lower
              .map((value, index) => ({
                x: plotLeft + index * step,
                y: at(value),
              }))
              .reverse();
            const line = smoothPath(top);
            const area = `${line} L${bottom[0]?.x.toFixed(1)},${bottom[0]?.y.toFixed(1)} ${smoothPath(bottom).slice(1)} Z`;
            return (
              <g key={band.key}>
                <path d={area} fill={`url(#gx-dash01-${band.id})`} />
                <path className="gx-dash01-area-line" d={line} />
              </g>
            );
          })}
          {pointer === null ? null : (
            <g className="gx-dash01-points">
              {bands.map((band) => (
                <circle
                  cx={plotLeft + pointer.index * step}
                  cy={at(band.upper[pointer.index] ?? 0)}
                  key={band.key}
                  r="4"
                  stroke="var(--card)"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
          {TRAFFIC.map((row, index) =>
            index % 5 === 0 ? (
              <text
                className="gx-dash-axis-label"
                key={row.date}
                textAnchor="middle"
                x={plotLeft + index * step}
                y={h - 6}
              >
                {row.date}
              </text>
            ) : null,
          )}
        </svg>
        {shown === undefined || pointer === null ? null : (
          <div
            className="gx-dash01-tip"
            data-flip-x={pointer.x > w * 0.6}
            data-flip-y={pointer.y > h * 0.55}
            style={{ left: pointer.x, top: pointer.y }}
          >
            <p className="gx-dash01-tip-date">{shown.date}</p>
            <ul className="gx-dash01-tip-rows">
              {series.map((one) => (
                <li key={one.key}>
                  <span aria-hidden="true" className="gx-dash01-tip-dot" />
                  <span className="gx-dash01-tip-name">{one.name}</span>
                  <span className="gx-dash01-tip-value">
                    {shown[one.key].toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <ul className="gx-dash01-legend">
        {series.map((one) => (
          <li key={one.key}>
            <span aria-hidden="true" className="gx-dash01-legend-dot" />
            {one.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The treemap of the traffic sources.
 *
 * Each cell's **area** is its share of the whole, and the cells are squared:
 * the largest source takes a strip of its own and the rest fill what is left,
 * so the picture is the proportions rather than a grid.
 */
function SourceTreemap() {
  const w = 300;
  const h = 208;
  const gap = 4;
  const sources = [
    { name: "Organic", value: 42 },
    { name: "Direct", value: 26 },
    { name: "Referral", value: 18 },
    { name: "Social", value: 14 },
  ] as const;
  const total = 100;
  const [organic, direct, referral, social] = sources;

  const leftW = ((organic?.value ?? 0) / total) * (w - gap);
  const rightX = leftW + gap;
  const rightW = w - rightX;
  const rest = (direct?.value ?? 0) + (referral?.value ?? 0) + (social?.value ?? 0);
  const directH = ((direct?.value ?? 0) / rest) * h;
  const bottomY = directH + gap;
  const bottomH = h - bottomY;
  const bottom = (referral?.value ?? 0) + (social?.value ?? 0);
  const referralW = ((referral?.value ?? 0) / bottom) * (rightW - gap);

  const cells = [
    { name: organic?.name ?? "", value: organic?.value ?? 0, x: 0, y: 0, w: leftW - gap, h, slot: 1 },
    { name: direct?.name ?? "", value: direct?.value ?? 0, x: rightX, y: 0, w: rightW, h: directH - gap, slot: 2 },
    { name: referral?.name ?? "", value: referral?.value ?? 0, x: rightX, y: bottomY, w: referralW, h: bottomH, slot: 3 },
    { name: social?.name ?? "", value: social?.value ?? 0, x: rightX + referralW + gap, y: bottomY, w: rightW - referralW - gap, h: bottomH, slot: 4 },
  ];

  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="gx-dash01-plot">
      <svg
        aria-label="Traffic by source"
        className="gx-dash01-treemap"
        onMouseLeave={() => setTip(null)}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          if (box.width === 0) return;
          const scale = w / box.width;
          const x = (event.clientX - box.left) * scale;
          const y = (event.clientY - box.top) * scale;
          const cell = cells.find(
            (one) =>
              x >= one.x && x <= one.x + one.w && y >= one.y && y <= one.y + one.h,
          );
          if (cell === undefined) {
            setTip(null);
            return;
          }
          setTip(
            tipFor(event, cell.name, [
              {
                name: "Share",
                value: `${cell.value}%`,
                color: SLOT_COLOURS[cell.slot - 1] ?? SLOT_COLOURS[0],
              },
            ]),
          );
        }}
        role="img"
        viewBox={`0 0 ${w} ${h}`}
      >
        {cells.map((cell) => (
        <g key={cell.name}>
          <rect
            className="gx-dash01-cell"
            data-slot={cell.slot}
            height={Math.max(0, cell.h)}
            rx="3"
            width={Math.max(0, cell.w)}
            x={cell.x}
            y={cell.y}
          />
          {cell.w > 108 && cell.h > 60 ? (
            <text className="gx-dash01-cell-label" x={cell.x + 12} y={cell.y + 26}>
              {cell.name}
            </text>
          ) : null}
          {cell.w > 108 && cell.h > 92 ? (
            <text className="gx-dash01-cell-value" x={cell.x + 12} y={cell.y + 48}>
              {cell.value}%
            </text>
          ) : null}
        </g>
      ))}
      </svg>
      {tip === null ? null : <TipCard tip={tip} />}
    </div>
  );
}

/**
 * The sankey of the funnel.
 *
 * A node's **height** is the flow through it and a ribbon's **thickness** the
 * flow it carries, so the picture is the funnel: a wide start, a narrower
 * middle, a thin end.
 */
function FunnelSankey() {
  const w = 300;
  const h = 208;
  const nodeW = 18;
  const top = 16;
  const bottom = h - 40;
  const span = bottom - top;
  const widest = 100;
  const stages = [
    { name: "Visits", value: 100, x: 0 },
    { name: "Trials", value: 60, x: (w - nodeW) / 2 },
    { name: "Paid", value: 24, x: w - nodeW },
  ] as const;
  const bar = (value: number): number => (value / widest) * span;
  const steps = [
    { from: 0, to: 1, value: 60, colour: "var(--series-3, #1fa968)" },
    { from: 1, to: 2, value: 24, colour: "var(--series-2, #6e9cff)" },
  ] as const;

  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="gx-dash01-plot">
      <svg
        aria-label="The funnel from visits to paid"
        className="gx-dash01-sankey"
        onMouseLeave={() => setTip(null)}
        onMouseMove={(event) => {
          // A mark's own handler sets the card and this one sees the event
          // bubble; only a move over the plot itself clears it.
          if (event.target === event.currentTarget) setTip(null);
        }}
        role="img"
        viewBox={`0 0 ${w} ${h}`}
      >
      {steps.map((step) => {
        const from = stages[step.from];
        const to = stages[step.to];
        if (from === undefined || to === undefined) return null;
        const thick = bar(step.value);
        const x0 = from.x + nodeW;
        const x1 = to.x;
        const mid = (x0 + x1) / 2;
        return (
          <path
            className="gx-dash01-ribbon"
            d={`M${x0},${top} C${mid},${top} ${mid},${top} ${x1},${top} L${x1},${top + thick} C${mid},${top + thick} ${mid},${top + thick} ${x0},${top + thick} Z`}
            key={`${step.from}-${step.to}`}
            onMouseMove={(event) =>
              setTip(
                tipFor(event, `${from.name} to ${to.name}`, [
                  {
                    name: "Flow",
                    value: String(step.value),
                    color: step.colour,
                  },
                ]),
              )
            }
            style={{ fill: step.colour, opacity: 0.55 }}
          />
        );
      })}
      {stages.map((stage) => (
        <g key={stage.name}>
          <rect
            className="gx-dash01-node"
            height={bar(stage.value)}
            onMouseMove={(event) =>
              setTip(
                tipFor(event, stage.name, [
                  { name: "Visitors", value: String(stage.value) },
                ]),
              )
            }
            rx="2"
            width={nodeW}
            x={stage.x}
            y={top}
          />
          <text
            className="gx-dash01-node-label"
            textAnchor={stage.x === 0 ? "start" : stage.x === w - nodeW ? "end" : "middle"}
            x={stage.x === 0 ? 0 : stage.x === w - nodeW ? w : stage.x + nodeW / 2}
            y={h - 22}
          >
            {stage.name}
          </text>
          <text
            className="gx-dash01-node-value"
            textAnchor={stage.x === 0 ? "start" : stage.x === w - nodeW ? "end" : "middle"}
            x={stage.x === 0 ? 0 : stage.x === w - nodeW ? w : stage.x + nodeW / 2}
            y={h - 4}
          >
            {stage.value}
          </text>
        </g>
      ))}
      </svg>
      {tip === null ? null : <TipCard tip={tip} />}
    </div>
  );
}

/**
 * The sunburst of the device mix.
 *
 * Each arc's angle is its value's share of the whole, and the rings are drawn
 * from the centre out.
 */
function DeviceSunburst() {
  const size = 300;
  const centre = size / 2;
  const outer = centre - 8;
  const inner = outer * 0.52;
  const devices = [
    { name: "Desktop", value: 46, slot: 0 },
    { name: "Mobile", value: 34, slot: 1 },
    { name: "Tablet", value: 12, slot: 2 },
    { name: "Other", value: 8, slot: 3 },
  ] as const;

  // The arcs are laid out from twelve o'clock, clockwise.
  let angle = -Math.PI / 2;
  const arcs = devices.map((device) => {
    const sweep = (device.value / 100) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const at = (a: number, r: number): [number, number] => [
      centre + Math.cos(a) * r,
      centre + Math.sin(a) * r,
    ];
    const [x0, y0] = at(start, outer);
    const [x1, y1] = at(end, outer);
    const [x2, y2] = at(end, inner);
    const [x3, y3] = at(start, inner);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      name: device.name,
      value: device.value,
      slot: device.slot,
      path: `M${x0.toFixed(2)},${y0.toFixed(2)} A${outer},${outer},0,${large},1,${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${inner},${inner},0,${large},0,${x3.toFixed(2)},${y3.toFixed(2)} Z`,
    };
  });

  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="gx-dash01-plot">
      <svg
        aria-label="Traffic by device"
        className="gx-dash01-sunburst"
        onMouseLeave={() => setTip(null)}
        onMouseMove={(event) => {
          if (event.target === event.currentTarget) setTip(null);
        }}
        role="img"
        viewBox={`0 0 ${size} ${size}`}
      >
        {arcs.map((arc) => (
          <path
            className="gx-dash01-arc"
            d={arc.path}
            data-slot={arc.slot + 1}
            key={arc.name}
            onMouseMove={(event) =>
              setTip(
                tipFor(event, arc.name, [
                  {
                    name: "Share",
                    value: `${arc.value}%`,
                    color: SLOT_COLOURS[arc.slot] ?? SLOT_COLOURS[0],
                  },
                ]),
              )
            }
          />
        ))}
        <circle className="gx-dash01-hub" cx={centre} cy={centre} r={inner - 2} />
      </svg>
      {tip === null ? null : <TipCard tip={tip} />}
    </div>
  );
}

/* -- the block ----------------------------------------------------------- */

/** The reference's four stat cards. */
function StatCards() {
  return (
    <div className="gx-dash01-cards">
      {STATS.map((stat) => (
        <div className="gx-dash01-card" key={stat.label}>
          <p className="gx-dash01-card-label">{stat.label}</p>
          <div className="gx-dash01-card-head">
            <p className="gx-dash01-card-value">{stat.value}</p>
            <span className="gx-dash01-badge" data-up={stat.up}>
              <SbIcon name={stat.up ? "arrow-up" : "arrow-down"} size={12} />
              {stat.trend}
            </span>
          </div>
          <p className="gx-dash01-card-note">
            <SbIcon name={stat.up ? "arrow-up" : "arrow-down"} size={13} />
            {stat.note}
          </p>
          <p className="gx-dash01-card-sub">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}

/** The reference's documents table. */
function DocumentsTable() {
  return (
    <div className="gx-dash01-table-wrap">
      <table className="gx-dash01-table">
        <thead>
          <tr>
            <th>Header</th>
            <th>Section Type</th>
            <th>Status</th>
            <th>Target</th>
            <th>Limit</th>
            <th>Reviewer</th>
          </tr>
        </thead>
        <tbody>
          {DOCUMENTS.map((row) => (
            <tr key={row.header}>
              <td className="gx-dash01-cell-strong">{row.header}</td>
              <td>{row.type}</td>
              <td>
                <span className="gx-dash01-status" data-done={row.status === "Done"}>
                  {row.status}
                </span>
              </td>
              <td>{row.target}</td>
              <td>{row.limit}</td>
              <td>{row.reviewer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The reference's page: an inset sidebar, a header, and the content. */
export function Dashboard01Render() {
  return (
    <SbShell>
      <SbPanel
        className="gx-sb-panel--docs"
        header={
          <>
            <SbBrand detail="v1.0.1" name="Documents" />
            <SbSearch />
          </>
        }
        footer={<SbAccount />}
        rail
      >
        <SbGroup label="Platform">
          {NAV.map((item) => (
            <SbRow
              active={item.title === "Dashboard"}
              icon={item.icon as never}
              key={item.title}
              label={item.title}
            />
          ))}
        </SbGroup>
        {CLOUDS.map((cloud) => (
          <SbGroup key={cloud.title} label={cloud.title}>
            {cloud.items.map((item) => (
              <SbRow
                active={cloud.active === true && item === "Active Proposals"}
                key={item}
                label={item}
              />
            ))}
          </SbGroup>
        ))}
      </SbPanel>
      <SbInset
        header={
          <SbInsetHeader trail={["Documents", "Dashboard"]} />
        }
      >
        <div className="gx-dash01-body">
          <StatCards />
          <section className="gx-dash01-panel">
            <header className="gx-dash01-panel-head">
              <div>
                <h2 className="gx-dash01-panel-title">Traffic</h2>
                <p className="gx-dash01-panel-sub">
                  Desktop and mobile over the last thirty days
                </p>
              </div>
              <span className="gx-dash01-panel-tab">Last 30 days</span>
            </header>
            <TrafficArea />
          </section>
          <div className="gx-dash01-grid">
            <section className="gx-dash01-panel">
              <header className="gx-dash01-panel-head">
                <div>
                  <h2 className="gx-dash01-panel-title">Sources</h2>
                  <p className="gx-dash01-panel-sub">Where the traffic came from</p>
                </div>
              </header>
              <SourceTreemap />
            </section>
            <section className="gx-dash01-panel">
              <header className="gx-dash01-panel-head">
                <div>
                  <h2 className="gx-dash01-panel-title">Funnel</h2>
                  <p className="gx-dash01-panel-sub">Visits through to paid</p>
                </div>
              </header>
              <FunnelSankey />
            </section>
            <section className="gx-dash01-panel">
              <header className="gx-dash01-panel-head">
                <div>
                  <h2 className="gx-dash01-panel-title">Devices</h2>
                  <p className="gx-dash01-panel-sub">The mix of readers</p>
                </div>
              </header>
              <DeviceSunburst />
            </section>
          </div>
          <section className="gx-dash01-panel">
            <header className="gx-dash01-panel-head">
              <div>
                <h2 className="gx-dash01-panel-title">Documents</h2>
                <p className="gx-dash01-panel-sub">
                  Six documents in flight
                </p>
              </div>
            </header>
            <DocumentsTable />
          </section>
        </div>
      </SbInset>
    </SbShell>
  );
}

/* -- the recipe ---------------------------------------------------------- */

/**
 * The `@gpuixui/*` recipe a consumer copies.
 *
 * The charts are `@gpuixui/data`'s own: an `AreaChart` over the same thirty
 * days, a `TreemapChart` of the sources, a `SankeyChart` of the funnel and a
 * `SunburstChart` of the devices. The config is shadcn's `ChartConfig`, and
 * the colours are the theme's own series.
 */
export const dashboard01Source = `import { Badge } from "@gpuixui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gpuixui/components/card";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@gpuixui/components/sidebar";
import {
  AreaChart, SankeyChart, SunburstChart, TreemapChart, type ChartConfig,
} from "@gpuixui/data";
import { Icon } from "@gpuixui/icons";
import { Box, Stack, Text } from "@gpuixui/primitives";

/** The chart's identity: one table, shared by every chart that reads it. */
const config = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig;

const traffic = [
  { date: "Apr 01", desktop: 222, mobile: 150 },
  { date: "Apr 02", desktop: 97, mobile: 180 },
  // … thirty days
];

export function Traffic() {
  return (
    <AreaChart
      aria-label="Desktop and mobile traffic"
      config={config}
      data={traffic}
      curve="smooth"
      height={240}
      stacked
      width={720}
    />
  );
}

export function Sources() {
  return (
    <TreemapChart
      aria-label="Traffic by source"
      nodes={[
        { path: "organic", value: 42 },
        { path: "direct", value: 26 },
        { path: "referral", value: 18 },
        { path: "social", value: 14 },
      ]}
      size={200}
    />
  );
}

export function Funnel() {
  return (
    <SankeyChart
      aria-label="The funnel from visits to paid"
      nodes={[
        { id: "visits", name: "Visits" },
        { id: "trials", name: "Trials" },
        { id: "paid", name: "Paid" },
      ]}
      links={[
        { source: "visits", target: "trials", value: 58 },
        { source: "visits", target: "paid", value: 24 },
        { source: "trials", target: "paid", value: 24 },
      ]}
      size={200}
    />
  );
}

export function Devices() {
  return (
    <SunburstChart
      aria-label="Traffic by device"
      nodes={[
        { path: "root/desktop", value: 46 },
        { path: "root/mobile", value: 34 },
        { path: "root/tablet", value: 12 },
        { path: "root/other", value: 8 },
      ]}
      size={200}
    />
  );
}`;

/** The packages the recipe uses. */
export const dashboard01Packages = [
  "@gpuixui/components",
  "@gpuixui/data",
  "@gpuixui/icons",
  "@gpuixui/primitives",
] as const;
