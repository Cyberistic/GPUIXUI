import type { ReactNode } from "react";

/**
 * Dashboard block — the landing's product window and the `/docs/blocks/dashboard`
 * recipe. Like every block, `DashboardRender` is a browser reproduction of the
 * native geometry/palette (the shipped tree renders through GPUix, not the DOM);
 * `dashboardSource` is the `@gpuixui/*` recipe a consumer copies.
 *
 * Charts and the app/database glyphs are a labelled gap: the library has no
 * chart component yet, so the recipe ships a minimal SVG primitive and the
 * composition note says so.
 *
 * The categorical colours are the library's data series, never a palette of the
 * docs' own: `--series-*` arrives from the preview surface's theme (so the
 * platform and look switch repaint the charts) and `.gx-dash` falls back to the
 * dark theme's scale on the landing, which renders outside a preview surface.
 */

const MODELS = [
  { name: "Kimi", model: "moonshot-v1-32k", pct: 33, tokens: "409k" },
  { name: "DeepSeek", model: "deepseek-chat", pct: 24, tokens: "298k" },
  { name: "Qwen", model: "qwen3-14b", pct: 18, tokens: "224k" },
  { name: "GLM", model: "glm-4-9b", pct: 14, tokens: "174k" },
  { name: "Minimax", model: "minimax-8b", pct: 11, tokens: "136k" },
] as const;

const PROJECTS = [
  { name: "gpuixui", time: "3h 12m", pct: 41 },
  { name: "effectjs", time: "2h 18m", pct: 30 },
  { name: "meow", time: "1h 24m", pct: 18 },
  { name: "openknet", time: "42m", pct: 9 },
  { name: "other", time: "26m", pct: 6 },
] as const;

const APPS = [
  { name: "Visual Studio Code", time: "3h 12m", pct: 41 },
  { name: "Ghostty", time: "1h 48m", pct: 23 },
  { name: "Discord", time: "1h 12m", pct: 16 },
  { name: "Obsidian", time: "56m", pct: 12 },
] as const;

const NAV = [
  { label: "Overview", active: true },
  { label: "Projects", active: false },
  { label: "Languages", active: false },
  { label: "Timeline", active: false },
  { label: "Reports", active: false },
  { label: "Settings", active: false },
] as const;

const WEEK = [6.5, 8, 7.2, 9.5, 10, 4, 3.5] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Token usage over a day, one column per two-hour bucket, five model values. */
const HOURLY = [
  { label: "12AM", values: [18, 12, 8, 4, 2] },
  { label: "2AM", values: [12, 9, 6, 3, 2] },
  { label: "4AM", values: [9, 7, 5, 3, 1] },
  { label: "6AM", values: [14, 10, 8, 5, 3] },
  { label: "8AM", values: [22, 16, 12, 9, 6] },
  { label: "10AM", values: [30, 22, 17, 12, 8] },
  { label: "12PM", values: [34, 26, 20, 15, 10] },
  { label: "2PM", values: [36, 28, 22, 16, 11] },
  { label: "4PM", values: [33, 25, 19, 14, 10] },
  { label: "6PM", values: [28, 21, 16, 12, 8] },
  { label: "8PM", values: [24, 18, 13, 10, 7] },
  { label: "10PM", values: [16, 12, 9, 6, 4] },
] as const;

const sum = (values: ReadonlyArray<number>): number =>
  values.reduce((total, value) => total + value, 0);

/** The categorical colour for a model index, from the theme's series scale. */
const colorAt = (index: number): string =>
  `var(--dash-series-${(index % 5) + 1})`;

/** A 24px monochrome icon, tinted by `currentColor`. */
function IconGlyph({
  children,
  size = 15,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className="gx-dash-glyph"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

/** The library's icon geometry; `db` is a hand-drawn gap (no database icon). */
const ICON = {
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  grid: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
    </>
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  db: (
    <>
      <path d="M12 8c3.3 0 6-1.34 6-3s-2.7-3-6-3-6 1.34-6 3 2.7 3 6 3Z" />
      <path d="M6 8v8c0 1.66 2.7 3 6 3s6-1.34 6-3V8" />
      <path d="M6 12c0 1.66 2.7 3 6 3s6-1.34 6-3" />
    </>
  ),
} as const;

const CHEVRON_LEFT = <path d="m15 18-6-6 6-6" />;
const CHEVRON_RIGHT = <path d="m9 18 6-6-6-6" />;
const SEARCH = (
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>
);

/** Mon–Sun bar chart with a 0/4/8/12h axis. */
function WeekBars() {
  const max = 12;
  const w = 300;
  const h = 116;
  const plotTop = 8;
  const plotBottom = 82;
  const plotH = plotBottom - plotTop;
  const slot = w / WEEK.length;
  const barW = slot * 0.42;

  return (
    <svg
      aria-label="Hours per day"
      className="gx-dash-bars"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      {[0, 4, 8, 12].map((value) => {
        const y = plotTop + plotH - (value / max) * plotH;
        return (
          <g key={value}>
            <line className="gx-dash-axis" x1="0" x2={w} y1={y} y2={y} />
            <text
              className="gx-dash-axis-label"
              textAnchor="end"
              x={w - 4}
              y={y + 3}
            >
              {value}h
            </text>
          </g>
        );
      })}
      {WEEK.map((value, i) => {
        const height = (value / max) * plotH;
        const x = i * slot + (slot - barW) / 2;
        const y = plotTop + plotH - height;
        return (
          <g key={i}>
            <rect
              className="gx-dash-bar"
              height={height}
              rx="3"
              width={barW}
              x={x}
              y={y}
            />
            <text
              className="gx-dash-axis-label"
              textAnchor="middle"
              x={i * slot + slot / 2}
              y={h - 6}
            >
              {DAYS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Five-segment donut with the total in the centre. */
function TokenDonut() {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = MODELS.map((model, i) => {
    const length = (model.pct / 100) * circumference;
    const segment = {
      name: model.name,
      color: colorAt(i),
      length,
      offset,
    };
    offset += length;
    return segment;
  });

  return (
    <svg
      aria-label="Token usage by model"
      className="gx-dash-donut"
      role="img"
      viewBox="0 0 100 100"
    >
      <g transform="rotate(-90 50 50)">
        {segments.map((segment) => (
          <circle
            cx="50"
            cy="50"
            fill="none"
            key={segment.name}
            r={radius}
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            strokeWidth="13"
            style={{ stroke: segment.color }}
          />
        ))}
      </g>
      <text className="gx-dash-donut-total" textAnchor="middle" x="50" y="48">
        1.24M
      </text>
      <text className="gx-dash-donut-caption" textAnchor="middle" x="50" y="61">
        tokens
      </text>
    </svg>
  );
}

/** 12AM–10PM stacked bar, one column per two-hour bucket. */
function HourlyStack() {
  const w = 320;
  const h = 120;
  const plotTop = 6;
  const plotBottom = 92;
  const plotH = plotBottom - plotTop;
  const maxTotal = Math.max(...HOURLY.map((column) => sum(column.values)));
  const slot = w / HOURLY.length;
  const barW = slot * 0.5;

  return (
    <svg
      aria-label="Token usage over time"
      className="gx-dash-stack"
      role="img"
      viewBox={`0 0 ${w} ${h}`}
    >
      {HOURLY.map((column, i) => {
        const total = sum(column.values);
        const columnH = (total / maxTotal) * plotH;
        const x = i * slot + (slot - barW) / 2;
        let y = plotTop + plotH - columnH;
        return (
          <g key={column.label}>
            {column.values.map((value, j) => {
              const segH = (value / total) * columnH;
              const rect = (
                <rect
                  height={segH}
                  key={j}
                  style={{ fill: colorAt(j) }}
                  width={barW}
                  x={x}
                  y={y}
                />
              );
              y += segH;
              return rect;
            })}
            {i % 2 === 0 ? (
              <text
                className="gx-dash-axis-label"
                textAnchor="middle"
                x={i * slot + slot / 2}
                y={h - 6}
              >
                {column.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** A green ▲ delta badge and its “vs. previous day” caption. */
function Delta({ pct }: { pct: number }) {
  return (
    <span className="gx-dash-delta">
      <span className="gx-dash-delta-pct">▲ {pct}%</span>
      <span className="gx-dash-delta-sub">vs. previous day</span>
    </span>
  );
}

/** One named, timed, percent row with a progress bar. */
function ProgressRow({
  label,
  time,
  pct,
  tone,
  glyph,
}: {
  label: string;
  time: string;
  pct: number;
  tone?: string;
  glyph?: string;
}) {
  return (
    <div className="gx-dash-row">
      <span
        className="gx-dash-row-glyph"
        style={tone ? { color: tone } : undefined}
      >
        {glyph ?? label.slice(0, 1).toUpperCase()}
      </span>
      <div className="gx-dash-row-body">
        <div className="gx-dash-row-top">
          <span className="gx-dash-row-name">{label}</span>
          <span className="gx-dash-row-time">{time}</span>
          <span className="gx-dash-row-pct">{pct}%</span>
        </div>
        <span className="gx-dash-track">
          <span
            className="gx-dash-fill"
            style={{ width: `${pct}%`, ...(tone ? { background: tone } : {}) }}
          />
        </span>
      </div>
    </div>
  );
}

/** A model row: colour dot, name, sub-label, tokens, percent and a bar. */
function ModelRow({
  name,
  model,
  pct,
  tokens,
  color,
}: {
  name: string;
  model: string;
  pct: number;
  tokens: string;
  color: string;
}) {
  return (
    <div className="gx-dash-row">
      <span className="gx-dash-dot" style={{ background: color }} />
      <div className="gx-dash-row-body">
        <div className="gx-dash-row-top">
          <span className="gx-dash-row-name">{name}</span>
          <span className="gx-dash-row-sub">{model}</span>
          <span className="gx-dash-row-time">{tokens}</span>
          <span className="gx-dash-row-pct">{pct}%</span>
        </div>
        <span className="gx-dash-track">
          <span
            className="gx-dash-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </span>
      </div>
    </div>
  );
}

/** A card: titled header over body content. */
function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`gx-dash-card${className ? ` ${className}` : ""}`}>
      <header className="gx-dash-card-head">
        <IconGlyph>{icon}</IconGlyph>
        <h3 className="gx-dash-card-title">{title}</h3>
      </header>
      <div className="gx-dash-card-body">{children}</div>
    </section>
  );
}

/** The dashboard window: sidebar, top bar and the six-card content grid. */
export function DashboardRender() {
  return (
    <div className="gx-dash">
      <div className="gx-dash-bar">
        <span aria-hidden="true" className="gx-dash-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="gx-dash-bar-title">gpuixui — Overview</span>
      </div>

      <div className="gx-dash-body">
        <aside className="gx-dash-side">
          <div className="gx-dash-logo">
            <span aria-hidden="true" className="gx-dash-logo-mark" />
            <span className="gx-dash-logo-name">gpuixui</span>
          </div>
          <nav aria-label="Dashboard" className="gx-dash-nav">
            {NAV.map((item) => (
              <span
                className="gx-dash-nav-item"
                data-active={item.active === true}
                key={item.label}
              >
                {item.label}
              </span>
            ))}
          </nav>
          <div className="gx-dash-side-foot">
            <span aria-hidden="true" className="gx-dash-status-dot" />
            <span className="gx-dash-status-label">Tracking</span>
            <span className="gx-dash-status-sub">Last activity: 2m ago</span>
          </div>
        </aside>

        <div className="gx-dash-main">
          <div className="gx-dash-topbar">
            <div className="gx-dash-date">
              <button
                aria-label="Previous"
                className="gx-dash-step"
                type="button"
              >
                <IconGlyph size={13}>{CHEVRON_LEFT}</IconGlyph>
              </button>
              <button aria-label="Next" className="gx-dash-step" type="button">
                <IconGlyph size={13}>{CHEVRON_RIGHT}</IconGlyph>
              </button>
              <span className="gx-dash-date-label">Mon, Oct 20, 2025</span>
            </div>
            <div className="gx-dash-search">
              <IconGlyph size={14}>{SEARCH}</IconGlyph>
              <span className="gx-dash-search-placeholder">Search</span>
              <span className="gx-dash-kbd">⌘K</span>
            </div>
          </div>

          <div className="gx-dash-grid">
            <div className="gx-dash-grid-row gx-dash-grid-wide">
              <Card
                className="gx-dash-total"
                icon={ICON.clock}
                title="Total time"
              >
                <div className="gx-dash-stat-row">
                  <span className="gx-dash-stat">7h 42m</span>
                  <Delta pct={12} />
                </div>
                <WeekBars />
              </Card>
              <Card icon={ICON.db} title="Token usage">
                <div className="gx-dash-stat-row">
                  <span className="gx-dash-stat">1.24M tokens</span>
                  <Delta pct={18} />
                </div>
                <div className="gx-dash-donut-row">
                  <TokenDonut />
                  <div className="gx-dash-legend">
                    {MODELS.map((model, i) => (
                      <div className="gx-dash-legend-item" key={model.name}>
                        <span
                          className="gx-dash-dot"
                          style={{ background: colorAt(i) }}
                        />
                        <span className="gx-dash-legend-name">
                          {model.name}
                        </span>
                        <span className="gx-dash-legend-pct">{model.pct}%</span>
                        <span className="gx-dash-legend-tokens">
                          {model.tokens}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <div className="gx-dash-grid-row">
              <Card icon={ICON.folder} title="Top projects">
                <div className="gx-dash-rows">
                  {PROJECTS.map((project) => (
                    <ProgressRow
                      key={project.name}
                      label={project.name}
                      pct={project.pct}
                      time={project.time}
                    />
                  ))}
                </div>
              </Card>
              <Card icon={ICON.grid} title="App time">
                <div className="gx-dash-rows">
                  {APPS.map((app) => (
                    <ProgressRow
                      key={app.name}
                      label={app.name}
                      pct={app.pct}
                      time={app.time}
                    />
                  ))}
                </div>
              </Card>
            </div>

            <div className="gx-dash-grid-row">
              <Card icon={ICON.db} title="Token usage by model">
                <div className="gx-dash-rows">
                  {MODELS.map((model, i) => (
                    <ModelRow
                      color={colorAt(i)}
                      key={model.name}
                      model={model.model}
                      name={model.name}
                      pct={model.pct}
                      tokens={model.tokens}
                    />
                  ))}
                </div>
              </Card>
              <Card icon={ICON.clock} title="Token usage over time">
                <HourlyStack />
                <div className="gx-dash-legend gx-dash-legend-inline">
                  {MODELS.map((model, i) => (
                    <span className="gx-dash-legend-chip" key={model.name}>
                      <span
                        className="gx-dash-dot"
                        style={{ background: colorAt(i) }}
                      />
                      {model.name}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dashboardPackages = [
  "@gpuixui/components",
  "@gpuixui/primitives",
  "@gpuixui/icons",
  "@gpuixui/tokens",
] as const;

/** The recipe a consumer copies — real `@gpuixui/*` parts, chart gap labelled. */
export const dashboardSource = `import { Badge } from "@gpuixui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gpuixui/components/card";
import { SearchInput } from "@gpuixui/components/search-input";
import { Button, Progress, Stack, Text } from "@gpuixui/primitives";
import { Icon } from "@gpuixui/icons";
import { seriesColors } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";

// gap: the library has no chart component yet. Chart is the recipe's minimal SVG
// primitive — GPUix paints <svg source> natively, so it is not a DOM widget,
// just the strongest honest stand-in until a chart component lands.
const Chart = ({ viewBox, markup }: { viewBox: string; markup: string }) => (
  <svg source={\`<svg viewBox="\${viewBox}" xmlns="http://www.w3.org/2000/svg">\${markup}</svg>\`} />
);

// No colour on a series: the row's position picks one from the theme's scale.
const models = [
  { name: "Kimi", model: "moonshot-v1-32k", pct: 33, tokens: "409k", series: 0 },
  { name: "DeepSeek", model: "deepseek-chat", pct: 24, tokens: "298k", series: 1 },
  { name: "Qwen", model: "qwen3-14b", pct: 18, tokens: "224k", series: 2 },
  { name: "GLM", model: "glm-4-9b", pct: 14, tokens: "174k", series: 3 },
  { name: "Minimax", model: "minimax-8b", pct: 11, tokens: "136k", series: 4 },
];

const projects = [
  { name: "gpuixui", time: "3h 12m", pct: 41 },
  { name: "effectjs", time: "2h 18m", pct: 30 },
  { name: "meow", time: "1h 24m", pct: 18 },
];

export function DashboardPage() {
  const series = seriesColors(useTheme());

  return (
    <Stack direction="row" grow>
      <Stack direction="column" style={{ width: 240, padding: 16 }}>
        <Text role="h3">gpuixui</Text>
        {["Overview", "Projects", "Languages", "Timeline", "Reports", "Settings"].map(
          (label, i) => (
            <Button key={label} variant={i === 0 ? "secondary" : "ghost"}>{label}</Button>
          ),
        )}
        <Stack direction="column" gap="2xs" style={{ marginTop: "auto" }}>
          <Text role="caption" tone="muted">Tracking · Last activity: 2m ago</Text>
        </Stack>
      </Stack>

      <Stack direction="column" grow gap="lg" style={{ padding: 20 }}>
        <Stack direction="row" justify="between" align="center">
          <Text role="label">Mon, Oct 20, 2025</Text>
          <SearchInput placeholder="Search" />
        </Stack>

        <Stack direction="row" gap="lg">
          <Card variant="outline" style={{ flexGrow: 1.5 }}>
            <CardHeader>
              <CardTitle>Total time</CardTitle>
            </CardHeader>
            <CardContent>
              <Text role="display">7h 42m</Text>
              <Stack direction="row" gap="sm" align="center">
                <Badge variant="success">▲ 12%</Badge>
                <Text role="caption" tone="muted">vs. previous day</Text>
              </Stack>
              <Chart viewBox="0 0 300 116" markup="/* Mon–Sun bars, 0/4/8/12h axis */" />
            </CardContent>
          </Card>

          <Card variant="outline" style={{ flexGrow: 1 }}>
            <CardHeader>
              <CardTitle>Token usage</CardTitle>
            </CardHeader>
            <CardContent>
              <Text role="display">1.24M tokens</Text>
              <Badge variant="success">▲ 18%</Badge>
              <Chart viewBox="0 0 100 100" markup="/* five-segment donut */" />
              {models.map((model) => (
                <Stack direction="row" gap="sm" align="center" key={model.name}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: series[model.series] }} />
                  <Text role="label">{model.name}</Text>
                  <Text role="caption" tone="muted">{model.tokens}</Text>
                  <Text role="caption" tone="muted">{model.pct}%</Text>
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Stack>

        <Card variant="outline">
          <CardHeader>
            <CardTitle>Top projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.map((project) => (
              <Stack direction="column" gap="2xs" key={project.name}>
                <Stack direction="row" justify="between">
                  <Text role="label">{project.name}</Text>
                  <Text role="caption" tone="muted">{project.time} · {project.pct}%</Text>
                </Stack>
                <Progress value={project.pct} label={project.name} />
              </Stack>
            ))}
          </CardContent>
        </Card>

        <Card variant="outline">
          <CardHeader>
            <CardTitle>Token usage over time</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart viewBox="0 0 320 120" markup="/* 12AM–10PM stacked bars */" />
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}`;
