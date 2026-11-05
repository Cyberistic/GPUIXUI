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
 * The area chart over the thirty days.
 *
 * Two series, each a filled region under its line, and the fill fades toward
 * the axis — the same shape the shipped `AreaChart` paints.
 */
function TrafficArea() {
  const w = 640;
  const h = 200;
  const gutter = 34;
  const plotTop = 10;
  const plotBottom = 168;
  const plotH = plotBottom - plotTop;
  const max = 520;
  const slot = (w - gutter) / TRAFFIC.length;
  const series = [
    { key: "desktop", name: "Desktop", tone: "one" },
    { key: "mobile", name: "Mobile", tone: "two" },
  ] as const;

  const at = (value: number): number =>
    plotBottom - (value / max) * plotH;

  return (
    <svg
      aria-label="Desktop and mobile traffic over the last thirty days"
      className="gx-dash01-area"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      {[0, 100, 200, 300, 400, 500].map((value) => {
        const y = at(value);
        return (
          <g key={value}>
            <line className="gx-dash-axis" x1={gutter} x2={w} y1={y} y2={y} />
            <text
              className="gx-dash-axis-label"
              textAnchor="end"
              x={gutter - 6}
              y={y + 3}
            >
              {value}
            </text>
          </g>
        );
      })}
      {series.map((one) => {
        const points = TRAFFIC.map((row, index) => {
          const value = row[one.key];
          const x = gutter + index * slot + slot / 2;
          return { x, y: at(value), value };
        });
        const line = points
          .map((point, index) =>
            `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
          )
          .join(" ");
        const area = `${line} L${points[points.length - 1]?.x.toFixed(1)},${plotBottom} L${points[0]?.x.toFixed(1)},${plotBottom} Z`;
        return (
          <g data-tone={one.tone} key={one.key}>
            <path className="gx-dash01-area-fill" d={area} />
            <path className="gx-dash01-area-line" d={line} />
          </g>
        );
      })}
      {TRAFFIC.filter((_, index) => index % 6 === 0).map((row, index) => (
        <text
          className="gx-dash-axis-label"
          key={row.date}
          textAnchor="middle"
          x={gutter + index * 6 * slot + slot / 2}
          y={h - 6}
        >
          {row.date}
        </text>
      ))}
    </svg>
  );
}

/**
 * The treemap of the traffic sources.
 *
 * Each cell's **area** is its share of the whole, and the cells are squared:
 * a large source is a wide, tall cell and a small one is a sliver. The layout
 * is squarified — the largest value takes a strip of its own, and the rest
 * fill what is left — so the picture is the proportions rather than a grid.
 */
function SourceTreemap() {
  const w = 200;
  const h = 132;
  const gap = 3;
  const sources = [
    { name: "Organic", value: 42 },
    { name: "Direct", value: 26 },
    { name: "Referral", value: 18 },
    { name: "Social", value: 14 },
  ] as const;
  const total = sources.reduce((sum, one) => sum + one.value, 0);
  const [organic, direct, referral, social] = sources;

  // The largest takes a strip on the left; the rest share the right.
  const leftW = organic === undefined ? 0 : (organic.value / total) * (w - gap);
  const rightX = leftW + gap;
  const rightW = w - rightX;
  const restTotal =
    (direct?.value ?? 0) + (referral?.value ?? 0) + (social?.value ?? 0);
  // The right column: the biggest of the three takes the top strip, the two
  // smallest share the bottom.
  const directH = direct === undefined ? 0 : (direct.value / restTotal) * h;
  const bottomY = directH + gap;
  const bottomH = h - bottomY;
  const bottomTotal = (referral?.value ?? 0) + (social?.value ?? 0);
  const referralW =
    referral === undefined ? 0 : (referral.value / bottomTotal) * (rightW - gap);

  const cells = [
    {
      name: organic?.name ?? "",
      value: organic?.value ?? 0,
      x: 0,
      y: 0,
      w: leftW - gap,
      h,
      slot: 1,
    },
    {
      name: direct?.name ?? "",
      value: direct?.value ?? 0,
      x: rightX,
      y: 0,
      w: rightW,
      h: directH - gap,
      slot: 2,
    },
    {
      name: referral?.name ?? "",
      value: referral?.value ?? 0,
      x: rightX,
      y: bottomY,
      w: referralW,
      h: bottomH,
      slot: 3,
    },
    {
      name: social?.name ?? "",
      value: social?.value ?? 0,
      x: rightX + referralW + gap,
      y: bottomY,
      w: rightW - referralW - gap,
      h: bottomH,
      slot: 4,
    },
  ];

  return (
    <svg
      aria-label="Traffic by source"
      className="gx-dash01-treemap"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      {cells.map((cell) => (
        <g data-slot={cell.slot} key={cell.name}>
          <rect
            className="gx-dash01-cell"
            height={Math.max(0, cell.h)}
            rx="3"
            width={Math.max(0, cell.w)}
            x={cell.x}
            y={cell.y}
          />
          {cell.h > 22 && cell.w > 58 ? (
            <text className="gx-dash01-cell-label" x={cell.x + 6} y={cell.y + 14}>
              {cell.name}
            </text>
          ) : null}
          {cell.h > 34 && cell.w > 58 ? (
            <text
              className="gx-dash01-cell-value"
              x={cell.x + 6}
              y={cell.y + 27}
            >
              {cell.value}%
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/**
 * The sankey of the funnel.
 *
 * A node's **height** is the flow through it and a ribbon's **thickness** is
 * the flow it carries, so the picture is the funnel itself: a wide start, a
 * narrower middle, and a thin end.
 */
function FunnelSankey() {
  const w = 200;
  const h = 132;
  const nodeW = 12;
  const top = 12;
  const bottom = h - 26;
  const span = bottom - top;
  const widest = 100;
  const stages = [
    { name: "Visits", value: 100, x: 0 },
    { name: "Trials", value: 60, x: (w - nodeW) / 2 },
    { name: "Paid", value: 24, x: w - nodeW },
  ] as const;
  const bar = (value: number): number => (value / widest) * span;
  // One ribbon per step, each carrying the flow that survives it.
  const steps = [
    { from: 0, to: 1, value: 60 },
    { from: 1, to: 2, value: 24 },
  ] as const;

  return (
    <svg
      aria-label="The funnel from visits to paid"
      className="gx-dash01-sankey"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      {steps.map((step) => {
        const from = stages[step.from];
        const to = stages[step.to];
        if (from === undefined || to === undefined) return null;
        const thickness = bar(step.value);
        // The ribbon leaves its source at the top of the flow it still
        // carries, and lands at the top of what its target receives.
        const y0 = top;
        const y1 = top;
        const x0 = from.x + nodeW;
        const x1 = to.x;
        const mid = (x0 + x1) / 2;
        return (
          <path
            className="gx-dash01-ribbon"
            d={`M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1} L${x1},${y1 + thickness} C${mid},${y1 + thickness} ${mid},${y0 + thickness} ${x0},${y0 + thickness} Z`}
            key={`${step.from}-${step.to}`}
            style={{ opacity: 0.28 + (step.value / widest) * 0.5 }}
          />
        );
      })}
      {stages.map((stage) => (
        <g key={stage.name}>
          <rect
            className="gx-dash01-node"
            height={bar(stage.value)}
            rx="2"
            width={nodeW}
            x={stage.x}
            y={top}
          />
          <text
            className="gx-dash01-node-label"
            textAnchor={
              stage.x === 0
                ? "start"
                : stage.x === w - nodeW
                  ? "end"
                  : "middle"
            }
            x={
              stage.x === 0
                ? 0
                : stage.x === w - nodeW
                  ? w
                  : stage.x + nodeW / 2
            }
            y={h - 8}
          >
            {stage.name}
          </text>
          <text
            className="gx-dash01-node-value"
            textAnchor={
              stage.x === 0
                ? "start"
                : stage.x === w - nodeW
                  ? "end"
                  : "middle"
            }
            x={
              stage.x === 0
                ? 0
                : stage.x === w - nodeW
                  ? w
                  : stage.x + nodeW / 2
            }
            y={h - 1}
          >
            {stage.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * The sunburst of the device mix.
 *
 * Each arc's angle is its value's share of the whole, and the rings are drawn
 * from the centre out.
 */
function DeviceSunburst() {
  const size = 132;
  const centre = size / 2;
  const outer = centre - 6;
  const inner = outer * 0.42;
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

  return (
    <svg
      aria-label="Traffic by device"
      className="gx-dash01-sunburst"
      role="img"
      viewBox={`0 0 ${size} ${size}`}
    >
      {arcs.map((arc) => (
        <path
          className="gx-dash01-arc"
          d={arc.path}
          data-slot={arc.slot + 1}
          key={arc.name}
        />
      ))}
      <circle className="gx-dash01-hub" cx={centre} cy={centre} r={inner - 2} />
    </svg>
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
      height={200}
      width={640}
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
