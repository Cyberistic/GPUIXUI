import type { TreeCursor } from "@gpuixui/data/tree/logic";
import type { FileNode } from "@gpuixui/files/tree/logic";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useState } from "react";
import { BlockIcon, type BlockIconName } from "./block-icons";
import { FileTreeFrame } from "./file-tree-demo";

/**
 * The hunter pipeline block — a guild's licence docket, plus the `@gpuixui/*`
 * recipe a consumer copies.
 *
 * The block is one whole application window, not a card: a tab strip, the
 * vault's file tree, and the note it opens on. The note is one pane of numbers
 * over one list of work — five readings, a six-stage strip, the dossiers ready
 * to deploy, the ones a missing fact blocks, and the renown the guild gained.
 * Two things a reader changes are the stage the strip names and the night the
 * chart reads; each is a pure rule below, so "which dossiers survive the
 * filter" is testable without a rendering.
 */

/** One stage of the pipeline: a count and the line under it. */
export interface PipelineStage {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  /** The meta line under the count. */
  readonly meta: string;
  /** The glyph beside the label, in the stage's own tone. */
  readonly icon: BlockIconName;
  /** The verified stage paints its glyph in the success tone. */
  readonly tone?: "success";
}

/** The guild's six stages, in the order the strip paints them. */
export const pipelineStages: ReadonlyArray<PipelineStage> = [
  {
    id: "ideas",
    label: "Ideas",
    count: 4,
    meta: "intel + backlog",
    icon: "flag",
  },
  {
    id: "research",
    label: "Research",
    count: 19,
    meta: "gaps · rivals",
    icon: "search",
  },
  {
    id: "dossiers",
    label: "Dossiers",
    count: 16,
    meta: "2 ready · 3 held",
    icon: "file",
  },
  {
    id: "deployed",
    label: "Deployed",
    count: 0,
    meta: "field work",
    icon: "paperclip",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    count: 0,
    meta: "awaiting slot",
    icon: "clock",
  },
  {
    id: "verified",
    label: "Verified",
    count: 29,
    meta: "last 14 days",
    icon: "mark",
    tone: "success",
  },
];

/** One reading in the strip above the pipeline. */
export interface HunterReading {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly meta: string;
  /** The figure the reference paints green: the two that carry the verdict. */
  readonly tone?: "success";
}

/**
 * The characters one cell carries on one line at the block's own width.
 *
 * Six stage cells share the strip's inner width and five readings share the one
 * above it. A label is uppercase and tracked, so it carries fewer characters
 * than the meta under it: measured on the block's window, 12 characters paint
 * on one line and 14 wrap, while 16 of meta still fit. The copy is shortened to
 * those budgets rather than clipped by an ellipsis, and `hunterCellFits` fails a
 * page whose copy grows past the line it was written for.
 */
export const hunterCellBudget = {
  label: 12,
  stage: 16,
  reading: 16,
} as const;

/** Whether a line of copy fits one cell without wrapping or clipping. */
export const hunterCellFits = (
  text: string,
  cell: keyof typeof hunterCellBudget,
): boolean => [...text].length <= hunterCellBudget[cell];

/** The five readings the docket opens on. */
export const hunterReadings: ReadonlyArray<HunterReading> = [
  {
    id: "renown-week",
    label: "Renown · 7d",
    value: "28,087",
    meta: "8 snapshot days",
    tone: "success",
  },
  {
    id: "renown-window",
    label: "Renown · 14d",
    value: "47,513",
    meta: "29 licences",
  },
  {
    id: "licences",
    label: "Licences",
    value: "11",
    meta: "25 measured",
  },
  {
    id: "per-licence",
    label: "Per licence",
    value: "0.25",
    meta: "the key ratio",
    tone: "success",
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
  /** The intel bank the dossier came from. */
  readonly bank: string;
  /** The rank the guild files it under. */
  readonly rank: "S" | "A" | "B";
  readonly length: "LONG" | "SHORT";
  /** `"ready"` items wait for a slot; `"blocked"` ones wait for a fact. */
  readonly state: "ready" | "blocked";
}

/** The five dossiers the two columns hold. */
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
    id: "trophies",
    title: "All 36 trophies ranked",
    bank: "Phantom Blade Zero",
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

/** One note in the window's tab strip. */
export interface HunterTab {
  readonly id: string;
  readonly label: string;
  readonly active?: boolean;
}

/** The open tabs, in the strip's order; the docket is the one in front. */
export const hunterTabs: ReadonlyArray<HunterTab> = [
  { id: "main", label: "Main Menu" },
  { id: "guild", label: "Guild App" },
  { id: "rim", label: "Rim Light Version …" },
  { id: "time", label: "Time bloc…" },
  { id: "pipeline", label: "Licence Pipeline", active: true },
  { id: "grain", label: "Grain Group" },
];

/** One view the docket's pills name. */
export interface HunterPill {
  readonly id: string;
  readonly label: string;
  readonly active?: boolean;
}

/** The four views; the dossier view is in front. */
export const hunterPills: ReadonlyArray<HunterPill> = [
  { id: "tracker", label: "Tracker" },
  { id: "index", label: "Licence index" },
  { id: "open", label: "Open items" },
  { id: "dossiers", label: "Dossiers", active: true },
];

/** The last `/` segment of a vault path, which is the row's name. */
const leaf = (path: string): string =>
  Option.getOrElse(Arr.last(Str.split("/")(path)), () => path);

/** One note: a leaf `FileNode`, declared the way `FileTreeFile` declares one. */
const note = (path: string): FileNode => ({ name: leaf(path), path });

/**
 * One folder: the way `FileTreeFolder` declares one. A folder whose entries the
 * reference keeps closed declares an empty list — the shipped part paints its
 * glyph and no disclosure, because there is nothing under it to disclose.
 */
const folder = (
  path: string,
  children: ReadonlyArray<FileNode> = [],
): FileNode => ({ name: leaf(path), path, children });

/** The note the pane opens on. */
export const VAULT_CURRENT = "Guild/Licence Pipeline";

/**
 * The vault tree the window opens on, declared as the `FileNode` hierarchy
 * `FileTree` reads from its parts. The docket's own row closes the open `Guild`
 * branch, and `AGENTS` and `Main Menu` are the two notes the vault keeps above
 * every folder.
 */
export const vaultTree: ReadonlyArray<FileNode> = [
  folder("Docs"),
  folder("Economy"),
  folder("Family"),
  folder("GTD"),
  folder("Journal"),
  folder("Quests"),
  folder("scripts"),
  folder("Guild", [
    note("Guild/00 Inbox"),
    note("Guild/01 Strategy"),
    note("Guild/02 Ideas"),
    note("Guild/03 Research"),
    folder("Guild/04 Dossiers", [
      folder("Guild/04 Dossiers/ArcheAge Chronicles", [
        note("Guild/04 Dossiers/ArcheAge Chronicles/All 4 Classes Ranked"),
      ]),
      folder("Guild/04 Dossiers/Crimson Desert", [
        note(
          "Guild/04 Dossiers/Crimson Desert/Everything in Charting the Unkno…",
        ),
        note("Guild/04 Dossiers/Crimson Desert/Your Build Was Reset"),
      ]),
      folder("Guild/04 Dossiers/Phantom Blade Zero"),
      folder("Guild/04 Dossiers/Valor Mortis", [
        note("Guild/04 Dossiers/Valor Mortis/Script for Valor Mortis Tips"),
      ]),
    ]),
    folder("Guild/05 Production"),
    folder("Guild/06 Scheduled"),
    folder("Guild/07 Verified", [
      note("Guild/07 Verified/All 36 Trophies Ran…"),
      note("Guild/07 Verified/Phantom Blade Zero"),
      note("Guild/07 Verified/Openquestionline"),
      note("Guild/07 Verified/LONG"),
    ]),
    folder("Guild/08 Analytics"),
    folder("Guild/Archive"),
    note(VAULT_CURRENT),
  ]),
  note("AGENTS"),
  note("Main Menu"),
];

/** The branches the window opens: `Guild`, its dossiers and the verified list. */
export const vaultOpen: ReadonlyArray<string> = [
  "Guild",
  "Guild/04 Dossiers",
  "Guild/04 Dossiers/ArcheAge Chronicles",
  "Guild/04 Dossiers/Crimson Desert",
  "Guild/04 Dossiers/Valor Mortis",
  "Guild/07 Verified",
];

/** The cursor the rail opens on: those branches open, the docket standed on. */
export const vaultCursor = (): TreeCursor => ({
  expanded: HashSet.fromIterable(vaultOpen),
  active: Option.some(VAULT_CURRENT),
});

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

const CHART_WIDTH = 620;
const CHART_HEIGHT = 86;

/** The sentence a screen reader hears when the axis picks a night. */
export const pickedReadout = (day: string | undefined): string => {
  const night =
    renownNights.find((entry) => entry.day === day) ?? renownNights.at(-1);
  return night === undefined
    ? ""
    : `${night.day} · ${night.renown.toLocaleString("en-US")} renown · ${night.seals} seals`;
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
  const x = (index: number): number =>
    nights.length === 1 ? 0 : (index / (nights.length - 1)) * CHART_WIDTH;
  const y = (value: number): number =>
    CHART_HEIGHT - (value / ceiling) * CHART_HEIGHT;
  const points = (read: (night: RenownNight) => number): string =>
    nights
      .map(
        (night, index) => `${x(index).toFixed(1)},${y(read(night)).toFixed(1)}`,
      )
      .join(" ");
  const picked = nights.find((night) => night.day === active) ?? nights.at(-1);
  const pickedIndex = picked === undefined ? -1 : nights.indexOf(picked);
  // An end label hangs inside the plot: a centred label on the first or last
  // point loses half of itself to the frame.
  const anchor =
    pickedIndex <= 0
      ? "start"
      : pickedIndex === nights.length - 1
        ? "end"
        : "middle";

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
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          {renownTicks(ceiling)
            .slice(1, -1)
            .map((_, index) => (
              <line
                className="gx-hunt-grid"
                key={index}
                x1={0}
                x2={CHART_WIDTH}
                y1={(CHART_HEIGHT / 4) * (index + 1)}
                y2={(CHART_HEIGHT / 4) * (index + 1)}
              />
            ))}
          <polyline
            className="gx-hunt-line"
            data-series="renown"
            points={points((night) => night.renown)}
          />
          <polyline
            className="gx-hunt-line"
            data-series="seals"
            points={points((night) => night.seals)}
          />
          {nights.map((night, index) => (
            <circle
              className="gx-hunt-dot"
              cx={x(index)}
              cy={y(night.renown)}
              data-active={night.day === active ? "true" : undefined}
              data-series="renown"
              key={night.day}
              r={night.day === active ? 3 : 1.8}
            />
          ))}
          {picked === undefined ? null : (
            <>
              <text
                className="gx-hunt-point"
                data-series="renown"
                textAnchor={anchor}
                x={x(pickedIndex)}
                y={Math.max(8, y(picked.renown) - 5)}
              >
                {picked.renown.toLocaleString("en-US")}
              </text>
              <text
                className="gx-hunt-point"
                data-series="seals"
                textAnchor={anchor}
                x={x(pickedIndex)}
                y={Math.min(CHART_HEIGHT - 2, y(picked.seals) + 10)}
              >
                {picked.seals}
              </text>
            </>
          )}
        </svg>
        {/* A day is a real control: the axis labels pick the night the two
            figures above name, so a keyboard reaches the same readout a
            pointer does. */}
        <div aria-label="Snapshot night" className="gx-hunt-days" role="group">
          {nights.map((night) => (
            <button
              aria-pressed={night.day === active}
              className="gx-hunt-day"
              key={night.day}
              onClick={() => onPick(night.day)}
              type="button"
            >
              {night.day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** The Badge variant a chip's tone reads as. */
const CHIP_TONES = {
  accent: "gx-badge-primary",
  success: "gx-badge-success",
  warn: "gx-badge-warning",
} as const;

/** A chip beside a dossier's title or under a reading: the Badge drawing. */
const Chip = ({
  children,
  tone,
}: {
  readonly children: string;
  readonly tone?: keyof typeof CHIP_TONES;
}) => (
  <span
    className={`gx-badge gx-badge-sm ${
      tone === undefined ? "gx-badge-outline" : CHIP_TONES[tone]
    } gx-hunt-chip`}
  >
    {children}
  </span>
);

const stageFilters: ReadonlyArray<{ value: StageFilter; label: string }> = [
  { value: "all", label: "All stages" },
  { value: "open", label: "Open" },
  { value: "verified", label: "Verified" },
];

export const HunterPipelineRender = () => {
  const [filter, setFilter] = useState<StageFilter>("all");
  const [night, setNight] = useState<string | undefined>("Oct 28");
  const [vault, setVault] = useState(vaultCursor);
  const stages = stagesFor(filter);
  const ready = dossiersIn("ready");
  const blocked = dossiersIn("blocked");

  return (
    <div className="gx-hunt">
      <header className="gx-hunt-titlebar">
        <span aria-hidden="true" className="gx-hunt-lights">
          <i />
          <i />
          <i />
        </span>
        <div aria-label="Open notes" className="gx-hunt-tabs">
          {hunterTabs.map((tab) => (
            <span
              aria-current={tab.active === true ? "page" : undefined}
              className="gx-hunt-tab"
              data-active={tab.active ? "true" : undefined}
              key={tab.id}
            >
              <span className="gx-hunt-tab-label">{tab.label}</span>
              {tab.active ? (
                <span aria-hidden="true" className="gx-hunt-tab-close">
                  ×
                </span>
              ) : null}
            </span>
          ))}
        </div>
        <span className="gx-hunt-tab-actions">
          <span aria-hidden="true" className="gx-hunt-tab-action">
            <BlockIcon name="plus" size={11} />
          </span>
          <span aria-hidden="true" className="gx-hunt-tab-action">
            <BlockIcon name="chevronDown" size={11} />
          </span>
        </span>
      </header>

      <div className="gx-hunt-body">
        {/* The rail is the Sidebar drawing's panel (`gx-sb-panel`), its group
            (`gx-sb-group`) and its footer (`gx-sb-panel-foot`, `gx-sb-row`);
            the rows are the FileTree drawing, so the branch fold, the guide
            indent and the selected file are the component's, not this block's. */}
        <nav
          aria-label="Vault"
          className="gx-hunt-rail gx-sb-panel"
          data-edge="left"
        >
          <div className="gx-hunt-tree gx-sb-group">
            <FileTreeFrame
              cursor={vault}
              onCursorChange={setVault}
              onSelect={() => undefined}
              roots={vaultTree}
              selected={VAULT_CURRENT}
            />
          </div>
          <div className="gx-hunt-rail-foot gx-sb-panel-foot">
            <span className="gx-sb-row gx-hunt-vault">
              <span className="gx-sb-row-label">WanTo</span>
              <span className="gx-sb-trail">
                <BlockIcon name="chevronDown" size={9} />
              </span>
              <span aria-hidden="true" className="gx-hunt-rail-actions">
                <span className="gx-sb-iconbtn">
                  <BlockIcon name="refresh" size={9} />
                </span>
                <span className="gx-sb-iconbtn">
                  <BlockIcon name="gear" size={9} />
                </span>
              </span>
            </span>
          </div>
        </nav>

        <main className="gx-hunt-main">
          <div className="gx-hunt-crumb">
            <span aria-hidden="true" className="gx-hunt-crumb-nav">
              <BlockIcon name="chevronLeft" size={11} />
              <BlockIcon name="chevronRight" size={11} />
            </span>
            {/* The trail is the Breadcrumb drawing: its list, items, separator
                and current page, at the window's caption size. */}
            <nav
              aria-label="Breadcrumb"
              className="gx-breadcrumb gx-hunt-crumb-path"
            >
              <ol className="gx-breadcrumb-list">
                <li className="gx-breadcrumb-item">
                  <span className="gx-breadcrumb-link">Guild</span>
                </li>
                <li className="gx-breadcrumb-item">
                  <span aria-hidden="true" className="gx-breadcrumb-sep">
                    /
                  </span>
                  <span aria-selected="true" className="gx-breadcrumb-page">
                    Licence Pipeline
                  </span>
                </li>
              </ol>
            </nav>
            <span aria-hidden="true" className="gx-hunt-crumb-actions">
              <BlockIcon name="link" size={10} />
              <BlockIcon name="more" size={10} />
            </span>
          </div>

          <article aria-label="Note" className="gx-note">
            <header className="gx-note-head">
              <h3 className="gx-note-title">Licence Pipeline</h3>
              <p className="gx-note-meta">
                Wednesday, 28 October 2026 · 16 dossiers · 4 intel banks · 29
                licences in the 14-day window
              </p>
              {/* The reference draws the note's four views as chrome, not as a
                  control this block implements; a disabled button would lie
                  about an action a reader cannot take. */}
              <div aria-label="Guild views" className="gx-hunt-pills">
                {hunterPills.map((pill) => (
                  <span
                    className={
                      pill.active === true
                        ? "gx-btn gx-btn-sm gx-hunt-pill-on"
                        : "gx-btn gx-btn-outline gx-btn-sm"
                    }
                    key={pill.id}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </header>

            <dl aria-label="Readings" className="gx-note-props">
              {hunterReadings.map((reading) => (
                <div className="gx-note-prop" key={reading.id}>
                  <dt className="gx-note-prop-key">{reading.label}</dt>
                  <dd className="gx-note-prop-value">
                    <b data-tone={reading.tone}>{reading.value}</b>
                    <span className="gx-note-prop-note">{reading.meta}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <section aria-label="Pipeline" className="gx-note-section">
              <header className="gx-note-heading">
                <h4 className="gx-note-h">Pipeline</h4>
                <div
                  aria-label="Stage filter"
                  className="gx-hunt-filter"
                  role="group"
                >
                  {stageFilters.map((entry) => (
                    <button
                      aria-pressed={filter === entry.value}
                      className={`gx-btn gx-btn-sm ${
                        filter === entry.value
                          ? "gx-btn-secondary"
                          : "gx-btn-ghost"
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
              <ul className="gx-note-list">
                {stages.map((stage) => (
                  <li className="gx-note-row" key={stage.id}>
                    <span
                      aria-hidden="true"
                      className="gx-note-row-icon"
                      data-tone={stage.tone}
                    >
                      <BlockIcon name={stage.icon} size={10} />
                    </span>
                    <span className="gx-note-row-label">{stage.label}</span>
                    <span className="gx-note-row-count">{stage.count}</span>
                    <span className="gx-note-row-note">{stage.meta}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="gx-note-columns">
              <section
                aria-label="Ready to deploy"
                className="gx-note-section gx-note-column"
              >
                <header className="gx-note-heading">
                  <h4 className="gx-note-h">Ready to deploy</h4>
                  <Chip>{`${ready.length} staged`}</Chip>
                </header>
                <ul className="gx-note-list gx-note-bullets">
                  {ready.map((dossier) => (
                    <li className="gx-note-bullet" key={dossier.id}>
                      <span aria-hidden="true" className="gx-note-bullet-mark">
                        •
                      </span>
                      <span className="gx-note-bullet-body">
                        <span className="gx-note-link">{dossier.title}</span>
                        <span className="gx-note-bullet-chips">
                          <Chip>{dossier.bank}</Chip>
                          <Chip tone="accent">{`Rank ${dossier.rank}`}</Chip>
                          <Chip>{dossier.length}</Chip>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-label="Scheduled"
                className="gx-note-section gx-note-column"
              >
                <header className="gx-note-heading">
                  <h4 className="gx-note-h">Scheduled</h4>
                  <Chip>0 queued</Chip>
                </header>
                <p className="gx-note-muted">
                  Nothing waiting for a slot. Seals land here between the exam
                  and the register.
                </p>
              </section>
            </div>

            <aside aria-label="Blocked" className="gx-note-callout">
              <p className="gx-note-callout-title">
                <span aria-hidden="true" className="gx-hunt-block">
                  <BlockIcon name="alert" size={11} />
                </span>
                Blocked by a missing fact
              </p>
              <ul className="gx-note-callout-list">
                {blocked.map((dossier) => (
                  <li className="gx-note-bullet" key={dossier.id}>
                    <span aria-hidden="true" className="gx-note-bullet-mark">
                      •
                    </span>
                    <span className="gx-note-bullet-body">
                      <span className="gx-note-link">{dossier.title}</span>
                      <span className="gx-note-bullet-chips">
                        <Chip>{dossier.bank}</Chip>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>

            <section aria-label="Renown" className="gx-note-section">
              <header className="gx-note-heading">
                <h4 className="gx-note-h">Renown gained per day</h4>
                <Chip>{`${renownNights.length} snapshots`}</Chip>
              </header>
              <RenownChart
                active={night}
                nights={renownNights}
                onPick={(day) => setNight(day)}
              />
              {/* The two figures on the plot are the readout; a reader who
                  cannot see the drawing still hears the night the axis picked. */}
              <p aria-live="polite" className="gx-hunt-live">
                {pickedReadout(night)}
              </p>
            </section>
          </article>
        </main>
      </div>
    </div>
  );
};

export const hunterPipelineSource = `import { Badge } from "@gpuixui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gpuixui/components/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gpuixui/components/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
} from "@gpuixui/components/sidebar";
import { FileTree, FileTreeFile, FileTreeFolder } from "@gpuixui/files";
import { Button, Text } from "@gpuixui/primitives";

const readings = [
  { label: "Renown · 7d", value: "28,087", meta: "8 snapshot days" },
  { label: "Renown · 14d", value: "47,513", meta: "29 licences" },
  { label: "Licences", value: "11", meta: "25 measured" },
  { label: "Per licence", value: "0.25", meta: "the key ratio" },
  { label: "Rising today", value: "26", meta: "Δ > 0" },
];

const stages = [
  { label: "Ideas", count: 4, meta: "intel + backlog" },
  { label: "Research", count: 19, meta: "gaps · rivals" },
  { label: "Dossiers", count: 16, meta: "2 ready · 3 held" },
  { label: "Deployed", count: 0, meta: "field work" },
  { label: "Scheduled", count: 0, meta: "awaiting slot" },
  { label: "Verified", count: 29, meta: "last 14 days" },
];

/** The window composes the shell; the tab strip is the app's own chrome. */
export const HunterPipeline = () => (
  <SidebarProvider>
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <FileTree
            defaultExpanded={["Guild", "Guild/04 Dossiers"]}
            selected="Guild/Licence Pipeline"
          >
            <FileTreeFolder path="Guild" name="Guild">
              <FileTreeFolder path="Guild/04 Dossiers" name="04 Dossiers">
                <FileTreeFile
                  path="Guild/04 Dossiers/Valor Mortis"
                  name="Valor Mortis"
                />
              </FileTreeFolder>
              <FileTreeFile
                path="Guild/Licence Pipeline"
                name="Licence Pipeline"
              />
            </FileTreeFolder>
            <FileTreeFile path="AGENTS" name="AGENTS" />
          </FileTree>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuButton label="WanTo" />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink>Guild</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Licence Pipeline</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Text role="h3" weight="semibold">Licence Pipeline</Text>
      <Text role="caption" tone="muted">
        Wednesday, 28 October 2026 · 16 dossiers · 4 intel banks
      </Text>
      <div style={{ display: "flex", gap: 6 }}>
        <Button variant="outline" size="sm">Tracker</Button>
        <Button variant="outline" size="sm">Licence index</Button>
        <Button variant="outline" size="sm">Open items</Button>
        <Button variant="secondary" size="sm">Dossiers</Button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {readings.map((reading) => (
          <Card key={reading.label}>
            <CardHeader>
              <Text role="label" tone="muted">{reading.label}</Text>
              <CardTitle>{reading.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text role="caption" tone="muted">{reading.meta}</Text>
            </CardContent>
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {stages.map((entry) => (
          <Card key={entry.label}>
            <CardHeader>
              <Text role="label" tone="muted">{entry.label}</Text>
              <CardTitle>{entry.count}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text role="caption" tone="muted">{entry.meta}</Text>
            </CardContent>
          </Card>
        ))}
      </div>
      <Badge variant="outline">2 staged</Badge>
      <Badge variant="warning">3 need work</Badge>
    </SidebarInset>
  </SidebarProvider>
);`;
