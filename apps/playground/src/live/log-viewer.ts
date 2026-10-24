/**
 * The `log-viewer-lifecycle` fixture: the shipped `@gpuixui/files` `LogViewer`
 * in a window.
 *
 * The headless `log-viewer` scenario measured the runtime's `<virtual-list>`
 * composition — `alignment="bottom"` plus `followTail` — around a probe-local
 * list, and the Tier 4 *Log viewers* row cites it for the shipped component.
 * What only a window settles is the component's own surface: its toolbar paints,
 * its level filter narrows the rows, its controlled `followTail` and
 * `enabledLevels` props are honoured, and a reader who wheels up is left where
 * they stopped when lines arrive.
 *
 * A line is `<level> line <index>`: the grammar the component's parser reads, so
 * the message names its row (`line 237`) and a painted text is one row. The
 * level cycles through the package's own order, so each level has a tail of its
 * own to filter to.
 *
 * Native-free, so the premises are testable on a host with no binding.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { DEFAULT_LEVEL, LOG_LEVELS, type LogLevel } from "@gpuixui/files";

/** The line count at mount. */
export const LOG_LINES = 240;

/** How many lines one press appends. */
export const LOG_APPEND = 40;

/** The list's definite height: ten rows of {@link LOG_ROW_HEIGHT}. */
export const LOG_VIEWPORT = 240;

/** The painted height of one row. */
export const LOG_ROW_HEIGHT = 24;

/**
 * The level row `index` carries.
 *
 * The cycle is the package's own `LOG_LEVELS`, so the scene cannot disagree with
 * the parser's vocabulary; the modulo is always in range, and the default is the
 * parser's own level rather than an absence a signal could paint.
 */
export const logLevelAt = (index: number): LogLevel =>
  Option.getOrElse(
    Arr.get(LOG_LEVELS, index % Arr.length(LOG_LEVELS)),
    () => DEFAULT_LEVEL,
  );

/** The message row `index` paints, which is also what a probe looks for. */
export const logMessage = (index: number): string => `line ${index}`;

/** One raw line, in the `level message` grammar the component parses. */
export const logLine = (index: number): string =>
  `${logLevelAt(index)} ${logMessage(index)}`;

/** The lines a viewer is handed, in order. */
export const logLines = (count: number): ReadonlyArray<string> =>
  Arr.map(Arr.range(0, count - 1), logLine);

/**
 * The last row below `count` whose level is `level`.
 *
 * A filtered log is tail-anchored, so the row the reader sees last is the
 * newest one that survived the filter — the number a filtered check reads.
 */
export const lastIndexOfLevel = (
  count: number,
  level: LogLevel,
): Option.Option<number> =>
  Arr.findFirst(
    Arr.reverse(Arr.range(0, count - 1)),
    (index) => logLevelAt(index) === level,
  );

/** The ids the view and the steps share. */
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

/** Every level the viewer starts with: its own index, in its own order. */
export const LOG_ALL_LEVELS: ReadonlyArray<LogLevel> = LOG_LEVELS;

/** The one level the filter press keeps. */
export const LOG_ERRORS_ONLY: ReadonlyArray<LogLevel> = ["error"];

/** What the readout publishes: the line count, the follow flag and the filter. */
export interface LogState {
  readonly lines: number;
  readonly follow: boolean;
  readonly levels: ReadonlyArray<LogLevel>;
}

/** The state before any input: the tail followed, every level shown. */
export const LOG_REST: LogState = {
  lines: LOG_LINES,
  follow: true,
  levels: LOG_ALL_LEVELS,
};

/** The readout's one spelling, so the probe and its record print the same line. */
export const logReadout = (state: LogState): string => {
  const levels =
    Arr.length(state.levels) === Arr.length(LOG_LEVELS)
      ? "all"
      : Arr.join(state.levels, "+");
  return `lines=${state.lines} follow=${state.follow ? "on" : "off"} levels=${levels}`;
};

/**
 * The states one append takes the scene to, in the order the steps drive them.
 *
 * Named so the probe, the record and the test read one sequence: the pair-
 * producing steps (a wheel up, a follow toggle) sit between them.
 */
export const LOG_AFTER_FIRST_APPEND: LogState = {
  ...LOG_REST,
  lines: LOG_LINES + LOG_APPEND,
};

/** The second append lands while the reader is scrolled up. */
export const LOG_AFTER_SECOND_APPEND: LogState = {
  ...LOG_AFTER_FIRST_APPEND,
  lines: LOG_LINES + LOG_APPEND * 2,
};

/** The third append lands with the follow flag off. */
export const LOG_AFTER_THIRD_APPEND: LogState = {
  ...LOG_AFTER_SECOND_APPEND,
  lines: LOG_LINES + LOG_APPEND * 3,
};

/**
 * The checks the probe asserts, by the step that makes them.
 *
 * `anchor()` is one assertion site the steps read five times, so it is counted
 * at every read: four steps carry it beside their own check, and the last two
 * carry it with the row they name.
 *
 * - rest: the readout, the tail row, the head's absence, the toolbar's follow
 *   control, the levels it offers, the anchor and the list's viewport (7);
 * - one append at the tail: the readout, the new tail, the retired tail, the
 *   anchor's read and the move it proves (5);
 * - a wheel up: the anchor's read and move, the row it pushes out and the row
 *   it reveals (4);
 * - an append by a reader scrolled up: the readout, the row that must not
 *   paint, the anchor's read and its stillness (4);
 * - the follow toggle off: the readout it reports (1);
 * - an append with follow off: the readout, the row that must not paint, the
 *   anchor's read and its stillness (4);
 * - the follow toggle on: the readout, the tail it returns the reader to, the
 *   anchor's read and the row it names (4);
 * - the append after it: the tail the flag follows (1);
 * - the level filter: the readout, the surviving tail, the row it drops (3);
 * - every level restored: the readout and the tail (2).
 */
export const LOG_CHECKS = Arr.reduce(
  [7, 5, 4, 4, 1, 4, 4, 1, 3, 2],
  0,
  (total, part) => total + part,
);
