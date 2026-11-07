export const LOG_LIMIT = 500;

export const append = (
  lines: ReadonlyArray<string>,
  line: string,
): ReadonlyArray<string> => {
  const next = [...lines, line];
  return next.length > LOG_LIMIT ? next.slice(next.length - LOG_LIMIT) : next;
};

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

export const tail = (
  lines: ReadonlyArray<string>,
  count: number,
): ReadonlyArray<string> =>
  lines.length <= count ? lines : lines.slice(lines.length - count);
