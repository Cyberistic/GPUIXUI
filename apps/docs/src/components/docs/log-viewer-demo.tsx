import {
  filterByLevel,
  levelTone,
  LOG_LEVELS,
  parseLogLine,
  type LogEntry,
  type LogLevel,
} from "@gpuixui/files/log/logic";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { useEffect, useRef, useState } from "react";

/**
 * Browser preview for the Log viewers page.
 *
 * `@gpuixui/files`' `LogViewer` is a GPUix host list, so the page cannot mount
 * it and this drawing is a labelled approximation. The lines are the package's
 * own: `parseLogLine` reads every row, `filterByLevel` decides what paints, and
 * `levelTone` names the role the level column is tinted with. Only the paint —
 * and the scroll box, because a browser scrolls its own way — is the browser's.
 */

/** The log the preview opens: a dev server's last few dozen lines. */
export const LOG_LINES: ReadonlyArray<string> = [
  "info dev server started on :5173",
  "debug resolved 148 modules in 320 ms",
  "info compiled src/app.tsx",
  "warn slow plugin: css-minify took 840 ms",
  "info compiled src/components/button.tsx",
  "error failed to read assets/logo.svg",
  "info retrying in 1s",
  "trace cache hit for /src/index.ts",
  "info ready in 1.02 s",
  "warning deprecated option `legacyProxy`",
  "error port 5173 is already in use",
  "info falling back to :5174",
  "debug cache cleared (12 entries)",
];

/** The lines the preview appends when a reader presses "Append a line". */
export const APPENDED_LINES: ReadonlyArray<string> = [
  "info rebuild finished in 96 ms",
  "warn 1 module was not tree-shaken",
  "info hot update src/app.tsx",
] as const;

/** The rows the filter paints, through the package's parser and filter. */
export const visibleEntries = (
  lines: ReadonlyArray<string>,
  enabled: ReadonlyArray<LogLevel>,
): ReadonlyArray<LogEntry> =>
  filterByLevel(Arr.map(lines, parseLogLine), HashSet.fromIterable(enabled));

/** The enabled levels after one toggle, in the package's level order. */
export const toggleLevel = (
  enabled: ReadonlyArray<LogLevel>,
  level: LogLevel,
): ReadonlyArray<LogLevel> =>
  Arr.filter(LOG_LEVELS, (candidate) =>
    candidate === level
      ? !Arr.contains(enabled, level)
      : Arr.contains(enabled, candidate),
  );

/** The colour role a level's token paints in; `debug` and `trace` are quiet. */
export const levelRole = (level: LogLevel): string =>
  Option.getOrElse(levelTone(level), () => "muted");

/** The tail the follow mode anchors on: the last rows that fit the frame. */
export const FOLLOW_ROWS = 8;

/** The rows a following viewer paints: the tail of the filtered list. */
export const tailRows = (
  entries: ReadonlyArray<LogEntry>,
): ReadonlyArray<LogEntry> => Arr.takeRight(entries, FOLLOW_ROWS);

/** The line an append produces; the caller owns the lines, as with the viewer. */
export const appendLine = (
  lines: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.append(
    lines,
    APPENDED_LINES[lines.length % APPENDED_LINES.length] ?? "info appended",
  );

/** The drawing itself: the level filter, the follow toggle and the rows. */
export interface LogViewerFrameProps {
  /** The raw lines, controlled the way `LogViewer` takes them. */
  readonly lines: ReadonlyArray<string>;
  /** The enabled levels, controlled the same way. */
  readonly enabled: ReadonlyArray<LogLevel>;
  /** Whether the list follows the tail. */
  readonly follow: boolean;
  /** Reports the next enabled levels. */
  readonly onEnabledChange: (levels: ReadonlyArray<LogLevel>) => void;
  /** Reports the next follow state. */
  readonly onFollowChange: (follow: boolean) => void;
}

/** The drawing itself: the level filter, the follow toggle and the rows. */
export function LogViewerFrame({
  lines,
  enabled,
  follow,
  onEnabledChange,
  onFollowChange,
}: LogViewerFrameProps) {
  const entries = visibleEntries(lines, enabled);
  const shown = follow ? tailRows(entries) : entries;
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = list.current;
    if (follow && element !== null) element.scrollTop = element.scrollHeight;
  }, [follow, entries.length]);

  return (
    <div className="gx-logviewer">
      <div className="gx-logviewer-bar">
        <div aria-label="Levels" className="gx-logviewer-levels" role="group">
          {LOG_LEVELS.map((level) => {
            const on = Arr.contains(enabled, level);
            return (
              <button
                aria-pressed={on}
                className="gx-logviewer-level"
                data-level={level}
                key={level}
                onClick={() => onEnabledChange(toggleLevel(enabled, level))}
                type="button"
              >
                {level}
              </button>
            );
          })}
        </div>
        <button
          aria-pressed={follow}
          className="gx-logviewer-follow"
          onClick={() => onFollowChange(!follow)}
          type="button"
        >
          Follow tail
        </button>
      </div>
      <div
        aria-label="Build log"
        className="gx-logviewer-list"
        data-follow={follow ? "true" : "false"}
        ref={list}
        role="log"
      >
        {shown.map((entry, index) => (
          <div
            className="gx-logviewer-row"
            data-level={entry.level}
            data-role={levelRole(entry.level)}
            key={`${index}-${entry.message}`}
          >
            <span className="gx-logviewer-token">{entry.level}</span>
            <span className="gx-logviewer-message">
              {Str.isEmpty(entry.message) ? " " : entry.message}
            </span>
          </div>
        ))}
      </div>
      <p className="gx-files-readout">
        {shown.length} of {entries.length} rows painted
        {follow ? " · following the tail" : " · scrolled where you left it"}
      </p>
    </div>
  );
}

/** The page's preview: the filter, the follow toggle and an append action. */
export function LogViewerDemo() {
  const [lines, setLines] = useState<ReadonlyArray<string>>(LOG_LINES);
  const [enabled, setEnabled] = useState<ReadonlyArray<LogLevel>>(LOG_LEVELS);
  const [follow, setFollow] = useState(true);

  return (
    <div className="gx-files-demo">
      <LogViewerFrame
        enabled={enabled}
        follow={follow}
        lines={lines}
        onEnabledChange={setEnabled}
        onFollowChange={setFollow}
      />
      <div className="gx-files-actions">
        <button
          className="gx-files-action"
          onClick={() => setLines((current) => appendLine(current))}
          type="button"
        >
          Append a line
        </button>
        <span className="gx-files-hint">
          The caller owns the lines; follow mode anchors the list on the tail.
        </span>
      </div>
    </div>
  );
}

export const logViewerDemoSource = `import { LogViewer, type LogLevel } from "@gpuixui/files";
import { useState } from "react";

const lines = [
  "info dev server started on :5173",
  "warn slow plugin: css-minify took 840 ms",
  "error port 5173 is already in use",
];

export function BuildLog() {
  const [levels, setLevels] = useState<LogLevel[]>(["error", "warn", "info"]);
  const [follow, setFollow] = useState(true);
  return (
    <LogViewer
      height={240}
      lines={lines}
      enabledLevels={levels}
      onEnabledLevelsChange={setLevels}
      followTail={follow}
      onFollowTailChange={setFollow}
    />
  );
}`;
