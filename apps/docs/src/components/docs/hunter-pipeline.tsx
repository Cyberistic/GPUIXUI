import * as Arr from "effect/Array";
import { useState } from "react";

/**
 * The hunter pipeline block — a guild's licence dashboard, plus the
 * `@gpuixui/*` recipe a consumer copies.
 *
 * The block is one pane of numbers over one list of work: five readings, a
 * seven-stage strip, the dossiers ready to deploy, the ones a missing fact
 * blocks, and the renown the guild gained. The three things a reader changes
 * are the stage the strip names, the filter on the ready column and the window
 * the chart reads — each a pure rule below, so "which dossiers survive the
 * filter" is testable without a rendering.
 */

/** One stage of the pipeline: a count and the line under it. */
export interface PipelineStage {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  /** The meta line under the count. */
  readonly meta: string;
  /** The published stage paints its check in the success tone. */
  readonly tone?: "success";
}

/** The guild's seven stages, in the order the strip paints them. */
export const pipelineStages: ReadonlyArray<PipelineStage> = [
  { id: "ideas", label: "Ideas", count: 4, meta: "intel + backlog" },
  { id: "research", label: "Research", count: 19, meta: "gaps · rivals" },
  { id: "dossiers", label: "Dossiers", count: 16, meta: "2 ready · 3 held" },
  { id: "deployed", label: "Deployed", count: 0, meta: "field work" },
  { id: "scheduled", label: "Scheduled", count: 0, meta: "awaiting slot" },
  {
    id: "verified",
    label: "Verified",
    count: 29,
    meta: "last 14 days",
    tone: "success",
  },
];

/** One reading in the strip above the pipeline. */
export interface HunterReading {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly meta: string;
}

/**
 * The characters one cell carries on one line at the block's 836px window.
 *
 * A stage cell is the narrower of the two: six cells share the block's inner
 * width, and 18 characters at the 10.5px meta size stay inside it. A reading is
 * one of five, so it carries 24. The values are conservative on purpose — the
 * copy is shortened to fit them rather than clipped by an ellipsis.
 */
export const hunterCellBudget = {
  stage: 18,
  reading: 24,
} as const;

/** Whether a line of copy fits one cell without wrapping or clipping. */
export const hunterCellFits = (
  text: string,
  cell: keyof typeof hunterCellBudget,
): boolean => [...text].length <= hunterCellBudget[cell];

/** The five readings the dashboard opens on. */
export const hunterReadings: ReadonlyArray<HunterReading> = [
  {
    id: "renown-week",
    label: "Renown · 7d",
    value: "28,087",
    meta: "8 snapshot days",
  },
  {
    id: "renown-window",
    label: "Renown · 14-day window",
    value: "47,513",
    meta: "29 licences",
  },
  {
    id: "licences",
    label: "Licences · 14-day window",
    value: "11",
    meta: "25 measured",
  },
  {
    id: "per-licence",
    label: "Renown per licence",
    value: "0.25",
    meta: "the key ratio",
  },
  {
    id: "today",
    label: "Rising today",
    value: "26",
    meta: "Δ > 0",
  },
];

/** A dossier ready for the field, or one a missing fact blocks. */
export interface HunterDossier {
  readonly id: string;
  readonly title: string;
  /** The bank the dossier came from. */
  readonly bank: string;
  /** The rank the guild files it under. */
  readonly rank: "S" | "A" | "B";
  readonly length: "LONG" | "SHORT";
  /** `"ready"` items wait for a slot; `"blocked"` ones wait for a fact. */
  readonly state: "ready" | "blocked";
}

/** The seven dossiers the two columns hold. */
export const hunterDossiers: ReadonlyArray<HunterDossier> = [
  {
    id: "valar",
    title: "Dossier for the Valar Mortis raid",
    bank: "Valar Mortis",
    rank: "S",
    length: "LONG",
    state: "ready",
  },
  {
    id: "ranked",
    title: "All 36 licences ranked",
    bank: "ArcheAge Chronicles",
    rank: "S",
    length: "LONG",
    state: "ready",
  },
  {
    id: "charting",
    title: "Everything in charting the unknown",
    bank: "Crimson Desert",
    rank: "A",
    length: "LONG",
    state: "blocked",
  },
  {
    id: "reset",
    title: "Your build was reset",
    bank: "Crimson Desert",
    rank: "A",
    length: "SHORT",
    state: "blocked",
  },
  {
    id: "classes",
    title: "All 4 classes ranked",
    bank: "ArcheAge Chronicles",
    rank: "B",
    length: "SHORT",
    state: "blocked",
  },
];

/** One night of renown, and the licences sealed beside it. */
export interface RenownNight {
  readonly day: string;
  readonly renown: number;
  readonly seals: number;
}

/** The eight snapshots the chart reads, oldest first. */
export const renownNights: ReadonlyArray<RenownNight> = [
  { day: "Oct 21", renown: 0, seals: 0 },
  { day: "Oct 22", renown: 1_240, seals: 42 },
  { day: "Oct 23", renown: 2_110, seals: 96 },
  { day: "Oct 24", renown: 1_980, seals: 118 },
  { day: "Oct 25", renown: 3_180, seals: 168 },
  { day: "Oct 26", renown: 7_420, seals: 214 },
  { day: "Oct 27", renown: 6_140, seals: 252 },
  { day: "Oct 28", renown: 5_663, seals: 276 },
];

/** The dossiers one column shows, in the order the block lists them. */
export const dossiersIn = (
  state: HunterDossier["state"],
): ReadonlyArray<HunterDossier> =>
  hunterDossiers.filter((dossier) => dossier.state === state);

/** The stages a reader may narrow the strip to; `"all"` keeps every one. */
export type StageFilter = "all" | "open" | "verified";

/** The stages a filter keeps: open work, or the licences already sealed. */
export const stagesFor = (filter: StageFilter): ReadonlyArray<PipelineStage> =>
  filter === "all"
    ? pipelineStages
    : filter === "open"
      ? pipelineStages.filter((stage) => stage.count > 0)
      : pipelineStages.filter((stage) => stage.tone === "success");

/**
 * The step one band of the y axis carries: a number a reader can halve.
 *
 * A ceiling divided by four is arithmetic, not a scale: 7,420 peaks at 1,855 a
 * band, and an axis labelled 7,500 / 5,625 / 3,750 / 1,875 reads as noise. The
 * step is rounded to 250, 500, 1,000 or 2,500 first, and the ceiling is four of
 * them.
 */
export const renownStep = (peak: number): number => {
  const raw = Math.max(1, peak) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / magnitude;
  const nice =
    scaled <= 1
      ? 1
      : scaled <= 2
        ? 2
        : scaled <= 2.5
          ? 2.5
          : scaled <= 5
            ? 5
            : 10;
  return Math.max(1, nice * magnitude);
};

/**
 * The peak a chart's y axis has to hold, at four readable bands.
 *
 * The ceiling is four steps rather than the peak rounded up to a step: an axis
 * is labelled at its bands, so it is the band that has to be a number a reader
 * can halve.
 */
export const renownCeiling = (nights: ReadonlyArray<RenownNight>): number =>
  renownStep(Math.max(1, ...nights.map((night) => night.renown))) * 4;

/** A night's point on the plot, as a fraction of the ceiling. */
export const renownPoint = (night: RenownNight, ceiling: number): number =>
  ceiling <= 0 ? 0 : Math.min(1, night.renown / ceiling);

/** The ticks a ceiling paints, top down, at four even bands. */
export const renownTicks = (ceiling: number): ReadonlyArray<number> => {
  const bands = 4;
  const step = ceiling / bands;
  return Arr.makeBy(bands + 1, (index) => ceiling - step * index);
};

const RenownChart = ({
  nights,
  active,
  onPick,
}: {
  readonly nights: ReadonlyArray<RenownNight>;
  readonly active: string | undefined;
  readonly onPick: (day: string) => void;
}) => {
  const ceiling = renownCeiling(nights);
  const width = 620;
  const height = 168;
  const point = (index: number, value: number): string => {
    const x = nights.length === 1 ? 0 : (index / (nights.length - 1)) * width;
    const y = height - (value / ceiling) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <div className="gx-hunt-chart">
      <div aria-hidden="true" className="gx-hunt-axis">
        {renownTicks(ceiling).map((tick) => (
          <span key={tick}>{tick.toLocaleString("en-US")}</span>
        ))}
      </div>
      <div className="gx-hunt-plot">
        <svg
          aria-label="Renown gained per day"
          className="gx-hunt-svg"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {renownTicks(ceiling)
            .slice(1, -1)
            .map((_, index) => (
              <line
                className="gx-hunt-grid"
                key={index}
                x1={0}
                x2={width}
                y1={(height / 4) * (index + 1)}
                y2={(height / 4) * (index + 1)}
              />
            ))}
          <polyline
            className="gx-hunt-line"
            data-series="renown"
            points={nights
              .map((night, index) => point(index, night.renown))
              .join(" ")}
          />
          <polyline
            className="gx-hunt-line"
            data-series="seals"
            points={nights
              .map((night, index) => point(index, night.seals))
              .join(" ")}
          />
          {nights.map((night, index) => (
            <circle
              className="gx-hunt-dot"
              cx={point(index, night.renown).split(",")[0]}
              cy={point(index, night.renown).split(",")[1]}
              data-active={night.day === active ? "true" : undefined}
              data-series="renown"
              key={night.day}
              r={night.day === active ? 4 : 2.5}
            />
          ))}
        </svg>
        {/* The ticks are painted text with a hit area, not a row of buttons: a
            chart's axis is not a control set, and a second button chrome under
            the plot would read as a toolbar. The readout above the axis is what
            a keyboard or a screen reader hears. */}
        <svg
          aria-hidden="true"
          className="gx-hunt-days"
          viewBox={`0 0 ${width} 22`}
        >
          {nights.map((night, index) => {
            const x =
              nights.length === 1 ? 0 : (index / (nights.length - 1)) * width;
            // The end labels hang inside the plot: a centred label at x=0 or
            // x=width loses half of itself to the frame.
            const anchor =
              index === 0
                ? "start"
                : index === nights.length - 1
                  ? "end"
                  : "middle";
            return (
              <g
                className="gx-hunt-day"
                data-active={night.day === active ? "true" : undefined}
                key={night.day}
                onClick={() => onPick(night.day)}
              >
                <rect
                  height={22}
                  width={width / nights.length}
                  x={x - width / nights.length / 2}
                />
                <text textAnchor={anchor} x={x} y={15}>
                  {night.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/** A chip beside a dossier's title or under a reading. */
const Chip = ({
  children,
  tone,
}: {
  readonly children: string;
  readonly tone?: "accent" | "success" | "warn";
}) => (
  <span className="gx-hunt-chip" data-tone={tone}>
    {children}
  </span>
);

const filters: ReadonlyArray<{ value: StageFilter; label: string }> = [
  { value: "all", label: "All stages" },
  { value: "open", label: "Open" },
  { value: "verified", label: "Verified" },
];

export const HunterPipelineRender = () => {
  const [filter, setFilter] = useState<StageFilter>("all");
  const [night, setNight] = useState<string | undefined>("Oct 28");
  const stages = stagesFor(filter);
  const ready = dossiersIn("ready");
  const blocked = dossiersIn("blocked");
  // The last night is the chart's resting point: the array is a literal, but a
  // reader of this file should not have to prove it is non-empty.
  const latest: RenownNight = renownNights[renownNights.length - 1] ?? {
    day: "Oct 28",
    renown: 0,
    seals: 0,
  };
  const picked = renownNights.find((row) => row.day === night) ?? latest;

  return (
    <div className="gx-hunt">
      <header className="gx-hunt-head">
        <div>
          <h3 className="gx-hunt-title">Licence pipeline</h3>
          <p className="gx-hunt-sub">
            Wednesday, 28 October 2026 · 16 dossiers · 4 intel banks · 29
            licences in the 14-day window
          </p>
        </div>
        <div aria-label="Guild views" className="gx-hunt-pills" role="group">
          <button className="gx-btn gx-btn-outline gx-btn-sm" type="button">
            Tracker
          </button>
          <button className="gx-btn gx-btn-outline gx-btn-sm" type="button">
            Licence index
          </button>
          <button className="gx-btn gx-btn-outline gx-btn-sm" type="button">
            Open items
          </button>
          <button
            aria-pressed="true"
            className="gx-btn gx-btn-secondary gx-btn-sm gx-hunt-pill-active"
            type="button"
          >
            Dossiers
          </button>
        </div>
      </header>

      <section aria-label="Readings" className="gx-hunt-readings">
        {hunterReadings.map((reading) => (
          <article className="gx-hunt-reading" key={reading.id}>
            <p className="gx-hunt-label">{reading.label}</p>
            <p className="gx-hunt-value">{reading.value}</p>
            <p className="gx-hunt-meta">{reading.meta}</p>
          </article>
        ))}
      </section>

      <section aria-label="Pipeline" className="gx-hunt-section">
        <header className="gx-hunt-bar">
          <h4 className="gx-hunt-h4">Pipeline</h4>
          <div
            aria-label="Stage filter"
            className="gx-hunt-filter"
            role="group"
          >
            {filters.map((entry) => (
              <button
                aria-pressed={filter === entry.value}
                className={`gx-btn gx-btn-sm ${
                  filter === entry.value ? "gx-btn-secondary" : "gx-btn-ghost"
                }`}
                key={entry.value}
                onClick={() => setFilter(entry.value)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>
        </header>
        <div className="gx-hunt-stages">
          {stages.map((stage) => (
            <div className="gx-hunt-stage" key={stage.id}>
              <p className="gx-hunt-label">
                <span aria-hidden="true" className="gx-hunt-stage-glyph" />
                {stage.label}
              </p>
              <p className="gx-hunt-value" data-tone={stage.tone}>
                {stage.count}
              </p>
              <p className="gx-hunt-meta">{stage.meta}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="gx-hunt-columns">
        <section aria-label="Ready to deploy" className="gx-hunt-column">
          <header className="gx-hunt-bar">
            <h4 className="gx-hunt-h4">
              <span aria-hidden="true" className="gx-hunt-flame" />
              Ready to deploy
            </h4>
            <Chip>{`${ready.length} staged`}</Chip>
          </header>
          <div className="gx-hunt-cards">
            {ready.map((dossier) => (
              <article className="gx-hunt-card" key={dossier.id}>
                <p className="gx-hunt-card-title">{dossier.title}</p>
                <div className="gx-hunt-chips">
                  <Chip>{dossier.bank}</Chip>
                  <Chip tone="accent">{`Rank ${dossier.rank}`}</Chip>
                  <Chip>{dossier.length}</Chip>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Scheduled" className="gx-hunt-column">
          <header className="gx-hunt-bar">
            <h4 className="gx-hunt-h4">
              <span aria-hidden="true" className="gx-hunt-clock" />
              Scheduled
            </h4>
            <Chip>0 queued</Chip>
          </header>
          <p className="gx-hunt-empty">
            Nothing waiting for a slot. Seals land here between the exam and the
            register.
          </p>
        </section>
      </div>

      <section aria-label="Blocked" className="gx-hunt-section">
        <header className="gx-hunt-bar">
          <h4 className="gx-hunt-h4">
            <span aria-hidden="true" className="gx-hunt-block" />
            Blocked by a missing fact
          </h4>
          <Chip tone="warn">{`${blocked.length} need work`}</Chip>
        </header>
        <ul className="gx-hunt-blocked">
          {blocked.map((dossier) => (
            <li className="gx-hunt-blocked-row" key={dossier.id}>
              <span aria-hidden="true" className="gx-hunt-bullet" />
              <span className="gx-hunt-blocked-title">{dossier.title}</span>
              <Chip>{dossier.bank}</Chip>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Renown" className="gx-hunt-section">
        <header className="gx-hunt-bar">
          <h4 className="gx-hunt-h4">
            <span aria-hidden="true" className="gx-hunt-spark" />
            Renown gained per day
          </h4>
          <Chip>{`${renownNights.length} snapshots`}</Chip>
        </header>
        <RenownChart
          active={night}
          nights={renownNights}
          onPick={(day) => setNight(day)}
        />
        <p aria-live="polite" className="gx-hunt-readout">
          {`${picked.day} · ${picked.renown.toLocaleString("en-US")} renown · ${picked.seals} seals`}
        </p>
      </section>
    </div>
  );
};

export const hunterPipelineSource = `import { useState } from "react";
import { Badge } from "@gpuixui/components/badge";
import { Button } from "@gpuixui/primitives";
import { Card } from "@gpuixui/components/card";
import { Text } from "@gpuixui/primitives";

const readings = [
  { label: "Renown · 7d", value: "28,087", meta: "8 snapshot days" },
  { label: "Renown · 14-day window", value: "47,513", meta: "29 licences" },
  { label: "Licences · 14-day window", value: "11", meta: "25 measured" },
  { label: "Renown per licence", value: "0.25", meta: "the key ratio" },
  { label: "Rising today", value: "26", meta: "Δ > 0" },
];

export const HunterPipeline = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <Text role="h3" weight="semibold">Licence pipeline</Text>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {readings.map((reading) => (
        <Card key={reading.label}>
          <Text role="label" tone="muted">{reading.label}</Text>
          <Text role="h3">{reading.value}</Text>
          <Text role="caption" tone="muted">{reading.meta}</Text>
        </Card>
      ))}
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="outline" size="sm">Tracker</Button>
      <Button variant="outline" size="sm">Licence index</Button>
      <Button variant="outline" size="sm">Open items</Button>
      <Button variant="secondary" size="sm">Dossiers</Button>
    </div>
    <Badge variant="outline">2 staged</Badge>
    <Badge variant="outline">3 need work</Badge>
  </div>
);`;
