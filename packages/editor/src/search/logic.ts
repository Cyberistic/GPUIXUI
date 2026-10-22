/**
 * The pure find-and-replace half of the search bar.
 *
 * A matcher that returns the byte ranges of a literal query inside a text, and
 * a replacer that swaps them out. Both share one rule: a match never overlaps
 * the one before it. Scanning left to right and resuming from a match's end
 * yields exactly the non-overlapping set — the same set `replaceAll` removes,
 * so a match count and a replace-all agree on what "one match" is.
 */

import * as Arr from "effect/Array";

/** A half-open `[start, end)` range in UTF-16 code units, the units `indexOf` returns. */
export interface MatchRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Every non-overlapping occurrence of `query` in `text`, left to right.
 *
 * An empty query matches nothing — the bar has nothing to find, and a zero-
 * length needle would otherwise match at every position. Overlapping matches
 * are skipped: the scan resumes at a match's `end`, so `"aa"` inside `"aaa"`
 * yields one range, not two.
 */
export const findRanges = (
  text: string,
  query: string,
): ReadonlyArray<MatchRange> => {
  const collect = (
    from: number,
    found: ReadonlyArray<MatchRange>,
  ): ReadonlyArray<MatchRange> => {
    if (query.length === 0) return [];
    const index = text.indexOf(query, from);
    return index === -1
      ? found
      : collect(
          index + query.length,
          Arr.append(found, { start: index, end: index + query.length }),
        );
  };
  return collect(0, []);
};

/**
 * The text with every non-overlapping occurrence of `query` replaced.
 *
 * Built from {@link findRanges} so a replace-all and a match count agree; an
 * empty query returns the text unchanged. Ranges are replaced from last to
 * first so an earlier replacement never shifts a later index.
 */
export const replaceAll = (
  text: string,
  query: string,
  replacement: string,
): string => {
  const ranges = findRanges(text, query);
  if (Arr.length(ranges) === 0) return text;
  let result = text;
  for (const range of Arr.reverse(ranges)) {
    result =
      result.slice(0, range.start) + replacement + result.slice(range.end);
  }
  return result;
};
