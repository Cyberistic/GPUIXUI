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
import * as Option from "effect/Option";

/** A half-open `[start, end)` range in UTF-16 code units, the units `indexOf` returns. */
export interface MatchRange {
  readonly start: number;
  readonly end: number;
}

/** How a query is matched. The defaults are the bar's documented literal scan. */
export interface FindOptions {
  /** Match the query's letter case. Default `true`. */
  readonly caseSensitive?: boolean;
  /** Match only where the word does not continue on either side. Default `false`. */
  readonly wholeWord?: boolean;
}

/** A letter, digit or underscore: the run a whole-word match must not touch. */
const WordCharacter = /[\p{L}\p{N}_]/u;

const isWordCharacter = (character: string | undefined): boolean =>
  character !== undefined && WordCharacter.test(character);

/** A whole-word range sits between non-word characters, or the text's ends. */
const isWholeWord = (text: string, range: MatchRange): boolean =>
  !isWordCharacter(text[range.start - 1]) && !isWordCharacter(text[range.end]);

/** Escape a literal query so a case-insensitive scan can use it as a pattern. */
const escapePattern = (query: string): string =>
  query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every non-overlapping occurrence of `query` in `text`, left to right.
 *
 * An empty query matches nothing — the bar has nothing to find, and a zero-
 * length needle would otherwise match at every position. Overlapping matches
 * are skipped: a candidate that starts before the previous match's `end` is
 * dropped, so `"aa"` inside `"aaa"` yields one range, not two. A
 * case-insensitive scan is a literal escaped pattern, not a lowered copy of
 * the text: lowering can change a string's length (and therefore its indices),
 * while the regex engine reports the offsets of the text it was given.
 *
 * The two rules run in that order: the **word boundary** first, then the
 * overlap. An occurrence the whole-word rule rejects can overlap one it
 * accepts (`"a.a"` at 1 and at 3 in `"xa.a.a "`), so filtering after the
 * overlap rule dropped a real whole-word match without a trace.
 *
 * The scan is a fold rather than a recursion: a document can hold a match per
 * character, and one call frame per match exhausted the stack on a large file.
 */
export const findRanges = (
  text: string,
  query: string,
  options: FindOptions = {},
): ReadonlyArray<MatchRange> => {
  if (query.length === 0) return [];
  const candidates = occurrences(text, query, options.caseSensitive !== false);
  const accepted =
    options.wholeWord === true
      ? Arr.filter(candidates, (range) => isWholeWord(text, range))
      : candidates;
  return nonOverlapping(accepted);
};

/** Every occurrence, overlaps included, left to right. */
const occurrences = (
  text: string,
  query: string,
  caseSensitive: boolean,
): ReadonlyArray<MatchRange> =>
  caseSensitive ? findExact(text, query) : findCaseInsensitive(text, query);

const findExact = (text: string, query: string): ReadonlyArray<MatchRange> =>
  Arr.unfold(
    0,
    (from: number): Option.Option<readonly [MatchRange, number]> => {
      const index = text.indexOf(query, from);
      return index === -1
        ? Option.none()
        : Option.some([
            { start: index, end: index + query.length },
            index + 1,
          ] as const);
    },
  );

const findCaseInsensitive = (
  text: string,
  query: string,
): ReadonlyArray<MatchRange> => {
  const pattern = new RegExp(escapePattern(query), "gi");
  return Arr.unfold(
    0,
    (from: number): Option.Option<readonly [MatchRange, number]> => {
      pattern.lastIndex = from;
      const found = pattern.exec(text);
      return found === null
        ? Option.none()
        : Option.some([
            { start: found.index, end: found.index + found[0].length },
            found.index + 1,
          ] as const);
    },
  );
};

/** Drop a candidate that starts inside the match accepted before it. */
const nonOverlapping = (
  ranges: ReadonlyArray<MatchRange>,
): ReadonlyArray<MatchRange> => {
  const [, kept] = Arr.mapAccum(
    ranges,
    -1,
    (end, range): readonly [number, Option.Option<MatchRange>] =>
      range.start >= end
        ? [range.end, Option.some(range)]
        : [end, Option.none()],
  );
  return Arr.getSomes(kept);
};

/**
 * The bar's readout: the active match of the total, `No matches` for a query
 * that fits nothing, and nothing at all before a query.
 *
 * The bar paints this sentence as a named `status` node, so it is also what a
 * screen reader hears: `No matches` before the reader has typed anything
 * announces a search that was never made, on a field whose query is empty.
 */
export const matchReadout = (
  query: string,
  active: number,
  count: number,
): string =>
  query.length === 0
    ? ""
    : count === 0
      ? "No matches"
      : `${active + 1} / ${count}`;

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
  options: FindOptions = {},
): string => {
  const ranges = findRanges(text, query, options);
  return Arr.length(ranges) === 0
    ? text
    : Arr.reduce(
        Arr.reverse(ranges),
        text,
        (result, range) =>
          result.slice(0, range.start) + replacement + result.slice(range.end),
      );
};
