import { statusTone, type Theme } from "@gpuixui/tokens";
import { useState } from "react";

/**
 * Browser preview for the Statistic / metric cards page.
 *
 * `@gpuixui/data`'s `StatCard` is a GPUix host, so the package page cannot mount
 * it and this drawing is a labelled approximation. What it does not approximate
 * is the card's contract: the reading is **derived** from the box the caller
 * hands it (never stored twice), and a trend's words paint the status tone's
 * readable role — the roles `packages/data/src/surfaces/stat-card.tsx`'s
 * `trendTone` returns, which this module names in one table so the paint and
 * the test cannot disagree with it. Only the paint is the browser's.
 */

/** One box the demo can measure: the reading is its area. */
export interface StatSample {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/** The box the demo opens on, and the one its controls name separately. */
const SMALL: StatSample = { id: "small", label: "4 × 3", width: 4, height: 3 };
const MEDIUM: StatSample = {
  id: "medium",
  label: "8 × 5",
  width: 8,
  height: 5,
};
const LARGE: StatSample = {
  id: "large",
  label: "12 × 7",
  width: 12,
  height: 7,
};

/** The boxes a reader can choose, smallest first. */
export const STAT_SAMPLES: ReadonlyArray<StatSample> = [SMALL, MEDIUM, LARGE];

/** The reading the card shows: the area, computed from the box. */
export const areaOf = (sample: StatSample): number =>
  sample.width * sample.height;

/** The reading as the card is handed it: rendered by the caller, not by the card. */
export const areaReading = (sample: StatSample): string => `${areaOf(sample)}`;

/** Which way a reading moved, and by how much. */
export interface StatTrend {
  readonly direction: "up" | "down" | "flat";
  readonly text: string;
}

/**
 * The trend between two readings.
 *
 * A flat reading is its own direction rather than `+0%`, so the drawing shows
 * the third tone role the card can paint.
 */
export const trendBetween = (from: number, to: number): StatTrend => {
  if (to === from) return { direction: "flat", text: "0%" };
  const change = Math.round(((to - from) / from) * 100);
  return change > 0
    ? { direction: "up", text: `+${change}%` }
    : { direction: "down", text: `${change}%` };
};

/**
 * The theme role each direction paints.
 *
 * The card's own `trendTone` answers `statusTone(theme, "success" | "destructive")`
 * `.foreground` and the muted role; this table names the same three roles so the
 * style sheet and the tokens can be held to them.
 */
export const trendRole = (direction: StatTrend["direction"]): string =>
  direction === "up"
    ? "successSoftForeground"
    : direction === "down"
      ? "destructiveSoftForeground"
      : "mutedForeground";

/** The colour the role resolves to in a theme, read through the tokens' own seam. */
export const trendInk = (
  theme: Theme,
  direction: StatTrend["direction"],
): string =>
  direction === "up"
    ? statusTone(theme, "success").foreground
    : direction === "down"
      ? statusTone(theme, "destructive").foreground
      : theme.colors.mutedForeground;

/** One drawn card: the four parts the component renders. */
export interface StatCardFrameProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly hint?: string;
  readonly trend?: StatTrend;
}

/** The card, its label, its reading, a unit, a hint and a trend. */
export function StatCardFrame({
  label,
  value,
  unit,
  hint,
  trend,
}: StatCardFrameProps) {
  return (
    <div aria-label={label} className="gx-dstat" role="group">
      <span className="gx-dstat-label">{label}</span>
      <span className="gx-dstat-reading">
        <span className="gx-dstat-value">{value}</span>
        {unit === undefined ? null : (
          <span className="gx-dstat-hint">{unit}</span>
        )}
        {trend === undefined ? null : (
          <span
            className="gx-dstat-hint gx-dstat-trend"
            data-direction={trend.direction}
            title={`Reads ${trendRole(trend.direction)}`}
          >
            {trend.text}
          </span>
        )}
      </span>
      {hint === undefined ? null : (
        <span className="gx-dstat-hint">{hint}</span>
      )}
    </div>
  );
}

/** The page's preview: two cards, one derived from the box a reader picks. */
export function StatCardDemo() {
  const [sample, setSample] = useState<StatSample>(MEDIUM);
  const [previous, setPrevious] = useState<number>(areaOf(MEDIUM));
  const trend = trendBetween(previous, areaOf(sample));

  const choose = (next: StatSample) => {
    setPrevious(areaOf(sample));
    setSample(next);
  };

  return (
    <div className="gx-data-scene">
      <div className="gx-data-row" data-even>
        <StatCardFrame
          hint={`${sample.width} × ${sample.height}`}
          label="Area"
          trend={trend}
          unit="px²"
          value={areaReading(sample)}
        />
        <StatCardFrame
          hint="one reading each, derived on render"
          label="Readings"
          value={`${STAT_SAMPLES.length}`}
        />
      </div>
      <div aria-label="Box to measure" className="gx-data-row" role="group">
        {STAT_SAMPLES.map((candidate) => (
          <button
            aria-pressed={candidate.id === sample.id}
            className="gx-btn gx-btn-sm gx-toggle"
            data-pressed={candidate.id === sample.id ? "" : undefined}
            key={candidate.id}
            onClick={() => choose(candidate)}
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <p className="gx-data-readout">
        Area {areaReading(sample)} px² · trend from {previous} px²
      </p>
    </div>
  );
}

export const statCardDemoSource = `import { StatCard } from "@gpuixui/data";

const width = 8;
const height = 5;

<StatCard
  label="Area"
  value={width * height}
  unit="px²"
  hint={\`\${width} × \${height}\`}
  trend={{ direction: "up", text: "+233%" }}
/>;`;
