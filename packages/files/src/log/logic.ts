/**
 * The log viewer's pure half: the line grammar, the level filter and the tone a
 * level paints.
 *
 * A log line is `level message`: an optional leading level token — one of
 * {@link LOG_LEVELS}, case-insensitive, optionally bracketed `[error]` or
 * followed by a colon — then the message. A line without a level token is the
 * whole message at {@link DEFAULT_LEVEL}, so a parse never drops a line.
 * {@link filterByLevel} narrows entries to the enabled set, and
 * {@link levelTone} answers the status tone a level tints in.
 */

import type { StatusTone } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The levels a log line can carry, most severe first. */
export const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;

/** One severity a log line names. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Whether a string is a level, for a filter control that reports strings. */
export const isLogLevel = (value: string): value is LogLevel =>
  Arr.some(LOG_LEVELS, (level) => level === value);

/** A parsed log line: its level and the message it left. */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
}

/** The level a line without a token carries. */
export const DEFAULT_LEVEL: LogLevel = "info";

/** The aliases a level token may spell. */
const LEVEL_ALIASES: Readonly<Record<string, LogLevel>> = {
  error: "error",
  warning: "warn",
  warn: "warn",
  info: "info",
  debug: "debug",
  trace: "trace",
};

/** A level token, or `None` when the word is not one. */
const levelOf = (token: string): Option.Option<LogLevel> =>
  Option.fromNullishOr(LEVEL_ALIASES[Str.toLowerCase(Str.trim(token))]);

/** A leading level token: optional bracket, a word, then `:` or whitespace. */
const LEVEL_PREFIX = /^\[?([A-Za-z]+)\]?[:\s]+/;

/**
 * Parse one log line.
 *
 * A leading level token is stripped and mapped to its {@link LogLevel}; the
 * remainder is the message. A line whose first word is not a level — or that is
 * blank — is the whole message at {@link DEFAULT_LEVEL}, so no line is ever
 * lost. `"warning"` is read as `"warn"`.
 */
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

/** The entries whose level is in the enabled set, in the order they arrive. */
export const filterByLevel = (
  entries: ReadonlyArray<LogEntry>,
  enabled: HashSet.HashSet<LogLevel>,
): ReadonlyArray<LogEntry> =>
  Arr.filter(entries, (entry) => HashSet.has(enabled, entry.level));

/** The status tone each level tints in; the quiet levels carry none. */
const LEVEL_TONES: Readonly<Record<LogLevel, Option.Option<StatusTone>>> = {
  error: Option.some("destructive"),
  warn: Option.some("warning"),
  info: Option.some("info"),
  debug: Option.none(),
  trace: Option.none(),
};

/** The status tone a level tints in; `debug` and `trace` carry none. */
export const levelTone = (level: LogLevel): Option.Option<StatusTone> =>
  LEVEL_TONES[level];
