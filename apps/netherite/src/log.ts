/**
 * The log the TUI keeps: a bounded tail, because a Netherite run prints
 * thousands of lines and the viewport shows the last screenful.
 *
 * The cap is the only rule; `append` returns a new array so the render can
 * compare identity, and `feed` splits a chunk on newlines and keeps the
 * unfinished last line in place.
 */

/** How many lines the log retains. */
export const LOG_LIMIT = 500;

/** Push one line, dropping the oldest past the cap. */
export const append = (
  lines: ReadonlyArray<string>,
  line: string,
): ReadonlyArray<string> => {
  const next = [...lines, line];
  return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next;
};

/** Push a chunk that may hold several lines; a trailing partial line is kept. */
export const feed = (
  lines: ReadonlyArray<string>,
  chunk: string,
): ReadonlyArray<string> => {
  const parts = chunk.split(/\r?\n/);
  const complete = parts.slice(0, -1);
  const rest = parts[parts.length - 1] ?? "";
  const next = complete.reduce(append, lines);
  return rest.length > 0 ? append(next, rest) : next;
};

/** The last `count` lines, for a viewport. */
export const tail = (
  lines: ReadonlyArray<string>,
  count: number,
): ReadonlyArray<string> =>
  lines.length <= count ? lines : lines.slice(lines.length - count);
