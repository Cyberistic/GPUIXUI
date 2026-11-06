import type { StatusTone } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";

export const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const LEVEL_COLUMN_WIDTH = 56;

export const isLogLevel = (value: string): value is LogLevel =>
  Arr.some(LOG_LEVELS, (level) => level === value);

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
}

export const DEFAULT_LEVEL: LogLevel = "info";

const LEVEL_ALIASES: Readonly<Record<string, LogLevel>> = {
  error: "error",
  warning: "warn",
  warn: "warn",
  info: "info",
  debug: "debug",
  trace: "trace",
};

const levelOf = (token: string): Option.Option<LogLevel> =>
  Option.fromNullishOr(LEVEL_ALIASES[Str.toLowerCase(Str.trim(token))]);

const LEVEL_PREFIX = /^\[?([A-Za-z]+)\]?[:\s]+/;

export const parseLogLine = (line: string): LogEntry => {
  const trimmed = Str.trim(line);
  const match = LEVEL_PREFIX.exec(trimmed);
  if (match !== null) {
    const [full, token] = match;
    if (full !== undefined && token !== undefined) {
      const level = levelOf(token);
      if (Option.isSome(level)) {
        return {
          level: level.value,
          message: Str.trim(trimmed.slice(full.length)),
        };
      }
    }
  }
  return { level: DEFAULT_LEVEL, message: trimmed };
};

export const filterByLevel = (
  entries: ReadonlyArray<LogEntry>,
  enabled: HashSet.HashSet<LogLevel>,
): ReadonlyArray<LogEntry> =>
  Arr.filter(entries, (entry) => HashSet.has(enabled, entry.level));

const LEVEL_TONES: Readonly<Record<LogLevel, Option.Option<StatusTone>>> = {
  error: Option.some("destructive"),
  warn: Option.some("warning"),
  info: Option.some("info"),
  debug: Option.none(),
  trace: Option.none(),
};

export const levelTone = (level: LogLevel): Option.Option<StatusTone> =>
  LEVEL_TONES[level];
