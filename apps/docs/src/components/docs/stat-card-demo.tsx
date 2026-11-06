import { statusTone, type Theme } from "@gpuixui/tokens";
import { useState } from "react";

export interface StatSample {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

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

export const STAT_SAMPLES: ReadonlyArray<StatSample> = [SMALL, MEDIUM, LARGE];

export const areaOf = (sample: StatSample): number =>
  sample.width * sample.height;

export const areaReading = (sample: StatSample): string => `${areaOf(sample)}`;

export interface StatTrend {
  readonly direction: "up" | "down" | "flat";
  readonly text: string;
}

export const trendBetween = (from: number, to: number): StatTrend => {
  if (to === from) return { direction: "flat", text: "0%" };
  const change = Math.round(((to - from) / from) * 100);
  return change > 0
    ? { direction: "up", text: `+${change}%` }
    : { direction: "down", text: `${change}%` };
};

export const trendRole = (direction: StatTrend["direction"]): string =>
  direction === "up"
    ? "successSoftForeground"
    : direction === "down"
      ? "destructiveSoftForeground"
      : "mutedForeground";

export const trendInk = (
  theme: Theme,
  direction: StatTrend["direction"],
): string =>
  direction === "up"
    ? statusTone(theme, "success").foreground
    : direction === "down"
      ? statusTone(theme, "destructive").foreground
      : theme.colors.mutedForeground;

export interface StatCardFrameProps {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly hint?: string;
  readonly trend?: StatTrend;
}

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
