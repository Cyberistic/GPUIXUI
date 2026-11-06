import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { DEFAULT_LEVEL, LOG_LEVELS, type LogLevel } from "@gpuixui/files";

export const LOG_LINES = 240;

export const LOG_APPEND = 40;

export const LOG_VIEWPORT = 240;

export const LOG_ROW_HEIGHT = 24;

export const logLevelAt = (index: number): LogLevel =>
  Option.getOrElse(
    Arr.get(LOG_LEVELS, index % Arr.length(LOG_LEVELS)),
    () => DEFAULT_LEVEL,
  );

export const logMessage = (index: number): string => `line ${index}`;

export const logLine = (index: number): string =>
  `${logLevelAt(index)} ${logMessage(index)}`;

export const logLines = (count: number): ReadonlyArray<string> =>
  Arr.map(Arr.range(0, count - 1), logLine);

export const lastIndexOfLevel = (
  count: number,
  level: LogLevel,
): Option.Option<number> =>
  Arr.findFirst(
    Arr.reverse(Arr.range(0, count - 1)),
    (index) => logLevelAt(index) === level,
  );

export const LOG_IDS = {
  viewer: "log-viewer",
  frame: "log-frame",
  list: "log-list",
  append: "log-append",
  follow: "log-follow",
  errors: "log-errors",
  all: "log-all",
  readout: "log-readout",
} as const;

export const LOG_ALL_LEVELS: ReadonlyArray<LogLevel> = LOG_LEVELS;

export const LOG_ERRORS_ONLY: ReadonlyArray<LogLevel> = ["error"];

export interface LogState {
  readonly lines: number;
  readonly follow: boolean;
  readonly levels: ReadonlyArray<LogLevel>;
}

export const LOG_REST: LogState = {
  lines: LOG_LINES,
  follow: true,
  levels: LOG_ALL_LEVELS,
};

export const logReadout = (state: LogState): string => {
  const levels =
    Arr.length(state.levels) === Arr.length(LOG_LEVELS)
      ? "all"
      : Arr.join(state.levels, "+");
  return `lines=${state.lines} follow=${state.follow ? "on" : "off"} levels=${levels}`;
};

export const LOG_AFTER_FIRST_APPEND: LogState = {
  ...LOG_REST,
  lines: LOG_LINES + LOG_APPEND,
};

export const LOG_AFTER_SECOND_APPEND: LogState = {
  ...LOG_AFTER_FIRST_APPEND,
  lines: LOG_LINES + LOG_APPEND * 2,
};

export const LOG_AFTER_THIRD_APPEND: LogState = {
  ...LOG_AFTER_SECOND_APPEND,
  lines: LOG_LINES + LOG_APPEND * 3,
};

export const LOG_CHECKS = Arr.reduce(
  [7, 5, 4, 4, 1, 4, 4, 1, 3, 2],
  0,
  (total, part) => total + part,
);
