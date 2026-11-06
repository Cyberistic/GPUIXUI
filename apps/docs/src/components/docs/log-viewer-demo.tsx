import {
  filterByLevel,
  LEVEL_COLUMN_WIDTH,
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

export const APPENDED_LINES: ReadonlyArray<string> = [
  "info rebuild finished in 96 ms",
  "warn 1 module was not tree-shaken",
  "info hot update src/app.tsx",
] as const;

export const LOG_FRAME_HEIGHT = 240;

export const visibleEntries = (
  lines: ReadonlyArray<string>,
  enabled: ReadonlyArray<LogLevel>,
): ReadonlyArray<LogEntry> =>
  filterByLevel(Arr.map(lines, parseLogLine), HashSet.fromIterable(enabled));

export const toggleLevel = (
  enabled: ReadonlyArray<LogLevel>,
  level: LogLevel,
): ReadonlyArray<LogLevel> =>
  Arr.filter(LOG_LEVELS, (candidate) =>
    candidate === level
      ? !Arr.contains(enabled, level)
      : Arr.contains(enabled, candidate),
  );

export const levelRole = (level: LogLevel): string =>
  Option.getOrElse(levelTone(level), () => "muted");

export const appendLine = (
  lines: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.append(
    lines,
    APPENDED_LINES[lines.length % APPENDED_LINES.length] ?? "info appended",
  );

export interface LogViewerFrameProps {
  readonly lines: ReadonlyArray<string>;

  readonly enabled: ReadonlyArray<LogLevel>;

  readonly follow: boolean;

  readonly onEnabledChange: (levels: ReadonlyArray<LogLevel>) => void;

  readonly onFollowChange: (follow: boolean) => void;
}

export function LogViewerFrame({
  lines,
  enabled,
  follow,
  onEnabledChange,
  onFollowChange,
}: LogViewerFrameProps) {
  const entries = visibleEntries(lines, enabled);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = list.current;
    if (follow && element !== null) element.scrollTop = element.scrollHeight;
  }, [follow, entries.length]);

  return (
    <>
      <div className="gx-logviewer">
        <div className="gx-logviewer-bar">
          <div aria-label="Levels" className="gx-tgroup" role="group">
            {LOG_LEVELS.map((level) => {
              const on = Arr.contains(enabled, level);
              return (
                <button
                  aria-pressed={on}
                  className="gx-btn gx-btn-sm gx-toggle gx-logviewer-level"
                  data-level={level}
                  data-pressed={on ? "" : undefined}
                  key={level}
                  onClick={() => onEnabledChange(toggleLevel(enabled, level))}
                  type="button"
                >
                  {Str.capitalize(level)}
                </button>
              );
            })}
          </div>
          <button
            aria-pressed={follow}
            className="gx-btn gx-btn-sm gx-toggle gx-toggle-outline"
            data-pressed={follow ? "" : undefined}
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
          style={{ height: LOG_FRAME_HEIGHT }}
        >
          {entries.map((entry, index) => (
            <div
              className="gx-logviewer-row"
              data-level={entry.level}
              data-role={levelRole(entry.level)}
              key={`${index}-${entry.message}`}
            >
              <span
                className="gx-logviewer-token"
                style={{ width: LEVEL_COLUMN_WIDTH }}
              >
                {entry.level}
              </span>
              <span className="gx-logviewer-message">
                {Str.isEmpty(entry.message) ? " " : entry.message}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="gx-demo-readout">
        {entries.length} of {lines.length} rows
        {follow ? " · following the tail" : " · scrolled where you left it"}
      </p>
    </>
  );
}

export function LogViewerDemo() {
  const [lines, setLines] = useState<ReadonlyArray<string>>(LOG_LINES);
  const [enabled, setEnabled] = useState<ReadonlyArray<LogLevel>>(LOG_LEVELS);
  const [follow, setFollow] = useState(true);

  return (
    <div className="gx-demo-frame">
      <LogViewerFrame
        enabled={enabled}
        follow={follow}
        lines={lines}
        onEnabledChange={setEnabled}
        onFollowChange={setFollow}
      />
      <div className="gx-files-actions">
        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => setLines((current) => appendLine(current))}
          type="button"
        >
          Append a line
        </button>
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
